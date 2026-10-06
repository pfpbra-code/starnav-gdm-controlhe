import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ITEM_STATUS_LABELS } from "@/lib/gdmItems";
import {
  formatCurrency,
  formatDays,
  DESTINATION_TYPE_LABELS,
} from "@/lib/equipmentReliability";

const fmtDate = (d) => (d ? format(new Date(d), "dd/MM/yyyy", { locale: ptBR }) : "—");

function Stat({ label, value, highlight }) {
  return (
    <div className="rounded-lg border bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? "text-sky-700" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}

/** Tela individual do equipamento por SN: histórico completo, MTBF/MTTR,
 * custo acumulado, tendência e gráfico de falhas. */
export default function SnReliabilityDialog({ record, gdmById, onClose }) {
  if (!record) return null;
  const { trend } = record;
  const costPercent =
    record.acquisitionValue > 0
      ? Math.round((record.totalCost / record.acquisitionValue) * 100)
      : null;
  const chartData = record.intervals.map((i) => ({
    name: `Reparo ${i.repairIndex}`,
    dias: Number(i.value.toFixed(1)),
  }));

  return (
    <Dialog open={!!record} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="font-mono">SN {record.sn}</span>
            <span className="text-slate-400 font-normal">—</span>
            <span>{record.equipmentName}</span>
            {record.inRepairNow ? (
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                Em reparo{record.activeSupplier ? ` — ${record.activeSupplier}` : ""}
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Em operação</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {[record.manufacturer, record.model].filter(Boolean).join(" • ") || record.equipmentCode}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Indicadores do SN */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat label="Desembarques para reparo" value={record.disembarkCount} />
            <Stat label="Reparos executados" value={record.repairsExecuted} />
            <Stat label="Fornecedores que repararam" value={record.suppliers.length} />
            <Stat label="Embarcações onde operou" value={record.vessels.length} />
            <Stat label="MTBF — tempo médio entre falhas" value={formatDays(record.mtbf)} highlight />
            <Stat label="MTTR — tempo médio de reparo" value={formatDays(record.mttr)} highlight />
            <Stat label="Tempo total em operação" value={formatDays(record.operationDays)} />
            <Stat label="Tempo total em manutenção" value={formatDays(record.maintenanceDays)} />
            <Stat label="Primeiro reparo" value={fmtDate(record.firstRepairAt)} />
            <Stat label="Último reparo" value={fmtDate(record.lastRepairAt)} />
            <Stat label="Custo acumulado" value={formatCurrency(record.totalCost)} highlight />
            <Stat
              label="Valor de equipamento novo"
              value={
                record.acquisitionValue > 0
                  ? `${formatCurrency(record.acquisitionValue)}${costPercent != null ? ` (${costPercent}% já gastos)` : ""}`
                  : "Não informado"
              }
            />
          </div>

          {/* Tendência de confiabilidade */}
          <div className="rounded-lg border px-4 py-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Tendência de Confiabilidade
            </p>
            {record.intervals.length < 2 ? (
              <p className="text-sm text-slate-500">
                Intervalos entre falhas insuficientes para análise de tendência.
              </p>
            ) : trend.reductionPercent > 0 ? (
              <p className="text-sm text-red-700 font-medium">
                O equipamento está perdendo vida útil: redução de {trend.reductionPercent}% no
                intervalo entre falhas
                {trend.shrinking ? " nos últimos 3 reparos (redução progressiva)" : ""}. Avalie a
                substituição definitiva do equipamento.
              </p>
            ) : (
              <p className="text-sm text-emerald-700 font-medium">
                Intervalo entre falhas estável — o equipamento mantém a vida útil esperada.
              </p>
            )}
          </div>

          {/* Gráfico de falhas (intervalo entre reparos) */}
          {chartData.length > 0 && (
            <div className="rounded-lg border px-4 py-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Intervalo entre falhas (dias em operação antes de cada reparo)
              </p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: 0, right: 8, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="dias" name="Dias em operação" fill="#0c8eca" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Histórico cronológico de GDMs e reparos do SN */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Histórico de GDMs e Reparos
            </p>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GDM</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Embarcação</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Tempo em manutenção</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...record.events]
                    .sort((a, b) => new Date(b.start || b.item.created_date) - new Date(a.start || a.item.created_date))
                    .map((e) => (
                      <TableRow key={e.item.id}>
                        <TableCell className="font-medium">
                          {gdmById[e.item.gdm_id]?.gdm_number || "—"}
                        </TableCell>
                        <TableCell>{fmtDate(e.start || e.item.created_date)}</TableCell>
                        <TableCell>{DESTINATION_TYPE_LABELS[e.type] || e.type}</TableCell>
                        <TableCell>{e.vessel || "—"}</TableCell>
                        <TableCell>{e.supplier || "—"}</TableCell>
                        <TableCell className="text-right">
                          {e.executed ? formatCurrency(e.item.quote_value) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {e.maintenanceDays > 0 ? formatDays(e.maintenanceDays) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">
                            {ITEM_STATUS_LABELS[e.item.status] || e.item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {record.suppliers.length > 0 && (
            <p className="text-xs text-slate-500">
              Fornecedores que já repararam este SN: {record.suppliers.join(", ")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}