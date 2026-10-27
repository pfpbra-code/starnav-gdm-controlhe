import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Undo2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  ITEM_DESTINATION_LABELS,
  ITEM_STATUS_LABELS,
  getItemStatusLabel,
  itemFlow,
  previousStatusFor,
} from '@/lib/gdmItems';
import { useSigner, createSignatureRecord } from '@/lib/signatures';
import SignatureConfirmStep from '@/components/signature/SignatureConfirmStep';

/**
 * Retorno de Etapa (correção de fluxo): devolve o item à etapa imediatamente
 * anterior com justificativa obrigatória. Administradores podem escolher uma
 * etapa anterior mais distante (múltiplas etapas) e reabrir processos
 * concluídos / OTs encerradas. Toda devolução é assinada e auditada.
 */
export default function ReturnStepDialog({ pending, onClose }) {
  const queryClient = useQueryClient();
  const [justification, setJustification] = useState('');
  const [target, setTarget] = useState('');
  const { signatureUrl } = useSigner();
  const [signatureChecked, setSignatureChecked] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const item = pending?.item;
  const isAdmin = user?.role === 'admin';
  const immediatePrev = item ? previousStatusFor(item) : null;

  // Etapas anteriores válidas: etapas concluídas do fluxo + a imediatamente
  // anterior (quando é um desvio/ramificação fora da linha do tempo).
  const candidates = (() => {
    if (!item) return [];
    const done = itemFlow(item)
      .filter((s) => s.state === 'done' && s.status !== 'completed')
      .map((s) => ({ value: s.status, label: s.label }));
    if (immediatePrev && !done.some((c) => c.value === immediatePrev)) {
      done.push({ value: immediatePrev, label: ITEM_STATUS_LABELS[immediatePrev] || immediatePrev });
    }
    return done;
  })();

  useEffect(() => {
    setJustification('');
    setTarget(immediatePrev || '');
    setSignatureChecked(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const returnMutation = useMutation({
    mutationFn: async () => {
      await createSignatureRecord({
        action: 'return_step',
        actionLabel: 'Retorno de Etapa (Correção de Fluxo)',
        item,
        justification: justification.trim(),
      });
      return base44.functions
        .invoke('gdmItemAction', {
          item_id: item.id,
          action: 'return_step',
          observation: justification.trim(),
          // target_status: apenas quando o ADM escolhe etapa além da imediatamente anterior.
          target_status: isAdmin && target && target !== immediatePrev ? target : undefined,
        })
        .then((res) => res.data);
    },
    onSuccess: () => {
      toast.success('Etapa devolvida com sucesso');
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
      queryClient.invalidateQueries({ queryKey: ['gdmItemHistory', item.id] });
      queryClient.invalidateQueries({ queryKey: ['gdm', item.gdm_id] });
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
      onClose();
    },
    onError: (error) => toast.error(error?.message || 'Não foi possível devolver a etapa'),
  });

  const closedProcess = item && ['completed', 'discard_approved'].includes(item.status);
  const otClosed = item?.ot_status === 'closed';

  const disabled =
    returnMutation.isPending ||
    !signatureChecked ||
    !justification.trim() ||
    !target;

  const targetLabel =
    (candidates.find((c) => c.value === target) || {}).label || ITEM_STATUS_LABELS[target] || target;

  return (
    <Dialog open={!!pending} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" />
            Retornar Etapa
          </DialogTitle>
          <DialogDescription>
            Você está devolvendo somente o item{' '}
            {item ? String(item.item_number).padStart(2, '0') : ''} — {item?.equipment_name}{' '}
            (destino {ITEM_DESTINATION_LABELS[item?.destination] || '—'}). A devolução será
            registrada com assinatura, data, hora e justificativa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-slate-50 p-3 text-sm space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Etapa atual:</span>
              <span className="font-medium text-right">{item ? getItemStatusLabel(item) : '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Etapa de destino:</span>
              <span className="font-medium text-right text-amber-700">{targetLabel || '—'}</span>
            </div>
            {(closedProcess || otClosed) && (
              <p className="flex items-start gap-1.5 pt-1 text-amber-800">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {closedProcess
                  ? 'Processo concluído: a reabertura limpa os dados de finalização do item.'
                  : 'OT encerrada: a OT será reaberta junto com a devolução da etapa.'}
              </p>
            )}
          </div>

          {isAdmin && candidates.length > 1 && (
            <div className="space-y-2">
              <Label>Etapa de destino *</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a etapa de destino" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.value === immediatePrev ? `${c.label} (imediatamente anterior)` : c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Como Administrador, você pode retornar múltiplas etapas. Usuários autorizados
                devolvem apenas para a etapa imediatamente anterior.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Justificativa do retorno *</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
              placeholder="Ex.: Fornecedor incorreto selecionado na etapa anterior."
            />
            <p className="text-xs text-slate-500">
              Nenhum retorno ocorre sem justificativa. Ela será registrada permanentemente no
              histórico do item e da GDM, e o setor responsável será notificado.
            </p>
          </div>
        </div>

        <SignatureConfirmStep
          signatureUrl={signatureUrl}
          checked={signatureChecked}
          onChange={setSignatureChecked}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={disabled}
            onClick={() => returnMutation.mutate()}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {returnMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Devolver Etapa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}