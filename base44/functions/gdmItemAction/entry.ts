import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  hasPermission,
  displayNameOf,
  SECTOR_BY_DESTINATION,
  isAccountAllowed,
} from '../../shared/itemPermissions.ts';
import {
  previousStatusOf,
  flowStatusesOf,
  sectorOfStatus,
  STATUS_LABELS,
} from '../../shared/stepReturn.ts';

// Ações protegidas sobre itens de GDM: verificação de permissão, bloqueio de
// saltos de etapa e registro automático no histórico (data, hora e usuário).
// Fluxo do ciclo de fornecedor (reparo/calibração), executado sempre por item:
//   Almoxarifado recebe → Planejamento emite PWT (reparo) → Serviços define
//   fornecedor → Almoxarifado anexa comprovante de envio → Serviços anexa
//   cotação → Manutenção decide (aprovar / desconto / reprovar com troca de
//   fornecedor ou descarte). O PWT é etapa obrigatória do reparo: emitido
//   somente após a validação da Coordenação e o recebimento do equipamento.
// Todo ciclo, cotação e decisão permanece registrado (nunca excluído).

const VALID_DESTINATIONS = ['repair', 'certification', 'stock_return', 'discard'];
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const SUPPLIER_DESTINATIONS = ['repair', 'certification'];

/** Espelha dados do item na GDM (Dashboard e relatórios legados). */
async function mirrorGdm(base44: any, gdmId: string, patch: Record<string, any>) {
  try {
    const gdms = await base44.asServiceRole.entities.GDM.filter({ id: gdmId });
    const gdm = gdms && gdms[0];
    if (gdm) await base44.asServiceRole.entities.GDM.update(gdm.id, patch);
  } catch {
    // Falha no espelho não invalida a ação do item
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    if (!isAccountAllowed(user)) {
      return Response.json({ error: 'Conta sem acesso liberado à plataforma' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const itemId = body.item_id || body.itemId;
    const action = body.action;
    const observation = body.observation || null;
    const returnNumber = body.return_number || body.returnNumber || null;
    const destination = body.destination || null;
    const expectedDisembarkDate = body.expected_disembark_date || body.expectedDisembarkDate || null;

    if (!itemId || !action) {
      return Response.json({ error: 'item_id e action são obrigatórios' }, { status: 400 });
    }

    let item = null;
    try {
      const items = await base44.entities.GDMItem.filter({ id: itemId });
      item = items && items[0];
    } catch {
      item = null;
    }
    if (!item) return Response.json({ error: 'Item não encontrado' }, { status: 404 });

    const can = (p: string) => hasPermission(user, p);

    // Cada ação valida a seguir a sua própria permissão específica — os
    // fluxos são naturalmente multi-setor (Coordenação aprova, Almoxarifado
    // envia, Planejamento emite PWT etc.), sem gate global de setor.
    const itemSector = SECTOR_BY_DESTINATION[item.destination] || 'maintenance';

    const prev = item.status;
    let next: string | null = null;
    const now = new Date().toISOString();
    const extra: Record<string, any> = {};

    if (action === 'approve') {
      // ETAPA 2 — Coordenador confirma a tratativa do item.
      if (!can('approve_gdm')) throw new Error('Sem permissão para confirmar a tratativa');
      if (prev !== 'pending_coordinator') throw new Error('Item não está aguardando o coordenador');
      if (item.receipt_situation === 'not_received') {
        // GDM aberta sem recebimento físico: a Coordenação valida o desembarque,
        // a situação operacional, o destino e a tratativa, e informa a nova
        // previsão de desembarque. O item retorna ao Almoxarifado no status
        // "Aguardando Recebimento" — após a chegada física do equipamento o
        // fluxo continua da etapa em que parou, sem nova análise do Coordenador.
        if (!expectedDisembarkDate) {
          throw new Error('Informe a nova previsão de desembarque');
        }
        next = 'awaiting_receipt';
        extra.expected_disembark_date = expectedDisembarkDate;
      } else {
        // GDM criada como "Recebido": o equipamento já está fisicamente no
        // Almoxarifado desde a abertura da GDM. A confirmação da tratativa
        // pela Coordenação avança direto para a etapa do destino, sem nova
        // confirmação de recebimento (etapa exclusiva de GDMs "Não Recebido").
        const finalDestination = destination || item.destination;
        // PWT (Planejamento) é etapa obrigatória dos itens de reparo, emitida
        // após a validação da tratativa pela Coordenação e com o equipamento
        // já recebido — antes da definição do fornecedor por Serviços.
        next =
          finalDestination === 'discard'
            ? 'pending_maintenance_authorization'
            : finalDestination === 'stock_return'
              ? 'received'
              : finalDestination === 'repair'
                ? 'awaiting_pwt'
                : 'awaiting_supplier_definition';
        if (!item.stock_received_at) {
          extra.stock_received_at = now;
          extra.stock_received_by = user.id;
        }
      }
      if (destination && destination !== item.destination) {
        if (!VALID_DESTINATIONS.includes(destination)) {
          throw new Error('Destino inválido para o item');
        }
        if (!can('change_gdm_destination') && user.role !== 'admin') {
          throw new Error('Sem permissão para alterar o destino do item');
        }
        extra.destination = destination;
        extra.previous_destination = item.destination;
      }
    } else if (action === 'reject') {
      if (!can('reject_gdm')) throw new Error('Sem permissão para reprovar');
      if (prev !== 'pending_coordinator') throw new Error('Item não está aguardando aprovação');
      next = 'rejected';
    } else if (action === 'confirm_receipt') {
      // Confirmação de chegada física — exclusiva de GDMs abertas como
      // "Não Recebido": a tratativa já foi validada pela Coordenação e o
      // fluxo segue direto para a etapa do destino.
      if (!can('confirm_receipt')) throw new Error('Sem permissão para confirmar recebimento');
      if (prev !== 'awaiting_receipt') {
        throw new Error('Item não está aguardando a chegada do equipamento');
      }
      // Itens de reparo seguem para a emissão do PWT pelo Planejamento
      // (etapa obrigatória antes da definição do fornecedor).
      next =
        item.destination === 'discard'
          ? 'pending_maintenance_authorization'
          : item.destination === 'stock_return'
            ? 'received'
            : item.destination === 'repair'
              ? 'awaiting_pwt'
              : 'awaiting_supplier_definition';
      extra.stock_received_at = now;
      extra.stock_received_by = user.id;
    } else if (action === 'confirm_stock_return') {
      if (!can('confirm_receipt')) throw new Error('Sem permissão para confirmar devolução');
      if (item.destination !== 'stock_return') throw new Error('Item não é de retorno ao estoque');
      if (item.stock_return_confirmed) throw new Error('Devolução já confirmada');
      if (prev !== 'received') {
        throw new Error('Item não está disponível para devolução');
      }
      next = 'completed';
      extra.stock_return_confirmed = true;
      extra.stock_return_number = returnNumber || null;
      extra.stock_return_at = now;
      extra.stock_return_by = user.id;
      extra.completed_at = now;
      extra.completed_by = user.email;
    } else if (action === 'authorize_discard') {
      if (!can('approve_maintenance')) throw new Error('Sem permissão para autorizar descarte');
      if (item.destination !== 'discard') throw new Error('Item não é de descarte');
      if (!item.stock_received_at) throw new Error('Almoxarifado ainda não recebeu o item');
      if (prev !== 'pending_maintenance_authorization') throw new Error('Item não está aguardando autorização');
      next = 'awaiting_discard_confirmation';
      extra.discard_authorized = true;
      extra.discard_authorized_by = user.id;
      extra.discard_authorized_at = now;
    } else if (action === 'confirm_discard') {
      if (!can('confirm_disposal') && !can('confirm_receipt')) {
        throw new Error('Sem permissão para confirmar descarte');
      }
      // O status do item é a fonte da verdade: o registro de autorização
      // (discard_authorized) pode não existir em itens de simulação/fluxos
      // antigos, sem prejuízo à etapa atual de confirmação.
      if (
        item.destination !== 'discard' ||
        item.discard_confirmed ||
        prev !== 'awaiting_discard_confirmation'
      ) {
        throw new Error('Item não está aguardando confirmação de descarte');
      }
      // Registro obrigatório: data, responsável e comprovação (anexo ou justificativa).
      const discardDate = body.discard_date || body.discardDate || null;
      const discardResponsible = String(body.discard_responsible || body.discardResponsible || '').trim();
      if (!discardDate) throw new Error('Informe a data do descarte');
      if (!discardResponsible) throw new Error('Informe o responsável pelo descarte');
      let evidenceCount = 0;
      try {
        const atts = await base44.entities.GDMAttachment.filter({ gdm_item_id: item.id });
        evidenceCount = (atts || []).filter((a: any) =>
          ['descarte_foto', 'descarte_pdf', 'documento_descarte'].includes(a.attachment_type),
        ).length;
      } catch {
        evidenceCount = 0;
      }
      const justification = (observation || '').trim();
      if (evidenceCount === 0 && !justification) {
        throw new Error('Anexe ao menos uma foto ou PDF de comprovação do descarte, ou informe uma justificativa obrigatória');
      }
      next = 'completed';
      extra.discard_confirmed = true;
      extra.discard_confirmed_by = user.id;
      extra.discard_confirmed_at = now;
      extra.discard_date = discardDate;
      extra.discard_responsible = discardResponsible;
      extra.discard_notes = justification || null;
      extra.evidence_files = Array.isArray(body.evidence_file_names) ? body.evidence_file_names : [];
      extra.completed_at = now;
      extra.completed_by = user.email;

    // ------------------------------------------------------------------
    // CICLO DE FORNECEDOR (reparo / calibração)
    // ------------------------------------------------------------------
    } else if (action === 'select_supplier') {
      // Serviços define o fornecedor, observações e previsão de envio.
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('send_to_supplier')) throw new Error('Sem permissão para definir fornecedor');
      if (!['awaiting_supplier_definition', 'pending_services', 'return_confirmed'].includes(prev)) {
        throw new Error('Item não está aguardando definição de fornecedor');
      }
      const supplierId = body.supplier_id;
      if (!supplierId) throw new Error('Selecione o fornecedor');
      if (!body.expected_ship_date) throw new Error('Informe a previsão de envio');

      let supplierName = body.supplier_name || null;
      if (!supplierName) {
        const suppliers = await base44.asServiceRole.entities.Supplier.filter({ id: supplierId });
        supplierName = suppliers && suppliers[0] ? suppliers[0].company_name : null;
      }
      if (!supplierName) throw new Error('Fornecedor não encontrado');

      const previous = Array.isArray(item.previous_suppliers) ? item.previous_suppliers : [];
      if (prev === 'return_confirmed' && item.supplier_id) {
        previous.push({
          supplier_id: item.supplier_id,
          supplier_name: item.supplier_name,
          sent_at: item.sent_to_supplier_at || null,
          returned_at: item.return_confirmed_at || null,
          reason: item.maintenance_reject_outcome === 'other_supplier'
            ? 'Reprovação da cotação — envio para outro fornecedor'
            : 'Ciclo encerrado',
        });
        extra.previous_suppliers = previous;
      }

      // Novo ciclo: limpa os dados do ciclo anterior e inicia novo vínculo.
      extra.supplier_id = supplierId;
      extra.supplier_name = supplierName;
      extra.supplier_selected_at = now;
      extra.supplier_selected_by = user.email;
      extra.expected_ship_date = body.expected_ship_date;
      extra.shipping_proof_url = null;
      extra.shipping_photo_url = null;
      extra.shipping_proof_at = null;
      extra.shipping_proof_by = null;
      extra.sent_to_supplier_at = null;
      extra.sent_by = null;
      extra.quote_due_at = null;
      extra.quote_followup_notified_at = null;
      // A guarda de alerta de prazo é por ciclo: sem a limpeza, o alerta de
      // retorno nunca dispararia nos ciclos seguintes do mesmo item.
      extra.return_deadline_notified_at = null;
      extra.quote_value = null;
      extra.quote_document_url = null;
      extra.quote_deadline = null;
      extra.quote_attached_at = null;
      extra.quote_attached_by = null;
      extra.maintenance_decision = null;
      extra.maintenance_reject_outcome = null;
      extra.maintenance_decided_by = null;
      extra.maintenance_decided_at = null;
      extra.return_nf_url = null;
      extra.return_proof_url = null;
      extra.return_registered_at = null;
      extra.return_registered_by = null;
      extra.return_confirmed_at = null;
      extra.return_confirmed_by = null;
      // Novo ciclo de fornecedor = nova OT: os campos da OT anterior são
      // limpos para que Serviços emita a OT do ciclo vigente.
      extra.ot_number = null;
      extra.ot_issued_at = null;
      extra.ot_issued_by = null;
      extra.ot_status = null;
      extra.ot_closed_at = null;
      extra.ot_closed_by = null;
      extra.ot_alerts_sent = [];
      // Novo ciclo: a OC e o prazo de retorno do ciclo anterior são limpos —
      // a previsão de retorno só existe após a nova emissão da OC (Serviços),
      // nunca antes da formalização junto ao fornecedor.
      extra.oc_number = null;
      extra.oc_issued_at = null;
      extra.oc_issued_by = null;
      extra.oc_approval_confirmed_at = null;
      extra.oc_approval_confirmed_by = null;
      extra.return_deadline_days = null;
      extra.expected_return_date = null;
      extra.return_deadline_alerts = [];
      next = 'awaiting_shipping_proof';

      await mirrorGdm(base44, item.gdm_id, {
        supplier_id: supplierId,
        supplier_name: supplierName,
        maintenance_decision: null,
      });
    } else if (action === 'attach_shipping_proof') {
      // Almoxarifado anexa a NF assinada e a foto do envio (ambas obrigatórias)
      // e registra a data de envio, a transportadora (quando aplicável) e
      // observações. O prazo de retorno NÃO é informado nesta etapa: ele só
      // existe após a emissão da Ordem de Compra, quando Serviços registra a
      // previsão informada pelo fornecedor (emissão da OC / set_return_deadline).
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('confirm_receipt')) throw new Error('Sem permissão para anexar comprovante de envio');
      if (prev !== 'awaiting_shipping_proof') throw new Error('Item não está aguardando comprovante de envio');
      if (!body.nf_url) throw new Error('Anexe a NF assinada');
      if (!body.photo_url) throw new Error('Anexe a foto do envio');

      const sentDate =
        typeof body.sent_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.sent_date)
          ? body.sent_date
          : now.slice(0, 10);
      const sentAt = new Date(`${sentDate}T12:00:00`).toISOString();
      const carrier = String(body.carrier || '').trim() || null;

      extra.shipping_proof_url = body.nf_url;
      extra.shipping_photo_url = body.photo_url;
      extra.shipping_proof_at = now;
      extra.shipping_proof_by = user.email;
      extra.shipping_carrier = carrier;
      extra.sent_to_supplier_at = sentAt;
      extra.sent_by = user.email;
      extra.quote_due_at = new Date(Date.now() + THREE_DAYS_MS).toISOString();
      extra.quote_followup_notified_at = null;
      next = 'sent_to_supplier';

      await mirrorGdm(base44, item.gdm_id, {
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name,
        sent_to_supplier_date: sentDate,
        sent_by: user.email,
      });
    } else if (action === 'attach_quote') {
      // Serviços anexa cotação, valor e prazo informado pelo fornecedor.
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('send_to_supplier')) throw new Error('Sem permissão para anexar cotação');
      if (prev !== 'sent_to_supplier') throw new Error('Item não está aguardando cotação');
      if (!body.quote_document_url) throw new Error('Anexe o documento da cotação');
      if (body.quote_value === undefined || body.quote_value === null || Number(body.quote_value) <= 0) {
        throw new Error('Informe o valor do reparo');
      }
      if (!body.quote_deadline) throw new Error('Informe o prazo informado pelo fornecedor');
      if (!can('register_warranty')) {
        throw new Error('Sem permissão para registrar a garantia da cotação');
      }
      const warrantyDays = Number(body.warranty_days);
      if (!body.warranty_days || !Number.isFinite(warrantyDays) || warrantyDays <= 0) {
        throw new Error('Informe a garantia oferecida pelo fornecedor (em dias)');
      }
      const proposalNumber = String(body.quote_proposal_number || '').trim() || null;

      const quoteValue = Number(body.quote_value);
      extra.quote_value = quoteValue;
      extra.warranty_days = warrantyDays;
      extra.quote_proposal_number = proposalNumber;
      extra.quote_document_url = body.quote_document_url;
      extra.quote_deadline = body.quote_deadline;
      extra.quote_attached_at = now;
      extra.quote_attached_by = user.email;
      const quotes = Array.isArray(item.quotes_history) ? [...item.quotes_history] : [];
      quotes.push({
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name,
        quote_value: quoteValue,
        quote_document_url: body.quote_document_url,
        quote_deadline: body.quote_deadline,
        quote_proposal_number: proposalNumber,
        warranty_days: warrantyDays,
        registered_by: user.email,
        registered_at: now,
        outcome: 'submitted',
      });
      extra.quotes_history = quotes;
      next = 'awaiting_maintenance_authorization';

      await mirrorGdm(base44, item.gdm_id, {
        quote_value: quoteValue,
        quote_document_url: body.quote_document_url,
        maintenance_decision: null,
        maintenance_decided_by: null,
        maintenance_decided_at: null,
      });
    } else if (action === 'maintenance_decision') {
      // Gerência de Manutenção: aprovar, solicitar desconto ou reprovar
      // (com escolha obrigatória: outro fornecedor ou descarte do equipamento).
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      const approvePerm = itemSector === 'operations' ? 'approve_operations_quote' : 'approve_maintenance';
      if (!can(approvePerm)) throw new Error('Sem permissão para analisar cotações');
      if (prev !== 'awaiting_maintenance_authorization') {
        throw new Error('Item não está aguardando aprovação da manutenção');
      }

      const decision = body.decision;
      if (!['approve', 'discount', 'reject'].includes(decision)) {
        throw new Error('Selecione uma decisão');
      }

      const quotes = Array.isArray(item.quotes_history) ? [...item.quotes_history] : [];
      const lastQuote = quotes.length ? { ...quotes[quotes.length - 1] } : null;

      if (decision === 'approve') {
        extra.maintenance_decision = 'approved';
        extra.maintenance_decided_by = user.email;
        extra.maintenance_decided_at = now;
        if (lastQuote) {
          lastQuote.outcome = 'approved';
          lastQuote.decided_by = user.email;
          lastQuote.decided_at = now;
          quotes[quotes.length - 1] = lastQuote;
          extra.quotes_history = quotes;
        }
        // Após a aprovação da cotação: itens de reparo com PWT já emitido
        // (novo fluxo) seguem direto para a OC; itens legados em andamento
        // sem PWT aguardam a emissão pelo Planejamento antes da OC.
        next =
          item.destination === 'certification' || item.pwt_number
            ? 'awaiting_oc_issuance'
            : 'awaiting_pwt';
      } else if (decision === 'discount') {
        extra.maintenance_decision = 'discount_requested';
        extra.maintenance_decided_by = user.email;
        extra.maintenance_decided_at = now;
        if (body.discount_percentage) extra.discount_percentage = Number(body.discount_percentage);
        if (lastQuote) {
          lastQuote.outcome = 'discount_requested';
          lastQuote.reason = observation || 'Desconto solicitado pela Manutenção';
          lastQuote.decided_by = user.email;
          lastQuote.decided_at = now;
          quotes[quotes.length - 1] = lastQuote;
          extra.quotes_history = quotes;
        }
        next = 'discount_negotiation';
      } else {
        // Reprovação: motivo obrigatório + desfecho obrigatório.
        if (!observation || !String(observation).trim()) {
          throw new Error('Informe o motivo da reprovação');
        }
        const outcome = body.reject_outcome;
        if (!['other_supplier', 'discard'].includes(outcome)) {
          throw new Error('Escolha: enviar para outro fornecedor ou descartar o equipamento');
        }
        extra.maintenance_decision = 'rejected';
        extra.maintenance_reject_outcome = outcome;
        extra.maintenance_decided_by = user.email;
        extra.maintenance_decided_at = now;
        if (lastQuote) {
          lastQuote.outcome = 'rejected';
          lastQuote.reason = observation;
          lastQuote.decided_by = user.email;
          lastQuote.decided_at = now;
          quotes[quotes.length - 1] = lastQuote;
          extra.quotes_history = quotes;
        }
        if (outcome === 'other_supplier') {
          next = 'awaiting_supplier_return';
        } else {
          extra.discard_authorized = true;
          extra.discard_authorized_by = user.id;
          extra.discard_authorized_at = now;
          extra.discard_notes = observation;
          extra.completed_at = now;
          extra.completed_by = user.email;
          next = 'discard_approved';
        }
      }

      await mirrorGdm(base44, item.gdm_id, {
        maintenance_decision: extra.maintenance_decision,
        maintenance_decided_by: user.email,
        maintenance_decided_at: now,
        maintenance_notes: observation || null,
        ...(body.discount_percentage ? { discount_percentage: Number(body.discount_percentage) } : {}),
      });
    } else if (action === 'renegotiate_quote') {
      // Serviços negocia: insere novo valor e anexa nova proposta.
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('send_to_supplier')) throw new Error('Sem permissão para negociar cotação');
      if (prev !== 'discount_negotiation') throw new Error('Item não está em negociação de desconto');
      if (body.quote_value === undefined || body.quote_value === null || Number(body.quote_value) <= 0) {
        throw new Error('Informe o novo valor negociado');
      }

      const quoteValue = Number(body.quote_value);
      extra.quote_value = quoteValue;
      extra.quote_attached_at = now;
      extra.quote_attached_by = user.email;
      // Garantia pode ser ajustada na renegociação (opcional; sempre no histórico).
      if (body.warranty_days !== undefined && body.warranty_days !== null && body.warranty_days !== '') {
        if (!can('register_warranty')) throw new Error('Sem permissão para alterar a garantia');
        const warrantyDays = Number(body.warranty_days);
        if (!Number.isFinite(warrantyDays) || warrantyDays <= 0) {
          throw new Error('Garantia inválida');
        }
        extra.warranty_days = warrantyDays;
        if (item.warranty_start_at) {
          extra.warranty_end_at = new Date(
            new Date(item.warranty_start_at).getTime() + warrantyDays * 86400000,
          ).toISOString();
        }
      }
      const quotes = Array.isArray(item.quotes_history) ? [...item.quotes_history] : [];
      if (body.quote_document_url) extra.quote_document_url = body.quote_document_url;
      quotes.push({
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name,
        quote_value: quoteValue,
        quote_document_url: body.quote_document_url || null,
        quote_deadline: body.quote_deadline || item.quote_deadline || null,
        registered_by: user.email,
        registered_at: now,
        outcome: 'renegotiated',
        reason: observation || 'Nova proposta após solicitação de desconto',
      });
      extra.quotes_history = quotes;
      next = 'awaiting_maintenance_authorization';

      await mirrorGdm(base44, item.gdm_id, {
        quote_value: quoteValue,
        ...(body.quote_document_url ? { quote_document_url: body.quote_document_url } : {}),
        maintenance_decision: null,
        maintenance_decided_by: null,
        maintenance_decided_at: null,
      });
    } else if (action === 'register_supplier_return') {
      // Serviços solicita devolução: NF de retorno + comprovante + observações.
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('send_to_supplier')) throw new Error('Sem permissão para registrar devolução');
      if (prev !== 'awaiting_supplier_return') {
        throw new Error('Item não está aguardando retorno do fornecedor');
      }
      if (!body.return_nf_url) throw new Error('Anexe a NF de retorno');
      if (!body.return_proof_url) throw new Error('Anexe o comprovante de devolução');

      extra.return_nf_url = body.return_nf_url;
      extra.return_proof_url = body.return_proof_url;
      extra.return_registered_at = now;
      extra.return_registered_by = user.email;
      next = 'awaiting_supplier_return';
    } else if (action === 'confirm_supplier_return') {
      // Almoxarifado confirma o recebimento do retorno: encerra o ciclo do
      // fornecedor anterior e devolve o item a Serviços para novo fornecedor.
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('confirm_receipt')) throw new Error('Sem permissão para confirmar o retorno');
      if (prev !== 'awaiting_supplier_return') {
        throw new Error('Item não está aguardando confirmação de retorno');
      }
      if (!item.return_nf_url) throw new Error('Serviços ainda não registrou a NF de retorno');

      extra.return_confirmed_at = now;
      extra.return_confirmed_by = user.email;
      next = 'return_confirmed';
    } else if (action === 'start_repair') {
      // Após aprovação, Serviços inicia o reparo no fornecedor.
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('edit_gdm')) throw new Error('Sem permissão');
      if (prev !== 'repair_approved') throw new Error('O reparo ainda não foi aprovado');
      // OT: fornecedor executando a atividade.
      if (item.ot_number && item.ot_status === 'open') {
        extra.ot_status = 'in_service';
      }
      next = 'in_treatment';
    } else if (action === 'complete') {
      if (!can('confirm_return')) throw new Error('Sem permissão para finalizar o item');
      if (['discard', 'stock_return'].includes(item.destination)) {
        throw new Error('Este item segue o fluxo próprio de descarte/estoque');
      }
      if (!['in_treatment', 'awaiting_return'].includes(prev)) {
        throw new Error('Item só pode ser finalizado em reparo ou aguardando retorno');
      }
      // Garantia: o prazo começa a contar no recebimento confirmado pelo Almoxarifado.
      if (item.warranty_days && Number(item.warranty_days) > 0) {
        extra.warranty_start_at = now;
        extra.warranty_end_at = new Date(
          new Date(now).getTime() + Number(item.warranty_days) * 86400000,
        ).toISOString();
      }
      next = 'completed';
      extra.completed_at = now;
      extra.completed_by = user.email;
    } else if (action === 'issue_pwt') {
      // Planejamento emite o PWT (apenas itens de reparo) e registra o número.
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (item.destination === 'certification') {
        throw new Error('Itens de calibração (Operações) não exigem PWT — emita a OC diretamente');
      }
      if (!can('issue_pwt')) throw new Error('Sem permissão para emitir PWT');
      if (!['awaiting_pwt', 'repair_approved'].includes(prev)) {
        throw new Error('Item não está aguardando PWT');
      }
      const pwtNumber = String(body.pwt_number || body.pwtNumber || '').trim();
      if (!pwtNumber) throw new Error('Informe o número do PWT');

      extra.pwt_number = pwtNumber;
      extra.pwt_issued_at = now;
      extra.pwt_issued_by = user.email;
      // Novo fluxo (PWT antes do fornecedor): libera a definição do
      // fornecedor por Serviços. Itens legados em andamento (fornecedor já
      // definido, PWT emitido após a aprovação da cotação) seguem para a OC.
      next = item.supplier_id ? 'awaiting_oc_issuance' : 'awaiting_supplier_definition';

      await mirrorGdm(base44, item.gdm_id, {
        pwt_number: pwtNumber,
        pwt_issued_by: user.email,
        pwt_issued_at: now,
      });
    } else if (action === 'issue_oc') {
      // Serviços emite a Ordem de Compra: número, data de emissão e, quando
      // já informado pelo fornecedor, o prazo de retorno (dias ou data —
      // o prazo em dias é calculado a partir da data de emissão da OC).
      // O prazo de retorno NUNCA é solicitado antes deste ponto do fluxo.
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('issue_oc')) throw new Error('Sem permissão para emitir OC');
      if (prev !== 'awaiting_oc_issuance') {
        throw new Error('Item não está aguardando emissão da OC');
      }
      const ocNumber = String(body.oc_number || body.ocNumber || '').trim();
      if (!ocNumber) throw new Error('Informe o número da OC');
      const ocDate =
        typeof body.oc_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.oc_date)
          ? body.oc_date
          : now.slice(0, 10);
      const ocAt = new Date(`${ocDate}T12:00:00`).toISOString();

      const deadlineDays = Math.round(Number(body.return_deadline_days));
      let expectedReturn: string | null =
        typeof body.expected_return_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.expected_return_date)
          ? body.expected_return_date
          : null;
      if (!expectedReturn && deadlineDays > 0) {
        const due = new Date(`${ocDate}T12:00:00`);
        due.setDate(due.getDate() + deadlineDays);
        expectedReturn = due.toISOString().slice(0, 10);
      }

      extra.oc_number = ocNumber;
      extra.oc_issued_at = ocAt;
      extra.oc_issued_by = user.email;
      if (expectedReturn) {
        if (deadlineDays > 0) extra.return_deadline_days = deadlineDays;
        extra.expected_return_date = expectedReturn;
        extra.return_deadline_alerts = [];
      }
      next = 'awaiting_oc_approval';

      await mirrorGdm(base44, item.gdm_id, {
        oc_number: ocNumber,
        oc_issued_by: user.email,
        oc_issued_at: ocAt,
        ...(expectedReturn ? { expected_return_date: expectedReturn } : {}),
      });
    } else if (action === 'confirm_oc_approved') {
      // Usuário autorizado de Serviços confirma que a OC foi aprovada e
      // enviada ao fornecedor — o item passa a aguardar o retorno.
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('approve_oc')) throw new Error('Sem permissão para confirmar a aprovação da OC');
      if (prev !== 'awaiting_oc_approval') {
        throw new Error('Item não está aguardando aprovação da OC');
      }

      extra.oc_approval_confirmed_at = now;
      extra.oc_approval_confirmed_by = user.email;
      // OT: com a OC aprovada e enviada, o fornecedor executa o serviço.
      if (item.ot_number && item.ot_status === 'open') {
        extra.ot_status = 'in_service';
      }
      next = 'awaiting_return';
    } else if (action === 'issue_ot') {
      // Serviços emite a Ordem de Trabalho (OT) do equipamento enviado ao
      // fornecedor (reparo, certificação ou calibração). A OT fica ABERTA.
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('send_to_supplier')) throw new Error('Sem permissão para emitir OT');
      if (item.ot_number) throw new Error('A OT já foi emitida para este item');
      if (!item.sent_to_supplier_at) {
        throw new Error('O equipamento ainda não foi enviado ao fornecedor');
      }
      const otNumber = String(body.ot_number || body.otNumber || '').trim();
      if (!otNumber) throw new Error('Informe o número da OT');

      extra.ot_number = otNumber;
      extra.ot_issued_at = now;
      extra.ot_issued_by = user.email;
      extra.ot_status = 'open';
      extra.ot_closed_at = null;
      extra.ot_closed_by = null;
      extra.ot_alerts_sent = [];
      next = prev;

      await mirrorGdm(base44, item.gdm_id, {
        ot_number: otNumber,
        ot_issued_by: user.email,
        ot_issued_at: now,
      });
    } else if (action === 'close_ot') {
      // Almoxarifado fecha a OT (equipamento recebido, OT em aberto).
      if (!item.ot_number) throw new Error('Este item não possui OT emitida');
      if (item.ot_status === 'closed') throw new Error('A OT já está fechada');
      if (!can('confirm_receipt')) throw new Error('Sem permissão para fechar a OT');

      extra.ot_status = 'closed';
      extra.ot_closed_at = now;
      extra.ot_closed_by = user.email;
      next = prev;
    } else if (action === 'set_ot_status') {
      // Serviços altera a situação da OT diretamente na listagem do Controle
      // de OT (abrir o serviço ou retornar a OT para aberta), sem abrir a GDM.
      if (!item.ot_number) throw new Error('Este item não possui OT emitida');
      if (item.ot_status === 'closed') throw new Error('A OT já está fechada');
      if (!can('send_to_supplier')) throw new Error('Sem permissão para alterar a situação da OT');
      const target = String(body.ot_status || '').trim();
      if (!['open', 'in_service'].includes(target)) {
        throw new Error('Situação de OT inválida');
      }
      if (item.ot_status === target) throw new Error('A OT já está nesta situação');

      extra.ot_status = target;
      next = prev;
    } else if (action === 'register_return_dispatch') {
      // Serviços registra quando o material saiu do fornecedor para entrega.
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('send_to_supplier')) throw new Error('Sem permissão para registrar a saída para entrega');
      if (prev !== 'awaiting_return') {
        throw new Error('Item não está aguardando retorno');
      }
      if (item.return_dispatched_at) {
        throw new Error('A saída para entrega já foi registrada');
      }

      extra.return_dispatched_at = body.dispatch_date
        ? new Date(`${body.dispatch_date}T12:00:00`).toISOString()
        : now;
      extra.return_dispatched_by = user.email;
      next = 'awaiting_return';
    } else if (action === 'confirm_return_receipt') {
      // Almoxarifado confirma o recebimento do material retornado, anexando
      // obrigatoriamente a NF e o laudo técnico — finaliza o fluxo do item.
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('confirm_receipt')) throw new Error('Sem permissão para confirmar o recebimento');
      if (!['awaiting_return', 'in_treatment'].includes(prev)) {
        throw new Error('Item não está aguardando retorno do fornecedor');
      }
      if (!body.nf_url) throw new Error('Anexe a NF do material retornado');
      if (!body.laudo_url) throw new Error('Anexe o laudo técnico');

      extra.return_receipt_nf_url = body.nf_url;
      extra.return_laudo_url = body.laudo_url;
      extra.return_received_at = now;
      extra.return_received_by = user.email;
      // Garantia: o prazo começa a contar no recebimento confirmado pelo Almoxarifado.
      if (item.warranty_days && Number(item.warranty_days) > 0) {
        extra.warranty_start_at = now;
        extra.warranty_end_at = new Date(
          new Date(now).getTime() + Number(item.warranty_days) * 86400000,
        ).toISOString();
      }
      // OT: no recebimento do retorno, o Almoxarifado escolhe fechar a OT ou
      // mantê-la aberta (fica em destaque no Controle de OT como pendência).
      if (item.ot_number && ['open', 'in_service'].includes(item.ot_status)) {
        if (String(body.ot_action || '') === 'close') {
          extra.ot_status = 'closed';
          extra.ot_closed_at = now;
          extra.ot_closed_by = user.email;
        } else {
          extra.ot_status = 'awaiting_close';
        }
      }
      // Calibração/Certificação (Operações): o recebimento do retorno NÃO finaliza
      // o item — o certificado e a validade da certificação são obrigatórios.
      if (item.destination === 'certification') {
        next = 'awaiting_certificate';
      } else {
        extra.completed_at = now;
        extra.completed_by = user.email;
        next = 'completed';
      }
    } else if (action === 'register_certificate') {
      // Operações registra o certificado e a validade da certificação do item.
      // O certificado fica permanentemente vinculado ao item (histórico por SN).
      if (item.destination !== 'certification') {
        throw new Error('Este item não é de calibração/certificação');
      }
      if (!can('approve_operations_quote')) {
        throw new Error('Sem permissão para registrar certificados');
      }
      if (!['awaiting_certificate', 'awaiting_validity_registration'].includes(prev)) {
        throw new Error('Item não está aguardando o registro do certificado');
      }
      const certificateNumber = String(body.certificate_number || '').trim();
      const certificateDate = body.certificate_date || null;
      const certifyingCompany = String(body.certifying_company || '').trim();
      const pdfUrl = body.pdf_url || null;
      const imageUrl = body.image_url || null;
      const validityDate = body.validity_date || null;
      const validityMonths = Number(body.validity_months);
      const hasValidity =
        !!validityDate || (Number.isFinite(validityMonths) && validityMonths > 0);

      if (prev === 'awaiting_certificate') {
        if (!certificateNumber) throw new Error('Informe o número do certificado');
        if (!certificateDate) throw new Error('Informe a data do certificado');
        if (!certifyingCompany) throw new Error('Informe a empresa certificadora');
        if (!pdfUrl) throw new Error('Anexe o certificado em PDF');
      } else if (!hasValidity) {
        throw new Error('Informe a validade da certificação (data de vencimento ou meses de validade)');
      }

      // Certificado já salvo (etapa de validade): base para calcular o vencimento.
      let latest: any = null;
      if (prev === 'awaiting_validity_registration') {
        const certs = await base44.entities.Certification.filter({ item_id: item.id });
        latest = (certs || [])
          .slice()
          .sort((a: any, b: any) => new Date(b.created_date) - new Date(a.created_date))[0];
        if (!latest) {
          throw new Error('Certificado não encontrado — registre o certificado novamente');
        }
      }

      // Vencimento calculado: data informada OU emissão + meses de validade.
      let expiresAt: string | null = null;
      if (hasValidity) {
        if (validityDate) {
          expiresAt = new Date(`${validityDate}T23:59:59`).toISOString();
        } else {
          const base = new Date(`${certificateDate || latest?.certificate_date}T12:00:00`);
          base.setMonth(base.getMonth() + validityMonths);
          base.setHours(23, 59, 59, 0);
          expiresAt = base.toISOString();
        }
      }

      if (prev === 'awaiting_certificate') {
        await base44.entities.Certification.create({
          item_id: item.id,
          gdm_id: item.gdm_id,
          vessel_id: item.vessel_id || null,
          vessel_name: item.vessel_name || null,
          equipment_id: item.equipment_id || null,
          equipment_code: item.equipment_code || null,
          equipment_name: item.equipment_name || null,
          serial_number: item.serial_number || null,
          type: 'certification',
          certificate_number: certificateNumber,
          certificate_date: certificateDate,
          certifying_company: certifyingCompany,
          document_url: pdfUrl,
          image_url: imageUrl,
          validity_input: validityDate ? 'date' : hasValidity ? 'months' : null,
          validity_date: validityDate,
          validity_months: hasValidity && !validityDate ? validityMonths : null,
          expires_at: expiresAt,
          observations: observation || null,
          registered_by: user.email,
          registered_at: now,
        });
      } else {
        // Etapa de validade: atualiza o certificado salvo sem a validade.
        await base44.entities.Certification.update(latest.id, {
          validity_input: validityDate ? 'date' : 'months',
          validity_date: validityDate,
          validity_months: validityDate ? null : validityMonths,
          expires_at: expiresAt,
        });
      }

      if (hasValidity) {
        next = 'completed';
        extra.completed_at = now;
        extra.completed_by = user.email;
      } else {
        next = 'awaiting_validity_registration';
      }
    } else if (action === 'update_warranty') {
      // Serviços altera a garantia informada na cotação — a mudança é sempre
      // registrada no histórico imutável do item (data, hora e usuário).
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('register_warranty')) throw new Error('Sem permissão para alterar a garantia');
      if (!item.quote_attached_at) throw new Error('O item ainda não possui cotação registrada');
      if (['completed', 'cancelled', 'rejected', 'discard_approved'].includes(prev)) {
        throw new Error('Processo encerrado — a garantia não pode ser alterada');
      }
      const warrantyDays = Number(body.warranty_days);
      if (!body.warranty_days || !Number.isFinite(warrantyDays) || warrantyDays <= 0) {
        throw new Error('Informe a garantia em dias');
      }
      extra.warranty_days = warrantyDays;
      // Se a garantia já começou a contar, o término é recalculado a partir do início.
      if (item.warranty_start_at) {
        extra.warranty_end_at = new Date(
          new Date(item.warranty_start_at).getTime() + warrantyDays * 86400000,
        ).toISOString();
      }
      next = prev;
    } else if (action === 'set_return_deadline') {
      // PREVISÃO DE RETORNO (Serviços) — registrada exclusivamente após a
      // emissão da Ordem de Compra. Aceita data prevista direta ou prazo em
      // dias (calculado a partir da data de emissão da OC). Alterações
      // posteriores exigem justificativa; prazo anterior, novo prazo,
      // responsável, data e motivo ficam registrados no histórico da GDM.
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('send_to_supplier')) {
        throw new Error('Sem permissão para definir a previsão de retorno');
      }
      if (!item.oc_number) {
        throw new Error('A previsão de retorno só pode ser registrada após a emissão da Ordem de Compra (OC)');
      }
      if (['completed', 'cancelled', 'rejected', 'discard_approved'].includes(prev)) {
        throw new Error('Processo encerrado — a previsão de retorno não pode ser alterada');
      }
      const justification = String(observation || '').trim();
      if (item.expected_return_date && !justification) {
        throw new Error('Informe a justificativa da alteração do prazo de retorno');
      }
      const deadlineDays = Math.round(Number(body.return_deadline_days));
      let expectedReturn: string | null =
        typeof body.expected_return_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.expected_return_date)
          ? body.expected_return_date
          : null;
      if (!expectedReturn && deadlineDays > 0) {
        const baseDate = (item.oc_issued_at || now).slice(0, 10);
        const due = new Date(`${baseDate}T12:00:00`);
        due.setDate(due.getDate() + deadlineDays);
        expectedReturn = due.toISOString().slice(0, 10);
      }
      if (!expectedReturn) {
        throw new Error('Informe o prazo de retorno em dias ou a data prevista de retorno');
      }

      extra.expected_return_date = expectedReturn;
      if (deadlineDays > 0) extra.return_deadline_days = deadlineDays;
      extra.return_deadline_alerts = [];
      next = prev;

      await mirrorGdm(base44, item.gdm_id, { expected_return_date: expectedReturn });
    } else if (action === 'return_step') {
      // CORREÇÃO DE FLUXO — Retorno de Etapa: devolve o item à etapa
      // imediatamente anterior com justificativa obrigatória. Autorização
      // individual (allow_step_return), concedida apenas pelo ADM. Somente
      // administradores podem reabrir processos concluídos, retornar com OT
      // encerrada ou saltar múltiplas etapas (target_status). Toda devolução
      // fica registrada no histórico (usuário, data, hora, etapas e motivo).
      const isAdmin = user.role === 'admin';
      if (!isAdmin && !can('allow_step_return')) {
        throw new Error('Sem autorização para retornar etapas — concessão exclusiva do Administrador');
      }
      const justification = String(observation || '').trim();
      if (!justification) throw new Error('A justificativa do retorno é obrigatória');
      if (['rejected', 'cancelled'].includes(prev)) {
        throw new Error('Item reprovado/cancelado não pode ser retornado');
      }
      const closedProcess = ['completed', 'discard_approved'].includes(prev);
      const otClosed = item.ot_status === 'closed';
      if (!isAdmin) {
        if (closedProcess) throw new Error('Processo concluído — apenas o Administrador pode reabrir');
        if (otClosed) throw new Error('OT encerrada — apenas o Administrador pode retornar');
      }
      const flow = flowStatusesOf(item);
      let target: string | null = body.target_status || null;
      if (target) {
        if (!isAdmin) throw new Error('Apenas o Administrador pode retornar múltiplas etapas');
        if (!flow.includes(target) || target === 'completed' || target === prev) {
          throw new Error('Etapa de destino inválida para o fluxo deste item');
        }
      } else {
        target = previousStatusOf(item);
        if (!target) throw new Error('O item está na primeira etapa do fluxo — não há etapa anterior');
      }
      // Reabertura de processo concluído: limpa os dados de finalização.
      if (closedProcess) {
        extra.completed_at = null;
        extra.completed_by = null;
      }
      // Reabertura de OT encerrada: a OT volta ao estado aberto para o novo ciclo.
      if (otClosed) {
        extra.ot_status = 'open';
        extra.ot_closed_at = null;
        extra.ot_closed_by = null;
      }
      next = target;
    } else if (action === 'cancel') {
      if (!can('edit_gdm') && user.role !== 'admin') throw new Error('Sem permissão para cancelar');
      if (prev === 'completed') throw new Error('Item já finalizado');
      next = 'cancelled';
    } else {
      throw new Error(`Ação desconhecida: ${action}`);
    }

    const updated = await base44.entities.GDMItem.update(item.id, {
      status: next,
      ...extra,
    });

    await base44.entities.GDMItemHistory.create({
      item_id: item.id,
      gdm_id: item.gdm_id,
      vessel_id: item.vessel_id || null,
      supplier_id: extra.supplier_id || item.supplier_id || null,
      user_id: user.id,
      user_email: user.email,
      action,
      previous_status: prev,
      new_status: next,
      observation: observation || null,
      data: Object.keys(extra).length ? extra : null,
    });

    // Fluxo de Coordenação: quando o Coordenador conclui a análise, o próximo
    // setor responsável (Almoxarifado) é notificado; se o destino do item foi
    // alterado, os demais usuários do setor de Coordenação também são avisados.
    if (action === 'approve') {
      try {
        const users = await base44.asServiceRole.entities.User.list();
        const sectorsOf = (u: any) => (Array.isArray(u.sectors) ? u.sectors : (u.data?.sectors || []));
        const itemLabel = `${item.equipment_name || 'Item'}${item.serial_number ? ` (SN ${item.serial_number})` : ''} da GDM ${item.gdm_id}`;
        const createNotif = (u: any, title: string, message: string) =>
          base44.asServiceRole.entities.Notification.create({
            user_id: u.id,
            user_email: u.email,
            type: 'gdm_approved',
            title,
            message,
            link: '/GDMList',
            link_text: 'Ver GDMs',
            priority: 'high',
            related_entity_type: 'GDMItem',
            related_entity_id: item.id,
          });
        if (extra.destination) {
          const msg = `O destino do item ${itemLabel} foi alterado de ${extra.previous_destination || '—'} para ${extra.destination} pela Coordenação (${user.email}). Justificativa: ${observation || 'não informada'}.`;
          await Promise.all(
            users
              .filter((u: any) => sectorsOf(u).includes('coordinator') && u.email !== user.email)
              .map((u: any) => createNotif(u, 'Destino de item alterado pela Coordenação', msg)),
          );
        }
        const finalDestination = extra.destination || item.destination;
        const notifySector =
          item.receipt_situation === 'not_received' || finalDestination === 'stock_return'
            ? 'almoxarifado'
            : finalDestination === 'discard'
              ? 'maintenance'
              : finalDestination === 'repair'
                ? 'planejamento'
                : 'services';
        const msgNext = item.receipt_situation === 'not_received'
          ? `A Coordenação aprovou a tratativa do item ${itemLabel} (GDM aberta como Não Recebido). O item está em "Aguardando Recebimento" até a chegada física do equipamento.`
          : finalDestination === 'repair'
            ? `A Coordenação confirmou a tratativa do item ${itemLabel} e o equipamento já está no Almoxarifado. O item está em "Aguardando Emissão de PWT" — o Planejamento deve emitir o PWT.`
            : `A Coordenação confirmou a tratativa do item ${itemLabel}. Como a GDM foi criada como Recebido, o item seguiu direto para a próxima etapa do processo.`;
        await Promise.all(
          users
            .filter((u: any) => sectorsOf(u).includes(notifySector))
            .map((u: any) => createNotif(u, 'Item aprovado pela Coordenação', msgNext)),
        );
      } catch {
        // Falha na notificação não invalida a ação do item
      }
    }

    // RECEBIMENTO CONFIRMADO (GDM "Não Recebido"): itens de reparo seguem para
    // a emissão do PWT — o Planejamento é notificado da chegada do equipamento.
    if (action === 'confirm_receipt' && item.destination === 'repair') {
      try {
        const users = await base44.asServiceRole.entities.User.list();
        const sectorsOf = (u: any) => (Array.isArray(u.sectors) ? u.sectors : (u.data?.sectors || []));
        const itemLabel = `${item.equipment_name || 'Item'}${item.serial_number ? ` (SN ${item.serial_number})` : ''} da GDM`;
        await Promise.all(
          users
            .filter((u: any) => sectorsOf(u).includes('planejamento'))
            .map((u: any) =>
              base44.asServiceRole.entities.Notification.create({
                user_id: u.id,
                user_email: u.email,
                type: 'system_alert',
                title: 'Equipamento recebido — Aguardando Emissão de PWT',
                message: `A chegada do equipamento do item ${itemLabel} foi confirmada pelo Almoxarifado. O item está em "Aguardando Emissão de PWT" — o Planejamento deve emitir o PWT.`,
                link: '/GDMList',
                link_text: 'Ver GDMs',
                priority: 'high',
                related_entity_type: 'GDMItem',
                related_entity_id: item.id,
              }),
            ),
        );
      } catch {
        // Falha na notificação não invalida a ação do item
      }
    }

    // RETORNO DE ETAPA: notifica o setor responsável pela etapa de destino e
    // o usuário que executou a etapa devolvida (aviso registrado no histórico
    // da GDM logo abaixo, na sincronização).
    if (action === 'return_step') {
      try {
        const users = await base44.asServiceRole.entities.User.list();
        const sectorsOf = (u: any) => (Array.isArray(u.sectors) ? u.sectors : (u.data?.sectors || []));
        const labelOf = (s: string) => STATUS_LABELS[s] || s;
        const itemLabel = `${item.equipment_name || 'Item'}${item.serial_number ? ` (SN ${item.serial_number})` : ''} da GDM`;
        const title = 'Etapa devolvida (Retorno de Etapa)';
        const message =
          `A etapa do item ${itemLabel} foi devolvida de "${labelOf(prev)}" para ` +
          `"${labelOf(next)}" por ${displayNameOf(user)}. Justificativa: ${String(observation || '').trim()}.`;

        // Executor da etapa devolvida: última movimentação que levou o item
        // à etapa atual (retornos de etapa anteriores não contam).
        const hist = await base44.entities.GDMItemHistory.filter({ item_id: item.id }, '-created_date');
        const executor = (hist || []).find(
          (h: any) => h.new_status === prev && h.action !== 'return_step',
        );
        const targetSector = sectorOfStatus(next, item.destination);
        const recipients = users.filter(
          (u: any) =>
            u.email &&
            (sectorsOf(u).includes(targetSector) ||
              (executor?.user_email &&
                u.email.toLowerCase() === String(executor.user_email).toLowerCase())),
        );
        await Promise.all(
          recipients.map((u: any) =>
            base44.asServiceRole.entities.Notification.create({
              user_id: u.id,
              user_email: u.email,
              type: 'system_alert',
              title,
              message,
              link: '/GDMList',
              link_text: 'Ver GDMs',
              priority: 'high',
              related_entity_type: 'GDMItem',
              related_entity_id: item.id,
            }),
          ),
        );
      } catch {
        // Falha na notificação não invalida o retorno da etapa
      }
    }

    // Sincroniza o status da GDM com a situação consolidada dos itens
    try {
      const siblings = await base44.entities.GDMItem.filter({ gdm_id: item.gdm_id });
      const statuses = (siblings || []).map((i: any) => i.status);
      const gdms = await base44.asServiceRole.entities.GDM.filter({ id: item.gdm_id });
      const gdm = gdms && gdms[0];
      if (gdm && statuses.length > 0) {
        const waiting = statuses.includes('pending_coordinator');
        const closed = ['completed', 'cancelled', 'rejected', 'discard_approved'];
        const allClosed = statuses.every((s: string) => closed.includes(s));
        let target: string | null = null;
        if (allClosed) {
          if (statuses.includes('completed')) target = 'completed';
          else if (statuses.every((s: string) => s === 'rejected')) target = 'rejected';
        } else if (!waiting && ['pending_coordinator', 'completed'].includes(gdm.status)) {
          // pending_coordinator: Coordenador concluiu a análise dos itens.
          // completed: um item concluído foi reaberto (Retorno de Etapa do ADM).
          target = 'pending_services';
        }
        const returnEntry =
          action === 'return_step'
            ? {
                action: 'return_step',
                user: user.email,
                user_name: displayNameOf(user),
                role: user.role,
                timestamp: new Date().toISOString(),
                details: `Etapa do item ${item.item_number} devolvida de "${STATUS_LABELS[prev] || prev}" para "${STATUS_LABELS[next] || next}". Justificativa: ${String(observation || '').trim()}`,
                previous_status: prev,
                new_status: next,
                step_name: 'Retorno de Etapa',
                observation: String(observation || '').trim(),
              }
            : null;
        // Alteração de previsão de retorno: registrada no histórico da GDM
        // com prazo anterior, novo prazo, responsável, data e justificativa.
        const deadlineEntry =
          action === 'set_return_deadline'
            ? {
                action: 'set_return_deadline',
                user: user.email,
                user_name: displayNameOf(user),
                role: user.role,
                timestamp: new Date().toISOString(),
                details: `Alteração de Prazo de Retorno do item ${item.item_number} — OC ${item.oc_number}. Prazo anterior: ${item.expected_return_date || 'não informado'}. Novo prazo: ${extra.expected_return_date}. Motivo: ${String(observation || '').trim() || 'registro inicial da previsão de retorno'}`,
                previous_status: prev,
                new_status: next,
                step_name: 'Alteração de Prazo de Retorno',
                observation: String(observation || '').trim(),
              }
            : null;
        const specialEntry = returnEntry || deadlineEntry;
        const shouldUpdateStatus = !!target && target !== gdm.status && gdm.status !== 'rejected';
        if (shouldUpdateStatus || specialEntry) {
          await base44.asServiceRole.entities.GDM.update(gdm.id, {
            ...(shouldUpdateStatus ? { status: target } : {}),
            history: [
              ...(gdm.history || []),
              ...(specialEntry
                ? [specialEntry]
                : [
                    {
                      action: 'status_synced_from_items',
                      user: user.email,
                      user_name: displayNameOf(user),
                      role: user.role,
                      timestamp: new Date().toISOString(),
                      details: `Status da GDM atualizado automaticamente a partir dos itens (${target}).`,
                      previous_status: gdm.status,
                      new_status: target,
                      step_name: 'Sincronização dos itens',
                      observation: `Item ${item.item_number}: ${prev} → ${next}`,
                    },
                  ]),
            ],
          });
        }
      }
    } catch {
      // Falha na sincronização da GDM não deve invalidar a ação do item
    }

    return Response.json(updated);
  } catch (error) {
    const status = typeof error?.message === 'string' && error.message.includes('permissão') ? 403 : 400;
    return Response.json({ error: error?.message || 'Não foi possível concluir a ação' }, { status });
  }
}