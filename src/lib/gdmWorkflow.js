// Central GDM workflow definitions: statuses, steps, roles and history builder.
// Used by GDMDetail, GDMList and StatusBadge to keep the flow consistent.

export const STATUS_LABELS = {
  pending_coordinator: 'Aguardando Aprovação do Coordenador',
  pending_services: 'Aguardando Serviços/Compras',
  sent_to_supplier: 'Enviado ao Fornecedor',
  awaiting_quote: 'Aguardando Cotação',
  quote_attached: 'Cotação Anexada',
  quote_analysis: 'Em Aprovação da Manutenção',
  new_quote_requested: 'Nova Cotação Solicitada',
  approved: 'Cotação Aprovada',
  pwt_issued: 'PWT Emitido',
  oc_issued: 'OC Emitida',
  ot_issued: 'OT Emitida',
  completed: 'Processo Finalizado',
  rejected: 'Reprovada',
};

export const STEP_NAMES = {
  pending_coordinator: 'Aprovação do Coordenador',
  pending_services: 'Envio ao Fornecedor',
  sent_to_supplier: 'Cotação do Fornecedor',
  quote_attached: 'Anexação da Cotação/Proposta',
  quote_analysis: 'Aprovação do Gestor de Manutenção',
  new_quote_requested: 'Solicitação de Nova Cotação',
  approved: 'Aprovação da Cotação',
  pwt_issued: 'Emissão do PWT (Manutenção)',
  oc_issued: 'Emissão da OC (Serviços/Compras)',
  ot_issued: 'Emissão da OT (Serviços/Compras)',
  completed: 'Finalização do Processo',
  rejected: 'Reprovação',
};

export const ROLE_LABELS = {
  admin: 'Administrador',
  coordinator: 'Coordenador',
  services: 'Serviços/Compras',
  maintenance: 'Gestor de Manutenção',
  vessel_user: 'Embarcação',
  user: 'Usuário',
};

// Statuses where a quote/proposta can be attached (supplier or services)
export const QUOTE_ATTACH_STATUSES = ['sent_to_supplier', 'awaiting_quote', 'new_quote_requested'];

// Build a full trail history entry. Every transition must go through this.
export function buildHistoryEntry({
  action,
  user,
  details,
  previousStatus,
  newStatus,
  stepName,
  observation,
}) {
  return {
    action,
    user: user?.email,
    user_name: user?.full_name || user?.email,
    role: user?.role,
    timestamp: new Date().toISOString(),
    details,
    previous_status: previousStatus,
    new_status: newStatus,
    step_name: stepName,
    observation: observation || '',
  };
}

// Push the current quote snapshot into quotes_history before replacing it.
export function snapshotCurrentQuote(gdm, reason) {
  if (!gdm || (!gdm.quote_value && !gdm.quote_document_url && !gdm.commercial_proposal_url)) {
    return gdm?.quotes_history || [];
  }
  const snapshot = {
    quote_value: gdm.quote_value,
    quote_document_url: gdm.quote_document_url,
    technical_report_url: gdm.technical_report_url,
    commercial_proposal_url: gdm.commercial_proposal_url,
    supplier_name: gdm.supplier_name,
    discount_percentage: gdm.discount_percentage,
    preserved_at: new Date().toISOString(),
    reason,
  };
  return [...(gdm.quotes_history || []), snapshot];
}

// --- Propostas comerciais (múltiplas por GDM, nunca excluídas) ---

// Formatos aceitos para anexos de propostas comerciais
export const ACCEPTED_PROPOSAL_EXTENSIONS = ['pdf', 'xlsx', 'xls'];
export const ACCEPTED_PROPOSAL_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

export function validateProposalFile(file) {
  if (!file) return { ok: false, error: 'Nenhum arquivo selecionado.' };
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const okExt = ACCEPTED_PROPOSAL_EXTENSIONS.includes(ext);
  const okMime = !file.type || ACCEPTED_PROPOSAL_MIME.includes(file.type);
  if (!okExt || !okMime) {
    return { ok: false, error: 'Formato inválido. Apenas arquivos PDF, XLSX ou XLS são aceitos.' };
  }
  return { ok: true };
}

export function fileNameFromUrl(url) {
  if (!url) return '';
  try {
    const decoded = decodeURIComponent(url);
    const parts = decoded.split('?')[0].split('/');
    return parts[parts.length - 1] || url;
  } catch {
    return (url.split('/').pop()) || url;
  }
}

// ============================================================================
// Numeração de GDM — sequencial por embarcação, reiniciando a cada ano.
// Formato: GDM-NNN/YYYY (ex.: GDM-001/2026).
// ============================================================================

// Extrai o sequencial e o ano de um número de GDM no formato GDM-NNN/YYYY.
// Retorna { seq, year } ou null quando o número não segue o padrão.
export function parseGdmNumber(gdmNumber) {
  if (!gdmNumber) return null;
  const match = String(gdmNumber).match(/^GDM-(\d{1,4})\/(\d{4})$/i);
  if (!match) return null;
  return { seq: parseInt(match[1], 10), year: parseInt(match[2], 10) };
}

// Calcula o próximo número de GDM para uma embarcação no ano informado,
// considerando as GDMs já existentes dessa embarcação.
export function nextGdmNumberForVessel(existingGdmsForVessel, year = new Date().getFullYear()) {
  let maxSeq = 0;
  (existingGdmsForVessel || []).forEach((g) => {
    const parsed = parseGdmNumber(g?.gdm_number);
    if (parsed && parsed.year === year && parsed.seq > maxSeq) {
      maxSeq = parsed.seq;
    }
  });
  const seq = maxSeq + 1;
  const seqStr = String(seq).padStart(3, '0');
  return `GDM-${seqStr}/${year}`;
}

// Adiciona uma nova proposta ao histórico (append-only, nada é removido)
export function addProposal(gdm, proposal) {
  const entry = {
    supplier_name: proposal.supplier_name || gdm?.supplier_name || '',
    quote_value: proposal.quote_value,
    proposal_date: proposal.proposal_date || new Date().toISOString(),
    registered_by: proposal.registered_by,
    file_url: proposal.file_url || '',
    technical_report_url: proposal.technical_report_url || '',
    notes: proposal.notes || '',
  };
  return [...(gdm?.proposals || []), entry];
}