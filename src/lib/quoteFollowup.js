// Acompanhamento de cotações (aba Serviços): regras de prazo, alerta e
// indicadores derivados dos itens da GDM — sempre a mesma fonte de verdade do
// fluxo. A contagem começa na data de envio ao fornecedor (sent_to_supplier_at).

const DAY_MS = 24 * 60 * 60 * 1000;

/** Marcos de atraso da cotação, do mais crítico para o inicial. */
export const QUOTE_ALERT_LEVELS = {
  late: {
    min_days: 7,
    label: 'Proposta em Atraso',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  charge: {
    min_days: 5,
    label: 'Cobrar Fornecedor',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  attention: {
    min_days: 3,
    label: 'Atenção',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  waiting: {
    min_days: 0,
    label: 'Aguardando Cotação',
    className: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
};

export const QUOTE_ALERT_ORDER = ['late', 'charge', 'attention', 'waiting'];

/** Meios de contato aceitos no registro de follow-up. */
export const QUOTE_CONTACT_CHANNELS = [
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'other', label: 'Outro' },
];

export const QUOTE_CONTACT_LABELS = QUOTE_CONTACT_CHANNELS.reduce((acc, c) => {
  acc[c.value] = c.label;
  return acc;
}, {});

/** Item enviado ao fornecedor que ainda não teve cotação anexada. */
export function isAwaitingQuote(item) {
  return (
    !!item &&
    item.status === 'sent_to_supplier' &&
    !item.quote_document_url &&
    !!item.sent_to_supplier_at
  );
}

/** Dias corridos aguardando cotação, contados da data de envio. */
export function quoteWaitingDays(item, now = Date.now()) {
  const sentAt = item?.sent_to_supplier_at;
  if (!sentAt) return 0;
  const diff = now - new Date(sentAt).getTime();
  return Number.isFinite(diff) ? Math.max(0, Math.floor(diff / DAY_MS)) : 0;
}

/** Estado de alerta da cotação conforme a idade da pendência. */
export function quoteAlertState(item, now = Date.now()) {
  const days = quoteWaitingDays(item, now);
  const key = QUOTE_ALERT_ORDER.find((k) => days >= QUOTE_ALERT_LEVELS[k].min_days) || 'waiting';
  return { key, days, ...QUOTE_ALERT_LEVELS[key] };
}

const average = (values) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

/** Tempo médio de resposta (envio → cotação anexada) por fornecedor. */
export function supplierQuotePerformance(items = [], now = Date.now()) {
  const map = new Map();
  const get = (name) => {
    if (!map.has(name)) map.set(name, { name, responses: [], awaiting: [] });
    return map.get(name);
  };

  items.forEach((item) => {
    const supplier = item.supplier_name;
    if (!supplier) return;
    if (item.sent_to_supplier_at && item.quote_attached_at) {
      const days =
        (new Date(item.quote_attached_at).getTime() -
          new Date(item.sent_to_supplier_at).getTime()) /
        DAY_MS;
      if (days >= 0) get(supplier).responses.push(days);
      return;
    }
    if (isAwaitingQuote(item)) {
      get(supplier).awaiting.push(quoteWaitingDays(item, now));
    }
  });

  return [...map.values()].map((s) => ({
    name: s.name,
    responses: s.responses.length,
    avgDays: average(s.responses),
    awaiting: s.awaiting.length,
    maxWaitingDays: s.awaiting.length ? Math.max(...s.awaiting) : 0,
  }));
}

export function fastestSuppliers(suppliers = [], limit = 5) {
  return suppliers
    .filter((s) => s.avgDays != null)
    .sort((a, b) => a.avgDays - b.avgDays)
    .slice(0, limit);
}

export function slowestSuppliers(suppliers = [], limit = 5) {
  return suppliers
    .filter((s) => s.avgDays != null || s.awaiting > 0)
    .sort(
      (a, b) =>
        b.maxWaitingDays - a.maxWaitingDays || (b.avgDays || 0) - (a.avgDays || 0),
    )
    .slice(0, limit);
}

/** Indicadores do painel de follow-up (cards + rankings). */
export function quoteFollowupMetrics(items = [], followups = [], now = Date.now()) {
  const awaiting = items
    .filter(isAwaitingQuote)
    .map((item) => ({ item, days: quoteWaitingDays(item, now) }))
    .sort((a, b) => b.days - a.days);

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const inMonth = (value) => !!value && new Date(value).getTime() >= monthStart.getTime();

  const responseDays = items
    .filter((i) => i.sent_to_supplier_at && i.quote_attached_at)
    .map(
      (i) =>
        (new Date(i.quote_attached_at).getTime() - new Date(i.sent_to_supplier_at).getTime()) /
        DAY_MS,
    )
    .filter((d) => d >= 0);

  const itemIds = new Set(items.map((i) => i.id));

  return {
    awaiting,
    awaitingCount: awaiting.length,
    over3: awaiting.filter((r) => r.days >= 3).length,
    over7: awaiting.filter((r) => r.days >= 7).length,
    receivedThisMonth: items.filter((i) => inMonth(i.quote_attached_at)).length,
    avgResponseDays: average(responseDays),
    followupsThisMonth: followups.filter(
      (f) => itemIds.has(f.item_id) && inMonth(f.registered_at || f.created_date),
    ).length,
    suppliers: supplierQuotePerformance(items, now),
  };
}