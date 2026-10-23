import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Timer, Clock, CheckCircle2 } from 'lucide-react';
import { formatDays } from '@/lib/supplierControl';

function RankingList({ title, icon: Icon, iconColor, rows, renderValue, emptyText }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-slate-500">{emptyText}</p>}
        {rows.map((row, i) => (
          <div key={row.supplier.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Badge
                variant="outline"
                className={
                  i === 0
                    ? 'bg-sky-100 text-sky-700 border-sky-200 shrink-0'
                    : 'bg-slate-50 text-slate-600 shrink-0'
                }
              >
                {i + 1}º
              </Badge>
              <span className="text-sm font-medium truncate">
                {row.supplier.trading_name || row.supplier.company_name}
              </span>
            </div>
            <span className="text-sm text-slate-500 shrink-0">{renderValue(row)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Ranking de Fornecedores — Top 10 por volume de equipamentos em posse,
 * menor tempo médio de retorno, maior índice de pontualidade e
 * maior quantidade de serviços concluídos.
 */
export default function SupplierRanking({ stats }) {
  const top10 = (key, dir = 'desc') =>
    [...stats]
      .filter((r) => (r[key] || 0) > 0)
      .sort((a, b) => (dir === 'desc' ? b[key] - a[key] : a[key] - b[key]))
      .slice(0, 10);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <RankingList
        title="🏆 Top 10 — Equipamentos em Posse"
        icon={Package}
        iconColor="text-sky-600"
        rows={top10('inPossession')}
        renderValue={(r) => `${r.inPossession} em posse`}
        emptyText="Nenhum equipamento em posse."
      />
      <RankingList
        title="🏆 Top 10 — Menor Tempo Médio de Retorno"
        icon={Timer}
        iconColor="text-emerald-600"
        rows={[...stats]
          .filter((r) => r.avgReturnDays !== null)
          .sort((a, b) => a.avgReturnDays - b.avgReturnDays)
          .slice(0, 10)}
        renderValue={(r) => formatDays(r.avgReturnDays)}
        emptyText="Nenhum retorno registrado ainda."
      />
      <RankingList
        title="🏆 Top 10 — Maior Índice de Pontualidade"
        icon={Clock}
        iconColor="text-orange-600"
        rows={[...stats]
          .filter((r) => r.punctualityRate !== null && r.punctualityRate > 0)
          .sort((a, b) => b.punctualityRate - a.punctualityRate)
          .slice(0, 10)}
        renderValue={(r) => `${r.punctualityRate}% no prazo`}
        emptyText="Sem retornos com prazo registrado."
      />
      <RankingList
        title="🏆 Top 10 — Serviços Concluídos"
        icon={CheckCircle2}
        iconColor="text-violet-600"
        rows={top10('completed')}
        renderValue={(r) => `${r.completed} concluídos`}
        emptyText="Nenhum serviço concluído."
      />
    </div>
  );
}