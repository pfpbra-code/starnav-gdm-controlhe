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
  pending_disembark_confirmation: "Confirmação de Desembarque (Embarcação)",
  disembark_rescheduled: "Desembarque Reprogramado",
  pending_services: "Aguardando Serviços",
  sent_to_supplier: "Enviado ao Fornecedor",
  in_treatment: "Em Tratativa no Fornecedor",
  awaiting_return: "Aguardando Retorno do Equipamento",
  pending_maintenance_authorization: "Aguardando Autorização do Gestor de Manutenção",
  awaiting_discard_confirmation: "Aguardando Confirmação do Descarte",
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
  pending_disembark_confirmation: "bg-orange-100 text-orange-800",
  disembark_rescheduled: "bg-purple-100 text-purple-800",
  pending_services: "bg-indigo-100 text-indigo-800",
  sent_to_supplier: "bg-indigo-100 text-indigo-800",
  in_treatment: "bg-blue-100 text-blue-800",
  awaiting_return: "bg-blue-100 text-blue-800",
  pending_maintenance_authorization: "bg-orange-100 text-orange-800",
  awaiting_discard_confirmation: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
};

export const ITEM_ACTION_LABELS = {
  approve: "Tratativa Confirmada pelo Coordenador",
  reject: "Reprovado pelo Coordenador",
  confirm_receipt: "Recebimento Confirmado",
  report_not_received: "Não Recebido pelo Almoxarifado",
  confirm_disembark: "Desembarque Confirmado pela Embarcação",
  reschedule_disembark: "Desembarque Reprogramado pela Embarcação",
  return_to_almoxarifado: "Retornado ao Almoxarifado (Nova Data Atingida)",
  confirm_stock_return: "Devolução ao Estoque Confirmada",
  authorize_discard: "Descarte Autorizado pelo Gestor",
  confirm_discard: "Descarte Confirmado pelo Almoxarifado",
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
    // ETAPA 2 — o coordenador apenas confirma a tratativa do item.
    actions.push({ action: "approve", label: "Confirmar Tratativa" });
  }

  if (s === "pending_almoxarifado") {
    // ETAPA 3 — Almoxarifado: Recebido / Não Recebido.
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

  if (
    ["repair", "certification"].includes(d) &&
    ["pending_services", "sent_to_supplier", "in_treatment"].includes(s) &&
    can("edit_gdm")
  ) {
    actions.push({ action: "advance_treatment", label: "Avançar etapa" });
  }

  if (
    ["repair", "certification"].includes(d) &&
    ["awaiting_return", "in_treatment"].includes(s) &&
    can("confirm_return")
  ) {
    actions.push({ action: "complete", label: "Finalizar item" });
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
    case "pending_disembark_confirmation":
    case "disembark_rescheduled":
      return "Embarcação";
    case "pending_maintenance_authorization":
      return "Gestor de Manutenção";
    case "pending_services":
      return "Serviços";
    case "sent_to_supplier":
    case "in_treatment":
    case "awaiting_return":
      return item.supplier_name || "Fornecedor";
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
  const completed = items.filter((i) => i.status === "completed").length;
  const pending = items.filter(
    (i) => !["completed", "cancelled", "rejected"].includes(i.status),
  ).length;
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
    { status: "received", label: "Recebido pelo Almoxarifado" },
    { status: "pending_services", label: "Aguardando envio" },
    { status: "sent_to_supplier", label: "Enviado ao fornecedor" },
    { status: "in_treatment", label: "Em reparo" },
    { status: "awaiting_return", label: "Aguardando retorno" },
    { status: "completed", label: "Finalizado" },
  ],
  certification: [
    { status: "pending_coordinator", label: "Aprovação do Coordenador" },
    { status: "pending_almoxarifado", label: "Recebimento pelo Almoxarifado" },
    { status: "received", label: "Recebido pelo Almoxarifado" },
    { status: "pending_services", label: "Aguardando envio" },
    { status: "sent_to_supplier", label: "Enviado para calibração" },
    { status: "in_treatment", label: "Em calibração" },
    { status: "awaiting_return", label: "Aguardando retorno" },
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

// Etapas de embarcação (não recebido / reprogramado) são exibidas sobre a
// etapa do Almoxarifado, onde o item retoma o fluxo.
const STATUS_ALIAS = {
  draft: "pending_coordinator",
  approved: "pending_almoxarifado",
  pending_disembark_confirmation: "pending_almoxarifado",
  disembark_rescheduled: "pending_almoxarifado",
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
    case "pending_maintenance_authorization":
      return "Este item está aguardando autorização do Gestor de Manutenção.";
    case "awaiting_discard_confirmation":
      return "O descarte foi autorizado pelo Gestor. Confirme quando o descarte físico for realizado.";
    case "pending_services":
      return "Este item está aguardando tratativa do setor de Serviços.";
    case "sent_to_supplier":
    case "in_treatment":
    case "awaiting_return":
      return "Este item está em tratativa no fornecedor.";
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
  if (item.status === "completed") return "completed";
  switch (item.status) {
    case "pending_almoxarifado":
    case "awaiting_discard_confirmation":
      return "almoxarifado";
    case "received":
      return item.destination === "stock_return" ? "almoxarifado" : "services";
    case "pending_maintenance_authorization":
      return "maintenance";
    case "pending_disembark_confirmation":
    case "disembark_rescheduled":
      return "operations";
    case "pending_services":
      return "services";
    case "sent_to_supplier":
    case "in_treatment":
    case "awaiting_return":
      return item.destination === "certification" ? "operations" : "services";
    default:
      return "other";
  }
}

/** Grupo do item para os filtros rápidos. */
export function itemGroup(item) {
  if (["completed"].includes(item.status)) return "completed";
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