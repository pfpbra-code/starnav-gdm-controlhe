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
import { Loader2, CheckCircle2, Percent, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ITEM_DESTINATION_LABELS, ITEM_STATUS_LABELS } from '@/lib/gdmItems';

/**
 * Diálogo das ações do ciclo de fornecedor (fluxo por item):
 * definição de fornecedor, comprovante de envio, cotação, decisão da
 * Manutenção, renegociação e retorno. Executa sempre a função gdmItemAction
 * — a mesma usada por todos os módulos (fonte única de verdade).
 * `pending`: { item, action, label }
 */
export default function SupplierFlowActionDialog({ pending, onClose }) {
  const queryClient = useQueryClient();
  const item = pending?.item;
  const action = pending?.action;

  const [supplierId, setSupplierId] = useState('');
  const [expectedShipDate, setExpectedShipDate] = useState('');
  const [nfUrl, setNfUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [quoteUrl, setQuoteUrl] = useState('');
  const [quoteValue, setQuoteValue] = useState('');
  const [quoteDeadline, setQuoteDeadline] = useState('');
  const [decision, setDecision] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [rejectOutcome, setRejectOutcome] = useState('');
  const [returnNfUrl, setReturnNfUrl] = useState('');
  const [returnProofUrl, setReturnProofUrl] = useState('');
  const [pwtNumber, setPwtNumber] = useState('');
  const [ocNumber, setOcNumber] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [receiptNfUrl, setReceiptNfUrl] = useState('');
  const [laudoUrl, setLaudoUrl] = useState('');
  const [observation, setObservation] = useState('');

  useEffect(() => {
    setSupplierId('');
    setExpectedShipDate('');
    setNfUrl('');
    setPhotoUrl('');
    setQuoteUrl('');
    setQuoteValue('');
    setQuoteDeadline('');
    setDecision('');
    setDiscountPercentage('');
    setRejectOutcome('');
    setReturnNfUrl('');
    setReturnProofUrl('');
    setPwtNumber('');
    setOcNumber('');
    setDispatchDate('');
    setReceiptNfUrl('');
    setLaudoUrl('');
    setObservation('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const needsSupplier = action === 'select_supplier';
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.filter({ status: 'active' }),
    enabled: needsSupplier,
  });

  const actionMutation = useMutation({
    mutationFn: (payload) =>
      base44.functions.invoke('gdmItemAction', payload).then((res) => res.data),
    onSuccess: () => {
      toast.success('Ação registrada');
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
      queryClient.invalidateQueries({ queryKey: ['gdmItemHistory', item.id] });
      queryClient.invalidateQueries({ queryKey: ['gdmItemHistories'] });
      queryClient.invalidateQueries({ queryKey: ['gdm', item.gdm_id] });
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
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
    } else if (action === 'attach_quote' || action === 'renegotiate_quote') {
      payload.quote_value = Number(quoteValue);
      if (quoteUrl) payload.quote_document_url = quoteUrl;
      if (quoteDeadline) payload.quote_deadline = quoteDeadline;
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
    } else if (action === 'register_return_dispatch') {
      if (dispatchDate) payload.dispatch_date = dispatchDate;
    } else if (action === 'confirm_return_receipt') {
      payload.nf_url = receiptNfUrl;
      payload.laudo_url = laudoUrl;
    }
    actionMutation.mutate(payload);
  };

  const disabled =
    actionMutation.isPending ||
    (needsSupplier && (!supplierId || !expectedShipDate)) ||
    (action === 'attach_shipping_proof' && (!nfUrl || !photoUrl)) ||
    (action === 'attach_quote' && (!quoteUrl || !quoteValue || !quoteDeadline)) ||
    (action === 'renegotiate_quote' && !quoteValue) ||
    (action === 'maintenance_decision' &&
      (!decision || (decision === 'reject' && (!rejectOutcome || !observation.trim())))) ||
    (action === 'register_supplier_return' && (!returnNfUrl || !returnProofUrl)) ||
    (action === 'issue_pwt' && !pwtNumber.trim()) ||
    (action === 'issue_oc' && !ocNumber.trim()) ||
    (action === 'confirm_return_receipt' && (!receiptNfUrl || !laudoUrl));

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
            </>
          )}

          {action === 'attach_shipping_proof' && (
            <>
              <AttachmentField label="NF assinada" value={nfUrl} onChange={setNfUrl} />
              <AttachmentField label="Foto do envio" value={photoUrl} onChange={setPhotoUrl} />
              <p className="text-xs text-slate-500">
                Ambos os anexos são obrigatórios: sem a NF assinada e a foto do envio o item não
                pode ser marcado como enviado ao fornecedor.
              </p>
            </>
          )}

          {action === 'attach_quote' && (
            <>
              <AttachmentField label="Cotação" value={quoteUrl} onChange={setQuoteUrl} />
              <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-2">
                <Label>Número da Ordem de Compra (OC) *</Label>
                <Input
                  value={ocNumber}
                  onChange={(e) => setOcNumber(e.target.value)}
                  placeholder="Ex: OC-00456"
                />
              </div>
              <p className="text-xs text-slate-500">
                Após a emissão, o item aguarda a confirmação de aprovação e envio da OC ao
                fornecedor.
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
              <p className="text-xs text-slate-500">
                Ambos os anexos são obrigatórios: a confirmação do recebimento finaliza o fluxo do
                item com data e responsável registrados.
              </p>
            </>
          )}

          {action !== 'maintenance_decision' && (
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