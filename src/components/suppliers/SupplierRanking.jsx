import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Wrench, Activity } from 'lucide-react';

function RankingList({ title, icon: Icon, iconColor, rows, valueKey, valueLabel, emptyText }) {
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
            <span className="text-sm text-slate-500 shrink-0">
              {row[valueKey]} {valueLabel}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Ranking gerencial de fornecedores — Top 10 por equipamentos em posse,
 * equipamentos reparados e volume total de processos.
 */
export default function SupplierRanking({ stats }) {
  const top10 = (key) =>
    [...stats].filter((r) => (r[key] || 0) > 0).sort((a, b) => b[key] - a[key]).slice(0, 10);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <RankingList
        title="Top 10 — Equipamentos em Posse"
        icon={Package}
        iconColor="text-sky-600"
        rows={top10('inPossession')}
        valueKey="inPossession"
        valueLabel="em posse"
        emptyText="Nenhum equipamento em posse."
      />
      <RankingList
        title="Top 10 — Equipamentos Reparados"
        icon={Wrench}
        iconColor="text-emerald-600"
        rows={top10('completed')}
        valueKey="completed"
        valueLabel="reparados"
        emptyText="Nenhum equipamento finalizado."
      />
      <RankingList
        title="Top 10 — Volume de Processos"
        icon={Activity}
        iconColor="text-orange-600"
        rows={top10('itemsTotal')}
        valueKey="itemsTotal"
        valueLabel="processos"
        emptyText="Nenhum processo registrado."
      />
    </div>
  );
}