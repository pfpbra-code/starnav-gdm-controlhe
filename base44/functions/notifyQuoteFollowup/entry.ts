import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Follow-up de cotações (workflow diário): itens enviados ao fornecedor
// (com comprovante de envio anexado) que ainda não têm cotação após
// 3 dias corridos geram notificação SOMENTE para o setor de Serviços.
// Idempotente por ciclo: o item guarda a data do último follow-up enviado.

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    const items = await base44.asServiceRole.entities.GDMItem.filter({
      status: 'sent_to_supplier',
    });

    const now = Date.now();
    let notified = 0;
    const details: any[] = [];

    for (const item of items) {
      if (!item.shipping_proof_url || item.quote_document_url) continue;
      if (item.quote_followup_notified_at) continue;

      const reference = item.quote_due_at || item.sent_to_supplier_at;
      if (!reference || now - new Date(reference).getTime() < THREE_DAYS_MS) continue;

      // Notifica apenas usuários ativos do setor de Serviços.
      const servicesUsers =
        (await base44.asServiceRole.entities.User.filter({ role: 'services' })) || [];
      const activeUsers = servicesUsers.filter((u: any) => !u.status || u.status === 'active');

      for (const u of activeUsers) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: u.id,
          user_email: u.email,
          type: 'quote_followup',
          title: `Follow-up de cotação — ${item.equipment_name}`,
          message: `O fornecedor ${item.supplier_name || 'vinculado'} ainda não enviou a cotação do equipamento. Favor realizar follow-up.`,
          link: `/GDMDetail?id=${item.gdm_id}`,
          link_text: 'Ver GDM',
          priority: 'high',
          related_entity_type: 'GDMItem',
          related_entity_id: item.id,
          metadata: {
            item_id: item.id,
            gdm_id: item.gdm_id,
            supplier_name: item.supplier_name || null,
          },
        });
      }

      await base44.asServiceRole.entities.GDMItem.update(item.id, {
        quote_followup_notified_at: new Date().toISOString(),
      });

      notified += 1;
      details.push({ id: item.id, equipment: item.equipment_name, supplier: item.supplier_name });
    }

    return Response.json({ checked: items.length, notified, details });
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Falha ao verificar cotações pendentes' },
      { status: 500 },
    );
  }
}