import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { OT_OPEN_STATES, otIsOverdue } from '@/lib/workOrders';
import { Card, CardContent } from '@/components/ui/card';
import { FolderOpen } from 'lucide-react';

/**
 * Card-resumo do total geral de OTs abertas (em todos os status de abertura),
 * exibido fora da aba de Controle de OT. Atualização em tempo real.
 */
export default function OpenOTSummaryCard() {
  const queryClient = useQueryClient();
  const [now] = useState(() => new Date());

  const { data: items = [] } = useQuery({
    queryKey: ['gdmItems'],
    queryFn: () => base44.entities.GDMItem.list('-created_date', 500),
  });

  useEffect(() => {
    const unsubscribe = base44.entities.GDMItem.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const open = useMemo(
    () => items.filter((i) => i.ot_number && OT_OPEN_STATES.includes(i.ot_status)),
    [items],
  );
  const overdue = useMemo(() => open.filter((i) => otIsOverdue(i, now)), [open, now]);

  const byStatus = (s) => open.filter((i) => i.ot_status === s).length;

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-2xl font-bold text-slate-900">{open.length}</p>
          <p className="text-xs text-slate-500 mt-1">OTs Abertas (total geral)</p>
          <p className="text-[11px] text-amber-700 mt-1">
            {byStatus('open')} aberta(s) · {byStatus('in_service')} em serviço ·{' '}
            {byStatus('awaiting_close')} aguardando fechamento
          </p>
        </div>
        <div className="text-right space-y-1">
          <FolderOpen className="h-5 w-5 text-slate-400" />
          {overdue.length > 0 && (
            <p className="text-[11px] font-medium text-red-600">
              {overdue.length} vencida(s)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}