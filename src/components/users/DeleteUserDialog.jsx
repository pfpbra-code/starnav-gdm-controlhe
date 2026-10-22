import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { SECTORS } from '@/lib/permissions';
import { displayNameOf } from '@/lib/displayName';

const ROLE_LABELS = { admin: 'Administrador', user: 'Usuário' };
const SECTOR_LABELS = Object.fromEntries(SECTORS.map((s) => [s.key, s.label]));

/**
 * Confirmação de exclusão definitiva de conta: revoga o acesso mantendo todo o
 * histórico operacional e de auditoria intacto.
 */
export default function DeleteUserDialog({ user, open, onOpenChange, onConfirm, pending }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  if (!user) return null;

  const sectors = Array.isArray(user.sectors) ? user.sectors : user.data?.sectors || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="h-5 w-5" />
            Excluir definitivamente a conta
          </DialogTitle>
          <DialogDescription>
            Esta operação revoga permanentemente o acesso à plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Usuário</span>
              <span className="font-medium text-right">{displayNameOf(user) || 'Sem nome'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">E-mail</span>
              <span className="font-medium text-right">{user.email}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Perfil atual</span>
              <span className="font-medium text-right">{ROLE_LABELS[user.role] || user.role}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Setores</span>
              <span className="font-medium text-right">
                {sectors.length > 0
                  ? sectors.map((key) => SECTOR_LABELS[key] || key).join(', ')
                  : '—'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              O acesso será revogado permanentemente. O histórico de atividades, os
              registros de auditoria, as aprovações e as assinaturas desta conta
              serão preservados.
            </p>
          </div>

          <p className="text-sm text-slate-600">
            Tem certeza de que deseja excluir definitivamente esta conta? O usuário
            perderá o acesso à plataforma. As ações realizadas anteriormente, os
            registros de auditoria, as aprovações e o histórico operacional serão
            preservados. Para voltar a acessar, será necessário realizar um novo
            cadastro e obter nova aprovação do administrador.
          </p>

          <div className="space-y-2">
            <Label>Motivo da exclusão *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da exclusão definitiva desta conta..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || pending}
            onClick={() => onConfirm(reason.trim())}
          >
            {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar exclusão definitiva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}