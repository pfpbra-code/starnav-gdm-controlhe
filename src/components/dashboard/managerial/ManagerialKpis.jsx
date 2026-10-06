import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus, CalendarRange, FileStack } from 'lucide-react';

function VariationBadge({ variation }) {
  const up = variation > 0;
  const flat = variation === 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const cls = flat
    ? 'bg-slate-100 text-slate-600'
    : up
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-red-100 text-red-700';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {up ? '+' : ''}
      {variation.toFixed(1)}%
    </span>
  );
}

function PeriodCard({ title, current, previous, variation }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <p className="text-sm text-slate-500">{title}</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="text-3xl font-bold text-slate-900">{current}</p>
          <VariationBadge variation={variation} />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Período anterior: <span className="font-medium text-slate-700">{previous}</span>
        </p>
      </CardContent>
    </Card>
  );
}

export default function ManagerialKpis({ general }) {
  if (general.mode === 'custom') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <CalendarRange className="h-4 w-4 text-sky-600" />
              Itens no período
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{general.label}</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-3xl font-bold text-slate-900">{general.total}</p>
              <VariationBadge variation={general.variation} />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Período anterior: <span className="font-medium text-slate-700">{general.previous}</span>
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <FileStack className="h-4 w-4 text-amber-600" />
              Média mensal no período
            </p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{general.monthlyAvg.toFixed(1)}</p>
            <p className="text-xs text-slate-500 mt-2">itens por mês</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <PeriodCard title="Itens no mês atual" {...general.month} />
      <PeriodCard title="Itens no trimestre atual" {...general.quarter} />
      <PeriodCard title="Itens no ano atual" {...general.year} />
    </div>
  );
}