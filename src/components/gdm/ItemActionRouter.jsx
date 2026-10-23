import React from 'react';
import ItemActionDialog from './ItemActionDialog';
import SupplierFlowActionDialog from './SupplierFlowActionDialog';
import DiscardConfirmDialog from './DiscardConfirmDialog';
import RegisterCertificateDialog from '@/components/certifications/RegisterCertificateDialog';
import NfRequestDialog from '@/components/nf/NfRequestDialog';
import { SUPPLIER_FLOW_ACTIONS } from '@/lib/gdmItems';

// A confirmação do descarte tem diálogo próprio (data, responsável e anexos).
const DISCARD_FLOW_ACTIONS = ['confirm_discard'];
// O registro do certificado de calibração tem diálogo próprio (anexos + validade).
const CERTIFICATE_FLOW_ACTIONS = ['register_certificate'];
// A solicitação de NF de envio tem formulário próprio, auto-preenchido e auditável.
const NF_FLOW_ACTIONS = ['request_nf'];

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
  const isCertificateFlow =
    pending && CERTIFICATE_FLOW_ACTIONS.includes(pending.action);
  const isNfFlow =
    pending && NF_FLOW_ACTIONS.includes(pending.action);
  if (isNfFlow) {
    return <NfRequestDialog item={pending.item} onClose={onClose} />;
  }
  if (isCertificateFlow) {
    return <RegisterCertificateDialog item={pending.item} onClose={onClose} />;
  }
  if (isSupplierFlow) {
    return <SupplierFlowActionDialog pending={pending} onClose={onClose} />;
  }
  if (isDiscardFlow) {
    return <DiscardConfirmDialog pending={pending} onClose={onClose} />;
  }
  return <ItemActionDialog pending={pending} onClose={onClose} />;
}