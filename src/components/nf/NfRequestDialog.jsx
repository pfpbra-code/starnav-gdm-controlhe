import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSigner } from '@/lib/signatures';
import NfItemsEditor from './NfItemsEditor';
import NfAuditList from './NfAuditList';
import {
  buildNfAutoForm,
  diffNfChanges,
  exportNfPdf,
  exportNfSpreadsheet,
  formFromNfRequest,
  printNfRequest,
} from '@/lib/nfRequest';

const Section = ({ title, children }) => (
  <div className="space-y-3">
    <h4 className="text-sm font-semibold text-sky-700 border-b border-slate-100 pb-1">{title}</h4>
    {children}
  </div>
);

const Field = ({ label, children, className = '' }) => (
  <div className={`space-y-1 ${className}`}>
    <Label className="text-xs text-slate-600">{label}</Label>
    {children}
  </div>
);

/**
 * Solicitação de Emissão de NF (Serviços): formulário preenchido automaticamente
 * com os dados da GDM, do item e do fornecedor, totalmente editável. Cada
 * alteração após o preenchimento automático é auditada, e a solicitação fica
 * vinculada à GDM, ao item, ao equipamento, ao fornecedor e ao histórico.
 */
export default function NfRequestDialog({ item, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useSigner();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(null);
  const originalRef = useRef(null);

  const { data: gdm } = useQuery({
    queryKey: ['gdm', item.gdm_id],
    queryFn: () => base44.entities.GDM.get(item.gdm_id),
    enabled: !!item.gdm_id,
  });
  const { data: supplier, isLoading: loadingSupplier } = useQuery({
    queryKey: ['supplier', item.supplier_id],
    queryFn: () => base44.entities.Supplier.get(item.supplier_id),
    enabled: !!item.supplier_id,
  });
  const { data: nfPage, isLoading: loadingNf } = useQuery({
    queryKey: ['nfRequests', item.id],
    queryFn: () =>
      base44.entities.NfRequest.filter({ item_id: item.id }, { sort: '-created_date', limit: 1 }),
    enabled: !!item.id,
  });
  const existing = nfPage?.items?.[0] || null;

  useEffect(() => {
    if (loadingNf) return;
    if (existing) {
      const restored = formFromNfRequest(existing);
      originalRef.current = restored;
      setForm(restored);
    } else if (gdm && user && !loadingSupplier) {
      const auto = buildNfAutoForm({ item, gdm, supplier, user });
      originalRef.current = auto;
      setForm(auto);
    }
  }, [existing, loadingNf, loadingSupplier, gdm, supplier, user, item]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const buildPayload = () => ({
    gdm_id: item.gdm_id,
    gdm_number: form.gdm_number,
    vessel_id: item.vessel_id,
    vessel_name: form.vessel_name,
    item_id: item.id,
    item_number: item.item_number,
    equipment_id: item.equipment_id || '',
    supplier_id: item.supplier_id || '',
    supplier_name: form.supplier_company_name || item.supplier_name || '',
    request_date: form.request_date,
    requested_by: user?.email || '',
    requester_name: form.requester_name,
    shipment_objective: form.shipment_objective,
    destination: form.destination,
    supplier_company_name: form.supplier_company_name,
    supplier_cnpj: form.supplier_cnpj,
    supplier_address: form.supplier_address,
    supplier_city: form.supplier_city,
    supplier_state: form.supplier_state,
    supplier_zip: form.supplier_zip,
    supplier_phone: form.supplier_phone,
    nf_items: form.nf_items,
    carrier: form.carrier,
    freight_type: form.freight_type,
    operation_type: form.operation_type,
    operation_nature: form.operation_nature,
    cfop: form.cfop,
    observations: form.observations,
  });

  const exportRecord = () => ({
    ...buildPayload(),
    audit_changes: existing?.audit_changes || [],
  });

  const recordHistory = async (action, observation, data) => {
    await base44.entities.GDMItemHistory.create({
      item_id: item.id,
      gdm_id: item.gdm_id,
      vessel_id: item.vessel_id,
      supplier_id: item.supplier_id || '',
      user_email: user?.email || '',
      action,
      previous_status: item.status,
      new_status: item.status,
      observation,
      data,
    });
    queryClient.invalidateQueries({ queryKey: ['gdmItemHistory', item.id] });
  };

  const refreshRequests = () =>
    queryClient.invalidateQueries({ queryKey: ['nfRequests', item.id] });

  const handleCreate = async () => {
    if (!form.nf_items?.length) {
      toast.error('Inclua pelo menos um equipamento na solicitação');
      return;
    }
    setSaving('create');
    try {
      const changes = diffNfChanges(originalRef.current, form, user);
      const record = await base44.entities.NfRequest.create({
        ...buildPayload(),
        audit_changes: changes,
      });
      await recordHistory(
        'request_nf',
        'Solicitação de Emissão de NF gerada automaticamente a partir dos dados da GDM',
        {
          nf_request_id: record.id,
          campos_alterados: changes.map((c) => c.field_label),
        },
      );
      toast.success('Solicitação de NF gerada e vinculada ao item');
      refreshRequests();
    } catch (error) {
      toast.error(error?.message || 'Não foi possível gerar a solicitação');
    } finally {
      setSaving(null);
    }
  };

  const handleSave = async ({ resend = false } = {}) => {
    setSaving(resend ? 'resend' : 'save');
    try {
      const changes = diffNfChanges(formFromNfRequest(existing), form, user);
      const changedLabels = changes.map((c) => c.field_label).join(', ');
      await base44.entities.NfRequest.update(existing.id, {
        ...buildPayload(),
        ...(changes.length
          ? { audit_changes: [...(existing.audit_changes || []), ...changes] }
          : {}),
        ...(resend
          ? {
              resent_count: (existing.resent_count || 0) + 1,
              last_resent_at: new Date().toISOString(),
              last_resent_by: user?.email || '',
            }
          : {}),
      });
      if (resend) {
        await recordHistory(
          'resend_nf_request',
          `Solicitação de NF reenviada${changedLabels ? ` (alterações: ${changedLabels})` : ''}`,
          { nf_request_id: existing.id },
        );
        toast.success('Solicitação de NF reenviada');
      } else {
        if (!changes.length) {
          toast.info('Nenhuma alteração foi realizada');
          return;
        }
        await recordHistory('update_nf_request', `Campos alterados: ${changedLabels}`, {
          nf_request_id: existing.id,
          campos_alterados: changes.map((c) => c.field_label),
        });
        toast.success('Alterações salvas e auditadas');
      }
      refreshRequests();
    } catch (error) {
      toast.error(error?.message || 'Não foi possível salvar a solicitação');
    } finally {
      setSaving(null);
    }
  };

  const handlePrint = () => {
    if (!printNfRequest(exportRecord())) {
      toast.error('Não foi possível abrir a impressão (verifique o bloqueador de pop-ups)');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitação de Emissão de NF</DialogTitle>
          <DialogDescription>
            Formulário preenchido automaticamente com os dados da GDM, do item e do
            fornecedor — todos os campos permanecem editáveis e as alterações são auditadas.
          </DialogDescription>
        </DialogHeader>

        {!form ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
          </div>
        ) : (
          <div className="space-y-5">
            <Section title="Dados da GDM">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Número da GDM">
                  <Input
                    value={form.gdm_number}
                    onChange={(e) => setField('gdm_number', e.target.value)}
                  />
                </Field>
                <Field label="Embarcação">
                  <Input
                    value={form.vessel_name}
                    onChange={(e) => setField('vessel_name', e.target.value)}
                  />
                </Field>
                <Field label="Data da Solicitação">
                  <Input
                    type="date"
                    value={form.request_date?.slice(0, 10) || ''}
                    onChange={(e) =>
                      setField(
                        'request_date',
                        e.target.value ? `${e.target.value}T12:00:00` : '',
                      )
                    }
                  />
                </Field>
                <Field label="Usuário Solicitante">
                  <Input
                    value={form.requester_name}
                    onChange={(e) => setField('requester_name', e.target.value)}
                  />
                </Field>
                <Field label="Objetivo da Remessa">
                  <Input
                    value={form.shipment_objective}
                    onChange={(e) => setField('shipment_objective', e.target.value)}
                  />
                </Field>
                <Field label="Destino do Equipamento">
                  <Input
                    value={form.destination}
                    onChange={(e) => setField('destination', e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Dados do Fornecedor">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Razão Social" className="md:col-span-2">
                  <Input
                    value={form.supplier_company_name}
                    onChange={(e) => setField('supplier_company_name', e.target.value)}
                  />
                </Field>
                <Field label="CNPJ">
                  <Input
                    value={form.supplier_cnpj}
                    onChange={(e) => setField('supplier_cnpj', e.target.value)}
                  />
                </Field>
                <Field label="Endereço" className="md:col-span-3">
                  <Input
                    value={form.supplier_address}
                    onChange={(e) => setField('supplier_address', e.target.value)}
                  />
                </Field>
                <Field label="Cidade">
                  <Input
                    value={form.supplier_city}
                    onChange={(e) => setField('supplier_city', e.target.value)}
                  />
                </Field>
                <Field label="Estado">
                  <Input
                    value={form.supplier_state}
                    onChange={(e) => setField('supplier_state', e.target.value)}
                  />
                </Field>
                <Field label="CEP">
                  <Input
                    value={form.supplier_zip}
                    onChange={(e) => setField('supplier_zip', e.target.value)}
                  />
                </Field>
                <Field label="Telefone">
                  <Input
                    value={form.supplier_phone}
                    onChange={(e) => setField('supplier_phone', e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Equipamentos (Itens da NF)">
              <NfItemsEditor items={form.nf_items} onChange={(items) => setField('nf_items', items)} />
            </Section>

            <Section title="Dados Logísticos">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Transportadora">
                  <Input value={form.carrier} onChange={(e) => setField('carrier', e.target.value)} />
                </Field>
                <Field label="Frete">
                  <Input
                    value={form.freight_type}
                    onChange={(e) => setField('freight_type', e.target.value)}
                  />
                </Field>
                <Field label="Tipo de Operação">
                  <Input
                    value={form.operation_type}
                    onChange={(e) => setField('operation_type', e.target.value)}
                  />
                </Field>
                <Field label="Natureza da Operação">
                  <Input
                    value={form.operation_nature}
                    onChange={(e) => setField('operation_nature', e.target.value)}
                  />
                </Field>
                <Field label="CFOP">
                  <Input value={form.cfop} onChange={(e) => setField('cfop', e.target.value)} />
                </Field>
              </div>
            </Section>

            <Section title="Observações">
              <Textarea
                rows={3}
                value={form.observations}
                onChange={(e) => setField('observations', e.target.value)}
                placeholder="Observações da solicitação..."
              />
            </Section>

            {existing && (
              <Section title="Auditoria de Alterações">
                {existing.resent_count > 0 && (
                  <p className="text-xs text-slate-500">
                    Solicitação reenviada {existing.resent_count}x · Último reenvio:{' '}
                    {existing.last_resent_by || '—'}
                  </p>
                )}
                <NfAuditList changes={existing.audit_changes || []} />
              </Section>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {existing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!form}
                  onClick={() => exportNfSpreadsheet(exportRecord())}
                >
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!form}
                  onClick={() => exportNfPdf(exportRecord())}
                >
                  PDF
                </Button>
                <Button variant="outline" size="sm" disabled={!form} onClick={handlePrint}>
                  Imprimir
                </Button>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onClose}>
              {existing ? 'Fechar' : 'Cancelar'}
            </Button>
            {existing ? (
              <>
                <Button
                  variant="secondary"
                  disabled={!!saving}
                  onClick={() => handleSave({ resend: true })}
                >
                  {saving === 'resend' ? 'Reenviando...' : 'Reenviar'}
                </Button>
                <Button disabled={!!saving} onClick={() => handleSave()}>
                  {saving === 'save' ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </>
            ) : (
              <Button disabled={!form || !!saving} onClick={handleCreate}>
                {saving === 'create' ? 'Gerando...' : 'Gerar Solicitação de NF'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}