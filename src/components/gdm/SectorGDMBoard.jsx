import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { SECTOR_DESTINATIONS, scopeGdms } from '@/lib/permissions';
import {
  ITEM_DESTINATION_LABELS,
  ITEM_DESTINATION_COLORS,
  ITEM_STATUS_LABELS,
  ITEM_STATUS_COLORS,
  itemGroup,
  itemResponsible,
  sortItemsByPriority,
} from '@/lib/gdmItems';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search,
  FileText,
  Eye,
  Ship,
  ChevronDown,
  ChevronRight,
  Package,
} from 'lucide-react';

const GROUP_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Aguardando Aprovação' },
  { key: 'in_progress', label: 'Em Andamento' },
  { key: 'completed', label: 'Finalizados' },
  { key: 'closed', label: 'Cancelados / Reprovados' },
];

/**
 * Painel setorial (Manutenção ou Operações).
 * Mostra as GDMs agrupadas com os itens do setor correspondente,
 * filtrando os mesmos registros do banco — sem duplicação.
 */
export default function SectorGDMBoard({
  sector,
  title,
  description,
  emptyMessage,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const { user, hasPermission } = usePermissions();

  const destinations = SECTOR_DESTINATIONS[sector] || [];

  const { data: gdms = [], isLoading: loadingGdms } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-created_date', 200),
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['gdmItems'],
    queryFn: () => base44.entities.GDMItem.list('-created_date', 500),
  });

  const isLoading = loadingGdms || loadingItems;

  const { groups, totalItems } = useMemo(() => {
    const itemsByGdm = {};
    items
      .filter((i) => destinations.includes(i.destination))
      .forEach((i) => {
        (itemsByGdm[i.gdm_id] = itemsByGdm[i.gdm_id] || []).push(i);
      });

    const scoped = scopeGdms(user, gdms);

    let result = scoped
      .filter((g) => itemsByGdm[g.id]?.length)
      .map((g) => ({ gdm: g, items: itemsByGdm[g.id] }));

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result
        .map((entry) => {
          const matched = entry.items.filter(
            (i) =>
              i.equipment_name?.toLowerCase().includes(term) ||
              i.serial_number?.toLowerCase().includes(term) ||
              i.supplier_name?.toLowerCase().includes(term),
          );
          const gdmMatched =
            entry.gdm.gdm_number?.toLowerCase().includes(term) ||
            entry.gdm.vessel_name?.toLowerCase().includes(term);
          if (gdmMatched) return entry;
          if (matched.length) return { gdm: entry.gdm, items: matched };
          return null;
        })
        .filter(Boolean);
    }

    if (groupFilter !== 'all') {
      result = result
        .map((entry) => {
          const matched = entry.items.filter((i) => itemGroup(i) === groupFilter);
          return matched.length ? { gdm: entry.gdm, items: matched } : null;
        })
        .filter(Boolean);
    }

    result.forEach((entry) => {
      entry.items = sortItemsByPriority(entry.items, hasPermission);
    });

    return {
      groups: result,
      totalItems: result.reduce((s, e) => s + e.items.length, 0),
    };
  }, [gdms, items, destinations, user, searchTerm, groupFilter, hasPermission]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Card>
          <CardContent className="p-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 mb-4" />
            ))}
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
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500 mt-1">{description}</p>
        </div>
        <p className="text-sm text-slate-500">
          {groups.length} GDMs · {totalItems} itens
        </p>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por GDM, embarcação, equipamento, serial ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {GROUP_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setGroupFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  groupFilter === f.key
                    ? 'bg-sky-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grupos por GDM */}
      {groups.map(({ gdm, items }) => (
        <GDMGroup key={gdm.id} gdm={gdm} items={items} />
      ))}

      {groups.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">{emptyMessage}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GDMGroup({ gdm, items }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 rounded-t-xl"
        >
          <div className="flex items-center gap-3">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
            <div className="flex items-center gap-2 text-sky-600">
              <FileText className="h-4 w-4" />
              <span className="font-semibold">{gdm.gdm_number}</span>
            </div>
            <span className="flex items-center gap-1 text-sm text-slate-500">
              <Ship className="h-4 w-4" />
              {gdm.vessel_name || '-'}
            </span>
            <span className="text-sm text-slate-400">
              {gdm.disembark_date
                ? format(new Date(gdm.disembark_date), 'dd/MM/yyyy', { locale: ptBR })
                : ''}
            </span>
          </div>
          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
            {items.length} {items.length === 1 ? 'item' : 'itens'}
          </span>
        </button>

        {expanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 pt-0 border-t border-slate-100">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.equipment_name}</p>
                    <p className="text-xs text-slate-500">
                      Serial: {item.serial_number || '—'} · Qtd: {item.quantity || 1}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${
                      ITEM_DESTINATION_COLORS[item.destination] || ''
                    }`}
                  >
                    {ITEM_DESTINATION_LABELS[item.destination] || item.destination}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      ITEM_STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {ITEM_STATUS_LABELS[item.status] || item.status}
                  </span>
                  <span className="text-xs text-slate-500 truncate">
                    {item.supplier_name || itemResponsible(item)}
                  </span>
                </div>
                <Link
                  to={createPageUrl(`GDMDetail?id=${gdm.id}`)}
                  className="mt-3 flex items-center gap-1 text-xs text-sky-600 hover:underline"
                >
                  <Eye className="h-3 w-3" />
                  Ver GDM completa
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}