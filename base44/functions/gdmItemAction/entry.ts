import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hasPermission } from '../../shared/itemPermissions.ts';

// Ações protegidas sobre itens de GDM (espelha a função gdm_item_action do projeto original):
// verificação de permissão, bloqueio de saltos de etapa e registro automático no histórico.
// As operações de entidade rodam como o usuário logado (RLS aplicado).

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

    if (!itemId || !action) {
      return Response.json({ error: 'item_id e action são obrigatórios' }, { status: 400 });
    }

    const items = await base44.entities.GDMItem.filter({ id: itemId });
    const item = items && items[0];
    if (!item) return Response.json({ error: 'Item não encontrado' }, { status: 404 });

    const can = (p: string) => hasPermission(user, p);
    const prev = item.status;
    let next: string | null = null;
    const now = new Date().toISOString();
    const extra: Record<string, any> = {};

    if (action === 'approve') {
      if (!can('approve_gdm')) throw new Error('Sem permissão para aprovar');
      if (prev !== 'pending_coordinator') throw new Error('Item não está aguardando aprovação');
      next = 'pending_almoxarifado';
      if (destination && destination !== item.destination) {
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
      if (['pending_coordinator', 'rejected', 'cancelled', 'completed'].includes(prev)) {
        throw new Error('Item não pode ser finalizado nesta etapa');
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
    });

    return Response.json(updated);
  } catch (error) {
    const status = typeof error?.message === 'string' && error.message.includes('permissão') ? 403 : 400;
    return Response.json({ error: error?.message || 'Não foi possível concluir a ação' }, { status });
  }
}