/**
 * Centro interno de controle de fornecedores.
 * Fornecedores NÃO acessam o sistema: este módulo é apenas consulta
 * interna (indicadores, vínculo automático GDM-Item-Fornecedor e
 * rastreabilidade completa de equipamentos e cotações).
 */

export const CLOSED_ITEM_STATUSES = ['completed', 'cancelled', 'rejected'];

export const SUPPLIER_ITEM_STATUS = {
  awaiting_quote: 'Aguardando Cotação',
  quote_received: 'Cotação Recebida',
  negotiating: 'Em Negociação',
  repair_approved: 'Reparo Aprovado',
  in_repair: 'Em Reparo',
  awaiting_return: 'Aguardando Retorno',
  completed: 'Finalizado',
  rejected: 'Reprovado',
  cancelled: 'Cancelado',
};

export const SUPPLIER_ITEM_STATUS_COLORS = {
  awaiting_quote: 'bg-amber-100 text-amber-800 border-amber-200',
  quote_received: 'bg-sky-100 text-sky-800 border-sky-200',
  negotiating: 'bg-violet-100 text-violet-800 border-violet-200',
  repair_approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  in_repair: 'bg-blue-100 text-blue-800 border-blue-200',
  awaiting_return: 'bg-orange-100 text-orange-800 border-orange-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-slate-100 text-slate-800 border-slate-200',
};

/** Situação do item sob a ótica do fornecedor (vínculo com a cotação da GDM). */
export function supplierItemStatusKey(item, gdm) {
  if (!item) return null;
  switch (item.status) {
    case 'completed':
      return 'completed';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
      return 'cancelled';
    case 'awaiting_return':
      return 'awaiting_return';
    case 'in_treatment':
      return 'in_repair';
    case 'sent_to_supplier':
      if (gdm?.maintenance_decision === 'discount_requested') return 'negotiating';
      if (gdm?.maintenance_decision === 'approved') return 'repair_approved';
      if (gdm?.maintenance_decision === 'new_quote_requested') return 'awaiting_quote';
      return gdm?.quote_value ? 'quote_received' : 'awaiting_quote';
    default:
      return null;
  }
}

export const formatBRL = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const daysBetween = (start, end) => {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  return ms > 0 ? ms / 86400000 : null;
};

const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);

/**
 * Indicadores por fornecedor a partir dos vínculos automáticos de itens
 * (item.supplier_id) e do histórico preservado (nada é apagado na troca
 * de fornecedor ou em decisões da manutenção).
 */
export function buildSupplierStats({ suppliers, items, gdms, histories }) {
  const gdmById = new Map((gdms || []).map((g) => [g.id, g]));
  const sentAtByItem = new Map();
  (histories || []).forEach((h) => {
    if (h.new_status === 'sent_to_supplier' && h.item_id && !sentAtByItem.has(h.item_id)) {
      sentAtByItem.set(h.item_id, h.created_date);
    }
  });

  return (suppliers || []).map((supplier) => {
    const own = (items || []).filter((i) => i.supplier_id === supplier.id);
    const active = own.filter((i) => !CLOSED_ITEM_STATUSES.includes(i.status));
    const negotiationGdmIds = new Set(active.map((i) => i.gdm_id));
    const totalValue = [...negotiationGdmIds].reduce(
      (sum, gid) => sum + (gdmById.get(gid)?.quote_value || 0),
      0
    );

    const responseDays = [];
    const repairDays = [];
    own.forEach((i) => {
      const sentAt = i.sent_to_supplier_at || sentAtByItem.get(i.id);
      const response = (histories || []).find(
        (h) => h.item_id === i.id && h.new_status === 'in_treatment'
      );
      const rd = sentAt && response ? daysBetween(sentAt, response.created_date) : null;
      if (rd !== null) responseDays.push(rd);
      if (i.status === 'completed' && sentAt) {
        const cd = daysBetween(sentAt, i.completed_at);
        if (cd !== null) repairDays.push(cd);
      }
    });

    return {
      supplier,
      itemsTotal: own.length,
      inPossession: active.length,
      inRepair: active.filter((i) => i.status === 'in_treatment').length,
      awaitingQuote: active.filter((i) => i.status === 'sent_to_supplier').length,
      awaitingReturn: active.filter((i) => i.status === 'awaiting_return').length,
      completed: own.filter((i) => i.status === 'completed').length,
      totalValue,
      avgResponseDays: avg(responseDays),
      avgRepairDays: avg(repairDays),
    };
  });
}