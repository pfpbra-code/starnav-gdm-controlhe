// Central GDM workflow definitions: statuses, steps, roles and history builder.
// Used by GDMDetail, SupplierGDMs, GDMList and StatusBadge to keep the flow consistent.

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
  supplier_user: 'Fornecedor',
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