import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import {
  ITEM_DESTINATION_LABELS,
  ITEM_DESTINATION_COLORS,
  summarizeItems,
  OVERALL_LABELS,
} from '@/lib/gdmItems';

export function useGdmItems(gdmId) {
  return useQuery({
    queryKey: ['gdmItems', gdmId],
    queryFn: () => base44.entities.GDMItem.filter({ gdm_id: gdmId }, 'item_number'),
    enabled: !!gdmId,
  });
}

/** Etiquetas de resumo exibidas no cabeçalho da guia (substitui a tratativa única). */
export function GDMItemsHeaderSummary({ gdmId }) {
  const { data: items = [] } = useGdmItems(gdmId);
  if (items.length === 0) return null;
  const summary = summarizeItems(items);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
        {summary.total} {summary.total === 1 ? 'item' : 'itens'}
      </span>
      {Object.entries(summary.byDestination).map(([dest, count]) => (
        <span
          key={dest}
          className={`text-xs font-medium px-2 py-1 rounded-full border ${ITEM_DESTINATION_COLORS[dest] || 'bg-slate-100 text-slate-700 border-slate-200'}`}
        >
          {count} {ITEM_DESTINATION_LABELS[dest] || dest}
        </span>
      ))}
    </div>
  );
}

/** Indicadores no topo: totais por situação e por destino. */
export default function GDMItemsSummary({ gdmId }) {
  const { data: items = [] } = useGdmItems(gdmId);
  if (items.length === 0) return null;
  const summary = summarizeItems(items);

  const blocks = [
    { label: 'Total de itens', value: summary.total, cls: 'text-slate-900' },
    { label: 'Finalizados', value: summary.completed, cls: 'text-green-700' },
    { label: 'Em andamento', value: summary.inProgress, cls: 'text-blue-700' },
    { label: 'Aguardando aprovação', value: summary.waiting, cls: 'text-amber-700' },
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-slate-500">Situação geral da guia</span>
          <span className="text-sm font-semibold text-slate-900">
            {OVERALL_LABELS[summary.overall]}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {blocks.map((b) => (
            <div key={b.label} className="rounded-xl bg-slate-50 p-3">
              <div className={`text-2xl font-bold ${b.cls}`}>{b.value}</div>
              <div className="text-xs text-slate-500">{b.label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {summary.completed} de {summary.total} itens finalizados
            </span>
            <span>{Math.round((summary.completed / Math.max(summary.total, 1)) * 100)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-600 transition-all"
              style={{
                width: `${Math.round((summary.completed / Math.max(summary.total, 1)) * 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.byDestination).map(([dest, count]) => (
            <span
              key={dest}
              className={`text-xs font-medium px-2 py-1 rounded-full border ${ITEM_DESTINATION_COLORS[dest] || 'bg-slate-100 text-slate-700 border-slate-200'}`}
            >
              {ITEM_DESTINATION_LABELS[dest] || dest}: {count}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}