import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { FileText, Package, Clock } from 'lucide-react';
import { DASHBOARD_TOOLTIPS } from '@/lib/kpiTooltips';

/**
 * Indicador "Aguardando Coordenação" do Dashboard Operacional:
 * GDMs pendentes de análise, itens aguardando validação do destino /
 * aprovação do Coordenador e tempo médio de espera desde a criação.
 */
export default function CoordinationPendingCard({ items, gdmViews }) {
  const pendingItems = items.filter((i) => i.status === 'pending_coordinator');
  const pendingGdms = gdmViews.filter((g) =>
    (g.items || []).some((i) => i.status === 'pending_coordinator'),
  ).length;

  const avgWaitHours = pendingItems.length
    ? pendingItems.reduce(
        (s, i) => s + (Date.now() - new Date(i.created_date).getTime()) / 3600000,
        0,
      ) / pendingItems.length
    : 0;
  const waitLabel =
    pendingItems.length === 0
      ? '—'
      : avgWaitHours < 24
        ? `${avgWaitHours.toFixed(1)}h`
        : `${(avgWaitHours / 24).toFixed(1)} dias`;

  const stats = [
    { icon: FileText, label: 'GDMs pendentes', value: pendingGdms },
    { icon: Package, label: 'Itens pendentes', value: pendingItems.length },
    { icon: Clock, label: 'Tempo médio de espera', value: waitLabel },
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
          Aguardando Coordenação
          <InfoTooltip content={DASHBOARD_TOOLTIPS.aguardandoCoordenacao} />
        </p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-amber-50 text-amber-600">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}