import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { SECTOR_DESTINATIONS } from '@/lib/permissions';
import {
  Wrench,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Percent,
  DollarSign,
  FileText,
  Loader2,
  ExternalLink,
  ShieldX,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * ANÁLISE DE COTAÇÕES — centraliza a aprovação de cotações.
 * Duas áreas internas (Manutenção / Operações), isoladas por permissão:
 * cada usuário vê apenas o setor autorizado pelo ADM.
 */
const SECTOR_TABS = [
  {
    key: 'maintenance',
    label: 'Manutenção',
    viewPermission: 'view_maintenance_quotes',
    approvePermission: 'approve_maintenance_quote',
  },
  {
    key: 'operations',
    label: 'Operações',
    viewPermission: 'view_operations_quotes',
    approvePermission: 'approve_operations_quote',
  },
];

export default function MaintenanceAnalysis() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = usePermissions();

  const visibleTabs = SECTOR_TABS.filter((t) => hasPermission(t.viewPermission));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key || 'maintenance');
  const tab = visibleTabs.find((t) => t.key === activeTab) || visibleTabs[0];

  const [searchTerm, setSearchTerm] = useState('');
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [selectedGDM, setSelectedGDM] = useState(null);
  const [decision, setDecision] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [notes, setNotes] = useState('');

  const { data: gdms = [], isLoading } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-created_date', 100),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['gdmItems'],
    queryFn: () => base44.entities.GDMItem.list('-created_date', 500),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GDM.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
      toast.success('Análise registrada!');
      setShowAnalysisDialog(false);
    },
    onError: () => toast.error('Erro ao registrar análise')
  });

  // Mapa de setores por GDM a partir dos itens — não duplica registros.
  const sectorsByGdm = useMemo(() => {
    const map = {};
    items.forEach((i) => {
      const entry = (map[i.gdm_id] = map[i.gdm_id] || {
        maintenance: false,
        operations: false,
        total: 0,
      });
      entry.total += 1;
      if (SECTOR_DESTINATIONS.maintenance.includes(i.destination)) entry.maintenance = true;
      if (SECTOR_DESTINATIONS.operations.includes(i.destination)) entry.operations = true;
    });
    return map;
  }, [items]);

  const belongsToTab = (gdm, tabKey) => {
    const s = sectorsByGdm[gdm.id];
    if (!s || s.total === 0) return tabKey === 'maintenance'; // GDMs legadas sem itens
    return tabKey === 'maintenance' ? s.maintenance : s.operations;
  };

  const analysisGDMs = useMemo(
    () =>
      gdms.filter(
        (gdm) =>
          gdm.status === 'quote_analysis' && (!tab || belongsToTab(gdm, tab.key)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gdms, sectorsByGdm, tab],
  );

  const decidedGDMs = useMemo(
    () => gdms.filter((g) => g.maintenance_decision && (!tab || belongsToTab(g, tab.key))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gdms, sectorsByGdm, tab],
  );

  const filteredGDMs = analysisGDMs.filter(gdm => {
    return gdm.gdm_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gdm.vessel_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gdm.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const canApprove = !!tab && hasPermission(tab.approvePermission);

  const handleAnalysis = () => {
    if (!decision) {
      toast.error('Selecione uma decisão');
      return;
    }

    let status = '';
    let historyAction = '';
    let historyDetails = '';

    if (decision === 'approved') {
      status = 'approved';
      historyAction = 'maintenance_approved';
      historyDetails = `Cotação aprovada. ${notes ? 'Obs: ' + notes : ''}`;
    } else if (decision === 'rejected') {
      status = 'rejected';
      historyAction = 'maintenance_rejected';
      historyDetails = `Cotação reprovada. Motivo: ${notes}`;
    } else if (decision === 'discount_requested') {
      status = 'awaiting_quote';
      historyAction = 'discount_requested';
      historyDetails = `Desconto de ${discountPercentage}% solicitado. ${notes ? 'Obs: ' + notes : ''}`;
    }

    const history = [
      ...(selectedGDM.history || []),
      {
        action: historyAction,
        user: user?.email,
        timestamp: new Date().toISOString(),
        details: historyDetails
      }
    ];

    const updateData = {
      status,
      maintenance_decision: decision,
      maintenance_notes: notes,
      maintenance_decided_by: user?.email,
      maintenance_decided_at: new Date().toISOString(),
      history
    };

    if (decision === 'discount_requested') {
      updateData.discount_percentage = parseFloat(discountPercentage);
    }

    updateMutation.mutate({ id: selectedGDM.id, data: updateData });
  };

  const openAnalysisDialog = (gdm) => {
    setSelectedGDM(gdm);
    setDecision('');
    setDiscountPercentage('');
    setNotes('');
    setShowAnalysisDialog(true);
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

  if (!visibleTabs.length) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-16 text-center">
          <ShieldX className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">Acesso Negado</h2>
          <p className="text-slate-500 mt-1">
            Você não possui permissão para analisar cotações.
            Solicite acesso ao administrador.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Análise de Cotações</h1>
        <p className="text-slate-500 mt-1">
          Aprovação centralizada das cotações recebidas dos fornecedores
        </p>
      </div>

      {/* Abas por setor */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {visibleTabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.key === 'maintenance' ? (
                <Wrench className="h-4 w-4 mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Stats da aba ativa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Wrench className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900">{analysisGDMs.length}</p>
                <p className="text-sm text-amber-700">Aguardando Análise</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">
                  {decidedGDMs.filter(g => g.maintenance_decision === 'approved').length}
                </p>
                <p className="text-sm text-green-700">Aprovadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-900">
                  {decidedGDMs.filter(g => g.maintenance_decision === 'rejected').length}
                </p>
                <p className="text-sm text-red-700">Reprovadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por número, embarcação ou equipamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>GDM</TableHead>
              <TableHead>Equipamento</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Valor Cotação</TableHead>
              <TableHead>Documentos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGDMs.map((gdm) => (
              <TableRow key={gdm.id} className="hover:bg-slate-50">
                <TableCell>
                  <div>
                    <p className="font-medium">{gdm.gdm_number}</p>
                    <p className="text-sm text-slate-500">{gdm.vessel_name}</p>
                  </div>
                </TableCell>
                <TableCell>{gdm.equipment_name || '-'}</TableCell>
                <TableCell>{gdm.supplier_name || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-semibold">
                      R$ {gdm.quote_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {gdm.quote_document_url && (
                      <a
                        href={gdm.quote_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-600 hover:text-sky-700"
                      >
                        <FileText className="h-4 w-4" />
                      </a>
                    )}
                    {gdm.technical_report_url && (
                      <a
                        href={gdm.technical_report_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {canApprove && (
                      <Button
                        size="sm"
                        className="bg-sky-600 hover:bg-sky-700"
                        onClick={() => openAnalysisDialog(gdm)}
                      >
                        <Wrench className="h-4 w-4 mr-1" />
                        Analisar
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
                <TableCell colSpan={6} className="h-32 text-center">
                  <Wrench className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500">Nenhuma cotação aguardando análise</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* Analysis Dialog */}
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Análise Técnica — {tab?.label}</DialogTitle>
            <DialogDescription>
              GDM: {selectedGDM?.gdm_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Quote Info */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Equipamento:</span>
                <span className="font-medium">{selectedGDM?.equipment_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fornecedor:</span>
                <span className="font-medium">{selectedGDM?.supplier_name}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-slate-500">Valor da Cotação:</span>
                <span className="text-xl font-bold text-green-600">
                  R$ {selectedGDM?.quote_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Documents */}
            <div className="flex gap-4">
              {selectedGDM?.quote_document_url && (
                <a
                  href={selectedGDM.quote_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-sky-600 hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  Ver Cotação
                </a>
              )}
              {selectedGDM?.technical_report_url && (
                <a
                  href={selectedGDM.technical_report_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-purple-600 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver Laudo
                </a>
              )}
            </div>

            {/* Decision */}
            <div className="space-y-2">
              <Label>Decisão *</Label>
              <Select value={decision} onValueChange={setDecision}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a decisão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Aprovar
                    </div>
                  </SelectItem>
                  <SelectItem value="discount_requested">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-amber-600" />
                      Solicitar Desconto
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Reprovar
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {decision === 'discount_requested' && (
              <div className="space-y-2">
                <Label>Percentual de Desconto (%)</Label>
                <Input
                  type="number"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  placeholder="Ex: 10"
                  min="1"
                  max="100"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações {decision === 'rejected' && '*'}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações internas (não visíveis ao fornecedor)..."
                rows={3}
              />
              <p className="text-xs text-slate-500">
                ⚠️ Estas observações são internas e não serão enviadas ao fornecedor
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnalysisDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={handleAnalysis}
              disabled={updateMutation.isPending || !decision || (decision === 'rejected' && !notes)}
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