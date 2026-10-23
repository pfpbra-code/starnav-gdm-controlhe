import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ALERTAS DO CONTROLE DE OT (Ordem de Trabalho) — executado diariamente pelo
// workflow "Alertas de Controle de OT". Marcos, cada um notificado uma única
// vez por OT (guardados em ot_alerts_sent):
//   pending_close — equipamento recebido pelo Almoxarifado com a OT ainda aberta
//   age15 / age30 / age60 — OT aberta há mais de 15 / 30 / 60 dias
//   almox_pending — equipamento aguardando ação do Almoxarifado (saída para
//                   entrega registrada e recebimento final pendente)
// Destinatários: setores de Serviços e Almoxarifado, além de administradores.

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // Tarefa administrativa: somente administradores do app podem invocar.
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    if (caller.role !== 'admin') {
      return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }
    const now = new Date();

    const items = await base44.asServiceRole.entities.GDMItem.list('-updated_date', 500);
    const gdms = await base44.asServiceRole.entities.GDM.list('-created_date', 500);
    const gdmById: Record<string, any> = {};
    (gdms || []).forEach((g: any) => { gdmById[g.id] = g; });

    // Destinatários: Serviços, Almoxarifado e administradores.
    const users = await base44.asServiceRole.entities.User.list();
    const recipients: any[] = (users || []).filter((u: any) => {
      if (u.role === 'admin') return true;
      const sectors = Array.isArray(u.sectors) ? u.sectors : u.data?.sectors || [];
      return sectors.includes('services') || sectors.includes('almoxarifado');
    });
    if (recipients.length === 0) {
      return Response.json({ notified: 0, message: 'Nenhum destinatário para notificar' });
    }

    let notified = 0;
    let flagged = 0;

    for (const item of items || []) {
      if (!item.ot_number) continue;
      if (item.ot_status === 'closed') continue;
      if (['cancelled', 'rejected', 'discard_approved'].includes(item.status)) continue;

      const gdmNumber = gdmById[item.gdm_id]?.gdm_number || '—';
      const where = `OT ${item.ot_number} — item ${String(item.item_number).padStart(2, '0')} (${item.equipment_name || 'Item'}) da GDM ${gdmNumber} — fornecedor ${item.supplier_name || '—'}.`;

      const pending: { key: string; title: string; message: string; priority: string }[] = [];

      // Equipamento recebido pelo Almoxarifado com a OT ainda aberta.
      if (item.return_received_at && item.ot_status === 'awaiting_close') {
        pending.push({
          key: 'pending_close',
          title: 'Equipamento recebido com OT aberta',
          message: `${where} O equipamento foi recebido pelo Almoxarifado, mas a OT permanece aberta. Realize o fechamento da OT.`,
          priority: 'high',
        });
      }

      // Tempo de abertura da OT (a partir da emissão por Serviços).
      if (item.ot_issued_at) {
        const daysOpen = Math.floor(
          (now.getTime() - new Date(item.ot_issued_at).getTime()) / 86400000,
        );
        if (daysOpen > 60) {
          pending.push({
            key: 'age60',
            title: 'OT aberta há mais de 60 dias',
            message: `${where} OT aberta há ${daysOpen} dias.`,
            priority: 'critical',
          });
        } else if (daysOpen > 30) {
          pending.push({
            key: 'age30',
            title: 'OT aberta há mais de 30 dias',
            message: `${where} OT aberta há ${daysOpen} dias.`,
            priority: 'high',
          });
        } else if (daysOpen > 15) {
          pending.push({
            key: 'age15',
            title: 'OT aberta há mais de 15 dias',
            message: `${where} OT aberta há ${daysOpen} dias.`,
            priority: 'medium',
          });
        }
      }

      // Equipamento aguardando ação do Almoxarifado (recebimento final).
      if (item.status === 'awaiting_return' && item.return_dispatched_at) {
        pending.push({
          key: 'almox_pending',
          title: 'Equipamento aguardando ação do Almoxarifado',
          message: `${where} O material saiu do fornecedor para entrega e aguarda o recebimento do Almoxarifado (NF + laudo).`,
          priority: 'medium',
        });
      }

      const alerted = Array.isArray(item.ot_alerts_sent) ? item.ot_alerts_sent : [];
      const toSend = pending.filter((m) => !alerted.includes(m.key));
      if (toSend.length === 0) continue;
      flagged++;

      for (const m of toSend) {
        await Promise.all(
          recipients.map((u) =>
            base44.asServiceRole.entities.Notification.create({
              user_id: u.id,
              user_email: u.email,
              type: 'system_alert',
              title: m.title,
              message: m.message,
              priority: m.priority,
              link: `/GDMDetail?id=${item.gdm_id}`,
              link_text: 'Ver item da GDM',
              related_entity_type: 'GDMItem',
              related_entity_id: item.id,
              metadata: { gdm_number: gdmNumber, ot_number: item.ot_number, milestone: m.key },
            }),
          ),
        );
        notified += recipients.length;
      }

      await base44.asServiceRole.entities.GDMItem.update(item.id, {
        ot_alerts_sent: [...alerted, ...toSend.map((m) => m.key)],
      });
    }

    if (flagged === 0) {
      return Response.json({ notified: 0, message: 'Nenhuma OT exigindo alerta' });
    }
    return Response.json({ notified, items: flagged });
  } catch (error) {
    return Response.json({ error: error?.message || 'Falha no alerta de OTs' }, { status: 500 });
  }
}