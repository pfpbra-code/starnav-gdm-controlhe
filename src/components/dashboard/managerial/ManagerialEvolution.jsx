import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TREND_META = {
  growth: { label: 'Crescimento', cls: 'bg-emerald-100 text-emerald-700', Icon: TrendingUp },
  reduction: { label: 'Redução', cls: 'bg-red-100 text-red-700', Icon: TrendingDown },
  stable: { label: 'Estável', cls: 'bg-slate-100 text-slate-600', Icon: Minus },
};

function TrendBadge({ trend }) {
  const { label, cls, Icon } = TREND_META[trend.direction] || TREND_META.stable;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {label} {trend.pct > 0 ? '+' : ''}{trend.pct.toFixed(1)}%/mês
    </span>
  );
}

function ChartCard({ title, data }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#0284c7" radius={[4, 4, 0, 0]} name="Itens" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManagerialEvolution({ monthly, quarterly, yearly, monthlyTrend }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Evolução Temporal dos Desembarques</h3>
        <TrendBadge trend={monthlyTrend} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Itens por mês (últimos 12 meses)" data={monthly} />
        <ChartCard title="Itens por trimestre (últimos 8)" data={quarterly} />
        <ChartCard title="Itens por ano (últimos 5)" data={yearly} />
      </div>
    </div>
  );
}