// Controle de OT (Ordem de Trabalho) — cálculos centrais do dashboard,
// compartilhado pelas abas de Serviços e Almoxarifado (mesma base de dados).

// Situações de OT que ainda não foi encerrada.
export const OT_OPEN_STATES = ['open', 'in_service', 'awaiting_close'];

// Prazo padrão (dias) para considerar uma OT vencida quando não há prazo de
// retorno acordado com o fornecedor.
export const OT_DEFAULT_DEADLINE_DAYS = 30;

/** Dias em que a OT está (ou esteve) aberta: emissão → fechamento ou hoje. */
export function otDaysOpen(item, now = new Date()) {
  if (!item?.ot_issued_at) return null;
  const end = item.ot_closed_at ? new Date(item.ot_closed_at) : now;
  return Math.max(0, Math.floor((end - new Date(item.ot_issued_at)) / 86400000));
}

/** Prazo da OT: data prevista de retorno ou emissão + prazo padrão. */
export function otDueDate(item) {
  if (item?.expected_return_date) return new Date(`${item.expected_return_date}T23:59:59`);
  if (item?.ot_issued_at) {
    return new Date(
      new Date(item.ot_issued_at).getTime() + OT_DEFAULT_DEADLINE_DAYS * 86400000,
    );
  }
  return null;
}

/** OT aberta há mais tempo que o prazo configurado. */
export function otIsOverdue(item, now = new Date()) {
  if (!item?.ot_number || item.ot_status === 'closed') return false;
  const due = otDueDate(item);
  return due ? now > due : false;
}

/** Tempo de ciclo da OT (dias): fechamento - abertura. */
export function otCycleDays(item) {
  if (!item?.ot_closed_at || !item?.ot_issued_at) return null;
  return Math.max(
    0,
    (new Date(item.ot_closed_at) - new Date(item.ot_issued_at)) / 86400000,
  );
}

/**
 * Linhas do Controle de OT: todos os itens de reparo, certificação ou
 * calibração com OT emitida, enriquecidas com a GDM e cálculos de prazo.
 */
export function buildWorkOrderRows(items = [], gdms = []) {
  const gdmById = Object.fromEntries(gdms.map((g) => [g.id, g]));
  return items
    .filter((i) => i.ot_number)
    .map((i) => ({
      item: i,
      gdm: gdmById[i.gdm_id] || null,
      gdm_number: gdmById[i.gdm_id]?.gdm_number || '—',
      isOpen: i.ot_status !== 'closed',
      daysOpen: otDaysOpen(i),
      cycleDays: otCycleDays(i),
      overdue: otIsOverdue(i),
    }));
}

/** Data dentro do período [from, to] (strings yyyy-mm-dd, opcionais). */
export function inDatePeriod(dateStr, from, to) {
  if (!dateStr) return true;
  const d = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
  if (from && d < new Date(`${from}T00:00:00`)) return false;
  if (to && d > new Date(`${to}T23:59:59`)) return false;
  return true;
}