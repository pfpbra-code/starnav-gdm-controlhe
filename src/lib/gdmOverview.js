/**
 * Visão centralizada das GDMs: agregações calculadas a partir dos itens.
 * O status geral é derivado — os status individuais dos itens nunca são alterados.
 */
import { itemSector } from "@/lib/permissions";

export const SECTOR_LABELS = {
  maintenance: "Manutenção",
  operations: "Operações",
};

export const DESTINATION_LABELS = {
  repair: "Reparo",
  certification: "Calibração/Certificação",
  stock_return: "Retorno para estoque",
  discard: "Descarte",
};

/** Agrupa os itens de GDM por gdm_id. */
export function groupItemsByGdm(items = []) {
  return items.reduce((acc, item) => {
    if (!item?.gdm_id) return acc;
    if (!acc[item.gdm_id]) acc[item.gdm_id] = [];
    acc[item.gdm_id].push(item);
    return acc;
  }, {});
}

/** Setores envolvidos nos itens de uma GDM (a partir dos destinos). */
export function sectorsOfItems(items = []) {
  const sectors = new Set();
  items.forEach((item) => {
    const sector = itemSector(item?.destination);
    if (sector) sectors.add(sector);
  });
  return Array.from(sectors);
}

const APPROVAL_STATUSES = [
  "pending_coordinator",
  "pending_maintenance_authorization",
  "awaiting_discard_confirmation",
];
const CANCELLED_STATUSES = ["cancelled", "rejected"];

/**
 * Status geral da GDM, calculado a partir dos itens (seção 9 do ajuste):
 * - todos finalizados → Finalizada
 * - algum aguardando aprovação → Aguardando aprovação
 * - algum em andamento → Em andamento (— Múltiplos setores quando houver)
 * - caso contrário → Pendente
 * Itens cancelados/reprovados geram apenas um indicador próprio.
 */
export function computeGeneralStatus(items = []) {
  const base = { hasCancelled: false };
  if (!items.length) {
    return { ...base, key: "pending", label: "Pendente", className: "bg-slate-100 text-slate-700" };
  }

  const statuses = items.map((i) => i.status);
  const hasCancelled = statuses.some((s) => CANCELLED_STATUSES.includes(s));
  const active = statuses.filter(
    (s) => s !== "completed" && !CANCELLED_STATUSES.includes(s),
  );

  let result;
  if (statuses.every((s) => s === "completed")) {
    result = { key: "completed", label: "Finalizada", className: "bg-emerald-100 text-emerald-800" };
  } else if (active.length && active.every((s) => APPROVAL_STATUSES.includes(s))) {
    result = { key: "awaiting_approval", label: "Aguardando aprovação", className: "bg-amber-100 text-amber-800" };
  } else if (active.length) {
    const multiSector = sectorsOfItems(items).length > 1;
    result = {
      key: "in_progress",
      label: multiSector ? "Em andamento — Múltiplos setores" : "Em andamento",
      className: "bg-sky-100 text-sky-800",
    };
  } else {
    result = { key: "pending", label: "Pendente", className: "bg-slate-100 text-slate-700" };
  }

  return { ...result, hasCancelled };
}

/** Rótulo do indicador de item cancelado/reprovado na GDM. */
export const CANCELLED_INDICATOR = {
  label: "Possui item cancelado",
  className: "bg-red-100 text-red-800",
};