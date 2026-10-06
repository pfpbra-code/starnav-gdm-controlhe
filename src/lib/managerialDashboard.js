/**
 * Dashboard Gerencial — cálculos por ITEM (cada equipamento da GDM contabiliza 1 item).
 * Fonte de verdade: GDMItem (created_date = registro/desembarque).
 * Fabricante/modelo vêm do cadastro de Equipamentos (vínculo por código);
 * itens sem vínculo são agrupados como "Não cadastrado" em vez de ignorados.
 */
import { format } from 'date-fns';
import { ITEM_STATUS_LABELS } from '@/lib/gdmItems';
import { DESTINATION_LABELS } from '@/lib/gdmOverview';

export const EMPTY_FILTERS = {
  from: '',
  to: '',
  vessel: 'all',
  destination: 'all',
  manufacturer: 'all',
  supplier: 'all',
  equipment: 'all',
  status: 'all',
};

export const MANUFACTURER_UNREGISTERED = 'Não cadastrado';
export const SUPPLIER_UNREGISTERED = 'Sem fornecedor';
export const EQUIPMENT_UNREGISTERED = 'Sem identificação';

export const DESTINATION_COLORS = {
  repair: '#0284c7',
  certification: '#8b5cf6',
  stock_return: '#22c55e',
  discard: '#ef4444',
};

/* ---------- Helpers de vínculo ---------- */

export function equipmentMapByCode(equipment = []) {
  const map = {};
  equipment.forEach((e) => {
    if (e?.code) map[e.code] = e;
  });
  return map;
}

const manufacturerOf = (item, byCode) =>
  byCode[item?.equipment_code]?.manufacturer || MANUFACTURER_UNREGISTERED;
const supplierOf = (item) => item?.supplier_name || SUPPLIER_UNREGISTERED;
const equipmentOf = (item) => item?.equipment_name || EQUIPMENT_UNREGISTERED;

/* ---------- Filtros ---------- */

export function applyFilters(items = [], filters, equipmentByCode = {}) {
  const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
  const to = filters.to ? new Date(`${filters.to}T23:59:59`) : null;
  return items.filter((it) => {
    if (!it?.created_date) return false;
    const d = new Date(it.created_date);
    if (from && d < from) return false;
    if (to && d > to) return false;
    if (filters.vessel !== 'all' && (it.vessel_name || 'Sem embarcação') !== filters.vessel) return false;
    if (filters.destination !== 'all' && it.destination !== filters.destination) return false;
    if (filters.manufacturer !== 'all' && manufacturerOf(it, equipmentByCode) !== filters.manufacturer) return false;
    if (filters.supplier !== 'all' && supplierOf(it) !== filters.supplier) return false;
    if (filters.equipment !== 'all' && equipmentOf(it) !== filters.equipment) return false;
    if (filters.status !== 'all' && it.status !== filters.status) return false;
    return true;
  });
}

export function filterOptions(items = [], equipmentByCode = {}) {
  const vessels = new Set();
  const manufacturers = new Set();
  const suppliers = new Set();
  const equipmentNames = new Set();
  const statuses = new Set();
  items.forEach((it) => {
    if (it.vessel_name) vessels.add(it.vessel_name);
    manufacturers.add(manufacturerOf(it, equipmentByCode));
    suppliers.add(supplierOf(it));
    equipmentNames.add(equipmentOf(it));
    if (it.status) statuses.add(it.status);
  });
  return {
    vessels: [...vessels].sort(),
    manufacturers: [...manufacturers].sort(),
    suppliers: [...suppliers].sort(),
    equipment: [...equipmentNames].sort(),
    statuses: [...statuses]
      .map((s) => ({ value: s, label: ITEM_STATUS_LABELS[s] || s }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

/* ---------- Períodos ---------- */

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const startOfQuarter = (d) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
const addQuarters = (d, n) => addMonths(d, n * 3);
const startOfYear = (d) => new Date(d.getFullYear(), 0, 1);
const addYears = (d, n) => new Date(d.getFullYear() + n, 0, 1);
const inRange = (d, start, end) => d >= start && d < end;

function countBetween(items, start, end) {
  return items.reduce((n, it) => {
    if (!it?.created_date) return n;
    const d = new Date(it.created_date);
    return n + (inRange(d, start, end) ? 1 : 0);
  }, 0);
}

const variationOf = (current, previous) => {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

function generalIndicators(items, now) {
  const mStart = startOfMonth(now);
  const qStart = startOfQuarter(now);
  const yStart = startOfYear(now);
  const block = (start, prevStart, next) => {
    const current = countBetween(items, start, next);
    const previous = countBetween(items, prevStart, start);
    return { current, previous, variation: variationOf(current, previous) };
  };
  return {
    mode: 'standard',
    month: block(mStart, addMonths(mStart, -1), addMonths(mStart, 1)),
    quarter: block(qStart, addQuarters(qStart, -1), addQuarters(qStart, 1)),
    year: block(yStart, addYears(yStart, -1), addYears(yStart, 1)),
  };
}

function customPeriodIndicators(items, from, to) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59.999`);
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000);
  prevStart.setHours(0, 0, 0, 0);
  const current = countBetween(items, start, new Date(end.getTime() + 1));
  const previous = countBetween(items, prevStart, new Date(prevEnd.getTime() + 1));
  return {
    mode: 'custom',
    label: `${format(start, 'dd/MM/yyyy')} a ${format(end, 'dd/MM/yyyy')}`,
    total: current,
    previous,
    variation: variationOf(current, previous),
    monthlyAvg: current / (days / 30.44),
  };
}

/* ---------- Séries temporais ---------- */

export function monthlySeries(items = [], count = 12, now = new Date()) {
  const buckets = [];
  for (let i = count - 1; i >= 0; i--) {
    const s = addMonths(startOfMonth(now), -i);
    buckets.push({
      label: format(s, 'MMM/yy'),
      start: s,
      end: addMonths(s, 1),
      value: 0,
    });
  }
  items.forEach((it) => {
    if (!it?.created_date) return;
    const d = new Date(it.created_date);
    const b = buckets.find((x) => inRange(d, x.start, x.end));
    if (b) b.value += 1;
  });
  return buckets;
}

export function quarterlySeries(items = [], count = 8, now = new Date()) {
  const buckets = [];
  for (let i = count - 1; i >= 0; i--) {
    const s = addQuarters(startOfQuarter(now), -i);
    buckets.push({
      label: `${Math.floor(s.getMonth() / 3) + 1}T/${String(s.getFullYear()).slice(2)}`,
      start: s,
      end: addQuarters(s, 1),
      value: 0,
    });
  }
  items.forEach((it) => {
    if (!it?.created_date) return;
    const d = new Date(it.created_date);
    const b = buckets.find((x) => inRange(d, x.start, x.end));
    if (b) b.value += 1;
  });
  return buckets;
}

export function yearlySeries(items = [], count = 5, now = new Date()) {
  const buckets = [];
  for (let i = count - 1; i >= 0; i--) {
    const s = addYears(startOfYear(now), -i);
    buckets.push({
      label: String(s.getFullYear()),
      start: s,
      end: addYears(s, 1),
      value: 0,
    });
  }
  items.forEach((it) => {
    if (!it?.created_date) return;
    const d = new Date(it.created_date);
    const b = buckets.find((x) => inRange(d, x.start, x.end));
    if (b) b.value += 1;
  });
  return buckets;
}

/** Tendência por regressão linear simples sobre os valores da série. */
export function trendOf(series = []) {
  const ys = series.map((s) => s.value);
  const n = ys.length;
  if (n < 2) return { direction: 'stable', pct: 0 };
  const meanX = (n - 1) / 2;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  ys.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  const slope = den ? num / den : 0;
  const pct = meanY ? (slope / meanY) * 100 : 0;
  const direction = pct > 2 ? 'growth' : pct < -2 ? 'reduction' : 'stable';
  return { direction, pct };
}

/* ---------- Agregações ---------- */

export function destinationBreakdown(items = []) {
  const counts = { repair: 0, certification: 0, stock_return: 0, discard: 0 };
  items.forEach((it) => {
    if (counts[it.destination] !== undefined) counts[it.destination] += 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts).map(([key, value]) => ({
    key,
    label: DESTINATION_LABELS[key],
    value,
    pct: total ? (value / total) * 100 : 0,
  }));
}

export function vesselRanking(items = [], limit = 10) {
  const map = {};
  items.forEach((it) => {
    const name = it.vessel_name || 'Sem embarcação';
    if (!map[name]) map[name] = { name, count: 0, maintenance: 0 };
    map[name].count += 1;
    if (it.destination === 'repair' || it.destination === 'certification') {
      map[name].maintenance += 1;
    }
  });
  const all = Object.values(map).sort((a, b) => b.count - a.count);
  const avg = all.length ? all.reduce((s, v) => s + v.count, 0) / all.length : 0;
  const aboveAverage = all.filter((v) => v.count > avg * 1.5).slice(0, 5);
  return { ranking: all.slice(0, limit), avg, aboveAverage };
}

export function equipmentRanking(items = [], equipmentByCode = {}, limit = 10) {
  const map = {};
  items.forEach((it) => {
    const name = equipmentOf(it);
    const key = `${name}::${it.equipment_code || ''}::${it.serial_number || ''}`;
    if (!map[key]) {
      map[key] = {
        name,
        code: it.equipment_code || '—',
        serial: it.serial_number || '—',
        manufacturer: manufacturerOf(it, equipmentByCode),
        count: 0,
        gdms: new Set(),
      };
    }
    map[key].count += 1;
    if (it.gdm_id) map[key].gdms.add(it.gdm_id);
  });
  const rows = Object.values(map)
    .map((r) => {
      const { gdms, ...rest } = r;
      return { ...rest, gdmCount: gdms.size };
    })
    .sort((a, b) => b.count - a.count);
  const total = rows.reduce((s, r) => s + r.count, 0);
  const manufacturers = {};
  rows.forEach((r) => {
    manufacturers[r.manufacturer] = (manufacturers[r.manufacturer] || 0) + r.count;
  });
  const manufacturerRows = Object.entries(manufacturers)
    .map(([name, count]) => ({ name, count, pct: total ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
  const reincidences = rows
    .filter((r) => r.gdmCount >= 2)
    .sort((a, b) => b.gdmCount - a.gdmCount)
    .slice(0, 5);
  return { ranking: rows.slice(0, limit), manufacturers: manufacturerRows, reincidences, total };
}

const AWAITING_RECEIPT_STATUSES = ['pending_disembark_confirmation', 'pending_almoxarifado'];
const APPROVAL_STATUSES = ['pending_coordinator', 'pending_maintenance_authorization', 'awaiting_discard_confirmation'];
const FINAL_STATUSES = ['completed', 'cancelled', 'rejected', 'discard_approved'];

export function processIndicators(items = []) {
  const byStatus = {};
  items.forEach((it) => {
    if (it.status) byStatus[it.status] = (byStatus[it.status] || 0) + 1;
  });
  const awaitingReceipt = items.filter((i) => AWAITING_RECEIPT_STATUSES.includes(i.status)).length;
  const awaitingApproval = items.filter((i) => APPROVAL_STATUSES.includes(i.status)).length;
  const finished = items.filter((i) => i.status === 'completed').length;
  const inTreatment = items.filter(
    (i) =>
      !FINAL_STATUSES.includes(i.status) &&
      !AWAITING_RECEIPT_STATUSES.includes(i.status) &&
      !APPROVAL_STATUSES.includes(i.status)
  ).length;
  const done = items.filter((i) => i.created_date && i.completed_at);
  const avgDays = done.length
    ? done.reduce((s, i) => s + Math.max(0, (new Date(i.completed_at) - new Date(i.created_date)) / 86400000), 0) /
      done.length
    : 0;
  const statusRows = Object.entries(byStatus)
    .map(([key, value]) => ({ key, value, label: ITEM_STATUS_LABELS[key] || key }))
    .sort((a, b) => b.value - a.value);
  return { byStatus: statusRows, awaitingReceipt, awaitingApproval, inTreatment, finished, avgDays };
}

/* ---------- Alertas e inteligência ---------- */

export function buildAlerts(items = [], equipmentByCode = {}, now = new Date()) {
  const alerts = [];
  const mStart = startOfMonth(now);
  const curMonth = countBetween(items, mStart, addMonths(mStart, 1));
  const prevMonths = [];
  for (let i = 1; i <= 3; i++) {
    const s = addMonths(mStart, -i);
    prevMonths.push(countBetween(items, s, addMonths(s, 1)));
  }
  const prevAvg = prevMonths.reduce((a, b) => a + b, 0) / 3;
  if (prevAvg >= 3 && curMonth > prevAvg * 1.5) {
    alerts.push({
      severity: 'high',
      icon: 'spike',
      title: 'Aumento anormal de desembarques',
      message: `Mês atual com ${curMonth} itens registrados, acima da média dos 3 meses anteriores (${prevAvg.toFixed(1)} itens/mês).`,
    });
  }

  equipmentRanking(items, equipmentByCode).reincidences.forEach((r) => {
    alerts.push({
      severity: 'medium',
      icon: 'repeat',
      title: 'Reincidência de manutenção',
      message: `${r.name}${r.serial !== '—' ? ` (S/N ${r.serial})` : ''} registrado em ${r.gdmCount} GDMs diferentes.`,
    });
  });

  vesselRanking(items).aboveAverage.forEach((v) => {
    alerts.push({
      severity: 'medium',
      icon: 'vessel',
      title: 'Embarcação com volume acima da média',
      message: `${v.name} registrou ${v.count} itens no filtro atual, acima da média geral por embarcação.`,
    });
  });

  const trend = trendOf(monthlySeries(items, 6, now));
  if (trend.direction !== 'stable') {
    alerts.push({
      severity: trend.direction === 'growth' ? 'medium' : 'info',
      icon: 'trend',
      title: trend.direction === 'growth' ? 'Tendência de crescimento da demanda' : 'Tendência de redução da demanda',
      message: `Variação média de ${trend.pct > 0 ? '+' : ''}${trend.pct.toFixed(1)}% ao mês nos últimos 6 meses.`,
    });
  }
  return alerts;
}

/* ---------- Métricas consolidadas ---------- */

export function computeManagerialMetrics(items = [], { equipmentByCode = {}, from, to } = {}) {
  const now = new Date();
  const general =
    from || to
      ? customPeriodIndicators(items, from || '1970-01-01', to || format(now, 'yyyy-MM-dd'))
      : generalIndicators(items, now);
  const monthly = monthlySeries(items, 12, now);
  return {
    general,
    monthly,
    quarterly: quarterlySeries(items, 8, now),
    yearly: yearlySeries(items, 5, now),
    monthlyTrend: trendOf(monthly),
    destinations: destinationBreakdown(items),
    vessels: vesselRanking(items),
    equipment: equipmentRanking(items, equipmentByCode),
    process: processIndicators(items),
    alerts: buildAlerts(items, equipmentByCode, now),
  };
}