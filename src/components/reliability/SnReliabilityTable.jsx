import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { formatCurrency, formatDays } from "@/lib/equipmentReliability";

/** Tabela de equipamentos monitorados por SN, com MTBF/MTTR e tendência. */
export default function SnReliabilityTable({ records, onSelect }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SN</TableHead>
            <TableHead>Equipamento</TableHead>
            <TableHead>Fabricante / Modelo</TableHead>
            <TableHead className="text-center">Desembarques</TableHead>
            <TableHead className="text-center">Reparos</TableHead>
            <TableHead className="text-right">Custo Acumulado</TableHead>
            <TableHead className="text-center">MTBF</TableHead>
            <TableHead className="text-center">MTTR</TableHead>
            <TableHead className="text-center">Tendência</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => {
            const declining = r.trend.reductionPercent > 0;
            return (
              <TableRow key={r.sn} className="cursor-pointer" onClick={() => onSelect(r.sn)}>
                <TableCell className="font-mono font-medium text-slate-900">{r.sn}</TableCell>
                <TableCell>
                  <p className="font-medium text-slate-800">{r.equipmentName}</p>
                  <p className="text-xs text-slate-400">{r.equipmentCode}</p>
                </TableCell>
                <TableCell className="text-slate-600">
                  {[r.manufacturer, r.model].filter(Boolean).join(" / ") || "—"}
                </TableCell>
                <TableCell className="text-center">{r.disembarkCount}</TableCell>
                <TableCell className="text-center">{r.repairsExecuted}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(r.totalCost)}</TableCell>
                <TableCell className="text-center">{formatDays(r.mtbf)}</TableCell>
                <TableCell className="text-center">{formatDays(r.mttr)}</TableCell>
                <TableCell className="text-center">
                  {r.intervals.length < 2 ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : declining ? (
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1">
                      <TrendingDown className="h-3 w-3" />
                      −{r.trend.reductionPercent}%
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Estável
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {r.inRepairNow ? (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1">
                      <Minus className="h-3 w-3" />
                      Em reparo{r.activeSupplier ? ` — ${r.activeSupplier}` : ""}
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Em operação
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(r.sn);
                    }}
                  >
                    Detalhes
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}