import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  isAccountAllowed,
  accountStatusOf,
  userCustomField,
} from '../../shared/itemPermissions.ts';

// Gestão administrativa de contas de usuário — exclusiva do administrador:
//   approve  — aprova cadastro pendente (libera o acesso)
//   reject   — recusa cadastro (justificativa obrigatória)
//   disable  — bloqueia o acesso de uma conta aprovada
//   enable   — reativa o acesso de uma conta bloqueada
//   update   — altera perfil/status (com salvaguarda do último administrador)
//   delete   — exclusão definitiva: revoga o acesso preservando TODO o
//              histórico (GDMs, aprovações, assinaturas, auditoria), sem
//              atribuir as ações anteriores a outro usuário
// Toda ação é registrada no log de auditoria. Os campos role/status/
// account_status são protegidos por regra de campo no User — esta função é a
// única via de alteração a partir do app.

const VALID_ROLES = ['admin', 'user'];
const VALID_STATUSES = ['active', 'inactive', 'suspended'];

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    if (caller.role !== 'admin') {
      return Response.json({ error: 'Ação restrita a administradores' }, { status: 403 });
    }
    if (!isAccountAllowed(caller)) {
      return Response.json({ error: 'Conta administrativa sem acesso liberado' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userId: string = body?.user_id || body?.userId;
    const action: string = body?.action;
    const reason: string = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!userId || !action) {
      return Response.json({ error: 'user_id e action são obrigatórios' }, { status: 400 });
    }

    let target: any = null;
    try {
      target = await base44.asServiceRole.entities.User.get(userId);
    } catch {
      target = null;
    }
    if (!target) return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });

    const now = new Date().toISOString();
    const targetName = target.full_name || target.email;
    const prevAccountStatus = accountStatusOf(target);
    const prevStatus = userCustomField(target, 'status') || null;

    /** Log de auditoria protegido — nunca invalida a operação. */
    const audit = async (act: string, details: Record<string, any>) => {
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          action: act,
          entity_type: 'User',
          entity_id: userId,
          user_email: caller.email,
          user_role: 'admin',
          details: JSON.stringify({
            target_user_id: userId,
            target_name: targetName,
            target_email: target.email,
            admin: caller.email,
            previous_account_status: prevAccountStatus,
            new_account_status: act === 'user_deleted' ? 'deleted' : undefined,
            ...details,
          }),
          timestamp: now,
        });
      } catch {
        // auditoria best-effort
      }
    };

    const notifyUser = async (title: string, message: string, priority = 'medium') => {
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: target.id,
          user_email: target.email,
          type: 'system_alert',
          title,
          message,
          link: '/',
          link_text: 'Acessar a plataforma',
          priority,
        });
      } catch {
        // notificação best-effort
      }
    };

    /** Quantos outros administradores ativos e liberados restam. */
    const countOtherActiveAdmins = async (): Promise<number> => {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      return (admins || []).filter((a: any) => {
        if (a.id === userId) return false;
        const status = userCustomField(a, 'status');
        if (status === 'deleted' || status === 'inactive') return false;
        const account = a.account_status !== undefined
          ? a.account_status
          : (a.data?.account_status ?? 'approved');
        return !['pending_approval', 'rejected', 'disabled', 'deleted'].includes(account);
      }).length;
    };

    if (action === 'approve') {
      await base44.asServiceRole.entities.User.update(userId, {
        account_status: 'approved',
        status: 'active',
        approved_by: caller.email,
        approved_at: now,
      });
      await audit('user_approved', { new_account_status: 'approved', reason: reason || null });
      await notifyUser(
        'Cadastro aprovado',
        'Seu cadastro foi aprovado pelo administrador. Você já pode acessar a plataforma.'
      );
      return Response.json({ ok: true, action, user_id: userId });
    }

    if (action === 'reject') {
      if (!reason) {
        return Response.json({ error: 'Informe a justificativa da recusa' }, { status: 400 });
      }
      await base44.asServiceRole.entities.User.update(userId, {
        account_status: 'rejected',
        status: 'inactive',
        rejected_by: caller.email,
        rejected_at: now,
        rejection_reason: reason,
      });
      await audit('user_rejected', { new_account_status: 'rejected', reason });
      return Response.json({ ok: true, action, user_id: userId });
    }

    if (action === 'disable') {
      await base44.asServiceRole.entities.User.update(userId, {
        account_status: 'disabled',
        status: 'suspended',
      });
      await audit('user_disabled', { new_account_status: 'disabled', reason: reason || null });
      return Response.json({ ok: true, action, user_id: userId });
    }

    if (action === 'enable') {
      await base44.asServiceRole.entities.User.update(userId, {
        account_status: 'approved',
        status: 'active',
      });
      await audit('user_enabled', { new_account_status: 'approved', reason: reason || null });
      return Response.json({ ok: true, action, user_id: userId });
    }

    if (action === 'update') {
      const role = body?.role;
      const status = body?.status;
      const patch: Record<string, any> = {};
      if (role !== undefined && role !== null) {
        if (!VALID_ROLES.includes(role)) {
          return Response.json({ error: 'Perfil inválido' }, { status: 400 });
        }
        patch.role = role;
      }
      if (status !== undefined && status !== null) {
        if (!VALID_STATUSES.includes(status)) {
          return Response.json({ error: 'Status inválido' }, { status: 400 });
        }
        patch.status = status;
      }
      if (Object.keys(patch).length === 0) {
        return Response.json({ error: 'Nada a atualizar' }, { status: 400 });
      }
      const demotesAdmin =
        target.role === 'admin' &&
        ((patch.role && patch.role !== 'admin') || (patch.status && patch.status !== 'active'));
      if (demotesAdmin && (await countOtherActiveAdmins()) === 0) {
        return Response.json(
          { error: 'Operação bloqueada: este é o último administrador ativo da plataforma' },
          { status: 409 },
        );
      }
      await base44.asServiceRole.entities.User.update(userId, patch);
      await audit('user_profile_updated', {
        previous_role: target.role,
        new_role: patch.role !== undefined ? patch.role : target.role,
        previous_status: prevStatus,
        new_status: patch.status !== undefined ? patch.status : prevStatus,
      });
      return Response.json({ ok: true, action, user_id: userId });
    }

    if (action === 'delete') {
      if (userId === caller.id) {
        return Response.json({ error: 'Não é possível excluir a própria conta' }, { status: 400 });
      }
      if (target.role === 'admin' && (await countOtherActiveAdmins()) === 0) {
        return Response.json(
          { error: 'Exclusão bloqueada: este é o último administrador ativo da plataforma' },
          { status: 409 },
        );
      }

      // Responsabilidades pendentes: apenas alerta administrativo — nenhum
      // processo é finalizado, cancelado ou transferido automaticamente.
      const pendingAlerts: Array<{ type: string; label: string }> = [];
      try {
        const vessels = await base44.asServiceRole.entities.Vessel.filter({
          coordinator_id: userId,
        });
        (vessels || []).slice(0, 5).forEach((v: any) => {
          pendingAlerts.push({
            type: 'vessel',
            label: `Embarcação ${v.name}: coordenador responsável`,
          });
        });
        const page = await base44.asServiceRole.entities.GDMItem.filter(
          {
            status: { $nin: ['completed', 'cancelled', 'rejected'] },
            $or: [
              { supplier_selected_by: target.email },
              { sent_by: target.email },
              { quote_attached_by: target.email },
              { return_dispatched_by: target.email },
            ],
          },
          { limit: 5, fields: ['id', 'item_number', 'equipment_name', 'status'] },
        );
        (page?.items || []).forEach((it: any) => {
          pendingAlerts.push({
            type: 'gdm_item',
            label: `Item ${it.item_number} (${it.equipment_name}) em andamento no fluxo`,
          });
        });
      } catch {
        // falha na checagem não invalida a exclusão
      }

      // Exclusão definitiva: a conta perde o acesso; TODO o histórico
      // permanece intacto, com a autoria original preservada.
      await base44.asServiceRole.entities.User.update(userId, {
        account_status: 'deleted',
        status: 'deleted',
        deleted_by: caller.email,
        deleted_at: now,
        deletion_reason: reason || null,
      });

      await audit('user_deleted', {
        new_account_status: 'deleted',
        reason: reason || null,
        history_preserved: true,
        pending_responsibilities: pendingAlerts.map((p) => p.label),
      });

      if (pendingAlerts.length > 0) {
        try {
          const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
          const alertTargets = (admins || []).filter((a: any) => {
            if (a.id === userId) return false;
            const account = a.account_status !== undefined
              ? a.account_status
              : (a.data?.account_status ?? 'approved');
            return !['deleted', 'rejected', 'disabled', 'pending_approval'].includes(account);
          });
          await Promise.allSettled(
            alertTargets.map((a: any) =>
              base44.asServiceRole.entities.Notification.create({
                user_id: a.id,
                user_email: a.email,
                type: 'system_alert',
                title: 'Conta excluída com responsabilidades pendentes',
                message:
                  `A conta de ${targetName} (${target.email}) foi excluída definitivamente e ainda possuía processos pendentes: ` +
                  `${pendingAlerts.map((p) => p.label).join('; ')}. Redistribua as responsabilidades.`,
                link: '/Users',
                link_text: 'Gerenciar usuários',
                priority: 'high',
              }),
            ),
          );
        } catch {
          // alerta best-effort
        }
      }

      return Response.json({ ok: true, action, user_id: userId, pending_alerts: pendingAlerts });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error?.message || 'Falha na operação' }, { status: 500 });
  }
}