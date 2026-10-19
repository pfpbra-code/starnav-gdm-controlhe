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

  const { data: signatures = [] } = useQuery({
    queryKey: ['itemSignatures', itemId],
    queryFn: () => base44.entities.Signature.filter({ item_id: itemId }, '-signed_at'),
    enabled: !!itemId,
  });

  const findSignature = (h) =>
    signatures.find(
      (s) =>
        s.action === h.action &&
        s.user_email === h.user_email &&
        Math.abs(new Date(s.signed_at) - new Date(h.created_date)) < 3 * 60 * 1000
    );

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
          {(() => {
            const sig = findSignature(h);
            if (!sig) return null;
            return (
              <div className="mt-1.5 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1">
                <img
                  src={sig.signature_url}
                  alt={`Assinatura de ${sig.user_name || sig.user_email}`}
                  className="h-8 object-contain object-left"
                />
                <span className="text-[10px] text-slate-400">
                  Assinado eletronicamente por {sig.user_name || sig.user_email}
                </span>
              </div>
            );
          })()}
        </li>
      ))}
    </ol>
  );
}