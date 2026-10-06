import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertTriangle, BellRing, Settings2 } from "lucide-react";
import { alertsForRecord } from "@/lib/equipmentReliability";

const SEVERITY_STYLES = {
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-red-200 bg-red-50 text-red-700",
};

/** Alertas inteligentes de confiabilidade + regras configuráveis
 * (limite de reparos, redução de MTBF e custo sobre o valor de um equipamento novo). */
export default function ReliabilityAlerts({ records, thresholds, onThresholdsChange }) {
  const alerts = useMemo(
    () => records.flatMap((r) => alertsForRecord(r, thresholds)),
    [records, thresholds]
  );

  const setThreshold = (key, value) =>
    onThresholdsChange({ ...thresholds, [key]: value === "" ? "" : Number(value) });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="border-0 shadow-sm lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <BellRing className="h-4 w-4 text-slate-500" />
            Alertas Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-6 justify-center">
              <AlertTriangle className="h-4 w-4" />
              Nenhum alerta de confiabilidade no momento
            </div>
          ) : (
            alerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${SEVERITY_STYLES[alert.severity]}`}
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{alert.message}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Settings2 className="h-4 w-4 text-slate-500" />
            Regras de Alerta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs text-slate-500">
              Alertar quando o equipamento ultrapassar (reparos)
            </span>
            <Input
              type="number"
              min={1}
              value={thresholds.maxRepairs}
              onChange={(e) => setThreshold("maxRepairs", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-500">
              Redução do intervalo entre falhas (%)
            </span>
            <Input
              type="number"
              min={1}
              max={100}
              value={thresholds.mtbfDropPercent}
              onChange={(e) => setThreshold("mtbfDropPercent", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-500">
              Custo acumulado sobre o valor de um equipamento novo (%)
            </span>
            <Input
              type="number"
              min={1}
              max={100}
              value={thresholds.costPercent}
              onChange={(e) => setThreshold("costPercent", e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-400 leading-tight">
            O valor de aquisição de cada equipamento é cadastrado no módulo de Equipamentos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}