import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Clock,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Timer,
  MessageSquare,
} from 'lucide-react';

/** Cards do painel de follow-up de cotações (Serviços). */
export default function QuoteFollowUpKpis({ metrics }) {
  const cards = [
    {
      label: 'Aguardando Cotação',
      value: metrics.awaitingCount,
      hint: 'itens sem retorno do fornecedor',
      icon: <Clock className="h-5 w-5 text-amber-600" />,
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Mais de 3 Dias',
      value: metrics.over3,
      hint: 'necessitam de follow-up',
      icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
      tone: 'bg-orange-50 text-orange-700',
    },
    {
      label: 'Mais de 7 Dias',
      value: metrics.over7,
      hint: 'propostas em atraso (crítico)',
      icon: <AlertOctagon className="h-5 w-5 text-red-600" />,
      tone: 'bg-red-50 text-red-700',
    },
    {
      label: 'Recebidas no Mês',
      value: metrics.receivedThisMonth,
      hint: 'cotações anexadas no mês',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Tempo Médio de Retorno',
      value:
        metrics.avgResponseDays != null
          ? `${metrics.avgResponseDays.toFixed(1)} dias`
          : '—',
      hint: 'do envio até a proposta',
      icon: <Timer className="h-5 w-5 text-indigo-600" />,
      tone: 'bg-indigo-50 text-indigo-700',
    },
    {
      label: 'Follow-ups no Mês',
      value: metrics.followupsThisMonth,
      hint: 'cobranças registradas',
      icon: <MessageSquare className="h-5 w-5 text-sky-600" />,
      tone: 'bg-sky-50 text-sky-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">{c.label}</p>
              <span className={`p-1.5 rounded-lg ${c.tone}`}>{c.icon}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{c.value}</p>
            <p className="text-xs text-slate-400 mt-1">{c.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}