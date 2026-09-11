import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search,
  Plus,
  Eye,
  FileText,
  Download,
  Ship,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import GDMCard from '@/components/gdm/GDMCard';
import GDMPdfButton from '@/components/gdm/GDMPdfButton';
import GDMDeleteButton from '@/components/gdm/GDMDeleteButton';
import GDMOverviewKpis from '@/components/gdm/GDMOverviewKpis';
import { hasPermission } from '@/lib/permissions';
import {
  groupItemsByGdm,
  computeGeneralStatus,
  sectorsOfItems,
  SECTOR_LABELS,
  DESTINATION_LABELS,
  CANCELLED_INDICATOR,
} from '@/lib/gdmOverview';

const PAGE_SIZE = 15;

const GDM_STATUS_OPTIONS = [
  ['pending_coordinator', 'GDM Emitida'],
  ['pending_services', 'Aguardando Serviços'],
  ['sent_to_supplier', 'Enviado ao Fornecedor'],
  ['awaiting_quote', 'Aguardando Cotação'],
  ['quote_attached', 'Cotação Anexada'],
  ['quote_analysis', 'Em Aprovação da Manutenção'],
  ['new_quote_requested', 'Nova Cotação Solicitada'],
  ['approved', 'Cotação Aprovada'],
  ['pwt_issued', 'PWT Emitido'],
  ['oc_issued', 'OC Emitida'],
  ['ot_issued', 'OT Emitida'],
  ['rejected', 'Reprovada'],
  ['completed', 'Processo Finalizado'],
];

export default function GDMList() {
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [vesselFilter, setVesselFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [responsibleFilter, setResponsibleFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: gdms = [], isLoading } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-created_date', 500),
  });

  const { data: gdmItems = [] } = useQuery({
    queryKey: ['gdmItems'],
    queryFn: () => base44.entities.GDMItem.list('-created_date', 1000),
  });

  // Diretório de usuários para exibir o responsável pela criação
  // (usuários sem permissão de listar recebem lista vazia da RLS).
  const { data: users = [] } = useQuery({
    queryKey: ['usersDirectory'],
    queryFn: () => base44.entities.User.list().catch(() => []),
  });

  const userNames = React.useMemo(() => {
    const map = {};
    (users || []).forEach((u) => {
      if (u?.id) map[u.id] = u.full_name || u.email;
    });
    return map;
  }, [users]);

  // Cada GDM é um único registro, mesmo com vários itens em setores diferentes.
  const gdmViews = React.useMemo(() => {
    const byGdm = groupItemsByGdm(gdmItems);
    return gdms.map((gdm) => {
      const items = byGdm[gdm.id] || [];
      const sectors = sectorsOfItems(items);
      return {
        ...gdm,
        items,
        itemCount: items.length,
        sectors,
        suppliers: Array.from(new Set(items.map((i) => i.supplier_name).filter(Boolean))),
        responsible: userNames[gdm.created_by_id] || gdm.history?.[0]?.user_name || '-',
        general: computeGeneralStatus(items),
      };
    });
  }, [gdms, gdmItems, userNames]);

  React.useEffect(() => {
    setPage(0);
  }, [searchTerm, vesselFilter, statusFilter, destinationFilter, sectorFilter, supplierFilter, responsibleFilter, dateFrom, dateTo, sortDir]);

  const filteredGDMs = React.useMemo(() => {
    let list = gdmViews;

    if (vesselFilter !== 'all') {
      list = list.filter((g) => g.vessel_name === vesselFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (g) =>
          g.gdm_number?.toLowerCase().includes(term) ||
          g.vessel_name?.toLowerCase().includes(term) ||
          String(g.responsible || '').toLowerCase().includes(term) ||
          g.items.some(
            (i) =>
              i.equipment_name?.toLowerCase().includes(term) ||
              i.equipment_code?.toLowerCase().includes(term) ||
              i.serial_number?.toLowerCase().includes(term) ||
              i.supplier_name?.toLowerCase().includes(term),
          ),
      );
    }

    if (statusFilter !== 'all') list = list.filter((g) => g.status === statusFilter);
    if (destinationFilter !== 'all') {
      list = list.filter((g) => g.items.some((i) => i.destination === destinationFilter));
    }
    if (sectorFilter !== 'all') list = list.filter((g) => g.sectors.includes(sectorFilter));
    if (supplierFilter !== 'all') list = list.filter((g) => g.suppliers.includes(supplierFilter));
    if (responsibleFilter !== 'all') list = list.filter((g) => g.created_by_id === responsibleFilter);

    if (dateFrom) {
      list = list.filter((g) => g.created_date && new Date(g.created_date) >= new Date(dateFrom));
    }
    if (dateTo) {
      list = list.filter(
        (g) => g.created_date && new Date(g.created_date) <= new Date(`${dateTo}T23:59:59`),
      );
    }

    return [...list].sort((a, b) => {
      const da = a.created_date ? new Date(a.created_date).getTime() : 0;
      const db = b.created_date ? new Date(b.created_date).getTime() : 0;
      return sortDir === 'desc' ? db - da : da - db;
    });
  }, [gdmViews, searchTerm, vesselFilter, statusFilter, destinationFilter, sectorFilter, supplierFilter, responsibleFilter, dateFrom, dateTo, sortDir]);

  const stats = React.useMemo(
    () => ({
      totalGdms: filteredGDMs.length,
      totalItems: filteredGDMs.reduce((sum, g) => sum + g.itemCount, 0),
      inMaintenance: filteredGDMs.filter((g) => g.sectors.includes('maintenance')).length,
      inOperations: filteredGDMs.filter((g) => g.sectors.includes('operations')).length,
      pendingApproval: filteredGDMs.filter((g) => g.general.key === 'awaiting_approval').length,
      completed: filteredGDMs.filter((g) => g.general.key === 'completed').length,
    }),
    [filteredGDMs],
  );

  const vesselOptions = React.useMemo(
    () => Array.from(new Set(gdmViews.map((g) => g.vessel_name).filter(Boolean))).sort(),
    [gdmViews],
  );
  const supplierOptions = React.useMemo(
    () => Array.from(new Set(gdmViews.flatMap((g) => g.suppliers))).sort(),
    [gdmViews],
  );
  const responsibleOptions = React.useMemo(() => {
    const map = {};
    gdmViews.forEach((g) => {
      if (g.created_by_id && !map[g.created_by_id]) {
        map[g.created_by_id] = userNames[g.created_by_id] || g.created_by_id;
      }
    });
    return Object.entries(map).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [gdmViews, userNames]);

  const totalPages = Math.max(1, Math.ceil(filteredGDMs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedGDMs = filteredGDMs.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const canExport = hasPermission(user, 'export_reports');

  const exportCsv = () => {
    const rows = [
      ['Nº GDM', 'Embarcação', 'Data Desembarque', 'Data Emissão', 'Responsável', 'Itens', 'Setores', 'Fornecedores', 'Status Geral', 'Status Sistema'],
      ...filteredGDMs.map((g) => [
        g.gdm_number,
        g.vessel_name || '',
        g.disembark_date ? format(new Date(g.disembark_date), 'dd/MM/yyyy') : '',
        g.created_date ? format(new Date(g.created_date), 'dd/MM/yyyy HH:mm') : '',
        g.responsible,
        g.itemCount,
        g.sectors.map((s) => SECTOR_LABELS[s]).join(' e '),
        g.suppliers.join(', '),
        g.general.label,
        g.status,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guias-de-desembarque-${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Guias de Desembarque</h1>
          <p className="text-slate-500 mt-1">
            Visão centralizada — {filteredGDMs.length} GDMs e {stats.totalItems} itens
          </p>
        </div>
        <div className="flex gap-2">
          {canExport && (
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          )}
          {(user?.role === 'admin' || user?.role === 'vessel_user') && (
            <Link to={createPageUrl('CreateGDM')}>
              <Button className="bg-sky-600 hover:bg-sky-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova GDM
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPIs */}
      <GDMOverviewKpis stats={stats} />

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por Nº GDM, embarcação, equipamento, série, fornecedor ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
            <Select value={vesselFilter} onValueChange={setVesselFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Embarcação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Embarcações</SelectItem>
                {vesselOptions.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {GDM_STATUS_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={destinationFilter} onValueChange={setDestinationFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Destinos</SelectItem>
                {Object.entries(DESTINATION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Setores</SelectItem>
                {Object.entries(SECTOR_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Fornecedores</SelectItem>
                {supplierOptions.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Responsáveis</SelectItem>
                {responsibleOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="Emissão — início"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="Emissão — fim"
            />
            <Select value={sortDir} onValueChange={setSortDir}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Ordenação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Mais recentes</SelectItem>
                <SelectItem value="asc">Mais antigas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === 'table' ? (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nº GDM</TableHead>
                  <TableHead>Embarcação</TableHead>
                  <TableHead>Data Desemb.</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Setores</TableHead>
                  <TableHead>Status Geral</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedGDMs.map((gdm) => (
                  <TableRow key={gdm.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{gdm.gdm_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Ship className="h-4 w-4 text-slate-400" />
                        {gdm.vessel_name || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {gdm.disembark_date
                        ? format(new Date(gdm.disembark_date), "dd/MM/yyyy", { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell>{gdm.responsible}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-4 w-4 text-slate-400" />
                        {gdm.itemCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {gdm.sectors.length > 0
                          ? gdm.sectors.map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
                              >
                                {SECTOR_LABELS[s]}
                              </span>
                            ))
                          : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium w-fit", gdm.general.className)}>
                          {gdm.general.label}
                        </span>
                        {gdm.general.hasCancelled && (
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium w-fit", CANCELLED_INDICATOR.className)}>
                            {CANCELLED_INDICATOR.label}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link to={createPageUrl(`GDMDetail?id=${gdm.id}`)}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </Link>
                        <GDMPdfButton gdm={gdm} label="PDF" />
                        {user?.role === 'admin' && <GDMDeleteButton gdm={gdm} />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pagedGDMs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <FileText className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-500">Nenhuma GDM encontrada</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-slate-500">
              Página {safePage + 1} de {totalPages} — {filteredGDMs.length} GDMs
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, safePage - 1))}
                disabled={safePage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                disabled={safePage >= totalPages - 1}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pagedGDMs.map((gdm) => (
            <GDMCard key={gdm.id} gdm={gdm} />
          ))}
          {pagedGDMs.length === 0 && (
            <Card className="col-span-full border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Nenhuma GDM encontrada</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* View toggle */}
      <div className="flex justify-end gap-2">
        <Button
          variant={viewMode === 'table' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setViewMode('table')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setViewMode('grid')}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}