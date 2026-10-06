import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ReliabilityFilters from "./ReliabilityFilters";
import ReliabilityKpis from "./ReliabilityKpis";
import ReliabilityCharts from "./ReliabilityCharts";
import ReliabilityAlerts from "./ReliabilityAlerts";
import SnReliabilityTable from "./SnReliabilityTable";
import SnReliabilityDialog from "./SnReliabilityDialog";
import {
  buildSnRecords,
  fleetSummary,
  fleetEvolution,
  applySnFilters,
  alertsForRecord,
  DEFAULT_THRESHOLDS,
} from "@/lib/equipmentReliability";

const EMPTY_FILTERS = {
  sn: "",
  equipment: "",
  manufacturer: "",
  model: "",
  vessel: "",
  supplier: "",
  from: "",
  to: "",
  destination: "all",
};

/**
 * Dashboard de Confiabilidade dos Equipamentos: rastreabilidade por SN,
 * indicadores MTBF/MTTR, tendência de vida útil, rankings e alertas
 * inteligentes — tudo derivado do histórico permanente dos itens de GDM.
 */
export default function ReliabilityDashboard() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [selectedSn, setSelectedSn] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["gdmItems"],
    queryFn: () => base44.entities.GDMItem.list("-created_date", 1000),
  });
  const { data: equipment = [] } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => base44.entities.Equipment.list("-created_date"),
  });
  const { data: gdms = [] } = useQuery({
    queryKey: ["gdms"],
    queryFn: () => base44.entities.GDM.list("-created_date", 200),
  });

  // Atualização em tempo real: qualquer movimentação de item atualiza os indicadores.
  useEffect(() => {
    const unsubscribe = base44.entities.GDMItem.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["gdmItems"] });
    });
    return unsubscribe;
  }, [queryClient]);

  const gdmById = useMemo(() => {
    const map = {};
    gdms.forEach((g) => { map[g.id] = g; });
    return map;
  }, [gdms]);

  const records = useMemo(() => {
    const base =
      filters.destination === "all"
        ? items
        : items.filter((i) => i.destination === filters.destination);
    return buildSnRecords(base, equipment, gdms);
  }, [items, equipment, gdms, filters.destination]);

  const filteredRecords = useMemo(
    () => applySnFilters(records, filters),
    [records, filters]
  );
  const summary = useMemo(() => fleetSummary(filteredRecords), [filteredRecords]);
  const alertsCount = useMemo(
    () => filteredRecords.reduce((s, r) => s + alertsForRecord(r, thresholds).length, 0),
    [filteredRecords, thresholds]
  );
  const evolution = useMemo(() => fleetEvolution(filteredRecords), [filteredRecords]);
  const selectedRecord = useMemo(
    () => records.find((r) => r.sn === selectedSn) || null,
    [records, selectedSn]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Gestão da Confiabilidade dos Equipamentos</h2>
        <p className="text-sm text-slate-500">
          Acompanhamento por Número de Série (SN): MTBF, MTTR, reincidência de falhas e
          apoio à decisão de reparar, substituir ou descartar.
        </p>
      </div>

      <ReliabilityFilters filters={filters} onChange={setFilters} />

      <ReliabilityKpis summary={summary} alertsCount={alertsCount} />

      <ReliabilityAlerts
        records={filteredRecords}
        thresholds={thresholds}
        onThresholdsChange={setThresholds}
      />

      <ReliabilityCharts evolution={evolution} records={filteredRecords} />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Nenhum equipamento monitorado com os filtros atuais. Itens de GDM com destino
              Reparo ou Calibração e Número de Série preenchido aparecem aqui
              automaticamente.
            </div>
          ) : (
            <SnReliabilityTable records={filteredRecords} onSelect={setSelectedSn} />
          )}
        </CardContent>
      </Card>

      <SnReliabilityDialog
        record={selectedRecord}
        gdmById={gdmById}
        onClose={() => setSelectedSn(null)}
      />
    </div>
  );
}