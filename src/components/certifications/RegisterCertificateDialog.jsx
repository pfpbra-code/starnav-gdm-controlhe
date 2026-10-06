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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AttachmentField from '@/components/gdm/AttachmentField';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ITEM_STATUS_LABELS } from '@/lib/gdmItems';
import { computeExpiryIso } from '@/lib/certifications';

/**
 * Registro do certificado de calibração/certificação do item (Operações).
 * O certificado (PDF + imagem opcional), número, data e empresa certificadora
 * ficam permanentemente vinculados ao item; a validade pode ser informada como
 * data de vencimento ou quantidade de meses (vencimento calculado).
 * Sem a validade, o item permanece "Aguardando Cadastro da Validade"; com a
 * validade, o item é finalizado.
 */
export default function RegisterCertificateDialog({ item, onClose }) {
  const queryClient = useQueryClient();
  const isValidityStep = item?.status === 'awaiting_validity_registration';

  const [certNumber, setCertNumber] = useState('');
  const [certDate, setCertDate] = useState('');
  const [company, setCompany] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [validityMode, setValidityMode] = useState('months');
  const [validityDate, setValidityDate] = useState('');
  const [validityMonths, setValidityMonths] = useState('');
  const [observations, setObservations] = useState('');

  const { data: itemCerts = [] } = useQuery({
    queryKey: ['itemCertifications', item?.id],
    queryFn: () => base44.entities.Certification.filter({ item_id: item.id }),
    enabled: !!item && isValidityStep,
  });

  useEffect(() => {
    if (isValidityStep && itemCerts.length) {
      const c = itemCerts[0];
      setCertNumber(c.certificate_number || '');
      setCertDate(c.certificate_date || '');
      setCompany(c.certifying_company || '');
      setPdfUrl(c.document_url || '');
      setImageUrl(c.image_url || '');
    }
  }, [itemCerts, isValidityStep]);

  const actionMutation = useMutation({
    mutationFn: (payload) =>
      base44.functions.invoke('gdmItemAction', payload).then((res) => res.data),
    onSuccess: (_data, variables) => {
      const completed = !!(variables.validity_date || variables.validity_months);
      toast.success(
        completed
          ? 'Certificado registrado e certificação concluída'
          : 'Certificado salvo — aguardando cadastro da validade'
      );
      ['gdmItems', 'certifications', 'gdms', 'gdmItemHistories'].forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
      onClose();
    },
    onError: (error) =>
      toast.error(error?.message || 'Não foi possível registrar o certificado'),
  });

  const validityFilled =
    validityMode === 'date' ? !!validityDate : !!validityMonths && Number(validityMonths) > 0;
  const baseFilled =
    !!certNumber.trim() && !!certDate && !!company.trim() && !!pdfUrl;
  const canComplete = isValidityStep ? validityFilled : baseFilled && validityFilled;
  const canSavePartial = !isValidityStep && baseFilled;

  const submit = (withValidity) => {
    const payload = {
      item_id: item.id,
      action: 'register_certificate',
      certificate_number: certNumber.trim(),
      certificate_date: certDate,
      certifying_company: company.trim(),
      pdf_url: pdfUrl,
      image_url: imageUrl,
    };
    if (withValidity) {
      if (validityMode === 'date') payload.validity_date = validityDate;
      else payload.validity_months = Number(validityMonths);
    }
    if (observations.trim()) payload.observations = observations.trim();
    actionMutation.mutate(payload);
  };

  const previewExpiry = computeExpiryIso(certDate, {
    validityDate: validityMode === 'date' ? validityDate : null,
    validityMonths: validityMode === 'months' ? Number(validityMonths) : null,
  });

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isValidityStep ? 'Cadastrar validade da certificação' : 'Registrar certificado'}
          </DialogTitle>
          <DialogDescription>
            Item {item ? String(item.item_number).padStart(2, '0') : ''} —{' '}
            {item?.equipment_name} · SN {item?.serial_number || '—'}
            {item && (
              <span className="text-slate-400">
                {' '}
                (situação atual: {ITEM_STATUS_LABELS[item.status] || item.status})
              </span>
            )}
            . O certificado fica permanentemente vinculado ao item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isValidityStep && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              O certificado já foi anexado. Informe a validade para concluir o item.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Número do certificado *</Label>
              <Input
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                placeholder="Ex: CERT-00123"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data do certificado *</Label>
              <Input
                type="date"
                value={certDate}
                onChange={(e) => setCertDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Empresa certificadora *</Label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Razão social da empresa certificadora"
            />
          </div>

          <AttachmentField label="Certificado em PDF" value={pdfUrl} onChange={setPdfUrl} />
          <AttachmentField
            label="Certificado em imagem"
            value={imageUrl}
            onChange={setImageUrl}
            required={false}
          />

          <div className="rounded-lg border border-slate-200 p-3 space-y-3">
            <Label>Validade da certificação</Label>
            <div className="flex items-center gap-2">
              <Select value={validityMode} onValueChange={setValidityMode}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="months">Quantidade de meses</SelectItem>
                  <SelectItem value="date">Data de vencimento</SelectItem>
                </SelectContent>
              </Select>
              {validityMode === 'months' ? (
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={validityMonths}
                  onChange={(e) => setValidityMonths(e.target.value)}
                  placeholder="Ex: 12"
                />
              ) : (
                <Input
                  type="date"
                  value={validityDate}
                  onChange={(e) => setValidityDate(e.target.value)}
                />
              )}
            </div>
            {previewExpiry && (
              <p className="text-xs text-slate-500">
                Vencimento calculado:{' '}
                <strong>
                  {format(new Date(previewExpiry), 'dd/MM/yyyy', { locale: ptBR })}
                </strong>
              </p>
            )}
            <p className="text-xs text-slate-500">
              O item só é finalizado com a validade registrada. Sem a validade, ele
              permanece em "Aguardando Cadastro da Validade".
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
              placeholder="Opcional (registrado no histórico do item)"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {!isValidityStep && (
            <Button
              variant="outline"
              disabled={!canSavePartial || actionMutation.isPending}
              onClick={() => submit(false)}
            >
              Salvar sem validade
            </Button>
          )}
          <Button disabled={!canComplete || actionMutation.isPending} onClick={() => submit(true)}>
            {actionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar e concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Label({ children }) {
  return <span className="text-sm font-medium text-slate-700">{children}</span>;
}