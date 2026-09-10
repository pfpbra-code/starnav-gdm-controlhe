import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Exclusão completa de GDM — restrita ao ADM. Remove do sistema a GDM, todos
// os seus itens e todo o histórico de ações vinculado a eles.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Somente o ADM pode excluir GDMs do sistema' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const gdmId = body.gdm_id || body.gdmId;
    if (!gdmId) return Response.json({ error: 'gdm_id é obrigatório' }, { status: 400 });

    let gdm = null;
    try {
      const gdms = await base44.asServiceRole.entities.GDM.filter({ id: gdmId });
      gdm = gdms && gdms[0];
    } catch {
      gdm = null;
    }
    if (!gdm) return Response.json({ error: 'GDM não encontrada' }, { status: 404 });

    await base44.asServiceRole.entities.GDMItem.deleteMany({ gdm_id: gdmId });
    await base44.asServiceRole.entities.GDMItemHistory.deleteMany({ gdm_id: gdmId });
    await base44.asServiceRole.entities.GDM.delete(gdmId);

    return Response.json({ success: true, gdm_number: gdm.gdm_number });
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Não foi possível excluir a GDM' },
      { status: 500 },
    );
  }
}