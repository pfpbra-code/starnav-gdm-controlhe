// Gestão de Confiabilidade dos Equipamentos por Número de Série (SN).
// Toda a análise é derivada dos itens de GDM com destino Reparo/Calibração:
// cada desembarque para reparo é uma falha e cada ciclo de fornecedor
// concluído é um reparo executado. O histórico permanece disponível mesmo
// após o encerramento da GDM — os itens nunca são apagados.

export const REPAIR_DESTINATIONS = ["repair", "certification"];

export const DESTINATION_TYPE_LABELS = {
  repair: "Reparo",
  certification: "Calibração",
};

// Status dentro do ciclo de fornecedor (equipamento fora de operação).
const FLOW_STATUSES = [
  "awaiting_supplier_definition",
  "pending_services",
  "awaiting_shipping_proof",
  "sent_to_supplier",
  "awaiting_maintenance_authorization",
  "discount_negotiation",
  "awaiting_pwt",
  "repair_approved",
  "awaiting_oc_issuance",
  "awaiting_oc_approval",
  "awaiting_return",
  "in_treatment",
  "awaiting_supplier_return",
  "return_confirmed",
];
const CANCELLED_STATUSES = ["rejected", "cancelled"];

// Regras de alerta configuráveis (alteráveis na tela de Confiabilidade).
export const DEFAULT_THRESHOLDS = {
  maxRepairs: 5,
  mtbfDropPercent: 30,
  costPercent: 80,
};

const DAY_MS = 86400000;
const daysBetween = (a, b) => Math.max((new Date(b) - new Date(a)) / DAY_MS, 0);
const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

export const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);

/** Exibe duração em dias ("120 dias" / "10,5 dias"). */
export const formatDays = (days) => {
  if (days == null || Number.isNaN(days)) return "—";
  const d = Number(days);
  return d >= 10 ? `${Math.round(d)} dias` : `${d.toFixed(1).replace(".", ",")} dias`;
};

/** Ciclo de reparo do item: desembarque (falha) → recebimento do retorno.
 * A data de desembarque da GDM serve de âncora quando o ciclo ainda não
 * possui carimbos de data próprios (itens antigos ou em andamento). */
function cycleOf(item, now) {
  const failureDate = item.failure_date || item.created_date;
  const start = item.sent_to_supplier_at || failureDate;
  const end =
    item.return_received_at ||
    item.completed_at ||
    (item.status === "completed" ? item.updated_date || failureDate : null);
  const cancelled = CANCELLED_STATUSES.includes(item.status);
  const active = !!start && !end && !cancelled && FLOW_STATUSES.includes(item.status);
  const executed = !!end && item.status === "completed";
  let maintenanceDays = 0;
  if (start && !cancelled) {
    maintenanceDays = end ? daysBetween(start, end) : active ? daysBetween(start, now) : 0;
  }
  return {
    item,
    start,
    end,
    active,
    executed,
    maintenanceDays,
    cost: executed ? Number(item.quote_value) || 0 : 0,
    supplier: item.supplier_name || null,
    vessel: item.vessel_name || null,
    type: item.destination,
  };
}

/**
 * Constrói o registro de confiabilidade por SN a partir dos itens de GDM.
 * Cada SN reúne todos os eventos de reparo/calibração, independentemente
 * da GDM a que pertencem — o vínculo é sempre o mesmo SN.
 */
export function buildSnRecords(items = [], equipmentList = [], gdms = [], now = new Date()) {
  const equipmentByCode = {};
  const equipmentById = {};
  (equipmentList || []).forEach((e) => {
    if (e.code) equipmentByCode[String(e.code).trim().toUpperCase()] = e;
    equipmentById[e.id] = e;
  });

  const gdmById = {};
  (gdms || []).forEach((g) => { gdmById[g.id] = g; });

  const groups = {};
  (items || []).forEach((item) => {
    const sn = (item.serial_number || "").toString().trim().toUpperCase();
    if (!sn || !REPAIR_DESTINATIONS.includes(item.destination)) return;
    if (item.status === "draft") return;
    item.failure_date = gdmById[item.gdm_id]?.disembark_date || item.created_date;
    if (!groups[sn]) groups[sn] = [];
    groups[sn].push(item);
  });

  return Object.entries(groups)
    .map(([sn, list]) => {
      const events = list
        .map((item) => cycleOf(item, now))
        .sort(
          (a, b) =>
            new Date(a.start || a.item.created_date) -
            new Date(b.start || b.item.created_date)
        );

      const executedCycles = events.filter((c) => c.executed);
      const repairsExecuted = executedCycles.length;
      const maintenanceDays = events.reduce((s, c) => s + c.maintenanceDays, 0);

      // Janela de observação: do primeiro envio ao último retorno (ou hoje).
      const windowStart = events.length
        ? new Date(events[0].start || events[0].item.created_date)
        : null;
      const lastClosed = [...events].reverse().find((c) => c.end);
      const windowEnd = lastClosed ? new Date(lastClosed.end) : now;
      const operationDays = windowStart
        ? Math.max(daysBetween(windowStart, windowEnd) - maintenanceDays, 0)
        : 0;

      const failures = events.length;
      const mtbf = failures > 0 ? operationDays / failures : null;
      const mttr = repairsExecuted > 0 ? maintenanceDays / repairsExecuted : null;

      // Intervalos de operação entre reparos executados consecutivos.
      const intervals = [];
      for (let i = 1; i < executedCycles.length; i++) {
        const prev = executedCycles[i - 1];
        if (!prev.end || !executedCycles[i].start) continue;
        intervals.push({
          repairIndex: i + 1,
          value: daysBetween(prev.end, executedCycles[i].start),
        });
      }

      // Tendência: média dos últimos intervalos vs. anteriores + encolhimento progressivo.
      const lastThree = intervals.slice(-3).map((i) => i.value);
      const earlier = intervals.slice(0, Math.max(intervals.length - 3, 0)).map((i) => i.value);
      const lastAvg = avg(lastThree);
      const prevAvg = avg(earlier);
      const reductionPercent =
        intervals.length >= 2 && prevAvg > 0
          ? Math.max(Math.round(((prevAvg - lastAvg) / prevAvg) * 100), 0)
          : 0;
      const shrinking =
        intervals.length >= 3 &&
        lastThree.length === 3 &&
        lastThree[0] > lastThree[1] &&
        lastThree[1] > lastThree[2];

      const firstCycle = executedCycles[0] || events[0];
      const lastCycle = events[events.length - 1];
      const sample = list[0];
      const equipment =
        (sample.equipment_code &&
          equipmentByCode[String(sample.equipment_code).trim().toUpperCase()]) ||
        (sample.equipment_id && equipmentById[sample.equipment_id]) ||
        null;

      return {
        sn,
        equipment,
        equipmentName: equipment?.name || sample.equipment_name || "—",
        equipmentCode: sample.equipment_code || equipment?.code || "",
        manufacturer: equipment?.manufacturer || "",
        model: equipment?.model || "",
        acquisitionValue: Number(equipment?.acquisition_value) || 0,
        events,
        disembarkCount: failures,
        firstRepairAt: firstCycle?.start || firstCycle?.item?.created_date || null,
        lastRepairAt: lastCycle?.end || lastCycle?.start || lastCycle?.item?.created_date || null,
        repairsExecuted,
        suppliers: [
          ...new Set(executedCycles.map((c) => c.supplier).filter(Boolean)),
        ],
        vessels: [...new Set(events.map((c) => c.vessel).filter(Boolean))],
        maintenanceDays,
        operationDays,
        mtbf,
        mttr,
        totalCost: executedCycles.reduce((s, c) => s + c.cost, 0),
        intervals,
        trend: { reductionPercent, shrinking },
        inRepairNow: events.some((c) => c.active),
        activeSupplier: events.find((c) => c.active)?.supplier || null,
      };
    })
    .sort((a, b) => b.disembarkCount - a.disembarkCount || b.totalCost - a.totalCost);
}

/** Alertas automáticos do SN, conforme as regras configuráveis. */
export function alertsForRecord(record, thresholds = DEFAULT_THRESHOLDS) {
  const alerts = [];
  const { reductionPercent, shrinking } = record.trend || {};
  if ((shrinking || reductionPercent >= thresholds.mtbfDropPercent) && reductionPercent > 0) {
    alerts.push({
      type: "mtbf_declining",
      severity: "warning",
      message: `SN ${record.sn} apresentou redução de ${reductionPercent}% no intervalo entre falhas${
        shrinking ? " nos últimos 3 reparos" : ""
      }.`,
    });
  }
  if (record.repairsExecuted >= thresholds.maxRepairs) {
    alerts.push({
      type: "repair_count",
      severity: "warning",
      message: `SN ${record.sn} já passou por ${record.repairsExecuted} reparos.`,
    });
  }
  if (
    record.acquisitionValue > 0 &&
    record.totalCost >= (record.acquisitionValue * thresholds.costPercent) / 100
  ) {
    const percent = Math.round((record.totalCost / record.acquisitionValue) * 100);
    alerts.push({
      type: "cost_threshold",
      severity: "critical",
      message: `Custo acumulado dos reparos do SN ${record.sn} atingiu ${percent}% do valor de aquisição de um equipamento novo.`,
    });
  }
  return alerts;
}

/** Indicadores consolidados da frota de equipamentos monitorados. */
export function fleetSummary(records = []) {
  const withMtbf = records.filter((r) => r.mtbf != null);
  const withMttr = records.filter((r) => r.mttr != null);
  return {
    monitored: records.length,
    inRepair: records.filter((r) => r.inRepairNow).length,
    avgMtbf: withMtbf.length ? avg(withMtbf.map((r) => r.mtbf)) : null,
    avgMttr: withMttr.length ? avg(withMttr.map((r) => r.mttr)) : null,
    totalCost: records.reduce((s, r) => s + r.totalCost, 0),
  };
}

/** Evolução do MTBF/MTTR da frota ao longo dos reparos concluídos. */
export function fleetEvolution(records = []) {
  const cycles = records
    .flatMap((r) => r.events.filter((c) => c.executed && c.start && c.end))
    .sort((a, b) => new Date(a.end) - new Date(b.end));
  if (!cycles.length) return [];
  const start = new Date(cycles[0].start);
  let maintenanceDays = 0;
  return cycles.map((c, i) => {
    maintenanceDays += c.maintenanceDays;
    const end = new Date(c.end);
    const operationDays = Math.max(daysBetween(start, end) - maintenanceDays, 0);
    return {
      date: c.end,
      label: `Reparo ${i + 1}`,
      mtbf: Number((operationDays / (i + 1)).toFixed(1)),
      mttr: Number((maintenanceDays / (i + 1)).toFixed(1)),
    };
  });
}

/** Filtros de consulta por SN, equipamento, fabricante, modelo, embarcação,
 * fornecedor e período (data dos eventos). */
export function applySnFilters(records = [], filters = {}) {
  const matches = (value, query) =>
    !query || String(value || "").toLowerCase().includes(query.toLowerCase());
  const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
  const to = filters.to ? new Date(`${filters.to}T23:59:59`) : null;

  return records.filter((r) => {
    if (!matches(r.sn, filters.sn)) return false;
    if (!matches(r.equipmentName, filters.equipment)) return false;
    if (!matches(r.manufacturer, filters.manufacturer)) return false;
    if (!matches(r.model, filters.model)) return false;
    if (filters.vessel && !r.vessels.some((v) => matches(v, filters.vessel))) return false;
    if (filters.supplier && !r.suppliers.some((s) => matches(s, filters.supplier))) return false;
    if (from || to) {
      const inPeriod = r.events.some((e) => {
        const ref = new Date(e.start || e.item.created_date);
        return (!from || ref >= from) && (!to || ref <= to);
      });
      if (!inPeriod) return false;
    }
    return true;
  });
}