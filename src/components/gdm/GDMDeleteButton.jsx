import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Exclusão completa de GDM — visível e executável somente pelo ADM.
 * Remove a GDM, todos os itens e todo o histórico do sistema.
 */
export default function GDMDeleteButton({ gdm }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke('deleteGdm', { gdm_id: gdm.id }).then((res) => res.data),
    onSuccess: () => {
      toast.success(`GDM ${gdm.gdm_number} excluída do sistema`);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
      queryClient.invalidateQueries({ queryKey: ['gdmItemHistories'] });
    },
    onError: (error) => toast.error(error?.message || 'Não foi possível excluir a GDM'),
  });

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Excluir
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir GDM {gdm.gdm_number}?</DialogTitle>
            <DialogDescription>
              Esta ação exclui a GDM <strong>por completo do sistema</strong>, incluindo todos os
              itens e todo o histórico de ações. Não é possível desfazer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleteMutation.isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}