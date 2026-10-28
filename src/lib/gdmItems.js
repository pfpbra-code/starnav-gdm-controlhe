// Itens da GDM: cada item tem destino, situação, OS, série e histórico próprios.
// Fonte única de verdade dos rótulos e das ações disponíveis por item.

export const ITEM_DESTINATION_LABELS = {
  repair: "Reparo",
  certification: "Calibração",
  stock_return: "Retorno ao Estoque",
  discard: "Descarte",
};

export const ITEM_DESTINATION_OPTIONS = Object.entries(ITEM_DESTINATION_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const ITEM_STATUS_LABELS = {
  draft: "Rascunho",
  pending_coordinator: "Aguardando Aprovação do Coordenador",
  approved: "Aprovado",
  rejected: "Reprovado",
  cancelled: "Cancelado",
  awaiting_receipt: "Aguardando Recebimento",
  received: "Recebido pelo Almoxarifado",
  awaiting_supplier_definition: "Aguardando Definição de Fornecedor",
  awaiting_shipping_proof: "Aguardando Comprovante de Envio",
  sent_to_supplier: "Equipamento Enviado ao Fornecedor",
  in_treatment: "Em Reparo",
  awaiting_return: "Aguardando Retorno do Equipamento",
  awaiting_supplier_return: "Aguardando Retorno do Fornecedor",
  return_confirmed: "Retorno Confirmado",
  awaiting_certificate: "Aguardando Certificado (Operações)",
  awaiting_validity_registration: "Aguardando Cadastro da Validade",
  pending_maintenance_authorization: "Aguardando Aprovação da Manutenção",
  awaiting_maintenance_authorization: "Aguardando Aprovação da Manutenção",
  awaiting_services_analysis: "Aguardando Análise de Serviços",
  repair_approved: "Reparo Aprovado",
  awaiting_pwt: "Aguardando Emissão de PWT (Planejamento)",
  awaiting_oc_issuance: "Aguardando Emissão da OC (Serviços)",
  awaiting_oc_approval: "Aguardando Aprovação da OC",
  awaiting_discount: "Aguardando Desconto (Fornecedor)",
  discount_negotiation: "Aguardando Desconto (Fornecedor)",
  awaiting_discard_confirmation: "Aguardando Confirmação do Descarte",
  discard_approved: "Descarte Aprovado",
  completed: "Finalizado",
};

export const ITEM_STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-700",
  pending_coordinator: "bg-amber-100 text-amber-800",
  approved: "bg-sky-100 text-sky-800",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-slate-200 text-slate-600",
  awaiting_receipt: "bg-amber-100 text-amber-800",
  received: "bg-sky-100 text-sky-800",
  awaiting_supplier_definition: "bg-indigo-100 text-indigo-800",
  awaiting_shipping_proof: "bg-orange-100 text-orange-800",
  sent_to_supplier: "bg-indigo-100 text-indigo-800",
  in_treatment: "bg-blue-100 text-blue-800",
  awaiting_return: "bg-blue-100 text-blue-800",
  awaiting_supplier_return: "bg-purple-100 text-purple-800",
  return_confirmed: "bg-teal-100 text-teal-800",
  awaiting_certificate: "bg-orange-100 text-orange-800",
  awaiting_validity_registration: "bg-amber-100 text-amber-800",
  pending_maintenance_authorization: "bg-orange-100 text-orange-800",
  awaiting_maintenance_authorization: "bg-orange-100 text-orange-800",
  awaiting_services_analysis: "bg-amber-100 text-amber-800",
  repair_approved: "bg-emerald-100 text-emerald-800",
  awaiting_pwt: "bg-cyan-100 text-cyan-800",
  awaiting_oc_issuance: "bg-indigo-100 text-indigo-800",
  awaiting_oc_approval: "bg-orange-100 text-orange-800",
  awaiting_discount: "bg-violet-100 text-violet-800",
  discount_negotiation: "bg-violet-100 text-violet-800",
  awaiting_discard_confirmation: "bg-orange-100 text-orange-800",
  discard_approved: "bg-slate-200 text-slate-600",
  completed: "bg-green-100 text-green-800",
};

// Rótulo de situação exibido nos cards: GDM aberta como "Não Recebido" na
// etapa da Coordenação representa validação do desembarque, não aprovação.
export function getItemStatusLabel(item) {
  if (!item) return "";
  if (item.status === "pending_coordinator" && item.receipt_situation === "not_received") {
    return "Aguardando Confirmação de Desembarque";
  }
  return ITEM_STATUS_LABELS[item.status] || item.status;
}

export const ITEM_ACTION_LABELS = {
  approve: "Tratativa Confirmada pelo Coordenador",
  reject: "Reprovado pelo Coordenador",
  confirm_receipt: "Chegada do Equipamento Confirmada (Almoxarifado)",
  confirm_stock_return: "Devolução ao Estoque Confirmada",
  authorize_discard: "Descarte Autorizado pelo Gestor",
  confirm_discard: "Descarte Confirmado pelo Almoxarifado",
  select_supplier: "Fornecedor Definido (Serviços)",
  attach_shipping_proof: "Comprovante de Envio Anexado (Almoxarifado)",
  attach_quote: "Cotação Anexada (Serviços)",
  maintenance_decision: "Análise Técnica da Cotação (Manutenção)",
  services_discount_decision: "Análise de Desconto (Serviços)",
  renegotiate_quote: "Nova Proposta Registrada (Serviços)",
  register_supplier_return: "NF de Retorno e Comprovante Registrados (Serviços)",
  confirm_supplier_return: "Retorno do Fornecedor Confirmado (Almoxarifado)",
  start_repair: "Reparo Iniciado no Fornecedor",
  issue_pwt: "PWT Emitido (Planejamento)",
  issue_oc: "OC Emitida (Serviços)",
  confirm_oc_approved: "OC Aprovada e Enviada ao Fornecedor (Serviços)",
  set_return_deadline: "Previsão de Retorno Definida/Alterada (Serviços)",
  issue_ot: "OT Emitida (Serviços)",
  close_ot: "OT Fechada (Almoxarifado)",
  request_nf: "Solicitação de Emissão de NF (Serviços)",
  update_nf_request: "Solicitação de NF Alterada (Serviços)",
  resend_nf_request: "Solicitação de NF Reenviada (Serviços)",
  register_return_dispatch: "Saída para Entrega Registrada (Serviços)",
  confirm_return_receipt: "Recebimento do Retorno Confirmado (Almoxarifado)",
  register_certificate: "Certificado Registrado (Operações)",
  update_warranty: "Garantia Alterada (Serviços)",
  complete: "Item Finalizado",
  cancel: "Item Cancelado",
  advance_treatment: "Avanço da Tratativa",
  created: "Item Criado",
  return_step: "Retorno de Etapa (Correção de Fluxo)",
};

// Situações padronizadas da OT (Ordem de Trabalho) do item.
export const OT_STATUS_LABELS = {
  open: "OT Aberta",
  in_service: "Em Serviço",
  awaiting_close: "Recebido - Aguardando Fechamento da OT",
  closed: "OT Fechada",
};

export const OT_STATUS_COLORS = {
  open: "bg-amber-100 text-amber-800",
  in_service: "bg-sky-100 text-sky-800",
  awaiting_close: "bg-orange-100 text-orange-800",
  closed: "bg-green-100 text-green-800",
};

// Situações do item em que a OT pode ser emitida por Serviços: equipamento já
// enviado ao fornecedor e ainda não recebido de volta.
// Situações em que o item tem fornecedor definido e ainda está no ciclo de
// envio/retorno — janela para solicitar a NF de envio ao fornecedor.
const NF_REQUEST_STATUSES = [
  "awaiting_shipping_proof",
  "sent_to_supplier",
  "awaiting_maintenance_authorization",
  "awaiting_services_analysis",
  "awaiting_discount",
  "discount_negotiation",
  "repair_approved",
  "in_treatment",
  "awaiting_pwt",
  "awaiting_oc_issuance",
  "awaiting_oc_approval",
  "awaiting_return",
  "awaiting_supplier_return",
];

const OT_ISSUE_STATUSES = [
  "sent_to_supplier",
  "awaiting_maintenance_authorization",
  "awaiting_services_analysis",
  "awaiting_discount",
  "discount_negotiation",
  "repair_approved",
  "in_treatment",
  "awaiting_pwt",
  "awaiting_oc_issuance",
  "awaiting_oc_approval",
  "awaiting_return",
  "awaiting_supplier_return",
];

/**
 * Ações disponíveis para um item, considerando destino, situação e permissões.
 * `can` é a função hasPermission já aplicada ao usuário: (key) => boolean.
 * `user` e `responsibleVesselIds` (opcional, Set de IDs das embarcações em que
 * o usuário é responsável por setor) habilitam as ações da etapa de confirmação
 * do desembarque.
 */
export function availableItemActions(item, can, user, responsibleVesselIds) {
  if (!item) return [];
  const s = item.status;
  const d = item.destination;
  const actions = [];

  if (s === "pending_coordinator" && can("approve_gdm")) {
    actions.push({
      action: "approve",
      // GDM "Não Recebido": a Coordenação valida o desembarque e informa a
      // nova previsão; GDM normal: confirmação padrão da tratativa.
      label:
        item.receipt_situation === "not_received"
          ? "Confirmar Desembarque"
          : "Confirmar Tratativa",
      ...(item.receipt_situation === "not_received" ? { askDate: true } : {}),
    });
  }

  // GDM aberta como "Não Recebido": tratativa já validada pela Coordenação —
  // o item aguarda apenas a chegada física, sem retornar ao Coordenador.
  if (s === "awaiting_receipt" && can("confirm_receipt")) {
    actions.push({ action: "confirm_receipt", label: "Confirmar Recebimento" });
  }

  if (d === "stock_return" && s === "received" && can("confirm_receipt")) {
    actions.push({
      action: "confirm_stock_return",
      label: "Confirmar devolução ao estoque",
      askReturnNumber: true,
    });
  }

  if (d === "discard" && s === "pending_maintenance_authorization" && can("approve_maintenance")) {
    actions.push({ action: "authorize_discard", label: "Autorizar descarte" });
  }

  if (
    d === "discard" &&
    s === "awaiting_discard_confirmation" &&
    (can("confirm_receipt") || can("confirm_disposal"))
  ) {
    actions.push({ action: "confirm_discard", label: "Confirmar descarte realizado" });
  }

  // CICLO DE FORNECEDOR (reparo / calibração) — um fluxo único para todos os módulos.
  if (["repair", "certification"].includes(d)) {
    if (
      ["awaiting_supplier_definition", "pending_services", "return_confirmed"].includes(s) &&
      can("send_to_supplier")
    ) {
      actions.push({
        action: "select_supplier",
        label: s === "return_confirmed" ? "Definir novo fornecedor" : "Definir fornecedor",
      });
    }

    if (s === "awaiting_shipping_proof" && can("confirm_receipt")) {
      actions.push({ action: "attach_shipping_proof", label: "Anexar comprovante de envio" });
    }

    // Solicitação de NF de envio: disponível para Serviços enquanto o item tem
    // fornecedor definido e está no ciclo de envio/retorno.
    if (item.supplier_id && NF_REQUEST_STATUSES.includes(s) && can("send_to_supplier")) {
      actions.push({ action: "request_nf", label: "Solicitar NF" });
    }

    if (s === "sent_to_supplier" && can("send_to_supplier")) {
      actions.push({ action: "attach_quote", label: "Anexar cotação" });
    }

    if (s === "awaiting_maintenance_authorization") {
      const approvePerm = d === "certification" ? "approve_operations_quote" : "approve_maintenance";
      if (can(approvePerm)) {
        actions.push({ action: "maintenance_decision", label: "Analisar cotação" });
      }
    }

    // Cotação aprovada pela Manutenção: Serviços decide se solicita desconto
    // ao fornecedor ou segue direto para a emissão da OC.
    if (s === "awaiting_services_analysis" && can("send_to_supplier")) {
      actions.push({
        action: "services_discount_decision",
        label: "Solicitar desconto ou emitir OC",
      });
    }

    if (["awaiting_discount", "discount_negotiation"].includes(s) && can("send_to_supplier")) {
      actions.push({ action: "renegotiate_quote", label: "Registrar nova proposta" });
    }

    if (s === "awaiting_supplier_return") {
      if (!item.return_nf_url && can("send_to_supplier")) {
        actions.push({ action: "register_supplier_return", label: "Registrar NF de retorno" });
      }
      if (item.return_nf_url && can("confirm_receipt")) {
        actions.push({ action: "confirm_supplier_return", label: "Confirmar recebimento do retorno" });
      }
    }

    // Etapas pós-aprovação da cotação: PWT (reparo, emitido pelo Planejamento),
    // OC e aprovação/envio da OC (Serviços).
    if (s === "awaiting_pwt" && can("issue_pwt")) {
      actions.push({ action: "issue_pwt", label: "Emitir PWT" });
    }

    if (s === "awaiting_oc_issuance" && can("issue_oc")) {
      actions.push({ action: "issue_oc", label: "Emitir OC" });
    }

    if (s === "awaiting_oc_approval" && can("approve_oc")) {
      actions.push({
        action: "confirm_oc_approved",
        label: "OC aprovada e enviada ao fornecedor",
      });
    }

    // Previsão de retorno (Serviços): registrada/alterada exclusivamente após
    // a emissão da OC — nunca na criação, na definição do fornecedor ou no envio.
    if (
      item.oc_number &&
      ["awaiting_oc_approval", "awaiting_return", "in_treatment", "awaiting_supplier_return"].includes(s) &&
      can("send_to_supplier")
    ) {
      actions.push({
        action: "set_return_deadline",
        label: item.expected_return_date
          ? "Alterar previsão de retorno"
          : "Definir previsão de retorno",
      });
    }

    // OT (Ordem de Trabalho): emitida por Serviços após o envio ao fornecedor;
    // fechada pelo Almoxarifado após o recebimento do equipamento retornado.
    if (!item.ot_number && OT_ISSUE_STATUSES.includes(s) && can("send_to_supplier")) {
      actions.push({ action: "issue_ot", label: "Emitir OT" });
    }
    if (
      item.ot_number &&
      item.ot_status !== "closed" &&
      item.return_received_at &&
      can("confirm_receipt")
    ) {
      actions.push({ action: "close_ot", label: "Fechar OT" });
    }

    if (s === "awaiting_return") {
      if (!item.return_dispatched_at && can("send_to_supplier")) {
        actions.push({
          action: "register_return_dispatch",
          label: "Registrar saída para entrega",
        });
      }
      if (can("confirm_receipt")) {
        actions.push({
          action: "confirm_return_receipt",
          label: "Receber retorno (NF + laudo)",
        });
      }
    }

    // Itens aprovados antes das etapas de PWT/OC (fluxo antigo) seguem direto
    // para a emissão do PWT (reparo) ou da OC (calibração).
    if (s === "repair_approved") {
      if (d === "repair" && can("issue_pwt")) {
        actions.push({ action: "issue_pwt", label: "Emitir PWT" });
      }
      if (can("edit_gdm")) {
        actions.push({ action: "start_repair", label: "Iniciar reparo" });
      }
    }

    if (s === "in_treatment" && can("confirm_return")) {
      actions.push({ action: "complete", label: "Finalizar item" });
    }

    // Certificado da calibração/certificação: anexo e validade (Operações).
    if (
      d === "certification" &&
      ["awaiting_certificate", "awaiting_validity_registration"].includes(s) &&
      can("approve_operations_quote")
    ) {
      actions.push({ action: "register_certificate", label: "Registrar certificado" });
    }
  }

  // RETORNO DE ETAPA (correção de fluxo): devolve o item à etapa imediatamente
  // anterior, com justificativa obrigatória e auditoria completa. Exclusivo
  // de usuários autorizados pelo ADM (permissão individual "allow_step_return").
  // Processos concluídos e OTs encerradas: apenas o Administrador.
  if (can("allow_step_return") && previousStatusFor(item)) {
    const closedProcess = ["completed", "discard_approved"].includes(s);
    const otClosed = item.ot_status === "closed";
    if ((!closedProcess && !otClosed) || user?.role === "admin") {
      actions.push({ action: "return_step", label: "Retornar Etapa", destructive: true });
    }
  }

  return actions;
}

export const ITEM_DESTINATION_COLORS = {
  repair: "bg-blue-100 text-blue-800 border-blue-200",
  certification: "bg-purple-100 text-purple-800 border-purple-200",
  stock_return: "bg-green-100 text-green-800 border-green-200",
  discard: "bg-red-100 text-red-700 border-red-200",
};

/**
 * Etapa imediatamente anterior do fluxo do item (null na primeira etapa).
 * Espelha previousStatusOf de base44/shared/stepReturn.ts — alterações
 * devem ser refletidas nos dois arquivos.
 */
export function previousStatusFor(item) {
  if (!item) return null;
  if (["pending_coordinator", "rejected", "cancelled"].includes(item.status)) return null;

  if (item.destination === "stock_return") {
    if (item.status === "received") return "pending_coordinator";
    if (item.status === "completed") return "received";
    return null;
  }
  if (item.destination === "discard") {
    const map = {
      pending_maintenance_authorization: "pending_coordinator",
      awaiting_discard_confirmation: "pending_maintenance_authorization",
      discard_approved: "awaiting_maintenance_authorization",
      completed: "awaiting_discard_confirmation",
    };
    return map[item.status] || null;
  }

  // Reparo / calibração (ciclo de fornecedor)
  if (item.status === "awaiting_receipt") return "pending_coordinator";
  if (["pending_services", "awaiting_supplier_definition"].includes(item.status)) {
    // Reparo: a definição do fornecedor só ocorre após o PWT do Planejamento.
    if (item.destination === "repair") return "awaiting_pwt";
    return item.receipt_situation === "not_received" ? "awaiting_receipt" : "pending_coordinator";
  }
  const map = {
    return_confirmed: "awaiting_supplier_return",
    awaiting_shipping_proof: "awaiting_supplier_definition",
    sent_to_supplier: "awaiting_shipping_proof",
    awaiting_maintenance_authorization: "sent_to_supplier",
    awaiting_services_analysis: "awaiting_maintenance_authorization",
    awaiting_discount: "awaiting_services_analysis",
    discount_negotiation: "awaiting_services_analysis",
    repair_approved: "awaiting_maintenance_authorization",
    in_treatment: "awaiting_maintenance_authorization",
    // PWT: novo fluxo (após validação da Coordenação + recebimento) ou legado
    // em andamento (cotação aprovada, aguardando PWT antes da OC).
    awaiting_pwt: item.supplier_id
      ? "awaiting_maintenance_authorization"
      : item.receipt_situation === "not_received"
        ? "awaiting_receipt"
        : "pending_coordinator",
    awaiting_oc_issuance: "awaiting_services_analysis",
    awaiting_oc_approval: "awaiting_oc_issuance",
    awaiting_return: "awaiting_oc_approval",
    awaiting_supplier_return: "awaiting_maintenance_authorization",
    awaiting_certificate: "awaiting_return",
    awaiting_validity_registration: "awaiting_certificate",
    completed:
      item.destination === "certification" ? "awaiting_validity_registration" : "awaiting_return",
  };
  return map[item.status] || null;
}

/** Setor responsável por cada etapa do fluxo (notificações e relatórios). */
export const SECTOR_OF_STATUS = {
  pending_coordinator: "coordinator",
  awaiting_receipt: "almoxarifado",
  received: "almoxarifado",
  awaiting_shipping_proof: "almoxarifado",
  awaiting_discard_confirmation: "almoxarifado",
  awaiting_supplier_definition: "services",
  pending_services: "services",
  sent_to_supplier: "services",
  awaiting_services_analysis: "services",
  awaiting_discount: "services",
  discount_negotiation: "services",
  return_confirmed: "services",
  awaiting_supplier_return: "services",
  awaiting_pwt: "planejamento",
  awaiting_oc_issuance: "services",
  awaiting_oc_approval: "services",
  awaiting_return: "services",
  awaiting_certificate: "operations",
  awaiting_validity_registration: "operations",
  in_treatment: "services",
  completed: "services",
  discard_approved: "maintenance",
};

export function itemSectorOfStatus(status, destination) {
  if (["pending_maintenance_authorization", "awaiting_maintenance_authorization"].includes(status)) {
    return destination === "certification" ? "operations" : "maintenance";
  }
  return SECTOR_OF_STATUS[status] || "services";
}

/** Responsável atual pelo item, conforme a situação. */
export function itemResponsible(item) {
  if (!item) return "—";
  switch (item.status) {
    case "pending_coordinator":
      return "Coordenador";
    case "awaiting_receipt":
    case "received":
    case "awaiting_discard_confirmation":
      return "Almoxarifado";
    case "awaiting_shipping_proof":
      return "Almoxarifado";
    case "awaiting_supplier_definition":
    case "pending_services":
    case "sent_to_supplier":
    case "awaiting_services_analysis":
    case "awaiting_discount":
    case "discount_negotiation":
    case "return_confirmed":
      return "Serviços";
    case "awaiting_pwt":
      return "Planejamento";
    case "awaiting_oc_issuance":
    case "awaiting_oc_approval":
      return "Serviços";
    case "awaiting_return":
      return item.return_dispatched_at ? "Almoxarifado" : "Serviços";
    case "awaiting_supplier_return":
      return item.return_nf_url ? "Almoxarifado" : "Serviços";
    case "pending_maintenance_authorization":
    case "awaiting_maintenance_authorization":
      return item.destination === "certification" ? "Operações" : "Gestor de Manutenção";
    case "repair_approved":
      return item.destination === "certification" ? "Serviços" : "Planejamento";
    case "in_treatment":
      return item.supplier_name || "Fornecedor";
    case "awaiting_certificate":
    case "awaiting_validity_registration":
      return "Operações";
    case "discard_approved":
    case "completed":
      return "Processo finalizado";
    case "rejected":
      return "Item reprovado";
    case "cancelled":
      return "Item cancelado";
    default:
      return "—";
  }
}

/** Resumo da situação geral da guia a partir dos itens. */
export function summarizeItems(items = []) {
  const total = items.length;
  const closedList = ["completed", "cancelled", "rejected", "discard_approved"];
  const completed = items.filter((i) => i.status === "completed").length;
  const pending = items.filter((i) => !closedList.includes(i.status)).length;
  const waiting = items.filter((i) => i.status === "pending_coordinator").length;
  const inProgress = Math.max(pending - waiting, 0);
  const byDestination = items.reduce((acc, i) => {
    acc[i.destination] = (acc[i.destination] || 0) + 1;
    return acc;
  }, {});
  let overall = "no_items";
  if (total > 0) {
    if (pending === 0) overall = "completed";
    else if (waiting > 0) overall = "pending_coordinator";
    else overall = "in_progress";
  }
  return { total, completed, pending, waiting, inProgress, byDestination, overall };
}

export const OVERALL_LABELS = {
  no_items: "Sem itens",
  completed: "Concluída",
  pending_coordinator: "Aguardando Aprovação",
  in_progress: "Em Andamento",
};

/** Etapas do fluxo, específicas de cada destino. */
const FLOW_BY_DESTINATION = {
  repair: [
    { status: "pending_coordinator", label: "Aprovação do Coordenador" },
    { status: "awaiting_pwt", label: "Emissão do PWT (Planejamento)" },
    { status: "awaiting_supplier_definition", label: "Definição do Fornecedor (Serviços)" },
    { status: "awaiting_shipping_proof", label: "Comprovante de Envio (Almoxarifado)" },
    { status: "sent_to_supplier", label: "Enviado — Aguardando Cotação (Serviços)" },
    { status: "awaiting_maintenance_authorization", label: "Aprovação da Manutenção" },
    { status: "awaiting_services_analysis", label: "Análise de Serviços (Desconto / OC)" },
    { status: "awaiting_oc_issuance", label: "Emissão da OC (Serviços)" },
    { status: "awaiting_oc_approval", label: "Aprovação e Envio da OC (Serviços)" },
    { status: "awaiting_return", label: "Aguardando Retorno do Fornecedor" },
    { status: "completed", label: "Finalizado" },
  ],
  certification: [
    { status: "pending_coordinator", label: "Aprovação do Coordenador" },
    { status: "awaiting_supplier_definition", label: "Definição do Fornecedor (Serviços)" },
    { status: "awaiting_shipping_proof", label: "Comprovante de Envio (Almoxarifado)" },
    { status: "sent_to_supplier", label: "Enviado — Aguardando Cotação (Serviços)" },
    { status: "awaiting_maintenance_authorization", label: "Aprovação da Operações" },
    { status: "awaiting_services_analysis", label: "Análise de Serviços (Desconto / OC)" },
    { status: "awaiting_oc_issuance", label: "Emissão da OC (Serviços)" },
    { status: "awaiting_oc_approval", label: "Aprovação e Envio da OC (Serviços)" },
    { status: "awaiting_return", label: "Aguardando Retorno do Fornecedor" },
    { status: "awaiting_certificate", label: "Certificado e Validade (Operações)" },
    { status: "completed", label: "Finalizado" },
  ],
  stock_return: [
    { status: "pending_coordinator", label: "Aprovação do Coordenador" },
    { status: "received", label: "Recebido pelo Almoxarifado" },
    { status: "completed", label: "Devolução confirmada / Finalizado" },
  ],
  discard: [
    { status: "pending_coordinator", label: "Aprovação do Coordenador" },
    { status: "pending_maintenance_authorization", label: "Autorização do Gestor de Manutenção" },
    { status: "awaiting_discard_confirmation", label: "Confirmação final do Almoxarifado" },
    { status: "completed", label: "Finalizado" },
  ],
};

// Estados que representam a mesma etapa do fluxo (legados ou ramificações
// que retornam a um ponto já exibido na linha do tempo).
const STATUS_ALIAS = {
  draft: "pending_coordinator",
  pending_services: "awaiting_supplier_definition",
  awaiting_discount: "awaiting_services_analysis",
  discount_negotiation: "awaiting_services_analysis",
  in_treatment: "awaiting_return",
  awaiting_supplier_return: "awaiting_shipping_proof",
  return_confirmed: "awaiting_supplier_definition",
  discard_approved: "completed",
};

/** Etapas do item com marcação de concluída / atual / futura. */
export function itemFlow(item) {
  if (!item) return [];
  const baseSteps = FLOW_BY_DESTINATION[item.destination] || FLOW_BY_DESTINATION.repair;
  // GDM aberta como "Não Recebido": após a validação do desembarque pela
  // Coordenação, o item passa pela chegada física (Almoxarifado) antes de
  // seguir para a etapa do destino. GDM "Recebida" segue direto, sem etapa
  // de recebimento — o equipamento já estava no Almoxarifado na abertura.
  const steps =
    item.receipt_situation === "not_received"
      ? [
          baseSteps[0],
          { status: "awaiting_receipt", label: "Chegada do Equipamento (Almoxarifado)" },
          ...baseSteps.slice(1),
        ]
      : baseSteps;
  if (["rejected", "cancelled"].includes(item.status)) {
    return steps.map((s, i) => ({ ...s, state: i === 0 ? "done" : "todo" }));
  }
  let current = STATUS_ALIAS[item.status] || item.status;
  // Itens legados em andamento (fornecedor já definido, cotação aprovada sem
  // PWT): o PWT pendente aparece na etapa da OC, emitida só após o PWT.
  if (item.status === "repair_approved" || (item.status === "awaiting_pwt" && item.supplier_id)) {
    current = "awaiting_services_analysis";
  }
  const idx = steps.findIndex((s) => s.status === current);
  return steps.map((s, i) => ({
    ...s,
    state: idx < 0 ? "todo" : i < idx ? "done" : i === idx ? "current" : "todo",
  }));
}

/** Frase de "quem deve agir" exibida em cada item. */
export function nextActionText(item) {
  if (!item) return "";
  switch (item.status) {
    case "pending_coordinator":
      return "Este item está aguardando o coordenador confirmar a tratativa (reparo, estoque, descarte ou calibração).";
    case "awaiting_receipt":
      return `Tratativa validada pela Coordenação (GDM aberta como Não Recebido)${
        item.expected_disembark_date ? ` — previsão de desembarque: ${item.expected_disembark_date}` : ""
      }. O fluxo aguarda apenas a chegada física do equipamento ao Almoxarifado.`;
    case "received":
      return item.destination === "stock_return"
        ? "Este item está aguardando a confirmação da devolução ao estoque."
        : "Este item foi recebido pelo Almoxarifado e segue para a próxima etapa.";
    case "awaiting_supplier_definition":
    case "pending_services":
      return item.destination === "repair"
        ? "PWT emitido pelo Planejamento. Serviços deve selecionar o fornecedor, informar observações e a previsão de envio."
        : "Serviços deve selecionar o fornecedor, informar observações e a previsão de envio.";
    case "awaiting_shipping_proof":
      return "Almoxarifado deve anexar obrigatoriamente a foto do equipamento expedido, a NF assinada ou o comprovante de coleta.";
    case "sent_to_supplier":
      return "Equipamento enviado ao fornecedor. Serviços deve anexar a cotação (valor e prazo informados pelo fornecedor).";
    case "awaiting_maintenance_authorization":
      return "Cotação anexada. Aguardando a análise técnica da Manutenção (aprovar ou reprovar a cotação).";
    case "awaiting_services_analysis":
      return "Cotação aprovada pela Manutenção. Serviços deve decidir: solicitar desconto ao fornecedor ou seguir para a emissão da OC.";
    case "awaiting_discount":
      return "Desconto solicitado por Serviços. Aguardando a proposta revisada do fornecedor — Serviços registra o novo valor e segue para a OC.";
    case "repair_approved":
      return "Cotação aprovada. O item segue para a emissão do PWT (Planejamento) — itens de calibração vão direto para a OC.";
    case "awaiting_pwt":
      return item.supplier_id
        ? "Cotação aprovada. O Planejamento deve emitir o PWT e registrar o número."
        : "Tratativa validada pela Coordenação e equipamento recebido pelo Almoxarifado. O Planejamento deve emitir o PWT para liberar a definição do fornecedor.";
    case "awaiting_oc_issuance":
      return item.destination === "certification"
        ? "Cotação aprovada. Serviços deve emitir a Ordem de Compra (OC)."
        : "PWT emitido. Serviços deve emitir a Ordem de Compra (OC).";
    case "awaiting_oc_approval":
      return "OC emitida. Serviços pode registrar a previsão de retorno informada pelo fornecedor e deve confirmar quando a OC for aprovada e enviada.";
    case "awaiting_return":
      return item.return_dispatched_at
        ? "Material saiu para entrega. O Almoxarifado deve confirmar o recebimento anexando a NF e o laudo."
        : "OC aprovada e enviada ao fornecedor. Serviços deve registrar a saída para entrega quando o material for despachado.";
    case "discount_negotiation":
      return "Desconto solicitado por Serviços. Registre o novo valor da proposta revisada do fornecedor para seguir à emissão da OC.";
    case "awaiting_supplier_return":
      return item.return_nf_url
        ? "NF e comprovante de devolução registrados. Almoxarifado deve confirmar o recebimento do retorno."
        : "Cotação reprovada. Serviços deve solicitar a devolução do equipamento e anexar a NF de retorno e o comprovante de devolução.";
    case "return_confirmed":
      return "Retorno confirmado pelo Almoxarifado. Serviços deve definir o novo fornecedor (todo o histórico anterior permanece registrado).";
    case "pending_maintenance_authorization":
      return "Este item está aguardando autorização do Gestor de Manutenção.";
    case "awaiting_discard_confirmation":
      return "O descarte foi autorizado pelo Gestor. Confirme quando o descarte físico for realizado.";
    case "awaiting_certificate":
      return "Equipamento recebido da certificação. Operações deve anexar o certificado (PDF e/ou imagem), número, data e empresa certificadora.";
    case "awaiting_validity_registration":
      return "Certificado anexado. Operações deve cadastrar a validade da certificação (data de vencimento ou meses de validade) para finalizar o item.";
    case "in_treatment":
      return "Este item está em tratativa no fornecedor.";
    case "discard_approved":
      return "Descarte aprovado pela Manutenção. Processo encerrado.";
    case "completed":
      return "Item finalizado.";
    case "rejected":
      return "Item reprovado.";
    case "cancelled":
      return "Item cancelado.";
    default:
      return "";
  }
}

/**
 * Grupo de responsabilidade do item para os filtros dos painéis setoriais
 * (Aguardando Operações / Manutenção / Almoxarifado / Serviços / Concluídos).
 */
export function itemResponsibleGroup(item) {
  if (!item) return "other";
  if (["completed", "discard_approved"].includes(item.status)) return "completed";
  switch (item.status) {
    case "pending_coordinator":
      // Itens aguardando validação do destino / aprovação do Coordenador.
      return "coordinator";
    case "awaiting_receipt":
    case "awaiting_discard_confirmation":
      return "almoxarifado";
    case "received":
      return item.destination === "stock_return" ? "almoxarifado" : "services";
    case "awaiting_shipping_proof":
      return "almoxarifado";
    case "awaiting_pwt":
      return "planejamento";
    case "awaiting_oc_issuance":
    case "awaiting_oc_approval":
      return "services";
    case "awaiting_return":
      return item.return_dispatched_at ? "almoxarifado" : "services";
    case "awaiting_supplier_return":
      return item.return_nf_url ? "almoxarifado" : "services";
    case "pending_maintenance_authorization":
      return item.destination === "certification" ? "operations" : "maintenance";
    case "awaiting_supplier_definition":
    case "pending_services":
    case "sent_to_supplier":
    case "awaiting_services_analysis":
    case "awaiting_discount":
    case "discount_negotiation":
    case "return_confirmed":
      return "services";
    case "in_treatment":
      return item.destination === "certification" ? "operations" : "services";
    case "awaiting_certificate":
    case "awaiting_validity_registration":
      return "operations";
    default:
      return "other";
  }
}

/** Grupo do item para os filtros rápidos. */
export function itemGroup(item) {
  if (["completed", "discard_approved"].includes(item.status)) return "completed";
  if (["rejected", "cancelled"].includes(item.status)) return "closed";
  if (item.status === "pending_coordinator") return "pending";
  return "in_progress";
}

/** Ordena: primeiro o que precisa da minha ação, depois pendentes, andamento e finalizados. */
export function sortItemsByPriority(items, can, user, responsibleVesselIds) {
  const rank = (i) => {
    if (availableItemActions(i, can, user, responsibleVesselIds).some((a) => !a.destructive)) return 0;
    const g = itemGroup(i);
    return g === "pending" ? 1 : g === "in_progress" ? 2 : g === "completed" ? 3 : 4;
  };
  return [...items].sort((a, b) => rank(a) - rank(b) || a.item_number - b.item_number);
}

/**
 * Alerta de prazo de retorno por item, controlado individualmente pela
 * previsão de retorno registrada por Serviços APÓS a emissão da Ordem de
 * Compra (expected_return_date) — nunca antes da formalização com o
 * fornecedor. O alerta desaparece quando o item é recebido ou o fluxo é
 * finalizado (status fora da lista).
 * Retorna 'overdue' (vencido), 'near' (próximo), 'ok' (no prazo) ou null.
 */
export function returnDeadlineState(item) {
  if (!item?.expected_return_date) return null;
  const IN_FLOW = [
    "awaiting_maintenance_authorization",
    "awaiting_services_analysis",
    "awaiting_discount",
    "discount_negotiation",
    "awaiting_pwt",
    "awaiting_oc_issuance",
    "awaiting_oc_approval",
    "awaiting_return",
    "in_treatment",
  ];
  if (!IN_FLOW.includes(item.status)) return null;
  const deadline = new Date(`${item.expected_return_date}T23:59:59`);
  const diffDays = (deadline - new Date()) / 86400000;
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "near";
  return "ok";
}

export const WARRANTY_STATUS_LABELS = {
  none: "Sem garantia informada",
  pending: "Aguardando início",
  active: "Garantia vigente",
  expired: "Garantia vencida",
};

/**
 * Situação da garantia do item, vinculada à cotação aprovada. O prazo começa a
 * contar quando o Almoxarifado confirma o recebimento do equipamento
 * (warranty_start_at); o término é calculado automaticamente (início + dias).
 * Sem alterar o prazo da cotação nem o prazo de retorno do fornecedor.
 */
export function warrantyInfo(item) {
  if (!item || !item.warranty_days || Number(item.warranty_days) <= 0) {
    return { days: null, start: null, end: null, status: "none" };
  }
  const days = Number(item.warranty_days);
  if (!item.warranty_start_at) {
    return { days, start: null, end: null, status: "pending" };
  }
  const start = new Date(item.warranty_start_at);
  const end = new Date(start.getTime() + days * 86400000);
  return { days, start, end, status: end >= new Date() ? "active" : "expired" };
}

/** Ações do ciclo de fornecedor — usadas pelo roteador de diálogos. */
export const SUPPLIER_FLOW_ACTIONS = [
  "select_supplier",
  "attach_shipping_proof",
  "attach_quote",
  "maintenance_decision",
  "services_discount_decision",
  "renegotiate_quote",
  "register_supplier_return",
  "confirm_supplier_return",
  "start_repair",
  "issue_pwt",
  "issue_oc",
  "confirm_oc_approved",
  "set_return_deadline",
  "register_return_dispatch",
  "confirm_return_receipt",
  "update_warranty",
  "issue_ot",
  "close_ot",
];