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
import { Loader2, Paperclip, FileImage, FileText, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ITEM_DESTINATION_LABELS } from '@/lib/gdmItems';
import {
  DISPOSAL_ACCEPT_ATTRIBUTE,
  DISPOSAL_MAX_FILE_SIZE,
  validateDisposalFile,
  uploadDisposalFiles,
  DISPOSAL_ATTACHMENT_TYPE_LABELS,
} from '@/lib/discardEvidence';

/**
 * Confirmação final do descarte (Almoxarifado): exige data, responsável e
 * comprovação — uma ou mais fotos e/ou PDFs vinculados ao item da GDM.
 * Sem anexo, a justificativa passa a ser obrigatória.
 */
export default function DiscardConfirmDialog({ pending, onClose }) {
  const queryClient = useQueryClient();
  const [discardDate, setDiscardDate] = useState('');
  const [responsible, setResponsible] = useState('');
  const [observation, setObservation] = useState('');
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');

  const item = pending?.item;

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    setDiscardDate(format(new Date(), 'yyyy-MM-dd'));
    setResponsible(user?.full_name || user?.email || '');
    setObservation('');
    setFiles([]);
    setFileError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const addFiles = (selected) => {
    const valid = [];
    const errors = [];
    Array.from(selected || []).forEach((file) => {
      const error = validateDisposalFile(file);
      if (error) errors.push(`${file.name}: ${error}`);
      else valid.push(file);
    });
    setFiles((prev) => [...prev, ...valid]);
    setFileError(errors.join(' · '));
  };

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const uploaded = await uploadDisposalFiles(files, item, user);
      const res = await base44.functions
        .invoke('gdmItemAction', {
          item_id: item.id,
          action: 'confirm_discard',
          discard_date: discardDate,
          discard_responsible: responsible.trim(),
          observation: observation.trim() || undefined,
          evidence_file_names: uploaded.map((a) => a.file_name),
        })
        .then((r) => r.data);
      return res;
    },
    onSuccess: () => {
      toast.success('Descarte confirmado com comprovação registrada');
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
      queryClient.invalidateQueries({ queryKey: ['gdmItemHistory', item.id] });
      queryClient.invalidateQueries({ queryKey: ['gdmItemAttachments', item.id] });
      queryClient.invalidateQueries({ queryKey: ['gdm', item.gdm_id] });
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
      onClose();
    },
    onError: (error) => toast.error(error?.message || 'Não foi possível confirmar o descarte'),
  });

  const hasEvidence = files.length > 0;
  const justificationRequired = !hasEvidence;
  const disabled =
    confirmMutation.isPending ||
    !discardDate ||
    !responsible.trim() ||
    (justificationRequired && !observation.trim());

  return (
    <Dialog open={!!pending} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-xl">
        <DialogHeader>
          <DialogTitle>{pending?.label || 'Confirmar descarte realizado'}</DialogTitle>
          <DialogDescription>
            Você está tratando somente o item{' '}
            {item ? String(item.item_number).padStart(2, '0') : ''} — {item?.equipment_name}{' '}
            (destino {ITEM_DESTINATION_LABELS[item?.destination] || '—'}). Os demais itens não
            serão alterados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data do descarte *</Label>
              <Input
                type="date"
                value={discardDate}
                onChange={(e) => setDiscardDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável pelo descarte *</Label>
              <Input
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Nome de quem executou o descarte"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-slate-500" />
              <Label className="text-sm">
                Comprovação do descarte (fotos e/ou PDFs) {hasEvidence ? '' : '*'}
              </Label>
            </div>
            <p className="text-xs text-slate-500">
              Anexe uma ou várias fotos do material descartado e/ou PDFs comprobatórios.
              Formatos: JPG, JPEG, PNG, WEBP e PDF — até {DISPOSAL_MAX_FILE_SIZE / (1024 * 1024)} MB por arquivo.
              Sem anexo, a justificativa abaixo passa a ser obrigatória.
            </p>
            <label>
              <span className="flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
                <Paperclip className="h-4 w-4" />
                Selecionar arquivos
              </span>
              <Input
                type="file"
                multiple
                accept={DISPOSAL_ACCEPT_ATTRIBUTE}
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>

            {fileError && <p className="text-xs text-red-600">{fileError}</p>}

            {files.length > 0 && (
              <ul className="space-y-1">
                {files.map((file, idx) => (
                  <li
                    key={`${file.name}-${idx}`}
                    className="flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-sm"
                  >
                    {file.type === 'application/pdf' ? (
                      <FileText className="h-4 w-4 text-red-500" />
                    ) : (
                      <FileImage className="h-4 w-4 text-sky-600" />
                    )}
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              {justificationRequired ? 'Observação / justificativa *' : 'Observação / justificativa'}
            </Label>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={3}
              placeholder={
                justificationRequired
                  ? 'Obrigatório: justifique o descarte sem anexo comprobatório'
                  : 'Opcional'
              }
            />
            {files.length > 0 && (
              <p className="text-xs text-slate-500">
                Serão vinculados ao item {files.length} arquivo(s):{' '}
                {files
                  .map((f) => DISPOSAL_ATTACHMENT_TYPE_LABELS[f.type === 'application/pdf' ? 'descarte_pdf' : 'descarte_foto'])
                  .join(', ')}
                .
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={confirmMutation.isPending}>
            Cancelar
          </Button>
          <Button disabled={disabled} onClick={() => confirmMutation.mutate()}>
            {confirmMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}