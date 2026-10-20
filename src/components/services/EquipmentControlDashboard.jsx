import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/hooks/usePermissions';
import { scopeGdms } from '@/lib/permissions';
import { ITEM_STATUS_LABELS, itemGroup } from '@/lib/gdmItems';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  buildEquipmentGroups,
  buildChartData,
  summarizeRows,
  buildEquipmentControlCsv,
  equipmentGroupKey,
} from '@/lib/equipmentRepairControl';
import EquipmentControlFilters from './EquipmentControlFilters';
import EquipmentControlKpis from './EquipmentControlKpis';
import EquipmentControlCharts from './EquipmentControlCharts';
import EquipmentGroupsTable from './EquipmentGroupsTable';
import EquipmentItemsTable from './EquipmentItemsTable';

const DEFAULT_FILTERS = {
  equipment: 'all',
  gdm: '',
  vessel: 'all',
  status: 'all',
  supplier: 'all',
  responsible: 'all',
  situation: 'all',
  disembarkFrom: '',
  disembarkTo: '',
  createdFrom: '',
  createdTo: '',
};

const SITUATION_TO_GROUP = {
  open: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'closed',
};

/**
 * Aba "Dados por Equipamento": consulta, filtra e acompanha as unidades de uma
 * mesma nomenclatura em processo de reparo — agrupadas pela nomenclatura
 * cadastrada, contadas pela quantidade real de cada item das GDMs.
 */
export default function EquipmentControlDashboard() {
  const { user } = usePermissions();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const { data: gdms = [], isLoading: loadingGdms } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-created_date', 200),
  });
  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['gdmItems'],
    queryFn: () => base44.entities.GDMItem.list('-created_date', 500),
  });

  // Sincronização automática: qualquer alteração relevante em GDMs ou itens
  // invalida as consultas e recalcula indicadores, gráficos e tabelas.
  useEffect(() => {
    const unsubItems = base44.entities.GDMItem.subscribe(() =>
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] }),
    );
    const unsubGdms = base44.entities.GDM.subscribe(() =>
      queryClient.invalidateQueries({ queryKey: ['gdms'] }),
    );
    return () => {
      unsubItems();
      unsubGdms();
    };
  }, [queryClient]);

  // Escopo de embarcações do usuário, na mesma regra dos demais painéis.
  const scopedGdms = useMemo(() => scopeGdms(user, gdms), [user, gdms]);
  const gdmById = useMemo(
    () => Object.fromEntries(scopedGdms.map((g) => [g.id, g])),
    [scopedGdms],
  );

  const baseRows = useMemo(
    () =>
      items
        .map((item) => ({ item, gdm: gdmById[item.gdm_id] }))
        .filter((r) => r.gdm),
    [items, gdmById],
  );

  // Linhas filtradas — cada alteração de filtro recalcula tudo.
  const filteredRows = useMemo(() => {
    let rows = baseRows;
    if (filters.equipment !== 'all') {
      rows = rows.filter((r) => equipmentGroupKey(r.item) === filters.equipment);
    }
    if (filters.gdm) {
      const t = filters.gdm.toLowerCase();
      rows = rows.filter((r) => r.gdm.gdm_number?.toLowerCase().includes(t));
    }
    if (filters.vessel !== 'all') {
      rows = rows.filter((r) => r.item.vessel_id === filters.vessel);
    }
    if (filters.status !== 'all') {
      rows = rows.filter((r) => r.item.status === filters.status);
    }
    if (filters.supplier !== 'all') {
      rows = rows.filter((r) => r.item.supplier_id === filters.supplier);
    }
    if (filters.responsible !== 'all') {
      rows = rows.filter((r) => r.item.supplier_selected_by === filters.responsible);
    }
    if (filters.situation !== 'all') {
      const g = SITUATION_TO_GROUP[filters.situation];
      rows = rows.filter((r) => itemGroup(r.item) === g);
    }
    if (filters.disembarkFrom) {
      rows = rows.filter((r) => (r.gdm.disembark_date || '') >= filters.disembarkFrom);
    }
    if (filters.disembarkTo) {
      rows = rows.filter((r) => (r.gdm.disembark_date || '') <= filters.disembarkTo);
    }
    if (filters.createdFrom) {
      rows = rows.filter((r) => (r.gdm.created_date || '').slice(0, 10) >= filters.createdFrom);
    }
    if (filters.createdTo) {
      rows = rows.filter((r) => (r.gdm.created_date || '').slice(0, 10) <= filters.createdTo);
    }
    return rows;
  }, [baseRows, filters]);

  const groups = useMemo(() => buildEquipmentGroups(filteredRows), [filteredRows]);
  const kpi = useMemo(() => summarizeRows(filteredRows), [filteredRows]);
  const charts = useMemo(() => buildChartData(filteredRows), [filteredRows]);

  // Opções do filtro de equipamento: linhas com os demais filtros aplicados,
  // mas sem o próprio filtro de equipamento (permite trocar a seleção).
  const optionsRows = useMemo(() => {
    let rows = baseRows;
    if (filters.gdm) {
      const t = filters.gdm.toLowerCase();
      rows = rows.filter((r) => r.gdm.gdm_number?.toLowerCase().includes(t));
    }
    if (filters.vessel !== 'all') rows = rows.filter((r) => r.item.vessel_id === filters.vessel);
    if (filters.status !== 'all') rows = rows.filter((r) => r.item.status === filters.status);
    if (filters.supplier !== 'all') rows = rows.filter((r) => r.item.supplier_id === filters.supplier);
    if (filters.responsible !== 'all') {
      rows = rows.filter((r) => r.item.supplier_selected_by === filters.responsible);
    }
    if (filters.situation !== 'all') {
      const g = SITUATION_TO_GROUP[filters.situation];
      rows = rows.filter((r) => itemGroup(r.item) === g);
    }
    if (filters.disembarkFrom) {
      rows = rows.filter((r) => (r.gdm.disembark_date || '') >= filters.disembarkFrom);
    }
    if (filters.disembarkTo) {
      rows = rows.filter((r) => (r.gdm.disembark_date || '') <= filters.disembarkTo);
    }
    if (filters.createdFrom) {
      rows = rows.filter((r) => (r.gdm.created_date || '').slice(0, 10) >= filters.createdFrom);
    }
    if (filters.createdTo) {
      rows = rows.filter((r) => (r.gdm.created_date || '').slice(0, 10) <= filters.createdTo);
    }
    return rows;
  }, [baseRows, filters]);

  const optionGroups = useMemo(() => buildEquipmentGroups(optionsRows), [optionsRows]);

  const equipmentOptions = useMemo(
    () => [
      { value: 'all', label: 'Todos os equipamentos' },
      ...optionGroups.map((g) => ({
        value: g.key,
        label: `${g.name} (${g.totals.total} un.)`,
      })),
    ],
    [optionGroups],
  );

  const vesselOptions = useMemo(() => {
    const seen = new Map();
    baseRows.forEach(({ gdm }) => {
      if (gdm.vessel_id && gdm.vessel_name && !seen.has(gdm.vessel_id)) {
        seen.set(gdm.vessel_id, gdm.vessel_name);
      }
    });
    return [
      { value: 'all', label: 'Todas as embarcações' },
      ...Array.from(seen, ([value, label]) => ({ value, label })),
    ];
  }, [baseRows]);

  const supplierOptions = useMemo(() => {
    const seen = new Map();
    baseRows.forEach(({ item }) => {
      if (item.supplier_id && item.supplier_name && !seen.has(item.supplier_id)) {
        seen.set(item.supplier_id, item.supplier_name);
      }
    });
    return [
      { value: 'all', label: 'Todos os fornecedores' },
      ...Array.from(seen, ([value, label]) => ({ value, label })),
    ];
  }, [baseRows]);

  const responsibleOptions = useMemo(() => {
    const seen = new Set();
    baseRows.forEach(({ item }) => {
      if (item.supplier_selected_by) seen.add(item.supplier_selected_by);
    });
    return [
      { value: 'all', label: 'Todos os responsáveis' },
      ...Array.from(seen).sort().map((email) => ({ value: email, label: email })),
    ];
  }, [baseRows]);

  const statusOptions = useMemo(() => {
    const seen = new Set(baseRows.map((r) => r.item.status));
    return [
      { value: 'all', label: 'Todas as situações' },
      ...Array.from(seen)
        .sort()
        .map((s) => ({ value: s, label: ITEM_STATUS_LABELS[s] || s })),
    ];
  }, [baseRows]);

  const selectedGroup = optionGroups.find((g) => g.key === filters.equipment);

  const handleFilterChange = (key, value) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
    queryClient.invalidateQueries({ queryKey: ['gdms'] });
    toast.success('Dados atualizados.');
  };

  const handleClear = () => setFilters(DEFAULT_FILTERS);

  const handleExport = () => {
    if (filteredRows.length === 0) {
      toast.warning('Nenhum registro para exportar.');
      return;
    }
    const filtersDesc = {
      Equipamento: selectedGroup?.name,
      'Código GDM': filters.gdm || undefined,
      Embarcação:
        filters.vessel !== 'all'
          ? vesselOptions.find((v) => v.value === filters.vessel)?.label
          : undefined,
      'Status atual':
        filters.status !== 'all'
          ? ITEM_STATUS_LABELS[filters.status] || filters.status
          : undefined,
      Fornecedor:
        filters.supplier !== 'all'
          ? supplierOptions.find((s) => s.value === filters.supplier)?.label
          : undefined,
      'Responsável de Serviços':
        filters.responsible !== 'all' ? filters.responsible : undefined,
      'Situação do processo': filters.situation !== 'all' ? filters.situation : undefined,
      'Desembarque (de)': filters.disembarkFrom || undefined,
      'Desembarque (até)': filters.disembarkTo || undefined,
      'Abertura da GDM (de)': filters.createdFrom || undefined,
      'Abertura da GDM (até)': filters.createdTo || undefined,
    };
    const csv = buildEquipmentControlCsv(filteredRows, filtersDesc);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dados-por-equipamento-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredRows.length} registro(s) exportado(s).`);
  };

  if (loadingGdms || loadingItems) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Dados por Equipamento</h2>
        <p className="text-slate-500 text-sm mt-1">
          Consulta e acompanhamento, pela nomenclatura cadastrada, das unidades
          desembarcadas em processos de reparo — com contagem por unidade real de
          cada item das GDMs.
        </p>
      </div>

      <EquipmentControlFilters
        equipmentOptions={equipmentOptions}
        filters={filters}
        onChange={handleFilterChange}
        vesselOptions={vesselOptions}
        statusOptions={statusOptions}
        supplierOptions={supplierOptions}
        responsibleOptions={responsibleOptions}
        onRefresh={handleRefresh}
        onClear={handleClear}
        onExport={handleExport}
      />

      {selectedGroup && (
        <div className="flex items-center gap-2">
          <Badge className="bg-sky-100 text-sky-800 border-sky-200">
            {selectedGroup.name}
          </Badge>
          <button
            type="button"
            onClick={() => handleFilterChange('equipment', 'all')}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
          >
            <X className="h-3.5 w-3.5" /> Remover seleção (ver todos)
          </button>
        </div>
      )}

      <EquipmentControlKpis kpi={kpi} />

      <EquipmentControlCharts {...charts} />

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          Resumo por nomenclatura
        </h3>
        <EquipmentGroupsTable
          groups={groups}
          selectedKey={filters.equipment}
          onSelect={(key) =>
            handleFilterChange('equipment', filters.equipment === key ? 'all' : key)
          }
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          Processos que compõem os indicadores ({filteredRows.length} item(ns))
        </h3>
        <EquipmentItemsTable rows={filteredRows} />
      </div>
    </div>
  );
}