import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { GDM_OVERVIEW_TOOLTIPS } from "@/lib/kpiTooltips";
import {
  FileText,
  Package,
  Wrench,
  Cog,
  Hourglass,
  CheckCircle2,
  PackageCheck,
  PackageX,
  UserCheck,
} from "lucide-react";

/** Indicadores da visão centralizada de Guias de Desembarque. */
export default function GDMOverviewKpis({ stats }) {
  const cards = [
    { key: "totalGdms", label: "GDMs", value: stats.totalGdms, icon: FileText, tone: "bg-sky-50 text-sky-700" },
    { key: "totalItems", label: "Itens", value: stats.totalItems, icon: Package, tone: "bg-indigo-50 text-indigo-700" },
    { key: "inMaintenance", label: "Total de GDM's de Manutenção", value: stats.inMaintenance, icon: Wrench, tone: "bg-amber-50 text-amber-700" },
    { key: "inOperations", label: "Total de GDM's de Operações", value: stats.inOperations, icon: Cog, tone: "bg-violet-50 text-violet-700" },
    { key: "pendingApproval", label: "Pendentes de Aprovação", value: stats.pendingApproval, icon: Hourglass, tone: "bg-orange-50 text-orange-700" },
    { key: "completed", label: "Finalizadas", value: stats.completed, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
  ];

  // Contadores de situação de recebimento (declaração do Almoxarifado na
  // abertura da GDM + etapa "Aguardando Recebimento").
  const receiptCards = [
    { key: "receivedGdms", label: "GDMs Recebidas", value: stats.receivedGdms ?? 0, icon: PackageCheck, tone: "bg-emerald-50 text-emerald-700" },
    { key: "notReceivedGdms", label: "GDMs Não Recebidas", value: stats.notReceivedGdms ?? 0, icon: PackageX, tone: "bg-rose-50 text-rose-700" },
    { key: "awaitingReceiptGdms", label: "Aguardando Recebimento", value: stats.awaitingReceiptGdms ?? 0, icon: Hourglass, tone: "bg-amber-50 text-amber-700" },
    { key: "awaitingCoordinatorGdms", label: "Aguardando Coordenador", value: stats.awaitingCoordinatorGdms ?? 0, icon: UserCheck, tone: "bg-orange-50 text-orange-700" },
    { key: "completedGdms", label: "Concluídas", value: stats.completedGdms ?? stats.completed ?? 0, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
  ];

  const renderCards = (list) =>
    list.map(({ key, label, value, icon: Icon, tone }) => (
      <Card key={key} className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${tone} mb-2`}>
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            {label}
            <InfoTooltip content={GDM_OVERVIEW_TOOLTIPS[key]} />
          </p>
        </CardContent>
      </Card>
    ));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {renderCards(cards)}
      </div>
      {/* Contadores de situação de recebimento: exibidos quando calculados. */}
      {stats.receivedGdms !== undefined && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {renderCards(receiptCards)}
        </div>
      )}
    </div>
  );
}