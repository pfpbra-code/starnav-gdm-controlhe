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
import AttachmentField from './AttachmentField';
import PhotoUrlField from './PhotoUrlField';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle2, Percent, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ITEM_DESTINATION_LABELS, ITEM_STATUS_LABELS } from '@/lib/gdmItems';
import { useSigner, createSignatureRecord } from '@/lib/signatures';
import SignatureConfirmStep from '@/components/signature/SignatureConfirmStep';

/**
 * Diálogo das ações do ciclo de fornecedor (fluxo por item):
 * definição de fornecedor, comprovante de envio, cotação, decisão da
 * Manutenção, renegociação e retorno. Executa sempre a função gdmItemAction
 * — a mesma usada por todos os módulos (fonte única de verdade).
 * `pending`: { item, action, label }
 */
export default function SupplierFlowActionDialog({ pending, onClose, onRequestNf }) {
  const queryClient = useQueryClient();
  const item = pending?.item;
  const action = pending?.action;

  const [supplierId, setSupplierId] = useState('');
  const [expectedShipDate, setExpectedShipDate] = useState('');
  const [nfUrl, setNfUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [sentDate, setSentDate] = useState('');
  const [carrier, setCarrier] = useState('');
  const [ocDate, setOcDate] = useState('');
  const [deadlineMode, setDeadlineMode] = useState('days');
  const [deadlineDays, setDeadlineDays] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [quoteUrl, setQuoteUrl] = useState('');
  const [quoteValue, setQuoteValue] = useState('');
  const [quoteDeadline, setQuoteDeadline] = useState('');
  const [warrantyDays, setWarrantyDays] = useState('');
  const [proposalNumber, setProposalNumber] = useState('');
  const [decision, setDecision] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [rejectOutcome, setRejectOutcome] = useState('');
  const [returnNfUrl, setReturnNfUrl] = useState('');
  const [returnProofUrl, setReturnProofUrl] = useState('');
  const [pwtNumber, setPwtNumber] = useState('');
  const [ocNumber, setOcNumber] = useState('');
  const [otNumber, setOtNumber] = useState('');
  const [otDecision, setOtDecision] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [receiptNfUrl, setReceiptNfUrl] = useState('');
  const [laudoUrl, setLaudoUrl] = useState('');
  const [observation, setObservation] = useState('');
  // Solicitação de NF (Serviços): opção exibida ao selecionar o fornecedor.
  const [requestNf, setRequestNf] = useState(false);
  const { signatureUrl } = useSigner();
  const [signatureChecked, setSignatureChecked] = useState(false);

  useEffect(() => {
    setSupplierId('');
    setExpectedShipDate('');
    setNfUrl('');
    setPhotoUrl('');
    setSentDate(new Date().toISOString().slice(0, 10));
    setCarrier('');
    setOcDate(new Date().toISOString().slice(0, 10));
    setDeadlineMode('days');
    setDeadlineDays('');
    setExpectedReturnDate('');
    setQuoteUrl('');
    setQuoteValue('');
    setQuoteDeadline('');
    setWarrantyDays('');
    setProposalNumber('');
    setDecision('');
    setDiscountPercentage('');
    setRejectOutcome('');
    setReturnNfUrl('');
    setReturnProofUrl('');
    setPwtNumber('');
    setOcNumber('');
    setOtNumber('');
    setOtDecision('');
    setDispatchDate('');
    setReceiptNfUrl('');
    setLaudoUrl('');
    setObservation('');
    setRequestNf(false);
    setSignatureChecked(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const needsSupplier = action === 'select_supplier';
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.filter({ status: 'active' }),
    enabled: needsSupplier,
  });

  const actionMutation = useMutation({
    mutationFn: async (payload) => {
      await createSignatureRecord({
        action,
        actionLabel: pending?.label,
        item,
        justification: observation,
        details: payload,
      });
      return base44.functions.invoke('gdmItemAction', payload).then((res) => res.data);
    },
    onSuccess: async () => {
      toast.success('Ação registrada');
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
      queryClient.invalidateQueries({ queryKey: ['gdmItemHistory', item.id] });
      queryClient.invalidateQueries({ queryKey: ['gdmItemHistories'] });
      queryClient.invalidateQueries({ queryKey: ['gdm', item.gdm_id] });
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
      // Serviços solicitou a NF junto com a definição do fornecedor: abre o
      // formulário de NF já preenchido com o fornecedor recém-selecionado.
      if (action === 'select_supplier' && requestNf && onRequestNf) {
        try {
          await onRequestNf(item);
          return;
        } catch {
          toast.error('Não foi possível abrir a solicitação de NF');
        }
      }
      onClose();
    },
    onError: (error) => toast.error(error?.message || 'Não foi possível concluir a ação'),
  });

  const submit = () => {
    const payload = { item_id: item.id, action };
    if (observation.trim()) payload.observation = observation.trim();

    if (action === 'select_supplier') {
      payload.supplier_id = supplierId;
      payload.supplier_name = suppliers.find((s) => s.id === supplierId)?.company_name;
      payload.expected_ship_date = expectedShipDate;
    } else if (action === 'attach_shipping_proof') {
      payload.nf_url = nfUrl;
      payload.photo_url = photoUrl;
      payload.sent_date = sentDate;
      if (carrier.trim()) payload.carrier = carrier.trim();
    } else if (action === 'attach_quote' || action === 'renegotiate_quote') {
      payload.quote_value = Number(quoteValue);
      if (quoteUrl) payload.quote_document_url = quoteUrl;
      if (quoteDeadline) payload.quote_deadline = quoteDeadline;
      if (warrantyDays) payload.warranty_days = Number(warrantyDays);
      if (action === 'attach_quote' && proposalNumber.trim()) {
        payload.quote_proposal_number = proposalNumber.trim();
      }
    } else if (action === 'update_warranty') {
      payload.warranty_days = Number(warrantyDays);
    } else if (action === 'maintenance_decision') {
      payload.decision = decision;
      if (discountPercentage) payload.discount_percentage = Number(discountPercentage);
      if (decision === 'reject') payload.reject_outcome = rejectOutcome;
    } else if (action === 'register_supplier_return') {
      payload.return_nf_url = returnNfUrl;
      payload.return_proof_url = returnProofUrl;
    } else if (action === 'issue_pwt') {
      payload.pwt_number = pwtNumber.trim();
    } else if (action === 'issue_oc') {
      payload.oc_number = ocNumber.trim();
      if (ocDate) payload.oc_date = ocDate;
      if (deadlineMode === 'days' ? Number(deadlineDays) > 0 : !!expectedReturnDate) {
        if (deadlineMode === 'days') {
          payload.return_deadline_days = Number(deadlineDays);
        } else {
          payload.expected_return_date = expectedReturnDate;
        }
      }
    } else if (action === 'set_return_deadline') {
      if (deadlineMode === 'days') {
        payload.return_deadline_days = Number(deadlineDays);
      } else {
        payload.expected_return_date = expectedReturnDate;
      }
    } else if (action === 'register_return_dispatch') {
      if (dispatchDate) payload.dispatch_date = dispatchDate;
    } else if (action === 'issue_ot') {
      payload.ot_number = otNumber.trim();
    } else if (action === 'confirm_return_receipt') {
      payload.nf_url = receiptNfUrl;
      payload.laudo_url = laudoUrl;
      if (item.ot_number && item.ot_status !== 'closed') {
        payload.ot_action = otDecision;
      }
    }
    actionMutation.mutate(payload);
  };

  const disabled =
    actionMutation.isPending ||
    !signatureChecked ||
    (needsSupplier && (!supplierId || !expectedShipDate)) ||
    (action === 'attach_shipping_proof' && (!nfUrl || !photoUrl || !sentDate)) ||
    (action === 'attach_quote' && (!quoteUrl || !quoteValue || !quoteDeadline || !warrantyDays)) ||
    (action === 'renegotiate_quote' && !quoteValue) ||
    (action === 'update_warranty' && (!warrantyDays || Number(warrantyDays) <= 0)) ||
    (action === 'maintenance_decision' &&
      (!decision || (decision === 'reject' && (!rejectOutcome || !observation.trim())))) ||
    (action === 'register_supplier_return' && (!returnNfUrl || !returnProofUrl)) ||
    (action === 'issue_pwt' && !pwtNumber.trim()) ||
    (action === 'issue_oc' && (!ocNumber.trim() || !ocDate)) ||
    (action === 'set_return_deadline' &&
      ((deadlineMode === 'days' ? !Number(deadlineDays) : !expectedReturnDate) ||
        (!!item?.expected_return_date && !observation.trim()))) ||
    (action === 'issue_ot' && !otNumber.trim()) ||
    (action === 'confirm_return_receipt' &&
      (!receiptNfUrl ||
        !laudoUrl ||
        (!!item?.ot_number &&
          item?.ot_status !== 'closed' &&
          !otDecision)));

  // Prévia da data prevista de retorno: dias → cálculo automático a partir da
  // data de emissão da OC (issue_oc / set_return_deadline — o prazo nunca é
  // solicitado na etapa de envio ao fornecedor).
  const expectedReturnPreview = (() => {
    if (!['issue_oc', 'set_return_deadline'].includes(action)) return '';
    if (deadlineMode === 'date') return expectedReturnDate || '';
    const days = Number(deadlineDays);
    const baseDate =
      ocDate || item?.oc_issued_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    if (days > 0) {
      const d = new Date(`${baseDate}T12:00:00`);
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    }
    return '';
  })();
  const expectedReturnLabel = expectedReturnPreview
    ? new Date(`${expectedReturnPreview}T12:00:00`).toLocaleDateString('pt-BR')
    : '';

  const decisionOption = (value, icon, title, hint) => (
    <button
      type="button"
      onClick={() => setDecision(value)}
      className={`w-full text-left rounded-lg border p-3 transition-colors ${
        decision === value
          ? 'border-sky-500 bg-sky-50'
          : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <span className="flex items-center gap-2 font-medium text-sm text-slate-800">
        {icon}
        {title}
      </span>
      <span className="block text-xs text-slate-500 mt-0.5">{hint}</span>
    </button>
  );

  return (
    <Dialog open={!!pending} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pending?.label}</DialogTitle>
          <DialogDescription>
            Item {item ? String(item.item_number).padStart(2, '0') : ''} — {item?.equipment_name}
            {' · '}
            {ITEM_DESTINATION_LABELS[item?.destination] || ''}{' '}
            {item && (
              <span className="text-slate-400">
                (situação atual: {ITEM_STATUS_LABELS[item.status] || item.status})
              </span>
            )}
            . A ação vale somente para este item; todo o registro vai para o histórico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {needsSupplier && (
            <>
              <div className="space-y-2">
                <Label>Fornecedor (já cadastrado) *</Label>
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
                {item?.status === 'return_confirmed' && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    Novo ciclo: todo o histórico, cotações e reprovações anteriores permanecem
                    registrados no item.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Previsão de envio *</Label>
                <Input
                  type="date"
                  value={expectedShipDate}
                  onChange={(e) => setExpectedShipDate(e.target.value)}
                />
              </div>
              <label className="flex items-start gap-2.5 rounded-lg border border-sky-200 bg-sky-50 p-3 cursor-pointer">
                <Checkbox
                  checked={requestNf}
                  onCheckedChange={(v) => setRequestNf(!!v)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">
                    Solicitar NF de envio agora
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    Após confirmar o fornecedor, abre a Solicitação de Emissão de NF
                    preenchida automaticamente com este fornecedor e os dados do item.
                  </span>
                </span>
              </label>
            </>
          )}

          {action === 'attach_shipping_proof' && (
            <>
              <AttachmentField label="NF assinada" value={nfUrl} onChange={setNfUrl} />
              <PhotoUrlField label="Foto do envio" value={photoUrl} onChange={setPhotoUrl} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data de envio *</Label>
                  <Input
                    type="date"
                    value={sentDate}
                    onChange={(e) => setSentDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Transportadora</Label>
                  <Input
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="Quando aplicável"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Ambos os anexos são obrigatórios: sem a NF assinada e a foto do envio o item não
                pode ser marcado como enviado ao fornecedor. A foto pode ser tirada pela câmera
                do celular ou escolhida da galeria. O prazo de retorno NÃO é informado nesta
                etapa: ele é registrado por Serviços somente após a emissão da Ordem de Compra
                (OC).
              </p>
            </>
          )}

          {action === 'attach_quote' && (
            <>
              <AttachmentField label="Cotação" value={quoteUrl} onChange={setQuoteUrl} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor do reparo (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quoteValue}
                    onChange={(e) => setQuoteValue(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prazo informado pelo fornecedor *</Label>
                  <Input
                    type="date"
                    value={quoteDeadline}
                    onChange={(e) => setQuoteDeadline(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Garantia oferecida pelo fornecedor (dias) *</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={warrantyDays}
                    onChange={(e) => setWarrantyDays(e.target.value)}
                    placeholder="Ex: 90"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número da proposta comercial</Label>
                  <Input
                    value={proposalNumber}
                    onChange={(e) => setProposalNumber(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Garantia vinculada a este item. O início da contagem é registrado
                automaticamente quando o Almoxarifado confirmar o recebimento do
                equipamento, e o término é calculado a partir dos dias informados.
              </p>
              <p className="text-xs text-slate-500">
                Após o anexo, o item segue automaticamente para a Gerência de Manutenção.
              </p>
            </>
          )}

          {action === 'maintenance_decision' && (
            <>
              {item && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm space-y-1">
                  <p className="flex justify-between">
                    <span className="text-slate-500">Fornecedor:</span>
                    <span className="font-medium">{item.supplier_name || '—'}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Valor cotado:</span>
                    <span className="font-medium">
                      {item.quote_value != null
                        ? item.quote_value.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })
                        : '—'}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Prazo informado:</span>
                    <span className="font-medium">{item.quote_deadline || '—'}</span>
                  </p>
                  {item.quote_document_url && (
                    <a
                      href={item.quote_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:underline"
                    >
                      Ver documento da cotação
                    </a>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Decisão *</Label>
                {decisionOption(
                  'approve',
                  <CheckCircle2 className="h-4 w-4 text-green-600" />,
                  'Aprovar cotação',
                  'Reparo aprovado — o item retorna para Serviços.',
                )}
                {decisionOption(
                  'discount',
                  <Percent className="h-4 w-4 text-amber-600" />,
                  'Solicitar desconto',
                  'Negociação de desconto — Serviços negocia e envia nova proposta.',
                )}
                {decisionOption(
                  'reject',
                  <XCircle className="h-4 w-4 text-red-600" />,
                  'Reprovar cotação',
                  'Exige motivo e a escolha do desfecho abaixo.',
                )}
              </div>
              {decision === 'discount' && (
                <div className="space-y-2">
                  <Label>Percentual de desconto (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(e.target.value)}
                    placeholder="Ex: 10"
                  />
                </div>
              )}
              {decision === 'reject' && (
                <div className="space-y-2">
                  <Label>Desfecho da reprovação *</Label>
                  <button
                    type="button"
                    onClick={() => setRejectOutcome('other_supplier')}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      rejectOutcome === 'other_supplier'
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-medium text-sm text-slate-800">
                      Enviar para outro fornecedor
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      Serviços solicita a devolução com NF e comprovante; o Almoxarifado confirma o
                      retorno e um novo ciclo começa.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectOutcome('discard')}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      rejectOutcome === 'discard'
                        ? 'border-red-400 bg-red-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-medium text-sm text-slate-800">
                      Descartar equipamento
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      Encerra o processo com descarte aprovado (justificativa obrigatória).
                    </span>
                  </button>
                  <div className="space-y-2">
                    <Label>Motivo da reprovação *</Label>
                    <Textarea
                      value={observation}
                      onChange={(e) => setObservation(e.target.value)}
                      rows={3}
                      placeholder="Descreva o motivo (registrado no histórico)"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {action === 'renegotiate_quote' && (
            <>
              <div className="space-y-2">
                <Label>Novo valor negociado (R$) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quoteValue}
                  onChange={(e) => setQuoteValue(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <AttachmentField
                label="Nova proposta"
                value={quoteUrl}
                onChange={setQuoteUrl}
                required={false}
              />
              <div className="space-y-2">
                <Label>Prazo (opcional)</Label>
                <Input
                  type="date"
                  value={quoteDeadline}
                  onChange={(e) => setQuoteDeadline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Garantia da nova proposta (dias, opcional)</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={warrantyDays}
                  onChange={(e) => setWarrantyDays(e.target.value)}
                  placeholder="Mantém a garantia anterior se vazio"
                />
              </div>
              <p className="text-xs text-slate-500">
                Após a nova proposta, o item retorna para nova aprovação da Manutenção. Todo o
                histórico de valores permanece registrado.
              </p>
            </>
          )}

          {action === 'register_supplier_return' && (
            <>
              <p className="text-xs text-slate-500">
                Solicite a devolução do equipamento ao fornecedor anterior e anexe a NF de retorno e
                o comprovante de devolução (obrigatórios).
              </p>
              <AttachmentField
                label="NF de retorno"
                value={returnNfUrl}
                onChange={setReturnNfUrl}
              />
              <AttachmentField
                label="Comprovante de devolução"
                value={returnProofUrl}
                onChange={setReturnProofUrl}
              />
            </>
          )}

          {action === 'confirm_supplier_return' && (
            <p className="text-xs text-slate-500">
              Ao confirmar o recebimento do retorno, o ciclo do fornecedor anterior{' '}
              <strong>{item?.supplier_name || ''}</strong> é encerrado com data e responsável
              registrados, e o item volta para Serviços definir o novo fornecedor.
            </p>
          )}

          {action === 'start_repair' && (
            <p className="text-xs text-slate-500">
              Confirma o início do reparo no fornecedor{' '}
              <strong>{item?.supplier_name || ''}</strong>. O item passa para "Em Reparo".
            </p>
          )}

          {action === 'issue_pwt' && (
            <>
              <div className="space-y-2">
                <Label>Número do PWT *</Label>
                <Input
                  value={pwtNumber}
                  onChange={(e) => setPwtNumber(e.target.value)}
                  placeholder="Ex: PWT-00123"
                />
              </div>
              <p className="text-xs text-slate-500">
                Emitido pelo Planejamento com data, hora e responsável registrados no histórico.
                Após o PWT, o item segue para Serviços emitir a Ordem de Compra (OC).
              </p>
            </>
          )}

          {action === 'issue_oc' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Número da Ordem de Compra (OC) *</Label>
                  <Input
                    value={ocNumber}
                    onChange={(e) => setOcNumber(e.target.value)}
                    placeholder="Ex: OC-00456"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de emissão da OC *</Label>
                  <Input
                    type="date"
                    value={ocDate}
                    onChange={(e) => setOcDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Previsão de retorno informada pelo fornecedor (opcional)</Label>
                <DeadlineModeToggle mode={deadlineMode} onChange={setDeadlineMode} />
                <DeadlineInput
                  mode={deadlineMode}
                  days={deadlineDays}
                  onDaysChange={setDeadlineDays}
                  date={expectedReturnDate}
                  onDateChange={setExpectedReturnDate}
                />
                {expectedReturnPreview && (
                  <p className="text-xs text-slate-600 bg-sky-50 border border-sky-200 rounded p-2">
                    Data prevista de retorno:{' '}
                    <strong>{expectedReturnLabel}</strong>. A contagem do prazo inicia na emissão
                    da OC — Serviços pode alterar a previsão posteriormente com justificativa.
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-500">
                A previsão de retorno só existe a partir da emissão da OC — nunca antes. Após a
                emissão, o item aguarda a confirmação de aprovação e envio da OC ao fornecedor.
              </p>
            </>
          )}

          {action === 'set_return_deadline' && (
            <>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm space-y-1">
                <p className="flex justify-between">
                  <span className="text-slate-500">OC:</span>
                  <span className="font-medium">{item?.oc_number || '—'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Emissão da OC:</span>
                  <span className="font-medium">
                    {item?.oc_issued_at
                      ? new Date(item.oc_issued_at).toLocaleDateString('pt-BR')
                      : '—'}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Previsão atual:</span>
                  <span className="font-medium">
                    {item?.expected_return_date
                      ? new Date(
                          `${item.expected_return_date}T12:00:00`,
                        ).toLocaleDateString('pt-BR')
                      : 'Não registrada'}
                  </span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>
                  {item?.expected_return_date
                    ? 'Nova previsão de retorno *'
                    : 'Previsão de retorno *'}
                </Label>
                <DeadlineModeToggle mode={deadlineMode} onChange={setDeadlineMode} />
                <DeadlineInput
                  mode={deadlineMode}
                  days={deadlineDays}
                  onDaysChange={setDeadlineDays}
                  date={expectedReturnDate}
                  onDateChange={setExpectedReturnDate}
                />
                {expectedReturnPreview && (
                  <p className="text-xs text-slate-600 bg-sky-50 border border-sky-200 rounded p-2">
                    Data prevista de retorno: <strong>{expectedReturnLabel}</strong>
                    {deadlineMode === 'days' && ' (contada a partir da emissão da OC)'}.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  {item?.expected_return_date
                    ? 'Justificativa da alteração *'
                    : 'Observações'}
                </Label>
                <Textarea
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  rows={3}
                  placeholder={
                    item?.expected_return_date
                      ? 'Ex: Fornecedor solicitou extensão para conclusão do reparo'
                      : 'Opcional'
                  }
                />
              </div>
              <p className="text-xs text-slate-500">
                Toda alteração fica registrada no histórico da GDM: prazo anterior, novo prazo,
                responsável, data e justificativa.
              </p>
            </>
          )}

          {action === 'issue_ot' && (
            <>
              <div className="space-y-2">
                <Label>Número da Ordem de Trabalho (OT) *</Label>
                <Input
                  value={otNumber}
                  onChange={(e) => setOtNumber(e.target.value)}
                  placeholder="Ex: OT-00123"
                />
              </div>
              <p className="text-xs text-slate-500">
                A OT fica registrada como <strong>🟡 OT Aberta</strong> e passa a ser monitorada
                pelo Controle de OT (abas de Serviços e Almoxarifado, com atualização em tempo
                real). O encerramento é responsabilidade do Almoxarifado, após o recebimento do
                equipamento retornado.
              </p>
            </>
          )}

          {action === 'confirm_oc_approved' && (
            <p className="text-xs text-slate-500">
              Confirma que a OC foi aprovada e enviada ao fornecedor{' '}
              <strong>{item?.supplier_name || ''}</strong>. O item passa a aguardar o retorno do
              material.
            </p>
          )}

          {action === 'close_ot' && (
            <p className="text-xs text-slate-500">
              Ao fechar a OT <strong>{item?.ot_number || ''}</strong>, o sistema registra a data
              de fechamento e o responsável, atualiza o status para{' '}
              <strong>🟢 OT Fechada</strong> e alimenta o Controle de OT de Serviços e
              Almoxarifado em tempo real.
            </p>
          )}

          {action === 'register_return_dispatch' && (
            <>
              <div className="space-y-2">
                <Label>Data de saída para entrega</Label>
                <Input
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500">
                Registre quando o material saiu do fornecedor para entrega. Sem data informada,
                vale a data de hoje. O prazo de retorno continua monitorado individualmente.
              </p>
            </>
          )}

          {action === 'confirm_return_receipt' && (
            <>
              <AttachmentField
                label="NF do material retornado"
                value={receiptNfUrl}
                onChange={setReceiptNfUrl}
              />
              <AttachmentField
                label="Laudo técnico"
                value={laudoUrl}
                onChange={setLaudoUrl}
              />
              {!!item?.ot_number && item?.ot_status !== 'closed' && (
                <div className="space-y-2">
                  <Label>Ordem de Trabalho (OT {item.ot_number}) *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOtDecision('close')}
                      className={`text-left rounded-lg border p-3 transition-colors ${
                        otDecision === 'close'
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="block font-medium text-sm text-slate-800">
                        🟢 Fechar OT
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        Registra a data de fechamento e o responsável, e conclui a OT no
                        Controle de OT.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtDecision('keep')}
                      className={`text-left rounded-lg border p-3 transition-colors ${
                        otDecision === 'keep'
                          ? 'border-red-400 bg-red-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="block font-medium text-sm text-slate-800">
                        🔴 Manter OT Aberta
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        O item fica destacado no Controle de OT como "Recebido - Aguardando
                        Fechamento da OT", com alertas automáticos.
                      </span>
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-500">
                Ambos os anexos são obrigatórios: a confirmação do recebimento finaliza o fluxo
                do item com data e responsável registrados. Itens de calibração/certificação
                seguem para Operações anexar o certificado e a validade antes da finalização.
              </p>
            </>
          )}

          {action === 'update_warranty' && (
            <>
              <div className="space-y-2">
                <Label>Nova garantia (dias) *</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={warrantyDays}
                  onChange={(e) => setWarrantyDays(e.target.value)}
                  placeholder="Ex: 180"
                />
              </div>
              <p className="text-xs text-slate-500">
                A alteração da garantia é sempre registrada no histórico do item com data,
                hora e responsável. Se a garantia já começou a contar, o término é
                recalculado a partir da data de início registrada.
              </p>
            </>
          )}

          {!['maintenance_decision', 'set_return_deadline'].includes(action) && (
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                rows={3}
                placeholder="Opcional"
              />
            </div>
          )}
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
          <Button disabled={disabled} onClick={submit}>
            {actionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Label({ children }) {
  return <span className="text-sm font-medium text-slate-700">{children}</span>;
}

/** Alternância de forma de informar a previsão de retorno: prazo em dias ou data. */
function DeadlineModeToggle({ mode, onChange }) {
  const buttonClass = (active) =>
    `flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
      active
        ? 'border-sky-500 bg-sky-50 text-sky-700 font-medium'
        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
    }`;
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => onChange('days')} className={buttonClass(mode === 'days')}>
        Prazo (dias)
      </button>
      <button type="button" onClick={() => onChange('date')} className={buttonClass(mode === 'date')}>
        Data prevista
      </button>
    </div>
  );
}

/** Campo da previsão de retorno conforme a forma escolhida (dias ou data). */
function DeadlineInput({ mode, days, onDaysChange, date, onDateChange }) {
  return mode === 'days' ? (
    <Input
      type="number"
      min="1"
      step="1"
      value={days}
      onChange={(e) => onDaysChange(e.target.value)}
      placeholder="Ex: 30"
    />
  ) : (
    <Input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
  );
}