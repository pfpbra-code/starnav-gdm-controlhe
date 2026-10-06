import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8 };

/** Ranking horizontal (top N) por métrica. */
function RankingChart({ title, data, nameKey, valueKey, color, formatValue }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-56">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            Sem dados
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 12, right: 24 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey={nameKey}
                width={70}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => [formatValue(v), ""]}
                labelFormatter={() => ""}
              />
              <Bar dataKey={valueKey} radius={[0, 4, 4, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={i === 0 ? "#0c8eca" : "#7dd3fc"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** Gráficos do Dashboard de Confiabilidade: evolução de MTBF/MTTR e rankings. */
export default function ReliabilityCharts({ evolution, records }) {
  const byRepairs = [...records]
    .sort((a, b) => b.repairsExecuted - a.repairsExecuted)
    .slice(0, 8)
    .map((r) => ({ sn: r.sn, value: r.repairsExecuted }));
  const byCost = [...records]
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 8)
    .map((r) => ({ sn: r.sn, value: r.totalCost }));
  const byFailures = [...records]
    .sort((a, b) => b.disembarkCount - a.disembarkCount)
    .slice(0, 8)
    .map((r) => ({ sn: r.sn, value: r.disembarkCount }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Evolução do MTBF (dias entre falhas)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {evolution.length < 2 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Histórico insuficiente
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolution} margin={{ left: 0, right: 12, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="mtbf"
                    name="MTBF (dias)"
                    stroke="#0c8eca"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Evolução do MTTR (dias para reparo)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {evolution.length < 2 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Histórico insuficiente
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolution} margin={{ left: 0, right: 12, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="mttr"
                    name="MTTR (dias)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RankingChart
          title="Reincidência de Falhas (desembarques)"
          data={byFailures}
          nameKey="sn"
          valueKey="value"
          formatValue={(v) => `${v} falhas`}
        />
        <RankingChart
          title="Ranking por Quantidade de Reparos"
          data={byRepairs}
          nameKey="sn"
          valueKey="value"
          formatValue={(v) => `${v} reparos`}
        />
        <RankingChart
          title="Ranking por Custo Acumulado"
          data={byCost}
          nameKey="sn"
          valueKey="value"
          color="#0c8eca"
          formatValue={(v) =>
            new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
          }
        />
      </div>
    </div>
  );
}