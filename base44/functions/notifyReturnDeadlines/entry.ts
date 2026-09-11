import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ALERTAS DE PRAZO DE RETORNO — controlados individualmente por equipamento,
// a partir do prazo informado na cotação do fornecedor (quote_deadline).
// Executado diariamente pelo workflow "Alerta de Prazos de Retorno":
//   - prazo vencido ou próximo (<= 3 dias) gera notificação para o setor de Serviços;
//   - cada item é notificado uma única vez por ciclo (return_deadline_notified_at);
//   - o alerta desaparece quando o item é recebido ou o fluxo é finalizado
//     (status fora da lista de etapas monitoradas).

const MONITORED_STATUSES = [
  'awaiting_pwt',
  'awaiting_oc_issuance',
  'awaiting_oc_approval',
  'awaiting_return',
  'in_treatment',
];
const NEAR_DAYS = 3;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const nowIso = now.toISOString();

    const items = await base44.asServiceRole.entities.GDMItem.list('-created_date', 500);
    const gdms = await base44.asServiceRole.entities.GDM.list('-created_date', 500);
    const gdmById: Record<string, any> = {};
    (gdms || []).forEach((g: any) => { gdmById[g.id] = g; });

    // Pendências de prazo: vencidas ou próximas do vencimento, ainda não notificadas.
    const pending = (items || []).filter((i: any) => {
      if (!MONITORED_STATUSES.includes(i.status)) return false;
      if (!i.quote_deadline || i.return_deadline_notified_at) return false;
      const deadline = new Date(`${i.quote_deadline}T23:59:59`);
      const diffDays = (deadline.getTime() - now.getTime()) / 86400000;
      return diffDays < 0 || diffDays <= NEAR_DAYS;
    });

    if (pending.length === 0) {
      return Response.json({ notified: 0, message: 'Nenhum prazo de retorno exigindo alerta' });
    }

    // Destinatários: usuários do setor de Serviços.
    const users = await base44.asServiceRole.entities.User.list();
    const servicesUsers = (users || []).filter((u: any) => u.role === 'services');
    if (servicesUsers.length === 0) {
      return Response.json({ notified: 0, message: 'Nenhum usuário de Serviços para notificar' });
    }

    let notified = 0;
    for (const item of pending) {
      const deadline = new Date(`${item.quote_deadline}T23:59:59`);
      const overdue = deadline.getTime() < now.getTime();
      const gdm = gdmById[item.gdm_id];
      const gdmNumber = gdm?.gdm_number || '—';

      for (const u of servicesUsers) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: u.id,
          user_email: u.email,
          type: 'system_alert',
          title: overdue
            ? 'Prazo de retorno vencido'
            : 'Prazo de retorno próximo do vencimento',
          message: `Item ${String(item.item_number).padStart(2, '0')} (${item.equipment_name}) da GDM ${gdmNumber} — prazo do fornecedor ${item.supplier_name || '—'}: ${item.quote_deadline}.`,
          priority: overdue ? 'high' : 'medium',
          link: `/GDMDetail?id=${item.gdm_id}`,
          link_text: 'Ver item da GDM',
          related_entity_type: 'GDMItem',
          related_entity_id: item.id,
          metadata: { gdm_number: gdmNumber, quote_deadline: item.quote_deadline, overdue },
        });
        notified++;
      }

      // Marca o item como notificado neste ciclo (alerta único por ciclo).
      await base44.asServiceRole.entities.GDMItem.update(item.id, {
        return_deadline_notified_at: nowIso,
      });
    }

    return Response.json({ notified, items: pending.length });
  } catch (error) {
    return Response.json({ error: error?.message || 'Falha no alerta de prazos' }, { status: 500 });
  }
}