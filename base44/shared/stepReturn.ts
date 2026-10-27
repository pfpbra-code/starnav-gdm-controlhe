// Retorno de etapas (correção de fluxo) — fonte única do backend.
// Espelha previousStatusFor / itemSectorOfStatus de src/lib/gdmItems.js.
// Alterações aqui devem ser refletidas lá.

/** Etapas válidas de cada fluxo, na ordem em que ocorrem. */
export const FLOW_BY_DESTINATION: Record<string, string[]> = {
  repair: [
    'pending_coordinator',
    'awaiting_supplier_definition',
    'awaiting_shipping_proof',
    'sent_to_supplier',
    'awaiting_maintenance_authorization',
    'awaiting_pwt',
    'awaiting_oc_issuance',
    'awaiting_oc_approval',
    'awaiting_return',
    'completed',
  ],
  certification: [
    'pending_coordinator',
    'awaiting_supplier_definition',
    'awaiting_shipping_proof',
    'sent_to_supplier',
    'awaiting_maintenance_authorization',
    'awaiting_oc_issuance',
    'awaiting_oc_approval',
    'awaiting_return',
    'awaiting_certificate',
    'awaiting_validity_registration',
    'completed',
  ],
  stock_return: ['pending_coordinator', 'received', 'completed'],
  discard: [
    'pending_coordinator',
    'pending_maintenance_authorization',
    'awaiting_discard_confirmation',
    'completed',
  ],
};

/** Etapas do item na ordem do fluxo (inclui a chegada física de GDMs "Não Recebido"). */
export function flowStatusesOf(item: any): string[] {
  const base = FLOW_BY_DESTINATION[item?.destination] || FLOW_BY_DESTINATION.repair;
  if (item?.receipt_situation === 'not_received') {
    return [base[0], 'awaiting_receipt', ...base.slice(1)];
  }
  return [...base];
}

/** Etapa imediatamente anterior do fluxo; null quando o item está na primeira etapa. */
export function previousStatusOf(item: any): string | null {
  if (!item) return null;
  if (['pending_coordinator', 'rejected', 'cancelled'].includes(item.status)) return null;

  if (item.destination === 'stock_return') {
    if (item.status === 'received') return 'pending_coordinator';
    if (item.status === 'completed') return 'received';
    return null;
  }
  if (item.destination === 'discard') {
    const map: Record<string, string> = {
      pending_maintenance_authorization: 'pending_coordinator',
      awaiting_discard_confirmation: 'pending_maintenance_authorization',
      discard_approved: 'awaiting_maintenance_authorization',
      completed: 'awaiting_discard_confirmation',
    };
    return map[item.status] || null;
  }

  // Reparo / calibração (ciclo de fornecedor)
  if (item.status === 'awaiting_receipt') return 'pending_coordinator';
  if (['pending_services', 'awaiting_supplier_definition'].includes(item.status)) {
    return item.receipt_situation === 'not_received' ? 'awaiting_receipt' : 'pending_coordinator';
  }
  const map: Record<string, string> = {
    return_confirmed: 'awaiting_supplier_return',
    awaiting_shipping_proof: 'awaiting_supplier_definition',
    sent_to_supplier: 'awaiting_shipping_proof',
    awaiting_maintenance_authorization: 'sent_to_supplier',
    discount_negotiation: 'awaiting_maintenance_authorization',
    repair_approved: 'awaiting_maintenance_authorization',
    in_treatment: 'awaiting_maintenance_authorization',
    awaiting_pwt: 'awaiting_maintenance_authorization',
    awaiting_oc_issuance: item.destination === 'certification' ? 'awaiting_maintenance_authorization' : 'awaiting_pwt',
    awaiting_oc_approval: 'awaiting_oc_issuance',
    awaiting_return: 'awaiting_oc_approval',
    awaiting_supplier_return: 'awaiting_maintenance_authorization',
    awaiting_certificate: 'awaiting_return',
    awaiting_validity_registration: 'awaiting_certificate',
    completed: item.destination === 'certification' ? 'awaiting_validity_registration' : 'awaiting_return',
  };
  return map[item.status] || null;
}

/** Setor responsável por cada etapa do fluxo. */
export const SECTOR_OF_STATUS: Record<string, string> = {
  pending_coordinator: 'coordinator',
  awaiting_receipt: 'almoxarifado',
  received: 'almoxarifado',
  awaiting_shipping_proof: 'almoxarifado',
  awaiting_discard_confirmation: 'almoxarifado',
  awaiting_supplier_definition: 'services',
  pending_services: 'services',
  sent_to_supplier: 'services',
  discount_negotiation: 'services',
  return_confirmed: 'services',
  awaiting_supplier_return: 'services',
  awaiting_pwt: 'planejamento',
  awaiting_oc_issuance: 'services',
  awaiting_oc_approval: 'services',
  awaiting_return: 'services',
  awaiting_certificate: 'operations',
  awaiting_validity_registration: 'operations',
  in_treatment: 'services',
  completed: 'services',
  discard_approved: 'maintenance',
};

export function sectorOfStatus(status: string, destination: string): string {
  if (status === 'pending_maintenance_authorization') {
    return destination === 'certification' ? 'operations' : 'maintenance';
  }
  return SECTOR_OF_STATUS[status] || 'services';
}

/** Rótulos das etapas para mensagens de notificação. */
export const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  pending_coordinator: 'Aguardando Aprovação do Coordenador',
  approved: 'Aprovado',
  rejected: 'Reprovado',
  cancelled: 'Cancelado',
  awaiting_receipt: 'Aguardando Recebimento',
  received: 'Recebido pelo Almoxarifado',
  awaiting_supplier_definition: 'Aguardando Definição de Fornecedor',
  pending_services: 'Aguardando Definição de Fornecedor',
  awaiting_shipping_proof: 'Aguardando Comprovante de Envio',
  sent_to_supplier: 'Equipamento Enviado ao Fornecedor',
  in_treatment: 'Em Reparo',
  awaiting_return: 'Aguardando Retorno do Equipamento',
  awaiting_supplier_return: 'Aguardando Retorno do Fornecedor',
  return_confirmed: 'Retorno Confirmado',
  awaiting_certificate: 'Aguardando Certificado (Operações)',
  awaiting_validity_registration: 'Aguardando Cadastro da Validade',
  pending_maintenance_authorization: 'Aguardando Aprovação da Manutenção',
  repair_approved: 'Reparo Aprovado',
  awaiting_pwt: 'Aguardando PWT (Planejamento)',
  awaiting_oc_issuance: 'Aguardando Emissão da OC (Serviços)',
  awaiting_oc_approval: 'Aguardando Aprovação da OC',
  discount_negotiation: 'Negociação de Desconto',
  awaiting_discard_confirmation: 'Aguardando Confirmação do Descarte',
  discard_approved: 'Descarte Aprovado',
  completed: 'Finalizado',
};