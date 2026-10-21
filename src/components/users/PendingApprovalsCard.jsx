import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Clock, UserCheck, XCircle, Loader2 } from 'lucide-react';
import { SECTORS } from '@/lib/permissions';

const ROLE_LABELS = { admin: 'Administrador', user: 'Usuário' };
const SECTOR_LABELS = Object.fromEntries(SECTORS.map((s) => [s.key, s.label]));

/**
 * Área administrativa: cadastros aguardando aprovação. Nada além da aprovação
 * libera o acesso de um novo usuário.
 */
export default function PendingApprovalsCard({ users, onApprove, onReject, pending }) {
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  if (!users || users.length === 0) return null;

  const sectorsOf = (u) => (Array.isArray(u.sectors) ? u.sectors : u.data?.sectors || []);

  const confirmReject = async () => {
    if (!reason.trim()) return;
    await onReject(rejecting, reason.trim());
    setRejecting(null);
    setReason('');
  };

  return (
    <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-amber-100">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Cadastros pendentes de aprovação</h2>
            <p className="text-sm text-slate-500">
              {users.length} {users.length === 1 ? 'solicitação aguardando' : 'solicitações aguardando'} decisão do administrador
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-white rounded-lg border border-amber-100"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{u.full_name || 'Sem nome'}</p>
                  <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                    {ROLE_LABELS[u.role] || u.role}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">{u.email}</p>
                <p className="text-xs text-slate-400">
                  Cadastrado em {new Date(u.created_date).toLocaleString('pt-BR')}
                </p>
                {sectorsOf(u).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {sectorsOf(u).map((key) => (
                      <Badge key={key} variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px]">
                        {SECTOR_LABELS[key] || key}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={pending}
                  onClick={() => onApprove(u)}
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4 mr-1" />}
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  disabled={pending}
                  onClick={() => setRejecting(u)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Recusar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!rejecting} onOpenChange={(o) => { if (!o) { setRejecting(null); setReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar cadastro</DialogTitle>
            <DialogDescription>
              O acesso de {rejecting?.full_name || rejecting?.email} ({rejecting?.email}) será bloqueado.
              A justificativa ficará registrada na auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Justificativa da recusa *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da recusa do cadastro..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejecting(null); setReason(''); }}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={!reason.trim() || pending} onClick={confirmReject}>
              {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}