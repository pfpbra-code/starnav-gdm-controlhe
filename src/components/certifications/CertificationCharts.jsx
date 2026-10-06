import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

const PIE_COLORS = ['#0284c7', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2'];

/** Gráficos do Dashboard de Certificações. */
export default function CertificationCharts({ byMonth, byVessel, byType, expiredByMonth }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Certificações por mês
          </CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byMonth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" name="Certificações" fill="#0284c7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Certificações por embarcação
          </CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          {byVessel.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byVessel} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="vessel" width={110} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Certificações" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Certificações por tipo de equipamento
          </CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          {byType.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byType}
                  dataKey="count"
                  nameKey="type"
                  innerRadius="45%"
                  outerRadius="75%"
                  paddingAngle={2}
                >
                  {byType.map((entry, index) => (
                    <Cell key={entry.type} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Certificações vencidas por período
          </CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          {expiredByMonth.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">
              Nenhuma certificação vencida
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expiredByMonth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Vencidas" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}