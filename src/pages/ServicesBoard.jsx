import React from 'react';
import PendingBoard from '@/components/gdm/PendingBoard';

// Pendências exclusivas do setor de Serviços, por categoria.
// Cada item sai da pendência assim que a ação é concluída e permanece no histórico.
const CATEGORIES = [
  {
    key: 'supplier',
    label: 'Seleção de Fornecedor (após recebimento do Almoxarifado)',
    match: (i) => ['awaiting_supplier_definition', 'pending_services', 'return_confirmed'].includes(i.status),
  },
  {
    key: 'quote',
    label: 'Aguardando Cotação do Fornecedor',
    match: (i) => i.status === 'sent_to_supplier',
  },
  {
    key: 'negotiation',
    label: 'Negociação de Desconto',
    match: (i) => i.status === 'discount_negotiation',
  },
  {
    key: 'pwt',
    label: 'GDMs Aguardando PWT (emissão pelo Planejamento)',
    match: (i) => i.status === 'awaiting_pwt',
  },
  {
    key: 'oc',
    label: 'GDMs Aguardando Emissão da OC',
    match: (i) => i.status === 'awaiting_oc_issuance',
  },
  {
    key: 'oc_approval',
    label: 'GDMs Aguardando Aprovação e Envio da OC ao Fornecedor',
    match: (i) => i.status === 'awaiting_oc_approval',
  },
  {
    key: 'dispatch',
    label: 'Registrar Saída para Entrega',
    match: (i) => i.status === 'awaiting_return' && !i.return_dispatched_at,
  },
  {
    key: 'return',
    label: 'GDMs Aguardando Retorno do Fornecedor',
    match: (i) => ['awaiting_return', 'in_treatment'].includes(i.status),
  },
];

/** Aba Serviços: somente GDMs e itens que aguardam ação do setor. */
export default function ServicesBoard() {
  return (
    <PendingBoard
      title="Serviços"
      description="GDMs e itens que aguardam ação do setor de Serviços"
      emptyMessage="Nenhuma pendência para o setor de Serviços"
      categories={CATEGORIES}
      showDeadlineAlerts
    />
  );
}