import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Consulta pública (somente leitura) de um item de GDM via QR Code — não exige login.
// Retorna apenas campos não sensíveis do item, da GDM e do histórico.

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const itemId =
      url.searchParams.get('item_id') ||
      url.searchParams.get('itemId');
    let resolvedId = itemId;

    if (!resolvedId && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      resolvedId = body.item_id || body.itemId || null;
    }

    // Endpoint público por design (QR Code de rastreabilidade externa): o
    // identificador do item é o único segredo. IDs são ObjectIds de 24 hex
    // gerados pela plataforma — exigir o formato integral elimina consultas
    // por prefixo ou ID parcial adivinhado (antes aceitava 10 caracteres).
    const ID_RE = /^[0-9a-f]{24}$/i;
    if (!resolvedId || typeof resolvedId !== 'string' || !ID_RE.test(resolvedId)) {
      return Response.json({ error: 'Identificador inválido' }, { status: 400 });
    }

    let item = null;
    try {
      const items = await base44.asServiceRole.entities.GDMItem.filter({ id: resolvedId });
      item = items && items[0];
    } catch {
      item = null;
    }
    if (!item) return Response.json({ error: 'Equipamento não encontrado' }, { status: 404 });

    let gdm = {};
    try {
      const gdms = await base44.asServiceRole.entities.GDM.filter({ id: item.gdm_id });
      gdm = (gdms && gdms[0]) || {};
    } catch {
      gdm = {};
    }

    let history = [];
    try {
      history = await base44.asServiceRole.entities.GDMItemHistory.filter(
        { item_id: item.id },
        'created_date',
      );
    } catch {
      history = [];
    }

    // Certificações do equipamento (destino Calibração/Certificação): a
    // consulta pública só expõe certificados vinculados ao PRÓPRIO item
    // consultado — nunca o histórico completo do número de série em outras
    // GDMs ou embarcações.
    let certifications: any[] = [];
    if (item.destination === 'certification') {
      try {
        certifications = await base44.asServiceRole.entities.Certification.filter(
          { item_id: item.id },
          '-created_date',
        );
      } catch {
        certifications = [];
      }
    }

    // Evidências fotográficas: fotos do item e, quando há SN, o histórico
    // do equipamento restrito à mesma embarcação (desembarque, reparos,
    // certificações, inspeções).
    let itemPhotos: any[] = [];
    let snPhotos: any[] = [];
    try {
      itemPhotos = await base44.asServiceRole.entities.GDMPhoto.filter(
        { gdm_item_id: item.id },
        'taken_at',
      );
    } catch {
      itemPhotos = [];
    }
    // Histórico fotográfico por SN limitado à mesma embarcação do item
    // consultado — fotos do mesmo SN em outras embarcações (escopo RLS) não
    // são expostas publicamente.
    if (item.serial_number && item.vessel_id) {
      try {
        snPhotos = await base44.asServiceRole.entities.GDMPhoto.filter(
          { serial_number: item.serial_number, vessel_id: item.vessel_id },
          '-taken_at',
        );
      } catch {
        snPhotos = [];
      }
    }
    const mapPhoto = (p: any) => ({
      id: p.id,
      gdm_id: p.gdm_id,
      gdm_item_id: p.gdm_item_id,
      equipment_name: p.equipment_name,
      url: p.url,
      caption: p.caption || null,
      category: p.category,
      taken_at: p.taken_at,
      });

    return Response.json({
      photos: (itemPhotos || []).map(mapPhoto),
      photo_history: (snPhotos || []).map(mapPhoto),
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
        // Documentos do processo consultáveis pelo QR Code (URLs públicas)
        quote_document_url: item.quote_document_url || null,
        quote_attached_at: item.quote_attached_at || null,
        quote_attached_by: item.quote_attached_by || null,
        quote_proposal_number: item.quote_proposal_number || null,
        quotes_history: Array.isArray(item.quotes_history)
          ? item.quotes_history.map((q: any) => ({
              quote_document_url: q.quote_document_url || null,
              quote_proposal_number: q.quote_proposal_number || null,
              outcome: q.outcome || null,
              registered_at: q.registered_at || null,
              registered_by: q.registered_by || null,
            }))
          : [],
        shipping_proof_url: item.shipping_proof_url || null,
        shipping_photo_url: item.shipping_photo_url || null,
        shipping_proof_at: item.shipping_proof_at || null,
        shipping_proof_by: item.shipping_proof_by || null,
        return_receipt_nf_url: item.return_receipt_nf_url || null,
        return_laudo_url: item.return_laudo_url || null,
        return_nf_url: item.return_nf_url || null,
        return_proof_url: item.return_proof_url || null,
        return_received_at: item.return_received_at || null,
        return_received_by: item.return_received_by || null,
        return_registered_at: item.return_registered_at || null,
        return_registered_by: item.return_registered_by || null,
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
      },
      history: (history || []).map((h) => ({
        id: h.id,
        action: h.action,
        previous_status: h.previous_status,
        new_status: h.new_status,
        observation: h.observation,
        created_date: h.created_date,
      })),
      certifications: (certifications || []).map((c) => ({
        id: c.id,
        certificate_number: c.certificate_number,
        certificate_date: c.certificate_date,
        certifying_company: c.certifying_company,
        expires_at: c.expires_at,
        document_url: c.document_url || null,
        image_url: c.image_url || null,
        registered_at: c.registered_at,
      })),
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Erro na consulta' }, { status: 500 });
  }
}