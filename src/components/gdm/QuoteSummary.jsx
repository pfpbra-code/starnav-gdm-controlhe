import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingDown, BarChart3, PiggyBank, Crown } from 'lucide-react';

const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function QuoteSummary({ gdm }) {
  const proposals = React.useMemo(() => {
    const list = [...(gdm.proposals || [])];
    if (
      gdm.quote_value != null &&
      !list.some((p) => p.quote_value === gdm.quote_value && (p.supplier_name || '') === (gdm.supplier_name || ''))
    ) {
      list.push({
        supplier_name: gdm.supplier_name,
        quote_value: gdm.quote_value,
        proposal_date: gdm.commercial_proposal_uploaded_at,
      });
    }
    return list.filter((p) => p.quote_value != null);
  }, [gdm]);

  if (proposals.length === 0) return null;

  const values = proposals.map((p) => p.quote_value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const approved = gdm.quote_value != null ? gdm.quote_value : min;
  const winner =
    proposals.find((p) => p.quote_value === approved) ||
    proposals.reduce((a, b) => (b.quote_value < a.quote_value ? b : a));
  const savings = Math.max(0, max - approved);

  const stats = [
    { label: 'Total de propostas', value: proposals.length, icon: BarChart3, color: 'text-sky-600 bg-sky-50' },
    { label: 'Menor valor', value: fmt(min), icon: TrendingDown, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Maior valor', value: fmt(max), icon: BarChart3, color: 'text-red-600 bg-red-50' },
    { label: 'Valor médio', value: fmt(avg), icon: BarChart3, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Empresa selecionada', value: winner?.supplier_name || '-', icon: Crown, color: 'text-amber-600 bg-amber-50' },
    { label: 'Valor aprovado', value: fmt(approved), icon: Trophy, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Economia gerada', value: fmt(savings), icon: PiggyBank, color: 'text-green-600 bg-green-50' },
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Resumo Comparativo de Cotações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="p-4 rounded-xl border border-slate-100 bg-white">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5 break-words">{s.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}