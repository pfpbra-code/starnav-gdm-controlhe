import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Package,
  Wrench,
  Cog,
  Hourglass,
  CheckCircle2,
} from "lucide-react";

/** Indicadores da visão centralizada de Guias de Desembarque. */
export default function GDMOverviewKpis({ stats }) {
  const cards = [
    { label: "GDMs", value: stats.totalGdms, icon: FileText, tone: "bg-sky-50 text-sky-700" },
    { label: "Itens", value: stats.totalItems, icon: Package, tone: "bg-indigo-50 text-indigo-700" },
    { label: "GDMs em Manutenção", value: stats.inMaintenance, icon: Wrench, tone: "bg-amber-50 text-amber-700" },
    { label: "GDMs em Operações", value: stats.inOperations, icon: Cog, tone: "bg-violet-50 text-violet-700" },
    { label: "Pendentes de Aprovação", value: stats.pendingApproval, icon: Hourglass, tone: "bg-orange-50 text-orange-700" },
    { label: "Finalizadas", value: stats.completed, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <Card key={label} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${tone} mb-2`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}