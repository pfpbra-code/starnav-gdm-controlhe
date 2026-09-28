import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { scopeGdms } from '@/lib/permissions';
import { itemResponsibleGroup } from '@/lib/gdmItems';
import { ClipboardList, Wrench, CheckCircle2, Timer } from 'lucide-react';

/**
 * KPIs de acompanhamento do setor de Serviços — derivados somente leitura dos
 * itens da GDM (mesma fonte de verdade do fluxo). Nenhum status é alterado aqui.
 */
export default function ServicesKpis() {
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

  const stats = useMemo(() => {
    const scoped = scopeGdms(user, gdms);
    const gdmIds = new Set(scoped.map((g) => g.id));
    const pool = items.filter((i) => gdmIds.has(i.gdm_id));

    // Pendências com a bola do Serviços agora (mesma regra dos filtros setoriais)
    const pendingCount = pool.filter((i) => itemResponsibleGroup(i) === 'services').length;

    // Itens que estão hoje no fornecedor (aguardando cotação ou em tratativa)
    const withSupplier = pool.filter((i) =>
      ['sent_to_supplier', 'in_treatment', 'awaiting_return'].includes(i.status),
    ).length;

    // Realizado: itens finalizados no mês corrente
    const now = new Date();
    const completedThisMonth = pool.filter((i) => {
      if (i.status !== 'completed' || !i.completed_at) return false;
      const d = new Date(i.completed_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    // Tempo médio de ciclo no fornecedor: envio confirmado → retorno confirmado
    const cycles = pool
      .map((i) => {
        const end = i.return_confirmed_at || i.return_received_at;
        if (!i.sent_to_supplier_at || !end) return null;
        const days = (new Date(end) - new Date(i.sent_to_supplier_at)) / 86400000;
        return days >= 0 ? days : null;
      })
      .filter((d) => d != null);
    const avgCycle = cycles.length
      ? cycles.reduce((s, d) => s + d, 0) / cycles.length
      : null;

    return { pendingCount, withSupplier, completedThisMonth, avgCycle };
  }, [items, gdms, user]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Pendências do Setor',
      value: stats.pendingCount,
      hint: 'itens aguardando ação de Serviços',
      icon: <ClipboardList className="h-5 w-5 text-amber-600" />,
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Com Fornecedor Agora',
      value: stats.withSupplier,
      hint: 'aguardando cotação, em tratativa ou retorno',
      icon: <Wrench className="h-5 w-5 text-sky-600" />,
      tone: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'Finalizados no Mês',
      value: stats.completedThisMonth,
      hint: 'itens concluídos no mês corrente',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Tempo Médio no Fornecedor',
      value: stats.avgCycle != null ? `${stats.avgCycle.toFixed(1)} dias` : '—',
      hint: 'do envio ao retorno confirmado',
      icon: <Timer className="h-5 w-5 text-indigo-600" />,
      tone: 'bg-indigo-50 text-indigo-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((k) => (
        <Card key={k.label} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">{k.label}</p>
              <span className={`p-1.5 rounded-lg ${k.tone}`}>{k.icon}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{k.value}</p>
            <p className="text-xs text-slate-400 mt-1">{k.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}