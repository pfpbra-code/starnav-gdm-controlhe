import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import GDMTimeline from '@/components/gdm/GDMTimeline';
import GDMPdfButton from '@/components/gdm/GDMPdfButton';
import QuoteSummary from '@/components/gdm/QuoteSummary';
import ProposalsHistory from '@/components/gdm/ProposalsHistory';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Ship,
  Package,
  Calendar,
  Hash,
  FileText,
  CheckCircle,
  XCircle,
  Send,
  Building2,
  DollarSign,
  Wrench,
  Upload,
  Loader2,
  ArrowLeft,
  History,
  Image,
  Percent,
  FileCheck2,
  ClipboardCheck,
  ListChecks,
  Flag,
  Paperclip,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildHistoryEntry,
  snapshotCurrentQuote,
  STATUS_LABELS,
  STEP_NAMES,
  ROLE_LABELS,
  QUOTE_ATTACH_STATUSES,
  addProposal,
  validateProposalFile,
  fileNameFromUrl,
} from '@/lib/gdmWorkflow';

export default function GDMDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const gdmId = urlParams.get('id');

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showSendSupplierDialog, setShowSendSupplierDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [showPwtDialog, setShowPwtDialog] = useState(false);
  const [showOcDialog, setShowOcDialog] = useState(false);
  const [showOtDialog, setShowOtDialog] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);

  const [coordinatorNotes, setCoordinatorNotes] = useState('');
  const [destination, setDestination] = useState('');
  const [repairReturn, setRepairReturn] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [quoteValue, setQuoteValue] = useState('');
  const [quoteDocument, setQuoteDocument] = useState('');
  const [technicalReport, setTechnicalReport] = useState('');
  const [maintenanceDecision, setMaintenanceDecision] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [pwtNumber, setPwtNumber] = useState('');
  const [pwtNotes, setPwtNotes] = useState('');
  const [ocNumber, setOcNumber] = useState('');
  const [ocNotes, setOcNotes] = useState('');
  const [otNumber, setOtNumber] = useState('');
  const [otNotes, setOtNotes] = useState('');
  const [finalizeNotes, setFinalizeNotes] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: gdm, isLoading } = useQuery({
    queryKey: ['gdm', gdmId],
    queryFn: () => base44.entities.GDM.filter({ id: gdmId }).then(res => res[0]),
    enabled: !!gdmId,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.filter({ status: 'active' }),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.GDM.update(gdmId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gdm', gdmId] });
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
      toast.success('GDM atualizada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar GDM');
    }
  });

  // Real-time: reflect status changes live
  useEffect(() => {
    if (!gdmId) return;
    const unsubscribe = base44.entities.GDM.subscribe((event) => {
      if (event?.data?.id === gdmId || event?.id === gdmId) {
        queryClient.invalidateQueries({ queryKey: ['gdm', gdmId] });
      }
    });
    return unsubscribe;
  }, [gdmId, queryClient]);

  const buildHistory = (params) => [
    ...(gdm?.history || []),
    buildHistoryEntry({ ...params, user }),
  ];

  const openDocument = async (url) => {
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      if (!win) window.open(url, '_blank');
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleFileUpload = async (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    const validation = validateProposalFile(file);
    if (!validation.ok) {
      toast.error(validation.error);
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setter(result.file_url);
      toast.success('Arquivo enviado!');
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  // Coordinator Actions
  const handleCoordinatorApprove = () => {
    const fullDestination = destination === 'reparo' && repairReturn
      ? `${destination} - ${repairReturn}`
      : destination;
    const previousStatus = gdm.status;
    const newStatus = 'pending_services';
    updateMutation.mutate({
      status: newStatus,
      coordinator_notes: coordinatorNotes,
      destination: fullDestination,
      coordinator_approved_by: user?.email,
      coordinator_approved_at: new Date().toISOString(),
      history: buildHistory({
        action: 'coordinator_approved',
        details: `GDM aprovada pelo coordenador. Destino: ${fullDestination}.`,
        previousStatus,
        newStatus,
        stepName: STEP_NAMES.pending_coordinator,
        observation: coordinatorNotes,
      }),
    });
    setShowApproveDialog(false);
    setDestination('');
    setRepairReturn('');
    setCoordinatorNotes('');
    setConfirmPassword('');
  };

  const handleCoordinatorReject = () => {
    const previousStatus = gdm.status;
    const newStatus = 'rejected';
    updateMutation.mutate({
      status: newStatus,
      coordinator_notes: coordinatorNotes,
      coordinator_approved_by: user?.email,
      coordinator_approved_at: new Date().toISOString(),
      history: buildHistory({
        action: 'coordinator_rejected',
        details: `GDM reprovada pelo coordenador. Motivo: ${coordinatorNotes}`,
        previousStatus,
        newStatus,
        stepName: STEP_NAMES.rejected,
        observation: coordinatorNotes,
      }),
    });
    setShowRejectDialog(false);
    setCoordinatorNotes('');
    setConfirmPassword('');
  };

  // Services Actions
  const handleSendToSupplier = () => {
    const supplier = suppliers.find(s => s.id === selectedSupplier);
    const previousStatus = gdm.status;
    const newStatus = 'sent_to_supplier';
    updateMutation.mutate({
      status: newStatus,
      supplier_id: selectedSupplier,
      supplier_name: supplier?.company_name,
      invoice_number: invoiceNumber,
      sent_to_supplier_date: new Date().toISOString(),
      sent_by: user?.email,
      history: buildHistory({
        action: 'sent_to_supplier',
        details: `Material enviado para ${supplier?.company_name}. NF: ${invoiceNumber || '-'}.`,
        previousStatus,
        newStatus,
        stepName: STEP_NAMES.pending_services,
        observation: invoiceNumber ? `NF: ${invoiceNumber}` : '',
      }),
    });
    setShowSendSupplierDialog(false);
    setSelectedSupplier('');
    setInvoiceNumber('');
    setConfirmPassword('');
  };

  // Quote attachment (supplier or services) — forwards automatically to maintenance
  const handleSubmitQuote = async () => {
    let quoteUrl = quoteDocument;
    let reportUrl = technicalReport;

    const previousStatus = gdm.status;
    const newStatus = 'quote_analysis';
    // Preserve any existing quote/proposal in history before overwriting
    const quotesHistory = (gdm.quote_value || gdm.quote_document_url || gdm.commercial_proposal_url)
      ? snapshotCurrentQuote(gdm, 'Nova cotação/proposta anexada')
      : (gdm.quotes_history || []);

    const proposals = addProposal(gdm, {
      supplier_name: gdm.supplier_name,
      quote_value: parseFloat(quoteValue),
      registered_by: user?.email,
      file_url: quoteUrl,
      technical_report_url: reportUrl,
      notes: 'Cotação/proposta anexada',
    });

    updateMutation.mutate({
      status: newStatus,
      quote_value: parseFloat(quoteValue),
      quote_document_url: quoteUrl,
      technical_report_url: reportUrl,
      quotes_history: quotesHistory,
      proposals,
      history: buildHistory({
        action: 'quote_attached',
        details: `Cotação anexada (R$ ${quoteValue}). Processo encaminhado à Manutenção.`,
        previousStatus,
        newStatus,
        stepName: STEP_NAMES.quote_attached,
        observation: `Valor: R$ ${quoteValue}`,
      }),
    });
    setShowQuoteDialog(false);
    setQuoteValue('');
    setQuoteDocument('');
    setTechnicalReport('');
    setConfirmPassword('');
  };

  // Maintenance Actions
  const handleMaintenanceDecision = () => {
    const previousStatus = gdm.status;
    let updates = {
      maintenance_decision: maintenanceDecision,
      maintenance_notes: maintenanceNotes,
      maintenance_decided_by: user?.email,
      maintenance_decided_at: new Date().toISOString(),
    };

    if (maintenanceDecision === 'approved') {
      updates.status = 'approved';
      updates.history = buildHistory({
        action: 'maintenance_approved',
        details: 'Cotação aprovada pelo Gestor de Manutenção.',
        previousStatus,
        newStatus: 'approved',
        stepName: STEP_NAMES.quote_analysis,
        observation: maintenanceNotes,
      });
    } else if (maintenanceDecision === 'rejected') {
      updates.status = 'rejected';
      updates.history = buildHistory({
        action: 'maintenance_rejected',
        details: `Cotação reprovada pela manutenção. Motivo: ${maintenanceNotes}`,
        previousStatus,
        newStatus: 'rejected',
        stepName: STEP_NAMES.rejected,
        observation: maintenanceNotes,
      });
    } else if (maintenanceDecision === 'discount_requested') {
      updates.status = 'new_quote_requested';
      updates.discount_percentage = parseFloat(discountPercentage);
      updates.quotes_history = snapshotCurrentQuote(gdm, `Desconto de ${discountPercentage}% solicitado`);
      updates.history = buildHistory({
        action: 'discount_requested',
        details: `Solicitado desconto de ${discountPercentage}%. Cotação atual preservada no histórico.`,
        previousStatus,
        newStatus: 'new_quote_requested',
        stepName: STEP_NAMES.new_quote_requested,
        observation: maintenanceNotes,
      });
    } else if (maintenanceDecision === 'new_quote_requested') {
      updates.status = 'new_quote_requested';
      updates.quotes_history = snapshotCurrentQuote(gdm, 'Nova cotação de outro fornecedor solicitada');
      updates.history = buildHistory({
        action: 'new_quote_requested',
        details: 'Manutenção solicitou nova cotação. Cotação anterior preservada no histórico.',
        previousStatus,
        newStatus: 'new_quote_requested',
        stepName: STEP_NAMES.new_quote_requested,
        observation: maintenanceNotes,
      });
    }

    updateMutation.mutate(updates);
    setShowMaintenanceDialog(false);
    setMaintenanceDecision('');
    setMaintenanceNotes('');
    setDiscountPercentage('');
    setConfirmPassword('');
  };

  // PWT issuance (Maintenance, after approval)
  const handleIssuePWT = () => {
    const previousStatus = gdm.status;
    const newStatus = 'pwt_issued';
    updateMutation.mutate({
      status: newStatus,
      pwt_number: pwtNumber,
      pwt_issued_by: user?.email,
      pwt_issued_at: new Date().toISOString(),
      history: buildHistory({
        action: 'pwt_issued',
        details: `PWT emitido pela Manutenção${pwtNumber ? ` (${pwtNumber})` : ''}.`,
        previousStatus,
        newStatus,
        stepName: STEP_NAMES.approved,
        observation: pwtNotes,
      }),
    });
    setShowPwtDialog(false);
    setPwtNumber('');
    setPwtNotes('');
    setConfirmPassword('');
  };

  // OC issuance (Services/Compras)
  const handleIssueOC = () => {
    const previousStatus = gdm.status;
    const newStatus = 'oc_issued';
    updateMutation.mutate({
      status: newStatus,
      oc_number: ocNumber,
      oc_issued_by: user?.email,
      oc_issued_at: new Date().toISOString(),
      history: buildHistory({
        action: 'oc_issued',
        details: `Ordem de Compra emitida${ocNumber ? ` (${ocNumber})` : ''}.`,
        previousStatus,
        newStatus,
        stepName: STEP_NAMES.pwt_issued,
        observation: ocNotes,
      }),
    });
    setShowOcDialog(false);
    setOcNumber('');
    setOcNotes('');
    setConfirmPassword('');
  };

  // OT issuance (Services/Compras)
  const handleIssueOT = () => {
    const previousStatus = gdm.status;
    const newStatus = 'ot_issued';
    updateMutation.mutate({
      status: newStatus,
      ot_number: otNumber,
      ot_issued_by: user?.email,
      ot_issued_at: new Date().toISOString(),
      history: buildHistory({
        action: 'ot_issued',
        details: `Ordem de Trabalho emitida${otNumber ? ` (${otNumber})` : ''}.`,
        previousStatus,
        newStatus,
        stepName: STEP_NAMES.oc_issued,
        observation: otNotes,
      }),
    });
    setShowOtDialog(false);
    setOtNumber('');
    setOtNotes('');
    setConfirmPassword('');
  };

  // Finalize process (Services/Compras)
  const handleFinalize = () => {
    const previousStatus = gdm.status;
    const newStatus = 'completed';
    updateMutation.mutate({
      status: newStatus,
      completed_by: user?.email,
      completed_at: new Date().toISOString(),
      history: buildHistory({
        action: 'process_finalized',
        details: 'Processo finalizado por Serviços/Compras.',
        previousStatus,
        newStatus,
        stepName: STEP_NAMES.ot_issued,
        observation: finalizeNotes,
      }),
    });
    setShowFinalizeDialog(false);
    setFinalizeNotes('');
    setConfirmPassword('');
  };

  const canCoordinatorAct = user?.role === 'coordinator' || user?.role === 'admin';
  const canServicesAct = user?.role === 'services' || user?.role === 'admin';
  const canSupplierAct = user?.role === 'supplier_user';
  const canMaintenanceAct = user?.role === 'maintenance' || user?.role === 'admin';
  const canAttachQuote = canSupplierAct || canServicesAct;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!gdm) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">GDM não encontrada</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(createPageUrl('GDMList'))}>
            Voltar para lista
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('GDMList'))}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">GDM {gdm.gdm_number}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={gdm.status} />
              <StatusBadge status={gdm.treatment} type="treatment" />
            </div>
          </div>
        </div>

        {/* Action Buttons based on status and role */}
        <div className="flex gap-3 items-center">
          <GDMPdfButton gdm={gdm} variant="outline" label="Gerar PDF" />
          {gdm.status === 'pending_coordinator' && canCoordinatorAct && (
            <>
              <Button variant="outline" onClick={() => setShowRejectDialog(true)}>
                <XCircle className="h-4 w-4 mr-2" />
                Reprovar
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowApproveDialog(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            </>
          )}

          {gdm.status === 'pending_services' && canServicesAct && (
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setShowSendSupplierDialog(true)}>
              <Send className="h-4 w-4 mr-2" />
              Enviar ao Fornecedor
            </Button>
          )}

          {QUOTE_ATTACH_STATUSES.includes(gdm.status) && canAttachQuote && (
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setShowQuoteDialog(true)}>
              <Paperclip className="h-4 w-4 mr-2" />
              Anexar Cotação/Proposta
            </Button>
          )}

          {gdm.status === 'quote_analysis' && canMaintenanceAct && (
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setShowMaintenanceDialog(true)}>
              <Wrench className="h-4 w-4 mr-2" />
              Analisar Cotação
            </Button>
          )}

          {gdm.status === 'approved' && canMaintenanceAct && (
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => setShowPwtDialog(true)}>
              <FileCheck2 className="h-4 w-4 mr-2" />
              Emitir PWT
            </Button>
          )}

          {gdm.status === 'pwt_issued' && canServicesAct && (
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowOcDialog(true)}>
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Emitir OC
            </Button>
          )}

          {gdm.status === 'oc_issued' && canServicesAct && (
            <Button className="bg-lime-600 hover:bg-lime-700" onClick={() => setShowOtDialog(true)}>
              <ListChecks className="h-4 w-4 mr-2" />
              Emitir OT
            </Button>
          )}

          {gdm.status === 'ot_issued' && canServicesAct && (
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowFinalizeDialog(true)}>
              <Flag className="h-4 w-4 mr-2" />
              Finalizar Processo
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="space-y-6">
            <TabsList>
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="photos">Fotos</TabsTrigger>
              {gdm.quote_value && <TabsTrigger value="quote">Cotação</TabsTrigger>}
              {(gdm.proposals?.length > 0 || gdm.quote_value) && (
                <TabsTrigger value="proposals">Propostas</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="details">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Informações da GDM</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current step & responsible */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-sky-50 rounded-xl border border-sky-100">
                    <div>
                      <p className="text-xs text-sky-700 font-medium uppercase tracking-wide">Etapa atual do processo</p>
                      <p className="text-base font-semibold text-slate-900">
                        {STATUS_LABELS[gdm.status] || gdm.status}
                      </p>
                      <p className="text-sm text-slate-600">{STEP_NAMES[gdm.status] || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-sky-600" />
                      <div>
                        <p className="text-xs text-slate-500">Responsável atual</p>
                        <p className="font-medium text-slate-900">
                          {user?.full_name || user?.email || '-'}
                        </p>
                        <p className="text-xs text-slate-500">{ROLE_LABELS[user?.role] || user?.role}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-sky-100 flex items-center justify-center">
                        <Ship className="h-5 w-5 text-sky-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Embarcação</p>
                        <p className="font-medium">{gdm.vessel_name || '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Package className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Equipamento</p>
                        <p className="font-medium">{gdm.equipment_name || '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Data de Desembarque</p>
                        <p className="font-medium">
                          {gdm.disembark_date
                            ? format(new Date(gdm.disembark_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                            : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Hash className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Número de Série</p>
                        <p className="font-medium">{gdm.serial_number || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {gdm.description && (
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Descrição</p>
                      <p className="text-slate-700 bg-slate-50 p-4 rounded-lg">{gdm.description}</p>
                    </div>
                  )}

                  {gdm.coordinator_notes && (
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Observações do Coordenador</p>
                      <p className="text-slate-700 bg-slate-50 p-4 rounded-lg">{gdm.coordinator_notes}</p>
                    </div>
                  )}

                  {gdm.supplier_name && (
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Fornecedor</p>
                        <p className="font-medium">{gdm.supplier_name}</p>
                        {gdm.invoice_number && (
                          <p className="text-sm text-slate-500">NF: {gdm.invoice_number}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="photos">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Fotos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {gdm.photos && gdm.photos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {gdm.photos.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={url}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-40 object-cover rounded-lg hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma foto anexada</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {gdm.quote_value && (
              <TabsContent value="quote">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Cotação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-500">Valor</p>
                      <p className="text-2xl font-bold text-slate-900">
                        R$ {gdm.quote_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {gdm.quote_document_url && (
                      <div>
                        <p className="text-sm text-slate-500 mb-2">Documento da Cotação</p>
                        <a
                          href={gdm.quote_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { e.preventDefault(); openDocument(gdm.quote_document_url); }}
                          className="text-sky-600 hover:underline cursor-pointer"
                        >
                          Ver documento
                        </a>
                      </div>
                    )}

                    {gdm.technical_report_url && (
                      <div>
                        <p className="text-sm text-slate-500 mb-2">Laudo Técnico</p>
                        <a
                          href={gdm.technical_report_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { e.preventDefault(); openDocument(gdm.technical_report_url); }}
                          className="text-sky-600 hover:underline cursor-pointer"
                        >
                          Ver laudo
                        </a>
                      </div>
                    )}

                    {gdm.commercial_proposal_url && (
                      <div>
                        <p className="text-sm text-slate-500 mb-2">Proposta Comercial (Fornecedor)</p>
                        <a
                          href={gdm.commercial_proposal_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { e.preventDefault(); openDocument(gdm.commercial_proposal_url); }}
                          className="text-sky-600 hover:underline cursor-pointer"
                        >
                          Ver proposta
                        </a>
                        {gdm.commercial_proposal_uploaded_at && (
                          <p className="text-xs text-slate-400 mt-1">
                            Anexada em {format(new Date(gdm.commercial_proposal_uploaded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    )}

                    {gdm.pwt_number && (
                      <div>
                        <p className="text-sm text-slate-500 mb-2">PWT</p>
                        <p className="font-medium">{gdm.pwt_number}</p>
                        {gdm.pwt_issued_at && (
                          <p className="text-xs text-slate-400">
                            Emitido em {format(new Date(gdm.pwt_issued_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    )}

                    {gdm.oc_number && (
                      <div>
                        <p className="text-sm text-slate-500 mb-2">Ordem de Compra (OC)</p>
                        <p className="font-medium">{gdm.oc_number}</p>
                      </div>
                    )}

                    {gdm.ot_number && (
                      <div>
                        <p className="text-sm text-slate-500 mb-2">Ordem de Trabalho (OT)</p>
                        <p className="font-medium">{gdm.ot_number}</p>
                      </div>
                    )}

                    {gdm.quotes_history && gdm.quotes_history.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-slate-500 mb-2">
                          Cotações/Propostas Anteriores (preservadas para auditoria)
                        </p>
                        <div className="space-y-3">
                          {gdm.quotes_history.map((q, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-slate-700">
                                  Cotação #{idx + 1}
                                  {q.supplier_name ? ` — ${q.supplier_name}` : ''}
                                </span>
                                {q.preserved_at && (
                                  <span className="text-xs text-slate-400">
                                    {format(new Date(q.preserved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                )}
                              </div>
                              {q.quote_value != null && (
                                <p className="text-slate-600 mt-1">Valor: R$ {Number(q.quote_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              )}
                              {q.discount_percentage != null && (
                                <p className="text-slate-600">Desconto solicitado: {q.discount_percentage}%</p>
                              )}
                              {q.reason && <p className="text-xs text-slate-500 italic">{q.reason}</p>}
                              <div className="flex flex-wrap gap-3 mt-1">
                                {q.quote_document_url && (
                                  <a href={q.quote_document_url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline text-xs">Ver cotação</a>
                                )}
                                {q.commercial_proposal_url && (
                                  <a href={q.commercial_proposal_url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline text-xs">Ver proposta</a>
                                )}
                                {q.technical_report_url && (
                                  <a href={q.technical_report_url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline text-xs">Ver laudo</a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {gdm.maintenance_decision && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-slate-500 mb-2">Decisão da Manutenção</p>
                        <StatusBadge status={
                          gdm.maintenance_decision === 'approved' ? 'approved'
                          : gdm.maintenance_decision === 'rejected' ? 'rejected'
                          : gdm.maintenance_decision === 'new_quote_requested' ? 'new_quote_requested'
                          : 'awaiting_quote'
                        } />
                        {gdm.discount_percentage && (
                          <p className="mt-2 text-sm">Desconto solicitado: {gdm.discount_percentage}%</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {(gdm.proposals?.length > 0 || gdm.quote_value) && (
              <TabsContent value="proposals" className="space-y-6">
                <QuoteSummary gdm={gdm} />
                <ProposalsHistory gdm={gdm} />
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Timeline */}
        <div>
          <Card className="border-0 shadow-sm sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GDMTimeline history={gdm.history} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Coordinator Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar GDM</DialogTitle>
            <DialogDescription>
              Confirme a aprovação da GDM e defina o destino do material.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Destino do Material *</Label>
              <Select value={destination} onValueChange={(value) => {
                setDestination(value);
                setRepairReturn('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o destino do material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reparo">Reparo</SelectItem>
                  <SelectItem value="calibracao">Calibração</SelectItem>
                  <SelectItem value="descarte">Descarte</SelectItem>
                  <SelectItem value="retorno_estoque">Retorno para Estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {destination === 'reparo' && (
              <div className="space-y-2">
                <Label>Retorno após reparo *</Label>
                <Select value={repairReturn} onValueChange={setRepairReturn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o destino após reparo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retorno_bordo">Retorno para Bordo</SelectItem>
                    <SelectItem value="retorno_estoque">Retorno para Estoque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observação *</Label>
              <Textarea
                value={coordinatorNotes}
                onChange={(e) => setCoordinatorNotes(e.target.value)}
                placeholder="Justifique a aprovação (obrigatório para rastreabilidade)..."
              />
            </div>
            <p className="text-xs text-slate-500">
              Responsável: {user?.full_name || user?.email} • Etapa: {STATUS_LABELS[gdm.status]} → Aguardando Serviços/Compras
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleCoordinatorApprove}
              disabled={updateMutation.isPending || !destination || (destination === 'reparo' && !repairReturn) || !coordinatorNotes}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coordinator Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar GDM</DialogTitle>
            <DialogDescription>
              Informe o motivo da reprovação da GDM.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo da Reprovação *</Label>
              <Textarea
                value={coordinatorNotes}
                onChange={(e) => setCoordinatorNotes(e.target.value)}
                placeholder="Descreva o motivo da reprovação..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCoordinatorReject}
              disabled={updateMutation.isPending || !coordinatorNotes}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send to Supplier Dialog */}
      <Dialog open={showSendSupplierDialog} onOpenChange={setShowSendSupplierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar ao Fornecedor</DialogTitle>
            <DialogDescription>
              Selecione o fornecedor e informe os dados de envio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fornecedor *</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Número da Nota Fiscal</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ex: NF-12345"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendSupplierDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={handleSendToSupplier}
              disabled={updateMutation.isPending || !selectedSupplier}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Quote Dialog */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Cotação</DialogTitle>
            <DialogDescription>
              Preencha os dados da cotação e anexe os documentos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor da Cotação (R$) *</Label>
              <Input
                type="number"
                value={quoteValue}
                onChange={(e) => setQuoteValue(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Anexos aceitos apenas em PDF, XLSX ou XLS.
            </p>

            <div className="space-y-2">
              <Label>Documento da Cotação</Label>
              <div className="flex gap-2">
                <Input
                  value={quoteDocument ? fileNameFromUrl(quoteDocument) : ''}
                  readOnly
                  placeholder="Nenhum arquivo selecionado"
                  disabled={uploading}
                />
                <div>
                  <input
                    type="file"
                    id="quote-doc"
                    className="hidden"
                    accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={(e) => handleFileUpload(e, setQuoteDocument)}
                    disabled={uploading}
                  />
                  <label htmlFor="quote-doc">
                    <Button type="button" variant="outline" asChild disabled={uploading}>
                      <span>
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
              {quoteDocument && (
                <a href={quoteDocument} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline">
                  Ver arquivo anexado
                </a>
              )}
            </div>

            <div className="space-y-2">
              <Label>Laudo Técnico</Label>
              <div className="flex gap-2">
                <Input
                  value={technicalReport ? fileNameFromUrl(technicalReport) : ''}
                  readOnly
                  placeholder="Nenhum arquivo selecionado"
                  disabled={uploading}
                />
                <div>
                  <input
                    type="file"
                    id="tech-report"
                    className="hidden"
                    accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={(e) => handleFileUpload(e, setTechnicalReport)}
                    disabled={uploading}
                  />
                  <label htmlFor="tech-report">
                    <Button type="button" variant="outline" asChild disabled={uploading}>
                      <span>
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
              {technicalReport && (
                <a href={technicalReport} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:underline">
                  Ver arquivo anexado
                </a>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={handleSubmitQuote}
              disabled={updateMutation.isPending || !quoteValue}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar Cotação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance Decision Dialog */}
      <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Análise da Cotação</DialogTitle>
            <DialogDescription>
              Analise a cotação e tome uma decisão.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-50 rounded-lg mb-4">
              <p className="text-sm text-slate-500">Valor da Cotação</p>
              <p className="text-2xl font-bold">
                R$ {gdm.quote_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Decisão *</Label>
              <Select value={maintenanceDecision} onValueChange={setMaintenanceDecision}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a decisão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Aprovar Cotação</SelectItem>
                  <SelectItem value="discount_requested">Reprovar e Solicitar Desconto</SelectItem>
                  <SelectItem value="new_quote_requested">Solicitar Nova Cotação (outro fornecedor)</SelectItem>
                  <SelectItem value="rejected">Reprovar Definitivamente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {maintenanceDecision === 'discount_requested' && (
              <div className="space-y-2">
                <Label>Percentual de Desconto (%)</Label>
                <Input
                  type="number"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  placeholder="Ex: 10"
                />
                <p className="text-xs text-slate-500">A cotação atual será preservada no histórico.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observação *</Label>
              <Textarea
                value={maintenanceNotes}
                onChange={(e) => setMaintenanceNotes(e.target.value)}
                placeholder="Justifique a decisão (obrigatório para rastreabilidade)..."
              />
            </div>
            <p className="text-xs text-slate-500">
              Responsável: {user?.full_name || user?.email} • A cotação atual não será excluída — permanecerá registrada no histórico.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMaintenanceDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={handleMaintenanceDecision}
              disabled={updateMutation.isPending || !maintenanceDecision || !maintenanceNotes}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Decisão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PWT Issuance Dialog */}
      <Dialog open={showPwtDialog} onOpenChange={setShowPwtDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emitir PWT</DialogTitle>
            <DialogDescription>
              A Manutenção emite o PWT após a aprovação final da cotação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Número do PWT</Label>
              <Input value={pwtNumber} onChange={(e) => setPwtNumber(e.target.value)} placeholder="Ex: PWT-0001" />
            </div>
            <div className="space-y-2">
              <Label>Observação *</Label>
              <Textarea value={pwtNotes} onChange={(e) => setPwtNotes(e.target.value)} placeholder="Justifique a emissão (obrigatório)..." />
            </div>
            <p className="text-xs text-slate-500">
              Responsável: {user?.full_name || user?.email} • Etapa: {STATUS_LABELS[gdm.status]} → PWT Emitido
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPwtDialog(false)}>Cancelar</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleIssuePWT} disabled={updateMutation.isPending || !pwtNotes}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Emitir PWT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OC Issuance Dialog */}
      <Dialog open={showOcDialog} onOpenChange={setShowOcDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emitir Ordem de Compra (OC)</DialogTitle>
            <DialogDescription>
              Serviços/Compras recebe o processo e emite a OC.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Número da OC</Label>
              <Input value={ocNumber} onChange={(e) => setOcNumber(e.target.value)} placeholder="Ex: OC-0001" />
            </div>
            <div className="space-y-2">
              <Label>Observação *</Label>
              <Textarea value={ocNotes} onChange={(e) => setOcNotes(e.target.value)} placeholder="Justifique a emissão (obrigatório)..." />
            </div>
            <p className="text-xs text-slate-500">
              Responsável: {user?.full_name || user?.email} • Etapa: {STATUS_LABELS[gdm.status]} → OC Emitida
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOcDialog(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleIssueOC} disabled={updateMutation.isPending || !ocNotes}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Emitir OC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OT Issuance Dialog */}
      <Dialog open={showOtDialog} onOpenChange={setShowOtDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emitir Ordem de Trabalho (OT)</DialogTitle>
            <DialogDescription>
              Serviços/Compras emite a OT após a OC.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Número da OT</Label>
              <Input value={otNumber} onChange={(e) => setOtNumber(e.target.value)} placeholder="Ex: OT-0001" />
            </div>
            <div className="space-y-2">
              <Label>Observação *</Label>
              <Textarea value={otNotes} onChange={(e) => setOtNotes(e.target.value)} placeholder="Justifique a emissão (obrigatório)..." />
            </div>
            <p className="text-xs text-slate-500">
              Responsável: {user?.full_name || user?.email} • Etapa: {STATUS_LABELS[gdm.status]} → OT Emitida
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOtDialog(false)}>Cancelar</Button>
            <Button className="bg-lime-600 hover:bg-lime-700" onClick={handleIssueOT} disabled={updateMutation.isPending || !otNotes}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Emitir OT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalize Dialog */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Processo</DialogTitle>
            <DialogDescription>
              Confirme o encerramento do processo da GDM.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Observação *</Label>
              <Textarea value={finalizeNotes} onChange={(e) => setFinalizeNotes(e.target.value)} placeholder="Confirme o encerramento (obrigatório)..." />
            </div>
            <p className="text-xs text-slate-500">
              Responsável: {user?.full_name || user?.email} • Etapa: {STATUS_LABELS[gdm.status]} → Processo Finalizado
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleFinalize} disabled={updateMutation.isPending || !finalizeNotes}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Finalizar Processo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}