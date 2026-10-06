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
  Cell,
} from 'recharts';
import { Ship } from 'lucide-react';

export default function ManagerialVesselRanking({ vessels }) {
  const { ranking = [], avg = 0 } = vessels || {};
  const data = ranking.map((v) => ({
    name: v.name,
    value: v.count,
    maintenance: v.maintenance,
    above: v.count > avg * 1.5,
  }));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Ship className="h-5 w-5 text-sky-600" />
          Ranking de Embarcações por Volume de Itens
        </CardTitle>
        <p className="text-xs text-slate-500">
          Média de {avg.toFixed(1)} itens por embarcação · barra âmbar = volume acima da média
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">Nenhum item no filtro atual.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={120} />
                <Tooltip />
                <Bar dataKey="value" name="Itens" radius={[0, 4, 4, 0]}>
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.above ? '#f59e0b' : '#0284c7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}