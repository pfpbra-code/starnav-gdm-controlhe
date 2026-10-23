/**
 * Centro interno de controle de fornecedores.
 * Fornecedores NÃO acessam o sistema: este módulo é apenas consulta
 * interna (indicadores, vínculo automático GDM-Item-Fornecedor e
 * rastreabilidade completa de equipamentos e cotações).
 * Usa a mesma fonte de dados do fluxo de itens (GDMItem) — sem divergência.
 */

export const CLOSED_ITEM_STATUSES = ["completed", "cancelled", "rejected", "discard_approved"];

export const SUPPLIER_ITEM_STATUS = {
  preparing_shipment: "Aguardando Comprovante de Envio",
  awaiting_quote: "Aguardando Cotação",
  quote_received: "Cotação Recebida",
  quote_analysis: "Em Análise (Manutenção)",
  negotiating: "Negociação de Desconto",
  repair_approved: "Reparo Aprovado",
  in_repair: "Em Reparo",
  awaiting_return: "Aguardando Retorno",
  awaiting_supplier_return: "Aguardando Retorno do Fornecedor",
  return_confirmed: "Retorno Confirmado",
  completed: "Finalizado",
  discarded: "Descartado",
  rejected: "Reprovado",
  cancelled: "Cancelado",
};

export const SUPPLIER_ITEM_STATUS_COLORS = {
  preparing_shipment: "bg-orange-100 text-orange-800 border-orange-200",
  awaiting_quote: "bg-amber-100 text-amber-800 border-amber-200",
  quote_received: "bg-sky-100 text-sky-800 border-sky-200",
  quote_analysis: "bg-violet-100 text-violet-800 border-violet-200",
  negotiating: "bg-violet-100 text-violet-800 border-violet-200",
  repair_approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  in_repair: "bg-blue-100 text-blue-800 border-blue-200",
  awaiting_return: "bg-orange-100 text-orange-800 border-orange-200",
  awaiting_supplier_return: "bg-purple-100 text-purple-800 border-purple-200",
  return_confirmed: "bg-teal-100 text-teal-800 border-teal-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  discarded: "bg-slate-100 text-slate-800 border-slate-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-slate-100 text-slate-800 border-slate-200",
};

/** Situação do item sob a ótica do fornecedor (fluxo por item). */
export function supplierItemStatusKey(item, gdm) {
  if (!item) return null;
  const hasQuote = !!(item.quote_document_url || item.quote_value || gdm?.quote_value);
  switch (item.status) {
    case "completed":
      return "completed";
    case "discard_approved":
      return "discarded";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "awaiting_shipping_proof":
      return "preparing_shipment";
    case "sent_to_supplier":
      // Enviado ao fornecedor com comprovante: aguardando cotação (3 dias).
      return hasQuote ? "quote_received" : "awaiting_quote";
    case "awaiting_maintenance_authorization":
      return "quote_analysis";
    case "discount_negotiation":
      return "negotiating";
    case "repair_approved":
      return "repair_approved";
    case "in_treatment":
      return "in_repair";
    case "awaiting_return":
      return "awaiting_return";
    case "awaiting_supplier_return":
      return "awaiting_supplier_return";
    case "return_confirmed":
      return "return_confirmed";
    default:
      return null;
  }
}

export const formatBRL = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export const formatDays = (days) =>
  days === null || days === undefined ? "—" : `${days.toFixed(1)} dias`;

const daysBetween = (start, end) => {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  return ms > 0 ? ms / 86400000 : null;
};

const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);

/** O item pertence a este fornecedor no ciclo atual ou em ciclos anteriores. */
function belongsToSupplier(item, supplierId) {
  if (item.supplier_id === supplierId) return true;
  return (item.previous_suppliers || []).some((p) => p.supplier_id === supplierId);
}

/**
 * Indicadores por fornecedor a partir dos vínculos de itens
 * (item.supplier_id e item.previous_suppliers) e do histórico preservado
 * (nada é apagado na troca de fornecedor ou em decisões da manutenção).
 */
export function buildSupplierStats({ suppliers, items, gdms, histories, certifications = [] }) {
  const gdmById = new Map((gdms || []).map((g) => [g.id, g]));
  const certTypeByItem = new Map((certifications || []).map((c) => [c.item_id, c.type]));
  const sentAtByItem = new Map();
  const quoteAtByItem = new Map();
  (histories || []).forEach((h) => {
    if (!h.item_id) return;
    if (h.new_status === "sent_to_supplier" && !sentAtByItem.has(h.item_id)) {
      sentAtByItem.set(h.item_id, h.created_date);
    }
    if (h.action === "attach_quote" && !quoteAtByItem.has(h.item_id)) {
      quoteAtByItem.set(h.item_id, h.created_date);
    }
  });

  return (suppliers || []).map((supplier) => {
    // Histórico completo: ciclo atual + ciclos anteriores (nunca removidos).
    const own = (items || []).filter((i) => belongsToSupplier(i, supplier.id));
    const current = own.filter((i) => i.supplier_id === supplier.id);
    const active = current.filter((i) => !CLOSED_ITEM_STATUSES.includes(i.status));

    const totalValue = active.reduce((sum, i) => {
      const gdm = gdmById.get(i.gdm_id);
      return sum + (i.quote_value || gdm?.quote_value || 0);
    }, 0);

    const responseDays = [];
    const repairDays = [];
    const returnSpans = [];
    const onTimeReturns = [];
    const completedItems = own.filter((i) => i.status === "completed");
    let lateCount = 0;
    let returnedThisMonth = 0;
    const now = new Date();

    own.forEach((i) => {
      const sentAt = i.sent_to_supplier_at || sentAtByItem.get(i.id);
      const response =
        quoteAtByItem.get(i.id) ||
        (histories || []).find((h) => h.item_id === i.id && h.new_status === "in_treatment")
          ?.created_date;
      const rd = sentAt && response ? daysBetween(sentAt, response) : null;
      if (rd !== null) responseDays.push(rd);
      if (i.status === "completed" && sentAt) {
        const cd = daysBetween(sentAt, i.completed_at);
        if (cd !== null) repairDays.push(cd);
      }

      // Atraso atual: item em posse deste fornecedor com prazo de retorno vencido.
      if (i.supplier_id === supplier.id && POSSESSION_STATUSES.includes(i.status)) {
        if (deadlineState(i, now).key === "overdue") lateCount++;
      }

      // Retornos efetivos: envio ao fornecedor → recebimento de volta no Almoxarifado.
      const backAt = i.return_received_at || (i.status === "completed" ? i.completed_at : null);
      if (sentAt && backAt) {
        returnSpans.push(
          Math.max(0, Math.floor((new Date(backAt) - new Date(sentAt)) / 86400000)),
        );
        const due = i.expected_return_date || i.quote_deadline;
        if (due) onTimeReturns.push(new Date(backAt) <= new Date(`${due}T23:59:59`));
        const m = new Date(backAt);
        if (m.getMonth() === now.getMonth() && m.getFullYear() === now.getFullYear()) {
          returnedThisMonth++;
        }
      }
    });

    const avgReturnDays = avg(returnSpans);
    const punctualityRate = onTimeReturns.length
      ? Math.round((onTimeReturns.filter(Boolean).length / onTimeReturns.length) * 100)
      : null;
    const repaired = completedItems.filter((i) => i.destination === "repair").length;
    const certificationsDone = completedItems.filter(
      (i) =>
        i.destination === "certification" &&
        (certTypeByItem.get(i.id) || "certification") === "certification",
    ).length;
    const calibrationsDone = completedItems.filter(
      (i) => i.destination === "certification" && certTypeByItem.get(i.id) === "calibration",
    ).length;
    const totalServiceValue = completedItems.reduce((sum, i) => {
      const gdm = gdmById.get(i.gdm_id);
      return sum + (i.quote_value || gdm?.quote_value || 0);
    }, 0);

    const row = {
      supplier,
      itemsTotal: own.length,
      inPossession: active.length,
      awaitingProof: active.filter((i) => i.status === "awaiting_shipping_proof").length,
      awaitingQuote: active.filter(
        (i) => i.status === "sent_to_supplier" && !i.quote_document_url,
      ).length,
      inRepair: active.filter((i) => i.status === "in_treatment").length,
      awaitingReturn: active.filter(
        (i) => i.status === "awaiting_return" || i.status === "awaiting_supplier_return",
      ).length,
      completed: completedItems.length,
      repaired,
      certificationsDone,
      calibrationsDone,
      lateCount,
      returnedThisMonth,
      avgReturnDays,
      punctualityRate,
      totalServiceValue,
      totalValue,
      avgResponseDays: avg(responseDays),
      avgRepairDays: avg(repairDays),
    };
    row.score = supplierScore(row);
    return row;
  });
}

/** Situações em que o item está fisicamente em posse do fornecedor. */
export const POSSESSION_STATUSES = [
  "sent_to_supplier",
  "awaiting_maintenance_authorization",
  "discount_negotiation",
  "repair_approved",
  "in_treatment",
  "awaiting_pwt",
  "awaiting_oc_issuance",
  "awaiting_oc_approval",
  "awaiting_return",
  "awaiting_supplier_return",
];

/** Categorias automáticas de situação de prazo (atualização automática do status). */
export const DEADLINE_STATES = {
  on_time: {
    label: "Dentro do prazo",
    emoji: "🟢",
    badge: "bg-green-100 text-green-800 border-green-200",
  },
  near15: {
    label: "Próximo do Prazo",
    emoji: "🟡",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
  },
  near7: {
    label: "Atenção",
    emoji: "🟠",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
  },
  overdue: {
    label: "Atrasado",
    emoji: "🔴",
    badge: "bg-red-100 text-red-800 border-red-200",
  },
};

export const formatDateBR = (value) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "—";

const endOfDay = (dateStr) => new Date(`${dateStr}T23:59:59`).getTime();

/** Data prevista de retorno do item (registrada no envio ao fornecedor). */
export function itemDueDate(item) {
  return item.expected_return_date || item.quote_deadline || null;
}

/**
 * Situação de prazo de um item em posse do fornecedor, calculada
 * automaticamente a partir da data prevista de retorno.
 */
export function deadlineState(item, now = new Date()) {
  const sentAt = item.sent_to_supplier_at;
  const daysInPossession = sentAt
    ? Math.max(0, Math.floor((now.getTime() - new Date(sentAt).getTime()) / 86400000))
    : null;
  const due = itemDueDate(item);
  if (!due) {
    return { key: "on_time", dueDate: null, daysInPossession, daysRemaining: null, daysOverdue: 0 };
  }
  const diff = (endOfDay(due) - now.getTime()) / 86400000;
  if (diff < 0) {
    return {
      key: "overdue",
      dueDate: due,
      daysInPossession,
      daysRemaining: null,
      daysOverdue: Math.floor(-diff) + 1,
    };
  }
  if (diff <= 7) {
    return { key: "near7", dueDate: due, daysInPossession, daysRemaining: Math.floor(diff), daysOverdue: 0 };
  }
  if (diff <= 15) {
    return { key: "near15", dueDate: due, daysInPossession, daysRemaining: Math.floor(diff), daysOverdue: 0 };
  }
  return { key: "on_time", dueDate: due, daysInPossession, daysRemaining: Math.floor(diff), daysOverdue: 0 };
}

/** Itens atualmente em posse de fornecedores. */
export function possessionItems(items = []) {
  return items.filter((i) => i.supplier_id && POSSESSION_STATUSES.includes(i.status));
}

/** Linha de follow-up de um item em posse de fornecedor. */
export function followUpRow(item, gdm, now = new Date()) {
  const ds = deadlineState(item, now);
  return {
    item,
    supplierName: item.supplier_name || "—",
    equipment: item.equipment_name,
    serialNumber: item.serial_number || "—",
    gdmNumber: gdm?.gdm_number || "—",
    vesselName: item.vessel_name || gdm?.vessel_name || "—",
    sentAt: item.sent_to_supplier_at,
    promisedDeadline: item.quote_deadline || null,
    expectedReturn: item.expected_return_date || null,
    statusKey: supplierItemStatusKey(item, gdm),
    sentBy: item.sent_by || "—",
    daysInPossession: ds.daysInPossession,
    daysRemaining: ds.key === "overdue" ? null : ds.daysRemaining,
    daysOverdue: ds.daysOverdue,
    deadlineKey: ds.key,
    dueDate: ds.dueDate,
  };
}

const clamp = (v) => Math.min(100, Math.max(0, v));

/**
 * Score automático de desempenho do fornecedor (0-100):
 * 50% cumprimento de prazo, 30% tempo médio de retorno (15 dias = 100,
 * 60 dias = 0) e 20% itens atrasados (nenhum atraso = 100).
 */
export function supplierScore(row) {
  const parts = [];
  if (row.punctualityRate !== null && row.punctualityRate !== undefined) {
    parts.push([row.punctualityRate, 0.5]);
  }
  if (row.avgReturnDays !== null && row.avgReturnDays !== undefined) {
    parts.push([clamp(100 - ((row.avgReturnDays - 15) * 100) / 45), 0.3]);
  }
  parts.push([clamp(100 - (row.lateCount || 0) * 20), 0.2]);
  const weight = parts.reduce((s, [, w]) => s + w, 0);
  return Math.round(parts.reduce((s, [v, w]) => s + v * w, 0) / weight);
}

export function scoreBadgeClass(score) {
  if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 60) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}