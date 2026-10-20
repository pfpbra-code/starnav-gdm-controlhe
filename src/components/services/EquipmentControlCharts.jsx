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
  LineChart,
  Line,
  Legend,
} from 'recharts';
import InfoTooltip from '@/components/ui/InfoTooltip';

const PALETTE = [
  '#2563eb', '#d97706', '#0ea5e9', '#9333ea', '#16a34a',
  '#0d9488', '#dc2626', '#64748b', '#7c3aed',
];

function ChartCard({ title, tooltip, children }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          {title}
          <InfoTooltip content={tooltip} />
        </CardTitle>
      </CardHeader>
      <CardContent className="h-56">{children}</CardContent>
    </Card>
  );
}

function Empty() {
  return <p className="text-sm text-slate-400 py-10 text-center">Sem dados</p>;
}

/** Gráficos da aba "Dados por Equipamento" — todos reagem aos filtros. */
export default function EquipmentControlCharts({ byCategory, byGdm, byVessel, evolution }) {
  const showEvolution = evolution.length >= 2;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <ChartCard
        title="Distribuição por etapa do processo"
        tooltip="Quantidade de unidades em cada etapa atual do fluxo, calculada a partir dos itens reais das GDMs."
      >
        {byCategory.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="qty"
                nameKey="name"
                innerRadius="45%"
                outerRadius="75%"
                paddingAngle={2}
              >
                {byCategory.map((entry, i) => (
                  <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Unidades por GDM"
        tooltip="Quantas unidades dos equipamentos filtrados estão vinculadas a cada GDM, para identificar concentração ou distribuição entre processos."
      >
        {byGdm.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byGdm} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="gdm" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="qty" name="Unidades" fill="#0284c7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Unidades por embarcação"
        tooltip="Distribuição das unidades entre as embarcações, conforme os registros reais de desembarque."
      >
        {byVessel.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byVessel} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="vessel" width={110} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="qty" name="Unidades" fill="#16a34a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Evolução dos processos"
        tooltip="Unidades desembarcadas por mês de abertura da GDM e unidades finalizadas por mês de conclusão do item. Exibido apenas quando existem dados históricos suficientes; datas ausentes nunca são inferidas."
      >
        {!showEvolution ? (
          <p className="text-sm text-slate-400 py-10 text-center">
            Histórico insuficiente para exibir a evolução.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolution} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="disembarked"
                name="Desembarcadas"
                stroke="#0284c7"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="finished"
                name="Finalizadas"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}