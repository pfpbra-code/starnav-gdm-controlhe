import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { accountStatusOf } from '../../shared/itemPermissions.ts';

// Acionado pelo workflow quando um novo usuário é criado: notifica todos os
// administradores sobre o cadastro pendente de aprovação e registra o
// recebimento no log de auditoria. Chamado pelo workflow (criador admin) —
// exige sessão administrativa.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    if (caller.role !== 'admin') {
      return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userId: string = body?.user_id || body?.userId;
    if (!userId) return Response.json({ error: 'user_id obrigatório' }, { status: 400 });

    let target: any = null;
    try {
      target = await base44.asServiceRole.entities.User.get(userId);
    } catch {
      target = null;
    }
    if (!target || accountStatusOf(target) !== 'pending_approval') {
      return Response.json({ ok: true, skipped: true });
    }

    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const alertTargets = (admins || []).filter((a: any) => a.id !== target.id);
    const message =
      `Novo cadastro aguardando aprovação: ${target.full_name || target.email} (${target.email}). ` +
      'Acesse Usuários > Cadastros pendentes para aprovar ou recusar.';
    await Promise.allSettled(
      alertTargets.map((a: any) =>
        base44.asServiceRole.entities.Notification.create({
          user_id: a.id,
          user_email: a.email,
          type: 'system_alert',
          title: 'Novo cadastro pendente de aprovação',
          message,
          link: '/Users',
          link_text: 'Revisar cadastros pendentes',
          priority: 'high',
          related_entity_type: 'User',
          related_entity_id: target.id,
        }),
      ),
    );

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'user_signup_pending',
        entity_type: 'User',
        entity_id: target.id,
        user_email: target.email,
        user_role: target.role,
        details: JSON.stringify({ account_status: 'pending_approval', requested_role: target.role }),
        timestamp: new Date().toISOString(),
      });
    } catch {
      // auditoria best-effort
    }

    return Response.json({ ok: true, notified: alertTargets.length });
  } catch (error) {
    return Response.json({ error: error?.message || 'Falha ao notificar administradores' }, { status: 500 });
  }
}