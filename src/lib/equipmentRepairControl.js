/**
 * Controle de equipamentos por nomenclatura — aba "Dados por Equipamento" (Serviços).
 *
 * Regras centrais de agrupamento, classificação e contagem. Fonte oficial:
 * itens das GDMs (GDMItem) — cada item carrega a quantidade real desembarcada
 * (campo `quantity`), a nomenclatura (equipment_name / equipment_id), a
 * embarcação, o fornecedor e a situação atual do workflow por item.
 *
 * Princípios de integridade:
 * - Contagem por UNIDADE (quantity), nunca por linha, GDM ou histórico.
 * - Categorias mutuamente exclusivas: cada unidade entra em exatamente uma
 *   categoria de status; "atrasada" é uma marcação sobreposta (condição de
 *   prazo), não uma categoria de status.
 * - Nenhuma tabela de histórico é somada: apenas o registro vivo do item.
 */
import { format } from 'date-fns';
import { returnDeadlineState, itemResponsible } from '@/lib/gdmItems';

// ---------------------------------------------------------------------------
// Categorias de contagem (mutuamente exclusivas) — mapeadas dos status reais
// do workflow de itens (enum de GDMItem).
// ---------------------------------------------------------------------------
export const CONTROL_CATEGORIES = [
  {
    key: 'awaiting_quote',
    label: 'Aguardando Cotação',
    color: '#7c3aed',
    statuses: ['sent_to_supplier'],
  },
  {
    key: 'awaiting_approval',
    label: 'Aguardando Aprovação',
    color: '#d97706',
    statuses: [
      'pending_coordinator',
      'pending_maintenance_authorization',
      'awaiting_maintenance_authorization',
      'awaiting_services_analysis',
      'awaiting_discount',
      'discount_negotiation',
      'repair_approved',
      'awaiting_pwt',
      'awaiting_oc_issuance',
      'awaiting_oc_approval',
      'awaiting_discard_confirmation',
      'awaiting_certificate',
      'awaiting_validity_registration',
    ],
  },
  {
    key: 'awaiting_supplier',
    label: 'Aguardando Fornecedor / Início',
    color: '#0ea5e9',
    statuses: [
      'draft',
      'awaiting_receipt',
      'received',
      'awaiting_supplier_definition',
      'pending_services',
      'awaiting_shipping_proof',
      'return_confirmed',
    ],
  },
  {
    key: 'in_repair',
    label: 'Em Reparo',
    color: '#2563eb',
    statuses: ['in_treatment'],
  },
  {
    key: 'awaiting_return',
    label: 'Aguardando Retorno',
    color: '#9333ea',
    statuses: ['awaiting_return', 'awaiting_supplier_return'],
  },
];

export const CLOSED_CATEGORIES = {
  finished: { label: 'Finalizada', color: '#16a34a' },
  stock_returned: { label: 'Devolvida ao Estoque', color: '#0d9488' },
  discarded: { label: 'Descartada', color: '#dc2626' },
  cancelled: { label: 'Cancelada / Reprovada', color: '#64748b' },
  unknown: { label: 'Não Identificada', color: '#94a3b8' },
};

export const CATEGORY_LABELS = {
  ...Object.fromEntries(CONTROL_CATEGORIES.map((c) => [c.key, c.label])),
  ...Object.fromEntries(
    Object.entries(CLOSED_CATEGORIES).map(([k, c]) => [k, c.label]),
  ),
};

const STATUS_TO_CATEGORY = Object.fromEntries(
  CONTROL_CATEGORIES.flatMap((c) => c.statuses.map((s) => [s, c.key])),
);

/** Quantidade real de unidades do item (padrão 1 quando não informada). */
export function itemQty(item) {
  const q = Number(item?.quantity);
  return Number.isFinite(q) && q > 0 ? q : 1;
}

/**
 * Categoria de contagem do item — exatamente uma, a partir do status VIGENTE
 * (nunca do histórico) e do destino registrado.
 */
export function classifyItem(item) {
  const s = item?.status;
  const d = item?.destination;
  if (['cancelled', 'rejected'].includes(s)) return 'cancelled';
  if (d === 'stock_return' && (s === 'completed' || item.stock_return_confirmed)) {
    return 'stock_returned';
  }
  if (d === 'discard' && ['completed', 'discard_approved'].includes(s)) {
    return 'discarded';
  }
  if (s === 'completed') return 'finished';
  if (d === 'discard' && s === 'awaiting_discard_confirmation') return 'discarded';
  if (STATUS_TO_CATEGORY[s]) return STATUS_TO_CATEGORY[s];
  if (s === 'discard_approved') return 'discarded';
  return 'unknown';
}

/** Processo ainda aberto (não finalizado, devolvido, descartado, cancelado). */
export function isOpenProcess(category) {
  return !['finished', 'stock_returned', 'discarded', 'cancelled'].includes(category);
}

/** Prazo de retorno vencido (marcação sobreposta, via expected_return_date — prazo pós-OC). */
export function isOverdue(item) {
  return returnDeadlineState(item) === 'overdue';
}

// ---------------------------------------------------------------------------
// Nomenclaturas equivalentes
// ---------------------------------------------------------------------------

/** Normalização conservadora: maiúsculas/minúsculas e espaços duplicados.
 *  Não remove modelo, capacidade, fabricante, dimensões nem observações
 *  entre parênteses — preserva o significado técnico. */
export function normalizeNomenclature(name = '') {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Chave de agrupamento: identificador estável do cadastro quando existir;
 *  caso contrário, a nomenclatura normalizada. */
export function equipmentGroupKey(item) {
  if (item?.equipment_id) return `id:${item.equipment_id}`;
  return `name:${normalizeNomenclature(item?.equipment_name)}`;
}

// ---------------------------------------------------------------------------
// Agrupamento e contagem
// ---------------------------------------------------------------------------

/**
 * Agrupa as linhas ({ item, gdm }) pela chave da nomenclatura e calcula os
 * totais por categoria, sempre somando a quantidade real de cada item.
 * Não soma históricos: cada item entra uma única vez, com o status vigente.
 */
export function buildEquipmentGroups(rows = []) {
  const groups = new Map();
  rows.forEach(({ item, gdm }) => {
    const key = equipmentGroupKey(item);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: item.equipment_name || '(sem nomenclatura)',
        equipmentId: item.equipment_id || null,
        rows: [],
        totals: {},
        needsReview: false,
      });
    }
    groups.get(key).rows.push({ item, gdm });
  });

  groups.forEach((group) => {
    let total = 0;
    let open = 0;
    let overdue = 0;
    const byCategory = {};
    group.rows.forEach(({ item }) => {
      const qty = itemQty(item);
      const category = classifyItem(item);
      total += qty;
      byCategory[category] = (byCategory[category] || 0) + qty;
      if (isOpenProcess(category)) open += qty;
      if (isOverdue(item)) overdue += qty;
    });
    group.totals = { total, open, overdue, ...byCategory };
  });

  // Sinalização administrativa: mesma nomenclatura normalizada vinculada a
  // identificadores de cadastro distintos — possível duplicidade de cadastro.
  const keysByName = new Map();
  groups.forEach((group) => {
    const nk = normalizeNomenclature(group.name);
    if (!keysByName.has(nk)) keysByName.set(nk, []);
    keysByName.get(nk).push(group.key);
  });
  groups.forEach((group) => {
    group.needsReview = keysByName.get(normalizeNomenclature(group.name)).length > 1;
  });

  return Array.from(groups.values()).sort(
    (a, b) => b.totals.total - a.totals.total || a.name.localeCompare(b.name),
  );
}

/** Indicadores consolidados das linhas filtradas (contagem por unidade). */
export function summarizeRows(rows = []) {
  const kpi = {
    total: 0,
    open: 0,
    inRepair: 0,
    awaitingQuoteOrApproval: 0,
    awaitingReturn: 0,
    finished: 0,
    stockReturned: 0,
    discarded: 0,
    cancelled: 0,
    unknown: 0,
    overdue: 0,
  };
  rows.forEach(({ item }) => {
    const qty = itemQty(item);
    const category = classifyItem(item);
    kpi.total += qty;
    if (isOpenProcess(category)) kpi.open += qty;
    if (category === 'in_repair') kpi.inRepair += qty;
    if (['awaiting_quote', 'awaiting_approval'].includes(category)) {
      kpi.awaitingQuoteOrApproval += qty;
    }
    if (category === 'awaiting_return') kpi.awaitingReturn += qty;
    if (category === 'finished') kpi.finished += qty;
    if (category === 'stock_returned') kpi.stockReturned += qty;
    if (category === 'discarded') kpi.discarded += qty;
    if (category === 'cancelled') kpi.cancelled += qty;
    if (category === 'unknown') kpi.unknown += qty;
    if (isOverdue(item)) kpi.overdue += qty;
  });
  return kpi;
}

/** Metadados de prazo da linha (usados na tabela e na exportação). */
export function controlRowMeta({ item }) {
  const created = item?.created_date ? new Date(item.created_date) : null;
  const daysOpen = created
    ? Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000))
    : null;
  const deadline = item?.expected_return_date
    ? new Date(`${item.expected_return_date}T23:59:59`)
    : null;
  const overdue = isOverdue(item);
  const daysLate = overdue
    ? Math.max(1, Math.ceil((Date.now() - deadline.getTime()) / 86400000))
    : 0;
  return { daysOpen, deadline, overdue, daysLate };
}

/** Dados dos quatro gráficos, sempre a partir dos rows filtrados. */
export function buildChartData(rows = []) {
  // 1 — Distribuição por categoria de status (unidades).
  const catMap = new Map();
  rows.forEach(({ item }) => {
    const label = CATEGORY_LABELS[classifyItem(item)];
    catMap.set(label, (catMap.get(label) || 0) + itemQty(item));
  });
  const byCategory = Array.from(catMap, ([name, qty]) => ({ name, qty }))
    .filter((d) => d.qty > 0)
    .sort((a, b) => b.qty - a.qty);

  // 2 — Unidades por GDM.
  const gdmMap = new Map();
  rows.forEach(({ item, gdm }) => {
    const label = gdm?.gdm_number || '—';
    gdmMap.set(label, (gdmMap.get(label) || 0) + itemQty(item));
  });
  const byGdm = Array.from(gdmMap, ([gdm, qty]) => ({ gdm, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 12);

  // 3 — Unidades por embarcação.
  const vesselMap = new Map();
  rows.forEach(({ item, gdm }) => {
    const label = item?.vessel_name || gdm?.vessel_name || '—';
    vesselMap.set(label, (vesselMap.get(label) || 0) + itemQty(item));
  });
  const byVessel = Array.from(vesselMap, ([vessel, qty]) => ({ vessel, qty }))
    .filter((d) => d.qty > 0)
    .sort((a, b) => b.qty - a.qty);

  // 4 — Evolução mensal: unidades desembarcadas (mês de abertura da GDM) e
  // unidades finalizadas (mês de conclusão do item). Sem datas inferidas.
  const months = new Map();
  const bucket = (key) => {
    if (!months.has(key)) months.set(key, { month: key, disembarked: 0, finished: 0 });
    return months.get(key);
  };
  rows.forEach(({ item, gdm }) => {
    const createdKey = gdm?.created_date ? String(gdm.created_date).slice(0, 7) : null;
    if (createdKey) bucket(createdKey).disembarked += itemQty(item);
    const completedKey = item?.completed_at ? String(item.completed_at).slice(0, 7) : null;
    if (completedKey) bucket(completedKey).finished += itemQty(item);
  });
  const evolution = Array.from(months.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((e) => ({
      ...e,
      monthLabel: format(new Date(`${e.month}-01T12:00:00`), 'MM/yyyy'),
    }));

  return { byCategory, byGdm, byVessel, evolution };
}

// ---------------------------------------------------------------------------
// Exportação CSV
// ---------------------------------------------------------------------------

const CSV_HEADERS = [
  'Nomenclatura',
  'Código',
  'SN',
  'GDM',
  'Embarcação',
  'Data Desembarque',
  'Qtde',
  'Status Atual',
  'Responsável',
  'Fornecedor',
  'Retorno Previsto',
  'Dias em Aberto',
  'Dias de Atraso',
  'Última Atualização',
];

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

/**
 * CSV dos registros filtrados, com os critérios de filtro e a data da
 * extração no cabeçalho. Exporta exatamente o que a tabela exibe.
 */
export function buildEquipmentControlCsv(rows = [], filters = {}) {
  const lines = [];
  lines.push(
    csvCell(
      `STARNAV CONTROL — Dados por Equipamento — Extração em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
    ),
  );
  const active = Object.entries(filters).filter(([, v]) => v);
  if (active.length) {
    lines.push(csvCell(`Filtros aplicados: ${active.map(([k, v]) => `${k}: ${v}`).join(' | ')}`));
  }
  lines.push('');
  lines.push(CSV_HEADERS.map(csvCell).join(';'));
  rows.forEach(({ item, gdm }) => {
    const meta = controlRowMeta({ item });
    lines.push(
      [
        item.equipment_name,
        item.equipment_code,
        item.serial_number,
        gdm?.gdm_number,
        item.vessel_name || gdm?.vessel_name,
        gdm?.disembark_date ? format(new Date(`${gdm.disembark_date}T12:00:00`), 'dd/MM/yyyy') : '',
        itemQty(item),
        item.status,
        itemResponsible(item),
        item.supplier_name,
        meta.deadline ? format(meta.deadline, 'dd/MM/yyyy') : 'Prazo não informado',
        meta.daysOpen ?? '',
        meta.overdue ? meta.daysLate : '',
        item.updated_date ? format(new Date(item.updated_date), 'dd/MM/yyyy HH:mm') : '',
      ]
        .map(csvCell)
        .join(';'),
    );
  });
  return `\uFEFF${lines.join('\r\n')}`;
}