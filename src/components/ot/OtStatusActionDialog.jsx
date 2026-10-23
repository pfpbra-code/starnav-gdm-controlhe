import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { OT_STATUS_LABELS } from '@/lib/gdmItems';
import { useSigner, createSignatureRecord } from '@/lib/signatures';
import SignatureConfirmStep from '@/components/signature/SignatureConfirmStep';

/**
 * Confirmação de alteração rápida da situação da OT direto na listagem do
 * Controle de OT. Usa a mesma função gdmItemAction de todos os módulos, com
 * assinatura eletrônica e registro no histórico do item.
 * `pending`: { item, ot_status, label }
 */
export default function OtStatusActionDialog({ pending, onClose }) {
  const queryClient = useQueryClient();
  const [observation, setObservation] = useState('');
  const { signatureUrl } = useSigner();
  const [signatureChecked, setSignatureChecked] = useState(false);

  const item = pending?.item;
  const targetStatus = pending?.ot_status;

  useEffect(() => {
    setObservation('');
    setSignatureChecked(false);
  }, [pending]);

  const actionMutation = useMutation({
    mutationFn: async () => {
      await createSignatureRecord({
        action: 'set_ot_status',
        actionLabel: pending?.label,
        item,
        justification: observation,
      });
      return base44.functions
        .invoke('gdmItemAction', {
          item_id: item.id,
          action: 'set_ot_status',
          ot_status: targetStatus,
          observation: observation.trim() || undefined,
        })
        .then((res) => res.data);
    },
    onSuccess: () => {
      toast.success('Situação da OT atualizada');
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
      queryClient.invalidateQueries({ queryKey: ['gdmItemHistory', item.id] });
      onClose();
    },
    onError: (error) => toast.error(error?.message || 'Não foi possível concluir a ação'),
  });

  return (
    <Dialog open={!!pending} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pending?.label}</DialogTitle>
          <DialogDescription>
            OT <span className="font-semibold">{item?.ot_number}</span> —{' '}
            {item?.equipment_name}
            {item?.serial_number ? ` (SN ${item.serial_number})` : ''}. A situação da OT
            passará de{' '}
            <span className="font-medium">
              {OT_STATUS_LABELS[item?.ot_status] || '—'}
            </span>{' '}
            para{' '}
            <span className="font-medium">
              {OT_STATUS_LABELS[targetStatus] || targetStatus}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            rows={3}
            placeholder="Observação (opcional)"
          />
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
            disabled={actionMutation.isPending || !signatureChecked}
            onClick={() => actionMutation.mutate()}
          >
            {actionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}