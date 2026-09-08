import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Consulta pública (somente leitura) de um item de GDM via QR Code — não exige login.
// Retorna apenas campos não sensíveis do item, da GDM e do histórico.

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const itemId =
      url.searchParams.get('item_id') ||
      url.searchParams.get('itemId') ||
      (() => {
        try {
          const body = req.method === 'POST' ? null : null;
          return body;
        } catch {
          return null;
        }
      })();
    let resolvedId = itemId;

    if (!resolvedId && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      resolvedId = body.item_id || body.itemId || null;
    }

    if (!resolvedId || typeof resolvedId !== 'string' || resolvedId.length < 10) {
      return Response.json({ error: 'Identificador inválido' }, { status: 400 });
    }

    const items = await base44.asServiceRole.entities.GDMItem.filter({ id: resolvedId });
    const item = items && items[0];
    if (!item) return Response.json({ error: 'Equipamento não encontrado' }, { status: 404 });

    const gdms = await base44.asServiceRole.entities.GDM.filter({ id: item.gdm_id });
    const gdm = (gdms && gdms[0]) || {};

    const history = await base44.asServiceRole.entities.GDMItemHistory.filter(
      { item_id: item.id },
      'created_date',
    );

    return Response.json({
      item: {
        id: item.id,
        gdm_id: item.gdm_id,
        item_number: item.item_number,
        equipment_name: item.equipment_name,
        equipment_code: item.equipment_code,
        serial_number: item.serial_number,
        quantity: item.quantity,
        os_number: item.os_number,
        destination: item.destination,
        status: item.status,
        supplier_name: item.supplier_name,
        notes: item.notes,
        stock_received_at: item.stock_received_at,
        stock_return_number: item.stock_return_number,
        stock_return_at: item.stock_return_at,
        discard_authorized_at: item.discard_authorized_at,
        discard_confirmed_at: item.discard_confirmed_at,
        created_date: item.created_date,
        updated_date: item.updated_date,
        completed_at: item.completed_at,
      },
      gdm: {
        gdm_number: gdm.gdm_number,
        vessel_name: gdm.vessel_name,
        disembark_date: gdm.disembark_date,
        sent_to_supplier_date: gdm.sent_to_supplier_date,
        expected_return_date: gdm.expected_return_date,
        return_date: gdm.return_date,
        description: gdm.description,
        photos: Array.isArray(gdm.photos) ? gdm.photos : [],
        pwt_number: gdm.pwt_number,
        oc_number: gdm.oc_number,
        ot_number: gdm.ot_number,
        quote_document_url: gdm.quote_document_url,
        technical_report_url: gdm.technical_report_url,
        commercial_proposal_url: gdm.commercial_proposal_url,
        return_nf_url: gdm.return_nf_url,
      },
      history: (history || []).map((h) => ({
        id: h.id,
        action: h.action,
        previous_status: h.previous_status,
        new_status: h.new_status,
        observation: h.observation,
        created_date: h.created_date,
      })),
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Erro na consulta' }, { status: 500 });
  }
}