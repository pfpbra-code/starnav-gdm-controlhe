import React from 'react';
import ItemActionDialog from './ItemActionDialog';
import SupplierFlowActionDialog from './SupplierFlowActionDialog';
import { SUPPLIER_FLOW_ACTIONS } from '@/lib/gdmItems';

/**
 * Roteador de diálogos de ação de item: ações do ciclo de fornecedor usam o
 * diálogo dedicado; as demais usam o diálogo padrão. Garante que TODOS os
 * módulos executem as ações pelo mesmo caminho (gdmItemAction).
 */
export default function ItemActionRouter({ pending, onClose }) {
  const isSupplierFlow =
    pending && SUPPLIER_FLOW_ACTIONS.includes(pending.action);
  return isSupplierFlow ? (
    <SupplierFlowActionDialog pending={pending} onClose={onClose} />
  ) : (
    <ItemActionDialog pending={pending} onClose={onClose} />
  );
}