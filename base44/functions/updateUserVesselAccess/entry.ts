import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { isAccountAllowed } from '../../shared/itemPermissions.ts';

// Atribuição de acesso por embarcação (assigned_vessels do usuário).
// Esse campo é protegido por regra no nível do campo (somente editores do
// workspace) e não pode ser alterado pelo próprio usuário — apenas por
// administradores do app, sempre através desta função.

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    if (caller.role !== 'admin') {
      return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }
    if (!isAccountAllowed(caller)) {
      return Response.json({ error: 'Conta sem acesso liberado à plataforma' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = body?.user_id;
    if (!userId || typeof userId !== 'string') {
      return Response.json({ error: 'user_id obrigatório' }, { status: 400 });
    }

    const update: Record<string, any> = {};
    if ('assigned_vessels' in body) {
      if (
        !Array.isArray(body.assigned_vessels) ||
        body.assigned_vessels.some((v: any) => typeof v !== 'string')
      ) {
        return Response.json({ error: 'assigned_vessels inválido' }, { status: 400 });
      }
      update.assigned_vessels = body.assigned_vessels;
    }
    if (Object.keys(update).length === 0) {
      return Response.json({ error: 'Nada a atualizar' }, { status: 400 });
    }

    await base44.asServiceRole.entities.User.update(userId, update);
    return Response.json({ ok: true, user_id: userId });
  } catch (error) {
    return Response.json({ error: error?.message || 'Falha ao atualizar acesso' }, { status: 500 });
  }
}