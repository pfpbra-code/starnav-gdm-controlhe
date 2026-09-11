import React from 'react';
import PendingBoard from '@/components/gdm/PendingBoard';

// Pendências exclusivas do Almoxarifado, por categoria.
// A ação tomada retira o item da pendência ativa, sem excluir dados da GDM.
const CATEGORIES = [
  {
    key: 'receipt',
    label: 'Recebimento Inicial de Materiais Desembarcados',
    match: (i) => i.status === 'pending_almoxarifado',
  },
  {
    key: 'shipping',
    label: 'Comprovante de Envio ao Fornecedor (NF + Foto)',
    match: (i) => i.status === 'awaiting_shipping_proof',
  },
  {
    key: 'supplier_return',
    label: 'Recebimento de Material Retornado do Fornecedor',
    match: (i) => i.status === 'awaiting_supplier_return' && !!i.return_nf_url,
  },
  {
    key: 'return_receipt',
    label: 'Recebimento Final do Material Retornado (NF + Laudo)',
    match: (i) => i.status === 'awaiting_return' && !!i.return_dispatched_at,
  },
  {
    key: 'stock',
    label: 'Confirmação de Devolução ao Estoque',
    match: (i) => i.destination === 'stock_return' && i.status === 'received',
  },
  {
    key: 'discard',
    label: 'Confirmação Final de Descarte',
    match: (i) => i.status === 'awaiting_discard_confirmation',
  },
];

/** Aba Almoxarifado: somente GDMs e itens que aguardam ação do setor. */
export default function AlmoxarifadoBoard() {
  return (
    <PendingBoard
      title="Almoxarifado"
      description="GDMs e itens que aguardam ação do Almoxarifado"
      emptyMessage="Nenhuma pendência para o Almoxarifado"
      categories={CATEGORIES}
    />
  );
}