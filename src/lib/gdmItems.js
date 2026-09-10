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
  pending_almoxarifado: "Aguardando Recebimento (Almoxarifado)",
  received: "Recebido pelo Almoxarifado",
  awaiting_supplier_definition: "Aguardando Definição de Fornecedor",
  awaiting_shipping_proof: "Aguardando Comprovante de Envio",
  sent_to_supplier: "Equipamento Enviado ao Fornecedor",
  in_treatment: "Em Reparo",
  awaiting_return: "Aguardando Retorno do Equipamento",
  awaiting_supplier_return: "Aguardando Retorno do Fornecedor",
  return_confirmed: "Retorno Confirmado",
  pending_maintenance_authorization: "Aguardando Aprovação da Manutenção",
  repair_approved: "Reparo Aprovado",
  discount_negotiation: "Negociação de Desconto",
  pending_disembark_confirmation: "Confirmação de Desembarque (Embarcação)",
  disembark_rescheduled: "Desembarque Reprogramado",
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
  pending_almoxarifado: "bg-amber-100 text-amber-800",
  received: "bg-sky-100 text-sky-800",
  awaiting_supplier_definition: "bg-indigo-100 text-indigo-800",
  awaiting_shipping_proof: "bg-orange-100 text-orange-800",
  sent_to_supplier: "bg-indigo-100 text-indigo-800",
  in_treatment: "bg-blue-100 text-blue-800",
  awaiting_return: "bg-blue-100 text-blue-800",
  awaiting_supplier_return: "bg-purple-100 text-purple-800",
  return_confirmed: "bg-teal-100 text-teal-800",
  pending_maintenance_authorization: "bg-orange-100 text-orange-800",
  repair_approved: "bg-emerald-100 text-emerald-800",
  discount_negotiation: "bg-violet-100 text-violet-800",
  pending_disembark_confirmation: "bg-orange-100 text-orange-800",
  disembark_rescheduled: "bg-purple-100 text-purple-800",
  awaiting_discard_confirmation: "bg-orange-100 text-orange-800",
  discard_approved: "bg-slate-200 text-slate-600",
  completed: "bg-green-100 text-green-800",
};

export const ITEM_ACTION_LABELS = {
  approve: "Tratativa Confirmada pelo Coordenador",
  reject: "Reprovado pelo Coordenador",
  confirm_receipt: "Recebimento Confirmado (Almoxarifado)",
  report_not_received: "Não Recebido pelo Almoxarifado",
  confirm_disembark: "Desembarque Confirmado pela Embarcação",
  reschedule_disembark: "Desembarque Reprogramado pela Embarcação",
  return_to_almoxarifado: "Retornado ao Almoxarifado (Nova Data Atingida)",
  confirm_stock_return: "Devolução ao Estoque Confirmada",
  authorize_discard: "Descarte Autorizado pelo Gestor",
  confirm_discard: "Descarte Confirmado pelo Almoxarifado",
  select_supplier: "Fornecedor Definido (Serviços)",
  attach_shipping_proof: "Comprovante de Envio Anexado (Almoxarifado)",
  attach_quote: "Cotação Anexada (Serviços)",
  maintenance_decision: "Decisão da Manutenção sobre a Cotação",
  renegotiate_quote: "Nova Proposta Inserida (Serviços)",
  register_supplier_return: "NF de Retorno e Comprovante Registrados (Serviços)",
  confirm_supplier_return: "Retorno do Fornecedor Confirmado (Almoxarifado)",
  start_repair: "Reparo Iniciado no Fornecedor",
  complete: "Item Finalizado",
  cancel: "Item Cancelado",
  advance_treatment: "Avanço da Tratativa",
  created: "Item Criado",
};

/** Recupera campo customizado do usuário (topo ou user.data). */
function userVesselId(user) {
  if (!user) return null;
  return user.vessel_id !== undefined ? user.vessel_id : user.data?.vessel_id;
}

/**
 * Ações disponíveis para um item, considerando destino, situação e permissões.
 * `can` é a função hasPermission já aplicada ao usuário: (key) => boolean.
 * `user` (opcional) habilita as ações da etapa de confirmação da embarcação.
 */
export function availableItemActions(item, can, user) {
  if (!item) return [];
  const s = item.status;
  const d = item.destination;
  const actions = [];

  if (s === "pending_coordinator" && can("approve_gdm")) {
    actions.push({ action: "approve", label: "Confirmar Tratativa" });
  }

  if (s === "pending_almoxarifado") {
    if (can("confirm_receipt")) {
      actions.push({ action: "confirm_receipt", label: "Recebido" });
    }
    if (can("report_not_received")) {
      actions.push({ action: "report_not_received", label: "Não Recebido", destructive: true });
    }
  }

  // ETAPA 4 — Confirmação da embarcação (apenas a embarcação emissora).
  const isVesselOwner =
    !!user &&
    (user.role === "admin" ||
      (user.role === "vessel_user" && userVesselId(user) === item.vessel_id));
  if (s === "pending_disembark_confirmation" && isVesselOwner) {
    actions.push({ action: "confirm_disembark", label: "Confirmo Desembarque" });
    actions.push({
      action: "reschedule_disembark",
      label: "Não Desembarcado",
      destructive: true,
      askDate: true,
    });
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

  if (d === "discard" && s === "awaiting_discard_confirmation" && can("confirm_receipt")) {
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

    if (s === "sent_to_supplier" && can("send_to_supplier")) {
      actions.push({ action: "attach_quote", label: "Anexar cotação" });
    }

    if (s === "awaiting_maintenance_authorization") {
      const approvePerm = d === "certification" ? "approve_operations_quote" : "approve_maintenance";
      if (can(approvePerm)) {
        actions.push({ action: "maintenance_decision", label: "Analisar cotação" });
      }
    }

    if (s === "discount_negotiation" && can("send_to_supplier")) {
      actions.push({ action: "renegotiate_quote", label: "Inserir nova proposta" });
    }

    if (s === "awaiting_supplier_return") {
      if (!item.return_nf_url && can("send_to_supplier")) {
        actions.push({ action: "register_supplier_return", label: "Registrar NF de retorno" });
      }
      if (item.return_nf_url && can("confirm_receipt")) {
        actions.push({ action: "confirm_supplier_return", label: "Confirmar recebimento do retorno" });
      }
    }

    if (s === "repair_approved" && can("edit_gdm")) {
      actions.push({ action: "start_repair", label: "Iniciar reparo" });
    }

    if (["in_treatment", "awaiting_return"].includes(s) && can("confirm_return")) {
      actions.push({ action: "complete", label: "Finalizar item" });
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

/** Responsável atual pelo item, conforme a situação. */
export function itemResponsible(item) {
  if (!item) return "—";
  switch (item.status) {
    case "pending_coordinator":
      return "Coordenador";
    case "pending_almoxarifado":
    case "received":
    case "awaiting_discard_confirmation":
      return "Almoxarifado";
    case "awaiting_shipping_proof":
      return "Almoxarifado";
    case "pending_disembark_confirmation":
    case "disembark_rescheduled":
      return "Embarcação";
    case "awaiting_supplier_definition":
    case "pending_services":
    case "sent_to_supplier":
    case "repair_approved":
    case "discount_negotiation":
    case "return_confirmed":
      return "Serviços";
    case "awaiting_supplier_return":
      return item.return_nf_url ? "Almoxarifado" : "Serviços";
    case "pending_maintenance_authorization":
      return item.destination === "certification" ? "Operações" : "Gestor de Manutenção";
    case "in_treatment":
    case "awaiting_return":
      return item.supplier_name || "Fornecedor";
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
    { status: "pending_almoxarifado", label: "Recebimento pelo Almoxarifado" },
    { status: "awaiting_supplier_definition", label: "Definição do Fornecedor (Serviços)" },
    { status: "awaiting_shipping_proof", label: "Comprovante de Envio (Almoxarifado)" },
    { status: "sent_to_supplier", label: "Enviado — Aguardando Cotação (Serviços)" },
    { status: "awaiting_maintenance_authorization", label: "Aprovação da Manutenção" },
    { status: "repair_approved", label: "Reparo Aprovado" },
    { status: "in_treatment", label: "Em Reparo no Fornecedor" },
    { status: "completed", label: "Finalizado" },
  ],
  certification: [
    { status: "pending_coordinator", label: "Aprovação do Coordenador" },
    { status: "pending_almoxarifado", label: "Recebimento pelo Almoxarifado" },
    { status: "awaiting_supplier_definition", label: "Definição do Fornecedor (Serviços)" },
    { status: "awaiting_shipping_proof", label: "Comprovante de Envio (Almoxarifado)" },
    { status: "sent_to_supplier", label: "Enviado — Aguardando Cotação (Serviços)" },
    { status: "awaiting_maintenance_authorization", label: "Aprovação da Operações" },
    { status: "repair_approved", label: "Calibração Aprovada" },
    { status: "in_treatment", label: "Em Calibração no Fornecedor" },
    { status: "completed", label: "Finalizado" },
  ],
  stock_return: [
    { status: "pending_coordinator", label: "Aprovação do Coordenador" },
    { status: "pending_almoxarifado", label: "Aguardando Almoxarifado" },
    { status: "received", label: "Recebido pelo Almoxarifado" },
    { status: "completed", label: "Devolução confirmada / Finalizado" },
  ],
  discard: [
    { status: "pending_coordinator", label: "Aprovação do Coordenador" },
    { status: "pending_almoxarifado", label: "Recebimento pelo Almoxarifado" },
    { status: "pending_maintenance_authorization", label: "Autorização do Gestor de Manutenção" },
    { status: "awaiting_discard_confirmation", label: "Confirmação final do Almoxarifado" },
    { status: "completed", label: "Finalizado" },
  ],
};

// Estados que representam a mesma etapa do fluxo (legados ou ramificações
// que retornam a um ponto já exibido na linha do tempo).
const STATUS_ALIAS = {
  draft: "pending_coordinator",
  approved: "pending_almoxarifado",
  pending_disembark_confirmation: "pending_almoxarifado",
  disembark_rescheduled: "pending_almoxarifado",
  pending_services: "awaiting_supplier_definition",
  discount_negotiation: "awaiting_maintenance_authorization",
  awaiting_return: "in_treatment",
  awaiting_supplier_return: "awaiting_shipping_proof",
  return_confirmed: "awaiting_supplier_definition",
  discard_approved: "completed",
};

/** Etapas do item com marcação de concluída / atual / futura. */
export function itemFlow(item) {
  if (!item) return [];
  const steps = FLOW_BY_DESTINATION[item.destination] || FLOW_BY_DESTINATION.repair;
  if (["rejected", "cancelled"].includes(item.status)) {
    return steps.map((s, i) => ({ ...s, state: i === 0 ? "done" : "todo" }));
  }
  const current = STATUS_ALIAS[item.status] || item.status;
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
    case "pending_almoxarifado":
      return "Este item está aguardando o recebimento pelo Almoxarifado.";
    case "pending_disembark_confirmation":
      return "O Almoxarifado não recebeu o item. A embarcação deve confirmar o desembarque ou informar a nova data prevista.";
    case "disembark_rescheduled":
      return `Desembarque reprogramado${item.expected_disembark_date ? ` para ${item.expected_disembark_date}` : ""}. Após a nova data, o item retorna ao Almoxarifado.`;
    case "received":
      return item.destination === "stock_return"
        ? "Este item está aguardando a confirmação da devolução ao estoque."
        : "Este item foi recebido pelo Almoxarifado e segue para a próxima etapa.";
    case "awaiting_supplier_definition":
    case "pending_services":
      return "Serviços deve selecionar o fornecedor, informar observações e a previsão de envio.";
    case "awaiting_shipping_proof":
      return "Almoxarifado deve anexar obrigatoriamente a foto do equipamento expedido, a NF assinada ou o comprovante de coleta.";
    case "sent_to_supplier":
      return "Equipamento enviado ao fornecedor. Serviços deve anexar a cotação (valor e prazo informados pelo fornecedor).";
    case "awaiting_maintenance_authorization":
      return "Cotação anexada. Aguardando a decisão da Gerência de Manutenção (aprovar, solicitar desconto ou reprovar).";
    case "repair_approved":
      return "Cotação aprovada pela Manutenção. Serviços deve iniciar o reparo junto ao fornecedor.";
    case "discount_negotiation":
      return "Manutenção solicitou desconto. Serviços deve negociar, inserir o novo valor e anexar a nova proposta.";
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
    case "in_treatment":
    case "awaiting_return":
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
    case "pending_almoxarifado":
    case "awaiting_discard_confirmation":
      return "almoxarifado";
    case "received":
      return item.destination === "stock_return" ? "almoxarifado" : "services";
    case "awaiting_shipping_proof":
      return "almoxarifado";
    case "awaiting_supplier_return":
      return item.return_nf_url ? "almoxarifado" : "services";
    case "pending_maintenance_authorization":
      return item.destination === "certification" ? "operations" : "maintenance";
    case "pending_disembark_confirmation":
    case "disembark_rescheduled":
      return "operations";
    case "awaiting_supplier_definition":
    case "pending_services":
    case "sent_to_supplier":
    case "repair_approved":
    case "discount_negotiation":
    case "return_confirmed":
      return "services";
    case "in_treatment":
    case "awaiting_return":
      return item.destination === "certification" ? "operations" : "services";
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
export function sortItemsByPriority(items, can, user) {
  const rank = (i) => {
    if (availableItemActions(i, can, user).some((a) => !a.destructive)) return 0;
    const g = itemGroup(i);
    return g === "pending" ? 1 : g === "in_progress" ? 2 : g === "completed" ? 3 : 4;
  };
  return [...items].sort((a, b) => rank(a) - rank(b) || a.item_number - b.item_number);
}

/** Ações do ciclo de fornecedor — usadas pelo roteador de diálogos. */
export const SUPPLIER_FLOW_ACTIONS = [
  "select_supplier",
  "attach_shipping_proof",
  "attach_quote",
  "maintenance_decision",
  "renegotiate_quote",
  "register_supplier_return",
  "confirm_supplier_return",
  "start_repair",
];