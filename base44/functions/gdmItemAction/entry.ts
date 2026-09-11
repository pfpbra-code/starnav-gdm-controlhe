import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  hasPermission,
  SECTOR_BY_DESTINATION,
  sectorViewPermission,
  VESSEL_STAGE_ACTIONS,
  canActOnVesselItems,
} from '../../shared/itemPermissions.ts';

// Ações protegidas sobre itens de GDM: verificação de permissão, bloqueio de
// saltos de etapa e registro automático no histórico (data, hora e usuário).
// Fluxo do ciclo de fornecedor (reparo/calibração), executado sempre por item:
//   Almoxarifado recebe → Serviços define fornecedor → Almoxarifado anexa
//   comprovante de envio → Serviços anexa cotação → Manutenção decide
//   (aprovar / desconto / reprovar com troca de fornecedor ou descarte).
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
    const isVesselStage = VESSEL_STAGE_ACTIONS.includes(action);

    // ETAPA 4 (embarcação): validada por vínculo com a embarcação emissora.
    if (isVesselStage && !canActOnVesselItems(user, item)) {
      throw new Error('Somente a embarcação emissora pode confirmar o desembarque deste item');
    }

    // Separação de setores: só usuários autorizados no setor do item podem agir.
    const itemSector = SECTOR_BY_DESTINATION[item.destination] || 'maintenance';
    if (!isVesselStage && !can(sectorViewPermission(itemSector))) {
      throw new Error('Sem permissão para atuar em itens deste setor');
    }

    const prev = item.status;
    let next: string | null = null;
    const now = new Date().toISOString();
    const extra: Record<string, any> = {};

    if (action === 'approve') {
      // ETAPA 2 — Coordenador confirma a tratativa do item.
      if (!can('approve_gdm')) throw new Error('Sem permissão para confirmar a tratativa');
      if (prev !== 'pending_coordinator') throw new Error('Item não está aguardando o coordenador');
      next = 'pending_almoxarifado';
      if (destination && destination !== item.destination) {
        if (!VALID_DESTINATIONS.includes(destination)) {
          throw new Error('Destino inválido para o item');
        }
        if (!can('change_gdm_destination') && user.role !== 'admin') {
          throw new Error('Sem permissão para alterar o destino do item');
        }
        extra.destination = destination;
      }
    } else if (action === 'reject') {
      if (!can('reject_gdm')) throw new Error('Sem permissão para reprovar');
      if (prev !== 'pending_coordinator') throw new Error('Item não está aguardando aprovação');
      next = 'rejected';
    } else if (action === 'confirm_receipt') {
      // ETAPA 3 — Almoxarifado confirma recebimento. Reparo/calibração seguem
      // para Serviços aguardando a definição do fornecedor.
      if (!can('confirm_receipt')) throw new Error('Sem permissão para confirmar recebimento');
      if (prev !== 'pending_almoxarifado') throw new Error('Item não está aguardando o almoxarifado');
      next =
        item.destination === 'discard'
          ? 'pending_maintenance_authorization'
          : item.destination === 'stock_return'
            ? 'received'
            : 'awaiting_supplier_definition';
      extra.stock_received_at = now;
      extra.stock_received_by = user.id;
    } else if (action === 'report_not_received') {
      if (!can('report_not_received')) throw new Error('Sem permissão para informar não recebimento');
      if (prev !== 'pending_almoxarifado') throw new Error('Item não está aguardando o almoxarifado');
      next = 'pending_disembark_confirmation';
      extra.not_received_at = now;
      extra.not_received_by = user.email;
    } else if (action === 'confirm_disembark') {
      if (prev !== 'pending_disembark_confirmation') {
        throw new Error('Item não está aguardando confirmação de desembarque');
      }
      next = 'pending_almoxarifado';
      extra.disembark_confirmed_at = now;
      extra.disembark_confirmed_by = user.email;
    } else if (action === 'reschedule_disembark') {
      if (prev !== 'pending_disembark_confirmation') {
        throw new Error('Item não está aguardando confirmação de desembarque');
      }
      if (!expectedDisembarkDate) throw new Error('Informe a nova data prevista de desembarque');
      if (!observation || !String(observation).trim()) {
        throw new Error('Informe a justificativa da reprogramação');
      }
      next = 'disembark_rescheduled';
      extra.expected_disembark_date = expectedDisembarkDate;
      extra.reschedule_justification = observation;
    } else if (action === 'confirm_stock_return') {
      if (!can('confirm_receipt')) throw new Error('Sem permissão para confirmar devolução');
      if (item.destination !== 'stock_return') throw new Error('Item não é de retorno ao estoque');
      if (item.stock_return_confirmed) throw new Error('Devolução já confirmada');
      if (!['received', 'pending_almoxarifado'].includes(prev)) {
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
      if (
        item.destination !== 'discard' ||
        !item.discard_authorized ||
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
      next = 'awaiting_shipping_proof';

      await mirrorGdm(base44, item.gdm_id, {
        supplier_id: supplierId,
        supplier_name: supplierName,
        maintenance_decision: null,
      });
    } else if (action === 'attach_shipping_proof') {
      // Almoxarifado anexa a NF assinada e a foto do envio (ambas obrigatórias).
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('confirm_receipt')) throw new Error('Sem permissão para anexar comprovante de envio');
      if (prev !== 'awaiting_shipping_proof') throw new Error('Item não está aguardando comprovante de envio');
      if (!body.nf_url) throw new Error('Anexe a NF assinada');
      if (!body.photo_url) throw new Error('Anexe a foto do envio');

      extra.shipping_proof_url = body.nf_url;
      extra.shipping_photo_url = body.photo_url;
      extra.shipping_proof_at = now;
      extra.shipping_proof_by = user.email;
      extra.sent_to_supplier_at = now;
      extra.sent_by = user.email;
      extra.quote_due_at = new Date(Date.now() + THREE_DAYS_MS).toISOString();
      extra.quote_followup_notified_at = null;
      next = 'sent_to_supplier';

      await mirrorGdm(base44, item.gdm_id, {
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name,
        sent_to_supplier_date: now.slice(0, 10),
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
        expected_return_date: body.quote_deadline,
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
        // Após a aprovação: reparo aguarda o PWT (Planejamento); calibração
        // (Operações) não exige PWT e vai direto para a emissão da OC.
        next =
          item.destination === 'certification'
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
      next = 'awaiting_oc_issuance';

      await mirrorGdm(base44, item.gdm_id, {
        pwt_number: pwtNumber,
        pwt_issued_by: user.email,
        pwt_issued_at: now,
      });
    } else if (action === 'issue_oc') {
      // Serviços emite a Ordem de Compra e registra o número da OC.
      if (!SUPPLIER_DESTINATIONS.includes(item.destination)) {
        throw new Error('Este item não segue o fluxo de fornecedor');
      }
      if (!can('issue_oc')) throw new Error('Sem permissão para emitir OC');
      if (prev !== 'awaiting_oc_issuance') {
        throw new Error('Item não está aguardando emissão da OC');
      }
      const ocNumber = String(body.oc_number || body.ocNumber || '').trim();
      if (!ocNumber) throw new Error('Informe o número da OC');

      extra.oc_number = ocNumber;
      extra.oc_issued_at = now;
      extra.oc_issued_by = user.email;
      next = 'awaiting_oc_approval';

      await mirrorGdm(base44, item.gdm_id, {
        oc_number: ocNumber,
        oc_issued_by: user.email,
        oc_issued_at: now,
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
      next = 'awaiting_return';
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
      extra.completed_at = now;
      extra.completed_by = user.email;
      next = 'completed';
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
        } else if (!waiting && gdm.status === 'pending_coordinator') {
          target = 'pending_services';
        }
        if (target && target !== gdm.status && gdm.status !== 'rejected') {
          await base44.asServiceRole.entities.GDM.update(gdm.id, {
            status: target,
            history: [
              ...(gdm.history || []),
              {
                action: 'status_synced_from_items',
                user: user.email,
                user_name: user.full_name || user.email,
                role: user.role,
                timestamp: new Date().toISOString(),
                details: `Status da GDM atualizado automaticamente a partir dos itens (${target}).`,
                previous_status: gdm.status,
                new_status: target,
                step_name: 'Sincronização dos itens',
                observation: `Item ${item.item_number}: ${prev} → ${next}`,
              },
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