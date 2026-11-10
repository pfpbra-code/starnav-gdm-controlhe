import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { scopeGdms } from '@/lib/permissions';
import { quoteFollowupMetrics, quoteAlertState } from '@/lib/quoteFollowup';
import QuoteFollowUpKpis from './QuoteFollowUpKpis';
import QuoteFollowUpTable from './QuoteFollowUpTable';
import QuoteFollowUpDialog from './QuoteFollowUpDialog';
import QuoteSupplierPerformance from './QuoteSupplierPerformance';

/**
 * Aba Serviços — Follow-up de Cotações: acompanhamento dos equipamentos enviados
 * ao fornecedor sem proposta recebida. A contagem começa na data de envio e o
 * alerta escala aos 3, 5 e 7 dias. Somente leitura sobre o fluxo: o registro de
 * follow-up não altera a etapa do item (vai para os históricos do item e da GDM).
 */
export default function QuoteFollowUpPanel() {
  const { user, hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: gdms = [], isLoading: loadingGdms } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-created_date', 200),
  });

  const { data: rawItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['gdmItems'],
    queryFn: () => base44.entities.GDMItem.list('-created_date', 500),
    refetchInterval: 30000,
  });

  const { data: followups = [], isLoading: loadingFollowups } = useQuery({
    queryKey: ['quoteFollowups'],
    queryFn: () => base44.entities.QuoteFollowup.list('-registered_at', 300),
  });

  // Atualização automática quando qualquer item é movimentado no sistema.
  useEffect(() => {
    const unsubscribe = base44.entities.GDMItem.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const gdmById = useMemo(() => {
    const map = {};
    gdms.forEach((g) => {
      map[g.id] = g;
    });
    return map;
  }, [gdms]);

  const scopedItems = useMemo(() => {
    const ids = new Set(scopeGdms(user, gdms).map((g) => g.id));
    return rawItems.filter((i) => ids.has(i.gdm_id));
  }, [rawItems, gdms, user]);

  const metrics = useMemo(
    () => quoteFollowupMetrics(scopedItems, followups),
    [scopedItems, followups],
  );

  const rows = useMemo(
    () =>
      metrics.awaiting.map(({ item, days }) => {
        const state = quoteAlertState(item);
        return { item, days, label: state.label, className: state.className };
      }),
    [metrics],
  );

  const lastFollowupByItem = useMemo(() => {
    const map = {};
    [...followups]
      .sort(
        (a, b) =>
          new Date(a.registered_at || a.created_date).getTime() -
          new Date(b.registered_at || b.created_date).getTime(),
      )
      .forEach((f) => {
        map[f.item_id] = f;
      });
    return map;
  }, [followups]);

  const canFollowUp = hasPermission('send_to_supplier') || user?.role === 'admin';

  const openFollowUp = (item) => {
    setTarget(item);
    setDialogOpen(true);
  };

  if (loadingGdms || loadingItems || loadingFollowups) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Follow-up de Cotações</h2>
        <p className="text-slate-500 mt-1 text-sm">
          Equipamentos enviados ao fornecedor que ainda não tiveram a proposta recebida.
          A contagem inicia na data de envio e escala aos 3, 5 e 7 dias corridos.
        </p>
      </div>

      <QuoteFollowUpKpis metrics={metrics} />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-2 p-4 pb-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Cotações Pendentes ({rows.length})
            </h3>
            <span className="text-xs text-slate-500">ordenadas pela mais antiga</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-4 pb-4 pt-1 text-sm text-slate-500 border-t border-slate-100">
              Nenhum equipamento aguardando cotação neste momento.
            </p>
          ) : (
            <div className="border-t border-slate-100">
              <QuoteFollowUpTable
                rows={rows}
                gdmById={gdmById}
                lastFollowupByItem={lastFollowupByItem}
                canFollowUp={canFollowUp}
                onFollowUp={openFollowUp}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <QuoteSupplierPerformance suppliers={metrics.suppliers} />

      <QuoteFollowUpDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={target}
        user={user}
      />
    </div>
  );
}