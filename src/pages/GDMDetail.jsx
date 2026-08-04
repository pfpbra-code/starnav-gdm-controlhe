import React, { useState } from 'react';
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
  Percent
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";

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

  const addHistoryEntry = (action, details) => {
    return [
      ...(gdm?.history || []),
      {
        action,
        user: user?.email,
        timestamp: new Date().toISOString(),
        details
      }
    ];
  };

  // Coordinator Actions
  const handleCoordinatorApprove = () => {
    const fullDestination = destination === 'reparo' && repairReturn
      ? `${destination} - ${repairReturn}`
      : destination;
    updateMutation.mutate({
      status: 'pending_services',
      coordinator_notes: coordinatorNotes,
      destination: fullDestination,
      coordinator_approved_by: user?.email,
      coordinator_approved_at: new Date().toISOString(),
      history: addHistoryEntry('coordinator_approved', `Aprovado pelo coordenador. Destino: ${fullDestination}`)
    });
    setShowApproveDialog(false);
    setDestination('');
    setRepairReturn('');
  };

  const handleCoordinatorReject = () => {
    updateMutation.mutate({
      status: 'rejected',
      coordinator_notes: coordinatorNotes,
      coordinator_approved_by: user?.email,
      coordinator_approved_at: new Date().toISOString(),
      history: addHistoryEntry('coordinator_rejected', `Reprovado pelo coordenador. Motivo: ${coordinatorNotes}`)
    });
    setShowRejectDialog(false);
  };

  // Services Actions
  const handleSendToSupplier = () => {
    const supplier = suppliers.find(s => s.id === selectedSupplier);
    updateMutation.mutate({
      status: 'awaiting_quote',
      supplier_id: selectedSupplier,
      supplier_name: supplier?.company_name,
      invoice_number: invoiceNumber,
      sent_to_supplier_date: new Date().toISOString(),
      sent_by: user?.email,
      history: addHistoryEntry('sent_to_supplier', `Material enviado para ${supplier?.company_name}. NF: ${invoiceNumber}`)
    });
    setShowSendSupplierDialog(false);
  };

  // Supplier Actions
  const handleSubmitQuote = async () => {
    let quoteUrl = quoteDocument;
    let reportUrl = technicalReport;

    // Upload documents if they are files
    // For now, we'll assume the user provides URLs

    updateMutation.mutate({
      status: 'quote_analysis',
      quote_value: parseFloat(quoteValue),
      quote_document_url: quoteUrl,
      technical_report_url: reportUrl,
      history: addHistoryEntry('quote_received', `Cotação recebida: R$ ${quoteValue}`)
    });
    setShowQuoteDialog(false);
  };

  // Maintenance Actions
  const handleMaintenanceDecision = () => {
    const updates = {
      maintenance_decision: maintenanceDecision,
      maintenance_notes: maintenanceNotes,
      maintenance_decided_by: user?.email,
      maintenance_decided_at: new Date().toISOString(),
    };

    if (maintenanceDecision === 'approved') {
      updates.status = 'approved';
      updates.history = addHistoryEntry('maintenance_approved', 'Cotação aprovada pela manutenção');
    } else if (maintenanceDecision === 'rejected') {
      updates.status = 'rejected';
      updates.history = addHistoryEntry('maintenance_rejected', `Cotação reprovada. Motivo: ${maintenanceNotes}`);
    } else if (maintenanceDecision === 'discount_requested') {
      updates.status = 'awaiting_quote';
      updates.discount_percentage = parseFloat(discountPercentage);
      updates.history = addHistoryEntry('discount_requested', `Desconto de ${discountPercentage}% solicitado`);
    }

    updateMutation.mutate(updates);
    setShowMaintenanceDialog(false);
  };

  const canCoordinatorAct = user?.role === 'coordinator' || user?.role === 'admin';
  const canServicesAct = user?.role === 'services' || user?.role === 'admin';
  const canSupplierAct = user?.role === 'supplier_user';
  const canMaintenanceAct = user?.role === 'maintenance' || user?.role === 'admin';

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
        <div className="flex gap-3">
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

          {gdm.status === 'awaiting_quote' && canSupplierAct && (
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setShowQuoteDialog(true)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Enviar Cotação
            </Button>
          )}

          {gdm.status === 'quote_analysis' && canMaintenanceAct && (
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setShowMaintenanceDialog(true)}>
              <Wrench className="h-4 w-4 mr-2" />
              Analisar Cotação
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
            </TabsList>

            <TabsContent value="details">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Informações da GDM</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
                          className="text-sky-600 hover:underline"
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
                          className="text-sky-600 hover:underline"
                        >
                          Ver laudo
                        </a>
                      </div>
                    )}

                    {gdm.maintenance_decision && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-slate-500 mb-2">Decisão da Manutenção</p>
                        <StatusBadge status={gdm.maintenance_decision === 'approved' ? 'approved' : gdm.maintenance_decision === 'rejected' ? 'rejected' : 'awaiting_quote'} />
                        {gdm.discount_percentage && (
                          <p className="mt-2 text-sm">Desconto solicitado: {gdm.discount_percentage}%</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
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
              <Label>Observações</Label>
              <Textarea
                value={coordinatorNotes}
                onChange={(e) => setCoordinatorNotes(e.target.value)}
                placeholder="Adicione observações se necessário..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleCoordinatorApprove}
              disabled={updateMutation.isPending || !destination || (destination === 'reparo' && !repairReturn)}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aprovar
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
            <div className="space-y-2">
              <Label>URL do Documento da Cotação</Label>
              <Input
                value={quoteDocument}
                onChange={(e) => setQuoteDocument(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>URL do Laudo Técnico</Label>
              <Input
                value={technicalReport}
                onChange={(e) => setTechnicalReport(e.target.value)}
                placeholder="https://..."
              />
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
                  <SelectItem value="approved">Aprovar</SelectItem>
                  <SelectItem value="discount_requested">Solicitar Desconto</SelectItem>
                  <SelectItem value="rejected">Reprovar</SelectItem>
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
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações (Interno)</Label>
              <Textarea
                value={maintenanceNotes}
                onChange={(e) => setMaintenanceNotes(e.target.value)}
                placeholder="Observações internas..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMaintenanceDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={handleMaintenanceDecision}
              disabled={updateMutation.isPending || !maintenanceDecision}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}