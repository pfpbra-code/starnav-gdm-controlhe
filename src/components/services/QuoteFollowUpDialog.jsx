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
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { toast } from 'sonner';
import { QUOTE_CONTACT_CHANNELS } from '@/lib/quoteFollowup';
import { displayNameOf } from '@/lib/displayName';

const errorMessage = (err) =>
  err?.response?.data?.error || err?.message || 'Não foi possível registrar o follow-up';

/** Registro de follow-up de cotação: contato, meio, responsável e observação. */
export default function QuoteFollowUpDialog({ open, onOpenChange, item, user }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    contact_date: '',
    contact_channel: 'email',
    responsible: '',
    observation: '',
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      contact_date: new Date().toISOString().slice(0, 10),
      contact_channel: 'email',
      responsible: displayNameOf(user) || user?.email || '',
      observation: '',
    });
  }, [open, user]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      base44.functions.invoke('gdmItemAction', payload).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
      queryClient.invalidateQueries({ queryKey: ['quoteFollowups'] });
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
      queryClient.invalidateQueries({ queryKey: ['gdmItemHistory', item?.id] });
      toast.success('Follow-up registrado no histórico do item e da GDM.');
      onOpenChange(false);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const submit = () => {
    if (!form.observation.trim()) {
      toast.error('Informe a observação do contato');
      return;
    }
    mutation.mutate({
      item_id: item?.id,
      action: 'register_quote_followup',
      contact_date: form.contact_date,
      contact_channel: form.contact_channel,
      contact_responsible: form.responsible,
      observation: form.observation.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-sky-600" />
            Registrar Follow-up
          </DialogTitle>
          <DialogDescription>
            {item?.equipment_name || 'Equipamento'}
            {item?.serial_number ? ` · SN ${item.serial_number}` : ''} · Fornecedor{' '}
            {item?.supplier_name || '—'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Data do contato</Label>
              <Input
                type="date"
                value={form.contact_date}
                onChange={(e) => setForm((f) => ({ ...f, contact_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Meio de contato</Label>
              <Select
                value={form.contact_channel}
                onValueChange={(v) => setForm((f) => ({ ...f, contact_channel: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {QUOTE_CONTACT_CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Responsável pelo contato</Label>
            <Input
              value={form.responsible}
              onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value }))}
              placeholder="Quem falou com o fornecedor"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Observação</Label>
            <Textarea
              rows={3}
              value={form.observation}
              onChange={(e) => setForm((f) => ({ ...f, observation: e.target.value }))}
              placeholder="Ex.: Fornecedor informou envio da proposta até 14/11."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}