import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ALERTAS DE PRAZO DE RETORNO — controle automático por equipamento, a partir
// da data prevista de retorno registrada por Serviços APÓS a emissão da Ordem
// de Compra (expected_return_date) — nunca antes da formalização com o
// fornecedor (a contagem inicia na emissão da OC + previsão de retorno).
// Executado diariamente pelo workflow "Alerta de Prazos de Retorno".
// Marcos notificados, cada um uma única vez por ciclo (return_deadline_alerts):
//   15d     — faltam até 15 dias para o vencimento
//   7d      — faltam até 7 dias para o vencimento
//   vencido — prazo vencido
//   atraso15 — atraso acima de 15 dias
//   atraso30 — atraso acima de 30 dias
// Destinatários: setor de Serviços e administradores.

const MONITORED_STATUSES = [
  'sent_to_supplier',
  'awaiting_maintenance_authorization',
  'discount_negotiation',
  'repair_approved',
  'in_treatment',
  'awaiting_pwt',
  'awaiting_oc_issuance',
  'awaiting_oc_approval',
  'awaiting_return',
  'awaiting_supplier_return',
];

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

    // Destinatários: usuários do setor de Serviços e administradores.
    const users = await base44.asServiceRole.entities.User.list();
    const recipients: any[] = (users || []).filter((u: any) => {
      if (u.role === 'admin') return true;
      const sectors = Array.isArray(u.sectors) ? u.sectors : u.data?.sectors || [];
      return sectors.includes('services');
    });
    if (recipients.length === 0) {
      return Response.json({ notified: 0, message: 'Nenhum destinatário para notificar' });
    }

    let notified = 0;
    let flagged = 0;

    for (const item of items || []) {
      if (!MONITORED_STATUSES.includes(item.status)) continue;
      const due = item.expected_return_date;
      if (!due) continue;
      const diffDays = (new Date(`${due}T23:59:59`).getTime() - now.getTime()) / 86400000;

      const gdm = gdmById[item.gdm_id];
      const gdmNumber = gdm?.gdm_number || '—';
      const where = `Item ${String(item.item_number).padStart(2, '0')} (${item.equipment_name}) da GDM ${gdmNumber} — fornecedor ${item.supplier_name || '—'}.`;

      let milestone: { key: string; title: string; message: string; priority: string } | null = null;
      if (diffDays < 0) {
        const overdueDays = Math.floor(-diffDays) + 1;
        if (overdueDays > 30) {
          milestone = {
            key: 'atraso30',
            title: 'Atraso de retorno acima de 30 dias',
            message: `${where} Prazo previsto (${due}) vencido há ${overdueDays} dias. Cobrança urgente do retorno.`,
            priority: 'critical',
          };
        } else if (overdueDays > 15) {
          milestone = {
            key: 'atraso15',
            title: 'Atraso de retorno acima de 15 dias',
            message: `${where} Prazo previsto (${due}) vencido há ${overdueDays} dias.`,
            priority: 'high',
          };
        } else {
          milestone = {
            key: 'vencido',
            title: 'Prazo de retorno vencido',
            message: `${where} Prazo previsto (${due}) vencido.`,
            priority: 'high',
          };
        }
      } else if (diffDays <= 7) {
        milestone = {
          key: '7d',
          title: 'Prazo de retorno vence em até 7 dias',
          message: `${where} Vencimento previsto: ${due}.`,
          priority: 'medium',
        };
      } else if (diffDays <= 15) {
        milestone = {
          key: '15d',
          title: 'Prazo de retorno vence em até 15 dias',
          message: `${where} Vencimento previsto: ${due}.`,
          priority: 'medium',
        };
      }
      if (!milestone) continue;

      const alerted = Array.isArray(item.return_deadline_alerts) ? item.return_deadline_alerts : [];
      if (alerted.includes(milestone.key)) continue;
      flagged++;

      await Promise.all(
        recipients.map((u) =>
          base44.asServiceRole.entities.Notification.create({
            user_id: u.id,
            user_email: u.email,
            type: 'system_alert',
            title: milestone!.title,
            message: milestone!.message,
            priority: milestone!.priority,
            link: `/GDMDetail?id=${item.gdm_id}`,
            link_text: 'Ver item da GDM',
            related_entity_type: 'GDMItem',
            related_entity_id: item.id,
            metadata: { gdm_number: gdmNumber, due, milestone: milestone!.key },
          }),
        ),
      );
      notified += recipients.length;

      await base44.asServiceRole.entities.GDMItem.update(item.id, {
        return_deadline_alerts: [...alerted, milestone.key],
      });
    }

    if (flagged === 0) {
      return Response.json({ notified: 0, message: 'Nenhum prazo de retorno exigindo alerta' });
    }
    return Response.json({ notified, items: flagged });
  } catch (error) {
    return Response.json({ error: error?.message || 'Falha no alerta de prazos' }, { status: 500 });
  }
}