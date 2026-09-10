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
export function buildSupplierStats({ suppliers, items, gdms, histories }) {
  const gdmById = new Map((gdms || []).map((g) => [g.id, g]));
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
    });

    return {
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
      completed: own.filter((i) => i.status === "completed").length,
      totalValue,
      avgResponseDays: avg(responseDays),
      avgRepairDays: avg(repairDays),
    };
  });
}