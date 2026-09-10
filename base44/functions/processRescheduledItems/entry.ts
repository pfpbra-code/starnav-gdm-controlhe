import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Tarefa agendada (workflow diário): após a nova data prevista de desembarque,
// devolve ao Almoxarifado os itens reprogramados pela embarcação (ETAPA 4).
// Operação idempotente: só atua sobre itens em disembark_rescheduled cuja
// data prevista já foi atingida. Todo retorno é registrado no histórico.

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    const items = await base44.asServiceRole.entities.GDMItem.filter({
      status: 'disembark_rescheduled',
    });

    const today = new Date().toISOString().slice(0, 10);
    let moved = 0;
    const movedItems: any[] = [];

    for (const item of items) {
      const expected = item.expected_disembark_date
        ? String(item.expected_disembark_date).slice(0, 10)
        : null;
      if (!expected || expected > today) continue;

      await base44.asServiceRole.entities.GDMItem.update(item.id, {
        status: 'pending_almoxarifado',
      });

      await base44.asServiceRole.entities.GDMItemHistory.create({
        item_id: item.id,
        gdm_id: item.gdm_id,
        vessel_id: item.vessel_id || null,
        supplier_id: item.supplier_id || null,
        user_email: 'sistema@starnav.com.br',
        action: 'return_to_almoxarifado',
        previous_status: 'disembark_rescheduled',
        new_status: 'pending_almoxarifado',
        observation: `Nova data prevista de desembarque (${expected}) atingida — item devolvido ao Almoxarifado para nova confirmação de recebimento.`,
      });

      moved += 1;
      movedItems.push({ id: item.id, item_number: item.item_number });
    }

    return Response.json({ moved, items: movedItems, checked: items.length });
  } catch (error) {
    return Response.json({ error: error?.message || 'Falha ao processar itens reprogramados' }, { status: 500 });
  }
}