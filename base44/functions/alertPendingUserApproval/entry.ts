import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { accountStatusOf } from '../../shared/itemPermissions.ts';

// Acionado pelo workflow de signup quando um novo usuário é criado: notifica
// todos os administradores sobre o cadastro pendente de aprovação e registra o
// recebimento no log de auditoria.
// Autorização estrita: o gatilho real é o cadastro, então a sessão disponível
// é a do próprio usuário recém-cadastrado — a função só aceita o chamador
// quando o user_id consultado é ELE MESMO (fluxo de signup) ou quando é um
// administrador autenticado. Nenhum usuário consulta dados de terceiros.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const userId: string = body?.user_id || body?.userId;
    if (!userId) return Response.json({ error: 'user_id obrigatório' }, { status: 400 });

    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    const isSelfSignup = caller.id === userId;
    if (caller.role !== 'admin' && !isSelfSignup) {
      return Response.json({ error: 'Sem permissão para notificar sobre este usuário' }, { status: 403 });
    }

    let target: any = null;
    try {
      target = await base44.asServiceRole.entities.User.get(userId);
    } catch {
      target = null;
    }
    if (!target || accountStatusOf(target) !== 'pending_approval') {
      return Response.json({ ok: true, skipped: true });
    }

    // Idempotência: um mesmo cadastro pendente gera apenas uma rodada de
    // alertas — chamadas repetidas (ex.: reenvio direto do endpoint) não
    // inundam os administradores.
    let alreadyNotified: any[] = [];
    try {
      alreadyNotified = await base44.asServiceRole.entities.Notification.filter({
        type: 'system_alert',
        related_entity_id: target.id,
      });
    } catch {
      alreadyNotified = [];
    }
    if (alreadyNotified && alreadyNotified.length > 0) {
      return Response.json({ ok: true, skipped: true, reason: 'already_notified' });
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