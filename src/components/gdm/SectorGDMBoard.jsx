import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { SECTOR_DESTINATIONS, scopeGdms } from '@/lib/permissions';
import {
  itemResponsibleGroup,
  availableItemActions,
  sortItemsByPriority,
} from '@/lib/gdmItems';
import SectorItemCard from './SectorItemCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search,
  FileText,
  Ship,
  ChevronDown,
  ChevronRight,
  Package,
} from 'lucide-react';

const RESPONSIBLE_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'mine', label: 'Minha Ação' },
  { key: 'operations', label: 'Aguardando Operações' },
  { key: 'maintenance', label: 'Aguardando Manutenção' },
  { key: 'almoxarifado', label: 'Aguardando Almoxarifado' },
  { key: 'services', label: 'Aguardando Serviços' },
  { key: 'planejamento', label: 'Aguardando Planejamento' },
  { key: 'completed', label: 'Concluídos' },
];

/**
 * Painel setorial (Manutenção ou Operações).
 * Painel operacional do workflow: cada setor executa suas ações
 * diretamente no card do item, sobre os mesmos registros da GDM —
 * sem duplicação e sincronizado em tempo real com todas as telas.
 */
export default function SectorGDMBoard({ sector, title, description, emptyMessage }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [respFilter, setRespFilter] = useState('all');
  const queryClient = useQueryClient();
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

  // Sincronização em tempo real com a GDM completa e demais telas:
  // qualquer mudança de item (ou da guia) atualiza este painel na hora.
  useEffect(() => {
    const unsubItems = base44.entities.GDMItem.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
    });
    const unsubGdms = base44.entities.GDM.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
    });
    return () => {
      unsubItems();
      unsubGdms();
    };
  }, [queryClient]);

  const { groups, totalItems, myActionCount } = useMemo(() => {
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

    // Filtro por responsabilidade: itens pendentes da minha ação primeiro.
    result = result
      .map((entry) => {
        const matched = entry.items.filter((i) => {
          if (respFilter === 'all') return true;
          if (respFilter === 'mine')
            return availableItemActions(i, hasPermission, user).length > 0;
          return itemResponsibleGroup(i) === respFilter;
        });
        return matched.length ? { gdm: entry.gdm, items: matched } : null;
      })
      .filter(Boolean);

    result.forEach((entry) => {
      entry.items = sortItemsByPriority(entry.items, hasPermission, user);
    });

    return {
      groups: result,
      totalItems: result.reduce((s, e) => s + e.items.length, 0),
      myActionCount: items.filter(
        (i) =>
          destinations.includes(i.destination) &&
          availableItemActions(i, hasPermission, user).length > 0,
      ).length,
    };
  }, [gdms, items, destinations, user, searchTerm, respFilter, hasPermission]);

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
        <div className="text-sm text-slate-500">
          {groups.length} GDMs · {totalItems} itens
          {myActionCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
              {myActionCount} aguardando sua ação
            </span>
          )}
        </div>
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
            {RESPONSIBLE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setRespFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  respFilter === f.key
                    ? 'bg-sky-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.key === 'mine' && myActionCount > 0 ? `${f.label} (${myActionCount})` : f.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grupos por GDM */}
      {groups.map(({ gdm, items }) => (
        <GDMGroup
          key={gdm.id}
          gdm={gdm}
          items={items}
          hasPermission={hasPermission}
          user={user}
        />
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

function GDMGroup({ gdm, items, hasPermission, user }) {
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 pt-3 border-t border-slate-100">
            {items.map((item) => (
              <SectorItemCard
                key={item.id}
                item={item}
                gdm={gdm}
                hasPermission={hasPermission}
                user={user}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}