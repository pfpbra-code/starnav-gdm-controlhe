import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { scopeGdms } from '@/lib/permissions';
import { returnDeadlineState } from '@/lib/gdmItems';
import SectorItemCard from './SectorItemCard';
import { Search, Package, AlertTriangle, Clock } from 'lucide-react';

/**
 * Painel de pendências setoriais (Serviços / Almoxarifado): agrupa os itens
 * que aguardam ação do setor por categoria. A ação executada no card move o
 * item para a próxima etapa e ele sai da pendência correspondente — todo o
 * registro permanece no histórico do item e da GDM.
 * `categories`: [{ key, label, match: (item) => boolean }]
 */
export default function PendingBoard({
  title,
  description,
  emptyMessage,
  categories,
  showDeadlineAlerts = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { user } = usePermissions();

  const { data: gdms = [], isLoading: loadingGdms } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-created_date', 200),
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['gdmItems'],
    queryFn: () => base44.entities.GDMItem.list('-created_date', 500),
  });

  const isLoading = loadingGdms || loadingItems;

  // Sincronização em tempo real: ação em qualquer módulo atualiza o painel.
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

  const gdmById = useMemo(() => {
    const map = {};
    gdms.forEach((g) => { map[g.id] = g; });
    return map;
  }, [gdms]);

  const categorized = useMemo(() => {
    const scoped = scopeGdms(user, gdms);
    const gdmIds = new Set(scoped.map((g) => g.id));
    let pool = items.filter((i) => gdmIds.has(i.gdm_id));
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      pool = pool.filter(
        (i) =>
          i.equipment_name?.toLowerCase().includes(term) ||
          i.serial_number?.toLowerCase().includes(term) ||
          i.supplier_name?.toLowerCase().includes(term) ||
          (gdmById[i.gdm_id]?.gdm_number || '').toLowerCase().includes(term) ||
          (gdmById[i.gdm_id]?.vessel_name || '').toLowerCase().includes(term),
      );
    }
    return categories
      .map((c) => ({ ...c, list: pool.filter(c.match) }))
      .filter((c) => c.list.length > 0);
  }, [items, gdms, user, searchTerm, categories, gdmById]);

  // Alertas de prazo de retorno por equipamento (vencido / próximo).
  const deadlineAlerts = useMemo(() => {
    if (!showDeadlineAlerts) return [];
    const scoped = scopeGdms(user, gdms);
    const gdmIds = new Set(scoped.map((g) => g.id));
    return items
      .filter((i) => gdmIds.has(i.gdm_id))
      .map((i) => ({ item: i, state: returnDeadlineState(i) }))
      .filter((a) => a.state === 'overdue' || a.state === 'near')
      .sort((a, b) => a.state === 'overdue' ? -1 : 1);
  }, [items, gdms, user, showDeadlineAlerts]);

  const totalPending = categorized.reduce((s, c) => s + c.list.length, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
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
          {categorized.length} pendências · {totalPending} itens
        </div>
      </div>

      {/* Alertas de prazo (vencido / próximo do vencimento) */}
      {showDeadlineAlerts && deadlineAlerts.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertas de prazo de retorno ({deadlineAlerts.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {deadlineAlerts.map(({ item, state }) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border p-2 text-sm ${
                    state === 'overdue'
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  <span className="truncate">
                    {gdmById[item.gdm_id]?.gdm_number || '—'} · Item{' '}
                    {String(item.item_number).padStart(2, '0')} · {item.equipment_name}
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap font-medium">
                    {state === 'overdue' ? (
                      <>
                        <AlertTriangle className="h-3 w-3" /> Vencido
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" /> Vence em breve
                      </>
                    )}
                    <span className="text-slate-500">· {item.quote_deadline}</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Busca */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por GDM, embarcação, equipamento, serial ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pendências por categoria */}
      {categorized.map((cat) => (
        <Card key={cat.key} className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 p-4 pb-2">
              <h3 className="text-sm font-semibold text-slate-900">{cat.label}</h3>
              <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                {cat.list.length} {cat.list.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 pt-2 border-t border-slate-100">
              {cat.list.map((item) => (
                <SectorItemCard
                  key={`${cat.key}-${item.id}`}
                  item={item}
                  gdm={gdmById[item.gdm_id]}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {categorized.length === 0 && (
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