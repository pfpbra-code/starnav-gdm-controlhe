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
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search,
  Filter,
  Plus,
  Eye,
  FileText,
  Download,
  Ship,
  LayoutGrid,
  List
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import GDMCard from '@/components/gdm/GDMCard';
import GDMPdfButton from '@/components/gdm/GDMPdfButton';

const quickFilters = [
  { key: 'all', label: 'Todas', filter: () => true },
  { key: 'pending', label: 'Pendentes', filter: (g) => ['pending_coordinator', 'pending_services', 'new_quote_requested'].includes(g.status) },
  { key: 'in_progress', label: 'Em Andamento', filter: (g) => ['sent_to_supplier', 'awaiting_quote', 'quote_attached', 'quote_analysis', 'approved', 'pwt_issued', 'oc_issued', 'ot_issued'].includes(g.status) },
  { key: 'completed', label: 'Concluídas', filter: (g) => g.status === 'completed' },
  { key: 'rejected', label: 'Rejeitadas', filter: (g) => g.status === 'rejected' },
];

export default function GDMList() {
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [treatmentFilter, setTreatmentFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: gdms = [], isLoading } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-created_date', 100),
  });

  // Filter GDMs based on user role
  const filteredGDMs = React.useMemo(() => {
    let filtered = [...gdms];

    // Role-based filtering
    if (user?.role === 'coordinator' && user?.assigned_vessels) {
      filtered = filtered.filter(gdm => user.assigned_vessels.includes(gdm.vessel_id));
    } else if (user?.role === 'vessel_user' && user?.vessel_id) {
      filtered = filtered.filter(gdm => gdm.vessel_id === user.vessel_id);
    } else if (user?.role === 'supplier_user' && user?.supplier_id) {
      filtered = filtered.filter(gdm => gdm.supplier_id === user.supplier_id);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(gdm =>
        gdm.gdm_number?.toLowerCase().includes(term) ||
        gdm.vessel_name?.toLowerCase().includes(term) ||
        gdm.equipment_name?.toLowerCase().includes(term) ||
        gdm.serial_number?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(gdm => gdm.status === statusFilter);
    }

    // Treatment filter
    if (treatmentFilter !== 'all') {
      filtered = filtered.filter(gdm => gdm.treatment === treatmentFilter);
    }

    // Quick filter
    const quickFilterFn = quickFilters.find((q) => q.key === quickFilter)?.filter;
    if (quickFilterFn) {
      filtered = filtered.filter(quickFilterFn);
    }

    return filtered;
  }, [gdms, user, searchTerm, statusFilter, treatmentFilter, quickFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Guias de Desembarque</h1>
          <p className="text-slate-500 mt-1">{filteredGDMs.length} registros encontrados</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'vessel_user') && (
          <Link to={createPageUrl('CreateGDM')}>
            <Button className="bg-sky-600 hover:bg-sky-700">
              <Plus className="h-4 w-4 mr-2" />
              Nova GDM
            </Button>
          </Link>
        )}
      </div>

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

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por número, embarcação, equipamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending_coordinator">GDM Emitida</SelectItem>
                <SelectItem value="pending_services">Aguardando Serviços/Compras</SelectItem>
                <SelectItem value="sent_to_supplier">Enviado ao Fornecedor</SelectItem>
                <SelectItem value="quote_attached">Cotação Anexada</SelectItem>
                <SelectItem value="quote_analysis">Em Aprovação da Manutenção</SelectItem>
                <SelectItem value="new_quote_requested">Nova Cotação Solicitada</SelectItem>
                <SelectItem value="approved">Cotação Aprovada</SelectItem>
                <SelectItem value="pwt_issued">PWT Emitido</SelectItem>
                <SelectItem value="oc_issued">OC Emitida</SelectItem>
                <SelectItem value="ot_issued">OT Emitida</SelectItem>
                <SelectItem value="rejected">Reprovada</SelectItem>
                <SelectItem value="completed">Processo Finalizado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={treatmentFilter} onValueChange={setTreatmentFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Tratativa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Tratativas</SelectItem>
                <SelectItem value="repair">Reparo</SelectItem>
                <SelectItem value="discard">Descarte</SelectItem>
                <SelectItem value="stock_return">Retorno ao Estoque</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
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
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === 'table' ? (
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Nº GDM</TableHead>
                <TableHead>Embarcação</TableHead>
                <TableHead>Equipamento</TableHead>
                <TableHead>Data Desemb.</TableHead>
                <TableHead>Tratativa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGDMs.map((gdm) => (
                <TableRow key={gdm.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">{gdm.gdm_number}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Ship className="h-4 w-4 text-slate-400" />
                      {gdm.vessel_name || '-'}
                    </div>
                  </TableCell>
                  <TableCell>{gdm.equipment_name || '-'}</TableCell>
                  <TableCell>
                    {gdm.disembark_date
                      ? format(new Date(gdm.disembark_date), "dd/MM/yyyy", { locale: ptBR })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={gdm.treatment} type="treatment" />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={gdm.status} />
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredGDMs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <FileText className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500">Nenhuma GDM encontrada</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGDMs.map((gdm) => (
            <GDMCard key={gdm.id} gdm={gdm} />
          ))}
          {filteredGDMs.length === 0 && (
            <Card className="col-span-full border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Nenhuma GDM encontrada</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}