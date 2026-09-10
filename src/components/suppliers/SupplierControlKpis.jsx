import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Wrench,
  Clock,
  Undo2,
  DollarSign,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { formatBRL } from '@/lib/supplierControl';

function KpiCard({ icon: Icon, label, value, hint }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <Icon className="h-4 w-4 text-sky-600" />
        </div>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </CardContent>
    </Card>
  );
}

const formatDays = (days) => (days === null ? '—' : `${days.toFixed(1)} dias`);

/** Indicadores internos de performance dos fornecedores. */
export default function SupplierControlKpis({ stats }) {
  const totalInPossession = stats.reduce((s, r) => s + r.inPossession, 0);
  const totalAwaitingQuote = stats.reduce((s, r) => s + r.awaitingQuote, 0);
  const totalInRepair = stats.reduce((s, r) => s + r.inRepair, 0);
  const totalAwaitingReturn = stats.reduce((s, r) => s + r.awaitingReturn, 0);
  const totalValue = stats.reduce((s, r) => s + r.totalValue, 0);
  const responses = stats.map((r) => r.avgResponseDays).filter((d) => d !== null);
  const avgResponse = responses.length
    ? responses.reduce((s, d) => s + d, 0) / responses.length
    : null;

  const mostUsed = [...stats].sort((a, b) => b.itemsTotal - a.itemsTotal).slice(0, 5);
  const slowest = stats
    .filter((r) => r.avgResponseDays !== null)
    .sort((a, b) => b.avgResponseDays - a.avgResponseDays)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard icon={Package} label="Em posse de fornecedores" value={totalInPossession} />
        <KpiCard icon={Clock} label="Aguardando cotação" value={totalAwaitingQuote} />
        <KpiCard icon={Wrench} label="Em reparo" value={totalInRepair} />
        <KpiCard icon={Undo2} label="Aguardando retorno" value={totalAwaitingReturn} />
        <KpiCard
          icon={DollarSign}
          label="Valor em orçamento"
          value={formatBRL(totalValue)}
        />
        <KpiCard
          icon={Timer}
          label="Tempo médio de resposta"
          value={formatDays(avgResponse)}
          hint="Envio → início do reparo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-600" />
              Fornecedores mais utilizados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mostUsed.length === 0 && (
              <p className="text-sm text-slate-500">Nenhum equipamento vinculado.</p>
            )}
            {mostUsed.map((row, index) => (
              <div key={row.supplier.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-slate-50 text-slate-600">
                    {index + 1}º
                  </Badge>
                  <span className="text-sm font-medium truncate max-w-[220px]">
                    {row.supplier.trading_name || row.supplier.company_name}
                  </span>
                </div>
                <span className="text-sm text-slate-500">{row.itemsTotal} equipamentos</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Timer className="h-4 w-4 text-orange-600" />
              Maior prazo médio de resposta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {slowest.length === 0 && (
              <p className="text-sm text-slate-500">Sem dados suficientes ainda.</p>
            )}
            {slowest.map((row) => (
              <div key={row.supplier.id} className="flex items-center justify-between">
                <span className="text-sm font-medium truncate max-w-[240px]">
                  {row.supplier.trading_name || row.supplier.company_name}
                </span>
                <span className="text-sm text-orange-600 font-medium">
                  {formatDays(row.avgResponseDays)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}