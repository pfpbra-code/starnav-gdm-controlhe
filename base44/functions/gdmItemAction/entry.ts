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
// Fluxo individual por item: Reparo, Estoque e Descarte são Manutenção;
// Calibração é Operações. A etapa de confirmação de desembarque (ETAPA 4) é
// executada pela própria embarcação, validada por vínculo com o item.

const VALID_DESTINATIONS = ['repair', 'certification', 'stock_return', 'discard'];

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

    // ETAPA 4 (embarcação): validada por vínculo com a embarcação emissora,
    // não por permissão de setor.
    if (isVesselStage && !canActOnVesselItems(user, item)) {
      throw new Error('Somente a embarcação emissora pode confirmar o desembarque deste item');
    }

    // Separação de setores: só usuários autorizados no setor do item podem agir sobre ele.
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
      // ETAPA 3 — Almoxarifado confirma recebimento.
      if (!can('confirm_receipt')) throw new Error('Sem permissão para confirmar recebimento');
      if (prev !== 'pending_almoxarifado') throw new Error('Item não está aguardando o almoxarifado');
      next =
        item.destination === 'discard'
          ? 'pending_maintenance_authorization'
          : item.destination === 'stock_return'
            ? 'received'
            : 'pending_services';
      extra.stock_received_at = now;
      extra.stock_received_by = user.id;
    } else if (action === 'report_not_received') {
      // ETAPA 3 — Almoxarifado informa que NÃO recebeu o item: devolve para a embarcação.
      if (!can('report_not_received')) throw new Error('Sem permissão para informar não recebimento');
      if (prev !== 'pending_almoxarifado') throw new Error('Item não está aguardando o almoxarifado');
      next = 'pending_disembark_confirmation';
      extra.not_received_at = now;
      extra.not_received_by = user.email;
    } else if (action === 'confirm_disembark') {
      // ETAPA 4 — Embarcação confirma o desembarque: retorna ao Almoxarifado.
      if (prev !== 'pending_disembark_confirmation') {
        throw new Error('Item não está aguardando confirmação de desembarque');
      }
      next = 'pending_almoxarifado';
      extra.disembark_confirmed_at = now;
      extra.disembark_confirmed_by = user.email;
    } else if (action === 'reschedule_disembark') {
      // ETAPA 4 — Embarcação informa que NÃO desembarcou: nova data + justificativa.
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
      if (!can('confirm_receipt')) throw new Error('Sem permissão para confirmar descarte');
      if (
        item.destination !== 'discard' ||
        !item.discard_authorized ||
        item.discard_confirmed ||
        prev !== 'awaiting_discard_confirmation'
      ) {
        throw new Error('Item não está aguardando confirmação de descarte');
      }
      next = 'completed';
      extra.discard_confirmed = true;
      extra.discard_confirmed_by = user.id;
      extra.discard_confirmed_at = now;
      extra.discard_notes = observation;
      extra.completed_at = now;
      extra.completed_by = user.email;
    } else if (action === 'complete') {
      if (!can('confirm_return')) throw new Error('Sem permissão para finalizar o item');
      if (['discard', 'stock_return'].includes(item.destination)) {
        throw new Error('Este item segue o fluxo próprio de descarte/estoque');
      }
      if (!['in_treatment', 'awaiting_return'].includes(prev)) {
        throw new Error('Item só pode ser finalizado em tratativa ou aguardando retorno');
      }
      next = 'completed';
      extra.completed_at = now;
      extra.completed_by = user.email;
    } else if (action === 'cancel') {
      if (!can('edit_gdm') && user.role !== 'admin') throw new Error('Sem permissão para cancelar');
      if (prev === 'completed') throw new Error('Item já finalizado');
      next = 'cancelled';
    } else if (action === 'advance_treatment') {
      if (!can('edit_gdm')) throw new Error('Sem permissão');
      if (!['pending_services', 'sent_to_supplier', 'in_treatment'].includes(prev)) {
        throw new Error('Etapa inválida');
      }
      if (prev === 'pending_services') {
        const supplierId = body.supplier_id || null;
        if (!supplierId) throw new Error('Selecione o fornecedor antes de enviar o item');
        extra.supplier_id = supplierId;
        extra.supplier_name = body.supplier_name || null;
      }
      next =
        prev === 'pending_services'
          ? 'sent_to_supplier'
          : prev === 'sent_to_supplier'
            ? 'in_treatment'
            : 'awaiting_return';
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
      supplier_id: item.supplier_id || null,
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
        const closed = ['completed', 'cancelled', 'rejected'];
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