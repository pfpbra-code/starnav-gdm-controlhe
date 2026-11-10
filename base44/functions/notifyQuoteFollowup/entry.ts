import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ALERTAS DE COTAÇÃO PENDENTE (workflow diário) — itens enviados ao fornecedor
// que ainda não tiveram a cotação anexada. A contagem começa na data de envio
// ao fornecedor (sent_to_supplier_at) e os marcos são:
//   3d — atenção      (notificação de acompanhamento)
//   5d — cobrar fornecedor (prioridade alta)
//   7d — proposta em atraso (prioridade crítica)
// Destinatários: setor de Serviços e administradores.
// Idempotência e auditoria: cada marco enviado é registrado no histórico do
// item (action 'quote_alert', data.level) e nunca é reenviado no mesmo ciclo.

const DAY_MS = 24 * 60 * 60 * 1000;

const LEVELS = [
  {
    key: '3d',
    days: 3,
    label: '3 dias sem cotação',
    priority: 'medium',
    message: 'A cotação está há 3 dias sem retorno do fornecedor. Realize o follow-up.',
  },
  {
    key: '5d',
    days: 5,
    label: '5 dias sem cotação',
    priority: 'high',
    message: 'A cotação está há 5 dias sem retorno do fornecedor. Cobrar o fornecedor.',
  },
  {
    key: '7d',
    days: 7,
    label: '7 dias sem cotação',
    priority: 'critical',
    message: 'Proposta em atraso: 7 dias ou mais sem retorno do fornecedor. Cobrança urgente.',
  },
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

    const items = (await base44.asServiceRole.entities.GDMItem.filter({
      status: 'sent_to_supplier',
    })) || [];

    const users = (await base44.asServiceRole.entities.User.list()) || [];
    const sectorsOf = (u: any) => (Array.isArray(u.sectors) ? u.sectors : u.data?.sectors || []);
    const recipients = users.filter(
      (u: any) =>
        u.email &&
        (u.role === 'admin' || sectorsOf(u).includes('services')) &&
        (!u.status || u.status === 'active'),
    );

    // Marcos já notificados (histórico do item) — idempotência por ciclo.
    const alerts = (await base44.asServiceRole.entities.GDMItemHistory.filter({
      action: 'quote_alert',
    })) || [];
    const alreadySent = new Set(
      alerts.map((h: any) => `${h.item_id}:${h.data?.level || ''}`),
    );

    const now = Date.now();
    let notified = 0;
    const details: any[] = [];

    for (const item of items) {
      if (item.quote_document_url || !item.sent_to_supplier_at) continue;

      const days = Math.floor(
        (now - new Date(item.sent_to_supplier_at).getTime()) / DAY_MS,
      );
      if (!Number.isFinite(days) || days < LEVELS[0].days) continue;

      const reached = LEVELS.filter((l) => days >= l.days);
      const missing = reached.filter((l) => !alreadySent.has(`${item.id}:${l.key}`));
      if (missing.length === 0) continue;

      const highest = missing[missing.length - 1];

      for (const u of recipients) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: u.id,
          user_email: u.email,
          type: 'quote_followup',
          title: `Cotação pendente (${highest.label}) — ${item.equipment_name || 'equipamento'}`,
          message: `Fornecedor ${item.supplier_name || 'vinculado'}: ${highest.message} Item ${item.item_number} · ${days} dias aguardando cotação.`,
          link: '/ServicesBoard',
          link_text: 'Abrir follow-up de cotações',
          priority: highest.priority,
          related_entity_type: 'GDMItem',
          related_entity_id: item.id,
          metadata: {
            item_id: item.id,
            gdm_id: item.gdm_id,
            supplier_name: item.supplier_name || null,
            level: highest.key,
            days,
          },
        });
      }

      // Registra todos os marcos alcançados e ainda não enviados: serve de
      // auditoria do alerta e impede reenvio no mesmo ciclo do fornecedor.
      for (const level of missing) {
        await base44.asServiceRole.entities.GDMItemHistory.create({
          item_id: item.id,
          gdm_id: item.gdm_id,
          vessel_id: item.vessel_id || null,
          supplier_id: item.supplier_id || null,
          user_email: 'sistema',
          action: 'quote_alert',
          previous_status: item.status,
          new_status: item.status,
          observation: `Alerta automático de cotação pendente (${level.days} dias sem retorno do fornecedor).`,
          data: { level: level.key, days, supplier_name: item.supplier_name || null },
        });
      }

      await base44.asServiceRole.entities.GDMItem.update(item.id, {
        quote_followup_notified_at: new Date().toISOString(),
      });

      notified += 1;
      details.push({
        id: item.id,
        equipment: item.equipment_name,
        supplier: item.supplier_name,
        days,
        level: highest.key,
      });
    }

    return Response.json({ checked: items.length, notified, details });
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Falha ao verificar cotações pendentes' },
      { status: 500 },
    );
  }
}