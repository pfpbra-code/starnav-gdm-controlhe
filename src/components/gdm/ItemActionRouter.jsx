import React from 'react';
import ItemActionDialog from './ItemActionDialog';
import SupplierFlowActionDialog from './SupplierFlowActionDialog';
import DiscardConfirmDialog from './DiscardConfirmDialog';
import { SUPPLIER_FLOW_ACTIONS } from '@/lib/gdmItems';

// A confirmação do descarte tem diálogo próprio (data, responsável e anexos).
const DISCARD_FLOW_ACTIONS = ['confirm_discard'];

/**
 * Roteador de diálogos de ação de item: ações do ciclo de fornecedor usam o
 * diálogo dedicado; a confirmação de descarte usa o diálogo de comprovação;
 * as demais usam o diálogo padrão. Garante que TODOS os módulos executem as
 * ações pelo mesmo caminho (gdmItemAction).
 */
export default function ItemActionRouter({ pending, onClose }) {
  const isSupplierFlow =
    pending && SUPPLIER_FLOW_ACTIONS.includes(pending.action);
  const isDiscardFlow =
    pending && DISCARD_FLOW_ACTIONS.includes(pending.action);
  if (isSupplierFlow) {
    return <SupplierFlowActionDialog pending={pending} onClose={onClose} />;
  }
  if (isDiscardFlow) {
    return <DiscardConfirmDialog pending={pending} onClose={onClose} />;
  }
  return <ItemActionDialog pending={pending} onClose={onClose} />;
}