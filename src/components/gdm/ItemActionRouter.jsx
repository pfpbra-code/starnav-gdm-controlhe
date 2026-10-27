import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import ItemActionDialog from './ItemActionDialog';
import ReturnStepDialog from './ReturnStepDialog';
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
// O retorno de etapa (correção de fluxo) tem diálogo próprio com justificativa.
const RETURN_STEP_ACTIONS = ['return_step'];

/**
 * Roteador de diálogos de ação de item: ações do ciclo de fornecedor usam o
 * diálogo dedicado; a confirmação de descarte usa o diálogo de comprovação;
 * as demais usam o diálogo padrão. Garante que TODOS os módulos executem as
 * ações pelo mesmo caminho (gdmItemAction).
 */
export default function ItemActionRouter({ pending, onClose }) {
  // Item atualizado usado quando o Serviços solicita a NF logo após definir o
  // fornecedor: o formulário precisa do item com o supplier_id já registrado.
  const [nfItem, setNfItem] = useState(null);

  const handleRequestNf = async (item) => {
    const fresh = await base44.entities.GDMItem.get(item.id);
    setNfItem(fresh);
  };

  const isSupplierFlow =
    pending && SUPPLIER_FLOW_ACTIONS.includes(pending.action);
  const isDiscardFlow =
    pending && DISCARD_FLOW_ACTIONS.includes(pending.action);
  const isCertificateFlow =
    pending && CERTIFICATE_FLOW_ACTIONS.includes(pending.action);
  const isNfFlow =
    pending && NF_FLOW_ACTIONS.includes(pending.action);
  const isReturnStep =
    pending && RETURN_STEP_ACTIONS.includes(pending.action);
  if (nfItem) {
    return (
      <NfRequestDialog
        item={nfItem}
        onClose={() => {
          setNfItem(null);
          onClose();
        }}
      />
    );
  }
  if (isNfFlow) {
    return <NfRequestDialog item={pending.item} onClose={onClose} />;
  }
  if (isReturnStep) {
    return <ReturnStepDialog pending={pending} onClose={onClose} />;
  }
  if (isCertificateFlow) {
    return <RegisterCertificateDialog item={pending.item} onClose={onClose} />;
  }
  if (isSupplierFlow) {
    return (
      <SupplierFlowActionDialog
        pending={pending}
        onClose={onClose}
        onRequestNf={handleRequestNf}
      />
    );
  }
  if (isDiscardFlow) {
    return <DiscardConfirmDialog pending={pending} onClose={onClose} />;
  }
  return <ItemActionDialog pending={pending} onClose={onClose} />;
}