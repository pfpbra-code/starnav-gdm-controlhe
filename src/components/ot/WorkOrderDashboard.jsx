import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/hooks/usePermissions';
import { buildWorkOrderRows, inDatePeriod, exportWorkOrdersCsv } from '@/lib/workOrders';
import { OT_STATUS_LABELS } from '@/lib/gdmItems';
import WorkOrderKpis from './WorkOrderKpis';
import WorkOrderCharts from './WorkOrderCharts';
import WorkOrderTable from './WorkOrderTable';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function filterSelect(value, onChange, options, placeholder) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full md:w-[11rem]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Controle de OT (Ordem de Trabalho) — dashboard integrado entre Serviços e
 * Almoxarifado. Mesma base de dados nos dois módulos, com atualização em
 * tempo real: qualquer alteração de um setor reflete no outro, sem
 * atualização manual (assinatura em GDMItem + invalidação das consultas).
 */
export default function WorkOrderDashboard() {
  const queryClient = useQueryClient();
  const { scopeGdms, hasPermission } = usePermissions();
  const [search, setSearch] = useState('');
  const [vesselFilter, setVesselFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  const { data: gdms = [], isLoading: loadingGdms } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-created_date', 500),
  });
  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['gdmItems'],
    queryFn: () => base44.entities.GDMItem.list('-created_date', 500),
  });

  // Tempo real: ações de Serviços e Almoxarifado sobre os itens propagam
  // automaticamente para os dois painéis.
  useEffect(() => {
    const unsubscribe = base44.entities.GDMItem.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const scopedGdms = useMemo(() => scopeGdms(gdms), [scopeGdms, gdms]);
  const allRows = useMemo(
    () => buildWorkOrderRows(items, scopedGdms),
    [items, scopedGdms],
  );

  const vesselOptions = useMemo(() => {
    const seen = new Map();
    scopedGdms.forEach((g) => {
      if (g.vessel_id && g.vessel_name && !seen.has(g.vessel_id)) {
        seen.set(g.vessel_id, g.vessel_name);
      }
    });
    return [
      { value: 'all', label: 'Todas as embarcações' },
      ...Array.from(seen, ([value, label]) => ({ value, label })),
    ];
  }, [scopedGdms]);

  const supplierOptions = useMemo(() => {
    const seen = new Map();
    allRows.forEach((r) => {
      if (r.item.supplier_id && r.item.supplier_name && !seen.has(r.item.supplier_id)) {
        seen.set(r.item.supplier_id, r.item.supplier_name);
      }
    });
    return [
      { value: 'all', label: 'Todos os fornecedores' },
      ...Array.from(seen, ([value, label]) => ({ value, label })),
    ];
  }, [allRows]);

  const rows = useMemo(() => {
    let list = allRows;
    if (vesselFilter !== 'all') list = list.filter((r) => r.item.vessel_id === vesselFilter);
    if (supplierFilter !== 'all') {
      list = list.filter((r) => r.item.supplier_id === supplierFilter);
    }
    if (statusFilter !== 'all') list = list.filter((r) => r.item.ot_status === statusFilter);
    if (periodFrom || periodTo) {
      list = list.filter((r) =>
        inDatePeriod(r.item.sent_to_supplier_at, periodFrom, periodTo),
      );
    }
    if (search) {
      const t = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.item.ot_number?.toLowerCase().includes(t) ||
          r.gdm_number?.toLowerCase().includes(t) ||
          r.item.equipment_name?.toLowerCase().includes(t) ||
          r.item.equipment_code?.toLowerCase().includes(t) ||
          r.item.serial_number?.toLowerCase().includes(t),
      );
    }
    // Abertas primeiro; dentro delas, pendências de fechamento em destaque.
    return list.sort((a, b) => {
      if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
      const rank = (r) => (r.item.ot_status === 'awaiting_close' ? 0 : 1);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return (b.daysOpen || 0) - (a.daysOpen || 0);
    });
  }, [allRows, vesselFilter, supplierFilter, statusFilter, periodFrom, periodTo, search]);

  if (loadingGdms || loadingItems) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Controle de OT</h2>
        <p className="text-slate-500 text-sm mt-1">
          Ordens de Trabalho dos equipamentos enviados para reparo, certificação e
          calibração. Serviços acompanha as OTs abertas; o Almoxarifado é responsável
          pelo encerramento após o recebimento do equipamento. Atualização em tempo real
          entre os dois setores.
        </p>
      </div>

      <WorkOrderKpis rows={allRows} />

      {/* Filtros */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por OT, GDM, equipamento, código ou número de série..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                exportWorkOrdersCsv(rows);
                toast.success(`Planilha exportada (${rows.length} OT(s))`);
              }}
              disabled={rows.length === 0}
              title="Exporta as OTs filtradas para uma planilha"
            >
              <Download className="h-4 w-4" />
              Exportar Planilha
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-2">
            {filterSelect(vesselFilter, setVesselFilter, vesselOptions, 'Embarcação')}
            {filterSelect(supplierFilter, setSupplierFilter, supplierOptions, 'Fornecedor')}
            {filterSelect(
              statusFilter,
              setStatusFilter,
              [
                { value: 'all', label: 'Todos os status de OT' },
                ...Object.entries(OT_STATUS_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              ],
              'Status da OT',
            )}
            <Input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              title="Período — data de envio inicial"
            />
            <Input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              title="Período — data de envio final"
            />
          </div>
        </CardContent>
      </Card>

      <WorkOrderCharts rows={allRows} />

      <WorkOrderTable
        rows={rows}
        canCloseOT={hasPermission('confirm_receipt')}
        canManageOT={hasPermission('send_to_supplier')}
      />
    </div>
  );
}