import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DESTINATION_COLORS } from '@/lib/managerialDashboard';

export default function ManagerialDestinationPanel({ destinations }) {
  const data = destinations.map((d) => ({ name: d.label, value: d.value, key: d.key }));
  const total = destinations.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900">Itens por Destino</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={DESTINATION_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {destinations.map((d) => (
              <div key={d.key} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: DESTINATION_COLORS[d.key] }}
                  />
                  <span className="text-sm text-slate-700">{d.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-900">{d.value}</span>
                  <span className="text-xs text-slate-500 w-14 text-right">
                    {total ? d.pct.toFixed(1) : '0.0'}%
                  </span>
                </div>
              </div>
            ))}
            <p className="text-xs text-slate-400 pt-2 border-t">
              Total de itens no filtro: {total}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}