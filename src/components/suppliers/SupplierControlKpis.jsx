import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  Undo2,
  Timer,
  TrendingUp,
  TrendingDown,
  Trophy,
} from 'lucide-react';
import { formatBRL, formatDays, scoreBadgeClass } from '@/lib/supplierControl';

function KpiCard({ icon: Icon, label, value, hint, tone }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <Icon className={`h-4 w-4 ${tone || 'text-sky-600'}`} />
        </div>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function HighlightCard({ icon: Icon, title, name, value, emptyText, tone }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className={`h-4 w-4 ${tone || 'text-sky-600'}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {name ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{name}</span>
            <span className="text-sm text-slate-500 shrink-0">{value}</span>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{emptyText}</p>
        )}
      </CardContent>
    </Card>
  );
}

/** Indicadores de desempenho e acompanhamento dos fornecedores. */
export default function SupplierControlKpis({ stats }) {
  const inPossession = stats.reduce((s, r) => s + r.inPossession, 0);
  const late = stats.reduce((s, r) => s + (r.lateCount || 0), 0);
  const onTime = inPossession - late;
  const returnedThisMonth = stats.reduce((s, r) => s + (r.returnedThisMonth || 0), 0);
  const returns = stats.map((r) => r.avgReturnDays).filter((d) => d !== null);
  const avgReturn = returns.length
    ? returns.reduce((s, d) => s + d, 0) / returns.length
    : null;

  const name = (r) => r.supplier.trading_name || r.supplier.company_name;
  const mostItems = [...stats].filter((r) => r.itemsTotal > 0).sort((a, b) => b.itemsTotal - a.itemsTotal)[0];
  const worstLate = [...stats].filter((r) => (r.lateCount || 0) > 0).sort((a, b) => b.lateCount - a.lateCount)[0];
  const bestScore = [...stats]
    .filter((r) => r.completed > 0 || r.inPossession > 0)
    .sort((a, b) => b.score - a.score)[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard icon={Package} label="Em posse de fornecedores" value={inPossession} />
        <KpiCard
          icon={AlertTriangle}
          label="Atrasados"
          value={late}
          tone={late > 0 ? 'text-red-600' : undefined}
        />
        <KpiCard icon={CheckCircle2} label="Dentro do prazo" value={onTime} tone="text-green-600" />
        <KpiCard
          icon={Undo2}
          label="Retornados no mês"
          value={returnedThisMonth}
          hint="Recebimentos confirmados pelo Almoxarifado"
        />
        <KpiCard
          icon={Timer}
          label="Tempo médio de retorno"
          value={formatDays(avgReturn)}
          hint="Envio → recebimento de volta"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HighlightCard
          icon={TrendingUp}
          title="Fornecedor com mais itens"
          name={mostItems ? name(mostItems) : null}
          value={mostItems ? `${mostItems.itemsTotal} processos` : null}
          emptyText="Nenhum equipamento vinculado."
        />
        <HighlightCard
          icon={TrendingDown}
          title="Maior índice de atraso"
          name={worstLate ? name(worstLate) : null}
          value={worstLate ? `${worstLate.lateCount} itens atrasados` : null}
          emptyText="Nenhum item atrasado no momento."
          tone="text-red-600"
        />
        <HighlightCard
          icon={Trophy}
          title="Melhor desempenho"
          name={bestScore ? name(bestScore) : null}
          value={
            bestScore ? (
              <Badge variant="outline" className={`font-semibold ${scoreBadgeClass(bestScore.score)}`}>
                ⭐ {bestScore.score}/100
              </Badge>
            ) : null
          }
          emptyText="Sem dados de desempenho ainda."
          tone="text-amber-500"
        />
      </div>
    </div>
  );
}