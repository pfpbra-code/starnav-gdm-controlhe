import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { userAccountStatus } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Clock, XCircle, Ban, Trash2, LogOut } from 'lucide-react';

const STATUS_CONTENT = {
  pending_approval: {
    icon: Clock,
    tone: 'bg-amber-100 text-amber-600',
    title: 'Cadastro em análise',
    message:
      'Seu cadastro foi recebido e está aguardando a aprovação do administrador. ' +
      'Assim que o acesso for liberado, você poderá entrar na plataforma.',
  },
  rejected: {
    icon: XCircle,
    tone: 'bg-red-100 text-red-600',
    title: 'Cadastro recusado',
    message:
      'Seu cadastro foi recusado pelo administrador. Para tentar novamente, entre em contato com a administração.',
  },
  disabled: {
    icon: Ban,
    tone: 'bg-slate-100 text-slate-600',
    title: 'Acesso bloqueado',
    message:
      'O acesso desta conta foi bloqueado pelo administrador. Entre em contato com a administração para regularizar o acesso.',
  },
  deleted: {
    icon: Trash2,
    tone: 'bg-slate-100 text-slate-500',
    title: 'Conta excluída',
    message:
      'Esta conta foi excluída definitivamente da plataforma. Para voltar a acessar, será necessário realizar um novo cadastro e obter nova aprovação do administrador.',
  },
};

/**
 * Barreira de acesso: contas pendentes, recusadas, bloqueadas ou excluídas
 * não acessam nenhum módulo da plataforma (nem por URL direta) — apenas esta
 * tela de consulta do estado da solicitação.
 */
export default function AccountStatusGate({ user }) {
  const { logout } = useAuth();
  const status = user ? userAccountStatus(user) : 'approved';
  const content = STATUS_CONTENT[status] || STATUS_CONTENT.disabled;
  const Icon = content.icon;
  const rejectionReason =
    user?.rejection_reason !== undefined
      ? user.rejection_reason
      : user?.data?.rejection_reason;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100 text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full ${content.tone}`}>
          <Icon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">{content.title}</h1>
        <p className="text-slate-600 mb-6">{content.message}</p>
        {status === 'rejected' && rejectionReason && (
          <div className="p-4 bg-slate-50 rounded-md text-sm text-slate-600 mb-6">
            <p className="font-medium mb-1">Justificativa do administrador:</p>
            <p>{rejectionReason}</p>
          </div>
        )}
        <p className="text-xs text-slate-400 mb-6">
          Conta: {user?.email}
        </p>
        <Button variant="outline" onClick={() => logout(true)} className="w-full">
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
}