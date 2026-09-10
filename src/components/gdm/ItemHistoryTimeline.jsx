import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { ITEM_ACTION_LABELS } from '@/lib/gdmItems';

/**
 * Linha do tempo completa do item: data/hora, usuário, ação e observação.
 */
export default function ItemHistoryTimeline({ itemId }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['gdmItemHistory', itemId],
    queryFn: () => base44.entities.GDMItemHistory.filter({ item_id: itemId }, '-created_date'),
    enabled: !!itemId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return <p className="text-xs text-slate-500">Nenhuma movimentação registrada ainda.</p>;
  }

  return (
    <ol className="space-y-2">
      {history.map((h) => (
        <li key={h.id} className="relative pl-4 border-l-2 border-slate-200">
          <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-sky-500" />
          <p className="text-xs font-medium text-slate-800">
            {ITEM_ACTION_LABELS[h.action] || h.action}
          </p>
          <p className="text-[11px] text-slate-500">
            {h.user_email || 'Sistema'} ·{' '}
            {h.created_date
              ? format(new Date(h.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
              : ''}
          </p>
          {h.observation && (
            <p className="text-[11px] text-slate-600 mt-0.5 italic">"{h.observation}"</p>
          )}
        </li>
      ))}
    </ol>
  );
}