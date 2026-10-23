// Controle de OT (Ordem de Trabalho) — cálculos centrais do dashboard,
// compartilhado pelas abas de Serviços e Almoxarifado (mesma base de dados).

// Situações de OT que ainda não foi encerrada.
export const OT_OPEN_STATES = ['open', 'in_service', 'awaiting_close'];

// Rótulos dos status da OT usados na planilha exportada.
const OT_STATUS_EXPORT_LABELS = {
  open: 'OT Aberta',
  in_service: 'Em Serviço',
  awaiting_close: 'Recebido - Aguardando Fechamento da OT',
  closed: 'OT Fechada',
};

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

function csvCell(value) {
  const v = value === null || value === undefined ? '' : String(value);
  return `"${v.replace(/"/g, '""')}"`;
}

function csvDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Exporta as linhas do Controle de OT para uma planilha CSV (UTF-8 com BOM,
 * separador ";", compatível com Excel) respeitando os filtros aplicados.
 */
export function exportWorkOrdersCsv(rows = []) {
  const header = [
    'OT',
    'GDM',
    'Item',
    'Equipamento',
    'Número de Série',
    'Fornecedor',
    'Embarcação',
    'Data de Envio ao Fornecedor',
    'Data de Recebimento',
    'Responsável pelo Recebimento',
    'Status da OT',
    'Dias em Aberto',
    'Vencida',
    'Data de Fechamento',
    'Fechada por',
  ];
  const lines = rows.map((r) =>
    [
      r.item.ot_number,
      r.gdm_number,
      r.item.item_number,
      r.item.equipment_name,
      r.item.serial_number,
      r.item.supplier_name,
      r.item.vessel_name || r.gdm?.vessel_name,
      csvDate(r.item.sent_to_supplier_at),
      csvDate(r.item.return_received_at),
      r.item.return_received_by,
      OT_STATUS_EXPORT_LABELS[r.item.ot_status] || r.item.ot_status,
      r.daysOpen,
      r.isOpen && r.overdue ? 'Sim' : 'Não',
      csvDate(r.item.ot_closed_at),
      r.item.ot_closed_by,
    ]
      .map(csvCell)
      .join(';'),
  );

  const csv = '\uFEFF' + [header.map(csvCell).join(';'), ...lines].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `controle-de-ot-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Data dentro do período [from, to] (strings yyyy-mm-dd, opcionais). */
export function inDatePeriod(dateStr, from, to) {
  if (!dateStr) return true;
  const d = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
  if (from && d < new Date(`${from}T00:00:00`)) return false;
  if (to && d > new Date(`${to}T23:59:59`)) return false;
  return true;
}