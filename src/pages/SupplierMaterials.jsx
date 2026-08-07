import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Package,
  Search,
  Eye,
  DollarSign,
  Upload,
  Loader2,
  CheckCircle,
  Ship
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import { buildHistoryEntry, STATUS_LABELS, STEP_NAMES, addProposal, validateProposalFile, fileNameFromUrl } from '@/lib/gdmWorkflow';

const quickFilters = [
  { key: 'all', label: 'Todas' },
  { key: 'awaiting', label: 'Aguardando Cotação' },
  { key: 'analysis', label: 'Em Análise' },
  { key: 'approved', label: 'Aprovadas' },
  { key: 'finalized', label: 'Finalizadas' },
  { key: 'rejected', label: 'Reprovadas' },
];

const quickFilterFn = {
  all: () => true,
  awaiting: (g) => ['awaiting_quote', 'new_quote_requested'].includes(g.status),
  analysis: (g) => ['quote_analysis', 'quote_attached'].includes(g.status),
  approved: (g) => ['approved', 'pwt_issued', 'oc_issued', 'ot_issued'].includes(g.status),
  finalized: (g) => g.status === 'completed',
  rejected: (g) => g.status === 'rejected',
};

export default function SupplierMaterials() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('awaiting');
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [selectedGDM, setSelectedGDM] = useState(null);
  const [quoteData, setQuoteData] = useState({
    quote_value: '',
    quote_document_url: '',
    technical_report_url: '',
    commercial_proposal_url: ''
  });
  const [uploading, setUploading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: gdms = [], isLoading } = useQuery({
    queryKey: ['supplierGDMs', user?.supplier_id],
    queryFn: () => base44.entities.GDM.filter({ supplier_id: user?.supplier_id }),
    enabled: !!user?.supplier_id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GDM.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierGDMs'] });
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
      toast.success('Cotação enviada com sucesso! Disponível em todas as telas.');
      setShowQuoteDialog(false);
    },
    onError: () => toast.error('Erro ao enviar cotação')
  });

  const awaitingGDMs = gdms.filter(g => g.status === 'awaiting_quote' || g.status === 'new_quote_requested');
  const sentGDMs = gdms.filter(g => ['quote_analysis', 'quote_attached', 'approved', 'pwt_issued', 'oc_issued', 'ot_issued', 'rejected', 'completed'].includes(g.status));

  const baseList = activeTab === 'awaiting' ? awaitingGDMs : sentGDMs;
  const filteredGDMs = baseList.filter((gdm) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      gdm.gdm_number?.toLowerCase().includes(term) ||
      gdm.equipment_name?.toLowerCase().includes(term) ||
      gdm.vessel_name?.toLowerCase().includes(term) ||
      (STATUS_LABELS[gdm.status] || gdm.status || '').toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' || gdm.status === statusFilter;
    const matchesQuick = quickFilterFn[quickFilter]?.(gdm) ?? true;
    return matchesSearch && matchesStatus && matchesQuick;
  });

  const handleFileUpload = async (e, field) => {
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
      setQuoteData(prev => ({ ...prev, [field]: result.file_url }));
      toast.success('Arquivo enviado!');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitQuote = () => {
    if (!quoteData.quote_value) {
      toast.error('Informe o valor da cotação');
      return;
    }

    const previousStatus = selectedGDM.status;
    const newStatus = 'quote_analysis';
    const history = [
      ...(selectedGDM.history || []),
      buildHistoryEntry({
        action: 'quote_received',
        user,
        details: `Cotação recebida: R$ ${parseFloat(quoteData.quote_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        previousStatus,
        newStatus,
        stepName: STEP_NAMES.quote_analysis,
        observation: `Fornecedor: ${selectedGDM.supplier_name || '-'}`,
      }),
    ];

    const proposals = addProposal(selectedGDM, {
      supplier_name: selectedGDM.supplier_name,
      quote_value: parseFloat(quoteData.quote_value),
      registered_by: user?.email,
      file_url: quoteData.commercial_proposal_url || quoteData.quote_document_url,
      technical_report_url: quoteData.technical_report_url,
      notes: 'Proposta enviada pelo fornecedor',
    });

    updateMutation.mutate({
      id: selectedGDM.id,
      data: {
        status: newStatus,
        quote_value: parseFloat(quoteData.quote_value),
        quote_document_url: quoteData.quote_document_url,
        technical_report_url: quoteData.technical_report_url,
        commercial_proposal_url: quoteData.commercial_proposal_url,
        commercial_proposal_uploaded_at: new Date().toISOString(),
        commercial_proposal_uploaded_by: user?.email,
        proposals,
        history,
      },
    });
  };

  const openQuoteDialog = (gdm) => {
    setSelectedGDM(gdm);
    setQuoteData({
      quote_value: gdm.quote_value?.toString() || '',
      quote_document_url: gdm.quote_document_url || '',
      technical_report_url: gdm.technical_report_url || '',
      commercial_proposal_url: gdm.commercial_proposal_url || ''
    });
    setShowQuoteDialog(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 mb-4" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Materiais Recebidos</h1>
        <p className="text-slate-500 mt-1">Gerencie os materiais e envie cotações</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="awaiting" className="relative">
            Aguardando Cotação
            {awaitingGDMs.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                {awaitingGDMs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">Cotações Enviadas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((qf) => (
          <button
            key={qf.key}
            onClick={() => setQuickFilter(qf.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              quickFilter === qf.key
                ? 'bg-sky-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {qf.label}
          </button>
        ))}
      </div>

      {/* Search & Status */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por número, embarcação, equipamento ou status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="awaiting_quote">Aguardando Cotação</SelectItem>
                <SelectItem value="new_quote_requested">Nova Cotação Solicitada</SelectItem>
                <SelectItem value="quote_attached">Cotação Anexada</SelectItem>
                <SelectItem value="quote_analysis">Em Aprovação da Manutenção</SelectItem>
                <SelectItem value="approved">Cotação Aprovada</SelectItem>
                <SelectItem value="pwt_issued">PWT Emitido</SelectItem>
                <SelectItem value="oc_issued">OC Emitida</SelectItem>
                <SelectItem value="ot_issued">OT Emitida</SelectItem>
                <SelectItem value="completed">Processo Finalizado</SelectItem>
                <SelectItem value="rejected">Reprovada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>GDM</TableHead>
              <TableHead>Equipamento</TableHead>
              <TableHead>Embarcação</TableHead>
              <TableHead>Data Recebimento</TableHead>
              <TableHead>Status</TableHead>
              {activeTab === 'sent' && <TableHead>Valor</TableHead>}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGDMs.map((gdm) => (
              <TableRow key={gdm.id} className="hover:bg-slate-50">
                <TableCell className="font-medium">{gdm.gdm_number}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-slate-400" />
                    {gdm.equipment_name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Ship className="h-4 w-4 text-slate-400" />
                    {gdm.vessel_name}
                  </div>
                </TableCell>
                <TableCell>
                  {gdm.sent_to_supplier_date
                    ? format(new Date(gdm.sent_to_supplier_date), "dd/MM/yyyy", { locale: ptBR })
                    : '-'}
                </TableCell>
                <TableCell>
                  <StatusBadge status={gdm.status} />
                </TableCell>
                {activeTab === 'sent' && (
                  <TableCell>
                    <span className="font-semibold text-green-600">
                      R$ {gdm.quote_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '-'}
                    </span>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {activeTab === 'awaiting' && (
                      <Button
                        size="sm"
                        className="bg-sky-600 hover:bg-sky-700"
                        onClick={() => openQuoteDialog(gdm)}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Enviar Cotação
                      </Button>
                    )}
                    <Link to={createPageUrl(`GDMDetail?id=${gdm.id}`)}>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredGDMs.length === 0 && (
              <TableRow>
                <TableCell colSpan={activeTab === 'sent' ? 7 : 6} className="h-32 text-center">
                  <Package className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500">
                    {activeTab === 'awaiting' 
                      ? 'Nenhum material aguardando cotação' 
                      : 'Nenhuma cotação enviada'}
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Quote Dialog */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Cotação</DialogTitle>
            <DialogDescription>
              GDM: {selectedGDM?.gdm_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Anexos aceitos apenas em PDF, XLSX ou XLS.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Equipamento</p>
              <p className="font-medium">{selectedGDM?.equipment_name}</p>
              <p className="text-sm text-slate-500 mt-2">Tratativa</p>
              <StatusBadge status={selectedGDM?.treatment} type="treatment" />
            </div>

            {selectedGDM?.discount_percentage && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800 font-medium">
                  ⚠️ Desconto de {selectedGDM.discount_percentage}% solicitado
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Valor da Cotação (R$) *</Label>
              <Input
                type="number"
                value={quoteData.quote_value}
                onChange={(e) => setQuoteData(prev => ({ ...prev, quote_value: e.target.value }))}
                placeholder="0,00"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label>Documento da Cotação</Label>
              <div className="flex gap-2">
                <Input
                  value={quoteData.quote_document_url}
                  onChange={(e) => setQuoteData(prev => ({ ...prev, quote_document_url: e.target.value }))}
                  placeholder="URL do documento ou faça upload"
                  disabled={uploading}
                />
                <div>
                  <input
                    type="file"
                    id="quote-doc"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'quote_document_url')}
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
            </div>

            <div className="space-y-2">
              <Label>Laudo Técnico</Label>
              <div className="flex gap-2">
                <Input
                  value={quoteData.technical_report_url}
                  onChange={(e) => setQuoteData(prev => ({ ...prev, technical_report_url: e.target.value }))}
                  placeholder="URL do laudo técnico ou faça upload"
                  disabled={uploading}
                />
                <div>
                  <input
                    type="file"
                    id="tech-report"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'technical_report_url')}
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
            </div>

            <div className="space-y-2">
              <Label>Proposta Comercial</Label>
              <div className="flex gap-2">
                <Input
                  value={quoteData.commercial_proposal_url}
                  onChange={(e) => setQuoteData(prev => ({ ...prev, commercial_proposal_url: e.target.value }))}
                  placeholder="URL da proposta ou faça upload"
                  disabled={uploading}
                />
                <div>
                  <input
                    type="file"
                    id="commercial-proposal"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'commercial_proposal_url')}
                    disabled={uploading}
                  />
                  <label htmlFor="commercial-proposal">
                    <Button type="button" variant="outline" asChild disabled={uploading}>
                      <span>
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
              {quoteData.commercial_proposal_url && (
                <p className="text-xs text-slate-500 mt-1 truncate">
                  Arquivo: {fileNameFromUrl(quoteData.commercial_proposal_url)}
                </p>
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
              disabled={updateMutation.isPending || !quoteData.quote_value}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-2" />
              Enviar Cotação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}