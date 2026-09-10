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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ITEM_DESTINATION_LABELS, ITEM_DESTINATION_OPTIONS } from '@/lib/gdmItems';

/**
 * Modal rápido de ação sobre um item — executa a mesma função gdmItemAction
 * usada pela GDM completa, garantindo fluxo e histórico únicos.
 * `pending`: { item, action, label, askDate?, askReturnNumber?, destructive? }
 */
export default function ItemActionDialog({ pending, onClose }) {
  const queryClient = useQueryClient();
  const [observation, setObservation] = useState('');
  const [returnNumber, setReturnNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [destination, setDestination] = useState('');

  const item = pending?.item;
  const action = pending?.action;

  useEffect(() => {
    setObservation('');
    setReturnNumber('');
    setSupplierId('');
    setExpectedDate('');
    setDestination(item?.destination || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const isApproval = action === 'approve';
  const destinationChanged = isApproval && destination && destination !== item?.destination;
  const needsSupplier = action === 'advance_treatment' && item?.status === 'pending_services';
  const needsDate = !!pending?.askDate;
  const needsReturnNumber = !!pending?.askReturnNumber;
  const reasonRequired =
    action === 'reject' || action === 'reschedule_disembark' || destinationChanged;

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.filter({ status: 'active' }),
    enabled: needsSupplier,
  });

  const actionMutation = useMutation({
    mutationFn: () =>
      base44.functions
        .invoke('gdmItemAction', {
          item_id: item.id,
          action,
          observation: observation.trim() || undefined,
          return_number: needsReturnNumber ? returnNumber.trim() || undefined : undefined,
          destination: isApproval ? destination || item.destination : undefined,
          supplier_id: needsSupplier ? supplierId : undefined,
          expected_disembark_date: needsDate ? expectedDate : undefined,
          supplier_name: needsSupplier
            ? suppliers.find((s) => s.id === supplierId)?.company_name
            : undefined,
        })
        .then((res) => res.data),
    onSuccess: () => {
      toast.success('Ação registrada');
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
      queryClient.invalidateQueries({ queryKey: ['gdmItemHistory', item.id] });
      queryClient.invalidateQueries({ queryKey: ['gdm', item.gdm_id] });
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
      onClose();
    },
    onError: (error) => toast.error(error?.message || 'Não foi possível concluir a ação'),
  });

  const disabled =
    actionMutation.isPending ||
    (reasonRequired && !observation.trim()) ||
    (isApproval && !destination) ||
    (needsSupplier && !supplierId) ||
    (needsDate && !expectedDate);

  return (
    <Dialog open={!!pending} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pending?.label}</DialogTitle>
          <DialogDescription>
            Você está tratando somente o item{' '}
            {item ? String(item.item_number).padStart(2, '0') : ''} — {item?.equipment_name}{' '}
            (destino {ITEM_DESTINATION_LABELS[item?.destination] || '—'}). Os demais itens não
            serão alterados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isApproval && (
            <div className="space-y-2">
              <Label>Tratativa / destino do item</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a tratativa" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_DESTINATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Tratativa cadastrada: {ITEM_DESTINATION_LABELS[item?.destination] || '—'}.{' '}
                {destinationChanged
                  ? 'Ao confirmar, a tratativa será alterada e o item seguirá o novo fluxo.'
                  : 'Confirme para manter esta tratativa.'}
              </p>
            </div>
          )}

          {needsSupplier && (
            <div className="space-y-2">
              <Label>Fornecedor *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                O item será vinculado a este fornecedor, que passará a enxergá-lo em seu painel.
              </p>
            </div>
          )}

          {needsDate && (
            <div className="space-y-2">
              <Label>Nova data prevista de desembarque *</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Após esta data, o item retornará automaticamente ao Almoxarifado para nova
                confirmação de recebimento.
              </p>
            </div>
          )}

          {needsReturnNumber && (
            <div className="space-y-2">
              <Label>Número da devolução (opcional)</Label>
              <Input
                value={returnNumber}
                onChange={(e) => setReturnNumber(e.target.value)}
                placeholder="Pode ficar em branco"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>
              {action === 'reschedule_disembark'
                ? 'Justificativa da reprogramação *'
                : reasonRequired
                  ? 'Motivo *'
                  : 'Observação'}
            </Label>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={3}
              placeholder={reasonRequired ? 'Descreva o motivo' : 'Opcional'}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={disabled} onClick={() => actionMutation.mutate()}>
            {actionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}