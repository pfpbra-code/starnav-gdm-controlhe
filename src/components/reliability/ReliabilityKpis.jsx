import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Wrench, Timer, Gauge, CircleDollarSign, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDays } from "@/lib/equipmentReliability";

const ICONS = {
  monitored: Activity,
  inRepair: Wrench,
  mtbf: Timer,
  mttr: Gauge,
  cost: CircleDollarSign,
  alerts: AlertTriangle,
};

/** KPIs do Dashboard de Confiabilidade da frota. */
export default function ReliabilityKpis({ summary, alertsCount }) {
  const items = [
    { key: "monitored", label: "Equipamentos Monitorados", value: summary.monitored, color: "text-sky-600", bg: "bg-sky-50" },
    { key: "inRepair", label: "Em Reparo Agora", value: summary.inRepair, color: "text-amber-600", bg: "bg-amber-50" },
    { key: "mtbf", label: "MTBF Médio da Frota", value: formatDays(summary.avgMtbf), color: "text-indigo-600", bg: "bg-indigo-50" },
    { key: "mttr", label: "MTTR Médio da Frota", value: formatDays(summary.avgMttr), color: "text-blue-600", bg: "bg-blue-50" },
    { key: "cost", label: "Custo Acumulado de Reparos", value: formatCurrency(summary.totalCost), color: "text-emerald-600", bg: "bg-emerald-50" },
    { key: "alerts", label: "Alertas Ativos", value: alertsCount, color: alertsCount > 0 ? "text-red-600" : "text-slate-500", bg: alertsCount > 0 ? "bg-red-50" : "bg-slate-50" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {items.map(({ key, label, value, color, bg }) => {
        const Icon = ICONS[key];
        return (
          <Card key={key} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg} mb-2`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <p className="text-xl font-bold text-slate-900 truncate" title={String(value)}>
                {value}
              </p>
              <p className="text-xs text-slate-500 leading-tight">{label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}