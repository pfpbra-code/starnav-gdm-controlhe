// Gestão de Certificações/Calibrações — controle de validade e conformidade por SN.
// Cada certificado fica permanentemente vinculado ao item da GDM; o histórico do
// equipamento é agrupado por Número de Série, permitindo acompanhar vencimentos,
// recertificações e o percentual de conformidade da frota.

export const EXPIRING_WINDOW_DAYS = 30;

// Marcos de alerta de vencimento notificados pelo workflow diário.
export const CERT_ALERT_MILESTONES = [90, 60, 30, 15, 0];

export const EQUIPMENT_CATEGORY_LABELS = {
  navigation: "Navegação",
  communication: "Comunicação",
  safety: "Segurança",
  deck: "Convés",
  engine: "Motor",
  electrical: "Elétrica",
  hydraulic: "Hidráulica",
  other: "Outros",
};

export const CERT_STATUS = {
  awaiting_certificate: {
    label: "Aguardando Certificado",
    color: "bg-orange-100 text-orange-800",
  },
  awaiting_validity: {
    label: "Aguardando Cadastro da Validade",
    color: "bg-amber-100 text-amber-800",
  },
  in_process: {
    label: "Em Certificação",
    color: "bg-blue-100 text-blue-800",
  },
  valid: { label: "Certificado", color: "bg-green-100 text-green-800" },
  expiring: { label: "Próximo do Vencimento", color: "bg-amber-100 text-amber-800" },
  expired: { label: "Vencido", color: "bg-red-100 text-red-700" },
};

const CLOSED_ITEM_STATUSES = ["completed", "cancelled", "rejected", "discard_approved"];
const DAY_MS = 86400000;

/** Dias restantes até a data (negativo = vencido). */
export function daysUntil(dateStr, now = new Date()) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - now) / DAY_MS);
}

/** Vencimento calculado: data informada OU emissão + meses de validade. */
export function computeExpiryIso(certificateDate, { validityDate, validityMonths } = {}) {
  if (validityDate) return new Date(`${validityDate}T23:59:59`).toISOString();
  const months = Number(validityMonths);
  if (!certificateDate || !Number.isFinite(months) || months <= 0) return null;
  const base = new Date(`${certificateDate}T12:00:00`);
  base.setMonth(base.getMonth() + months);
  base.setHours(23, 59, 59, 0);
  return base.toISOString();
}

/**
 * Constrói o registro de certificação por SN a partir dos itens de GDM com
 * destino Calibração/Certificação e dos certificados registrados (histórico
 * completo — nenhum certificado é removido ao ser substituído).
 */
export function buildCertEquipmentRecords(
  items = [],
  certifications = [],
  equipmentList = [],
  now = new Date()
) {
  const equipmentByCode = {};
  const equipmentById = {};
  (equipmentList || []).forEach((e) => {
    if (e.code) equipmentByCode[String(e.code).trim().toUpperCase()] = e;
    equipmentById[e.id] = e;
  });

  const certsBySn = {};
  (certifications || []).forEach((c) => {
    if (!c.serial_number) return;
    const sn = String(c.serial_number).trim().toUpperCase();
    (certsBySn[sn] = certsBySn[sn] || []).push(c);
  });
  Object.values(certsBySn).forEach((list) =>
    list.sort(
      (a, b) =>
        new Date(b.certificate_date || b.created_date) -
        new Date(a.certificate_date || a.created_date)
    )
  );

  const itemsBySn = {};
  (items || []).forEach((i) => {
    if (i.destination !== "certification" || !i.serial_number || i.status === "draft") return;
    const sn = String(i.serial_number).trim().toUpperCase();
    (itemsBySn[sn] = itemsBySn[sn] || []).push(i);
  });
  Object.values(itemsBySn).forEach((list) =>
    list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
  );

  const records = Object.entries(itemsBySn).map(([sn, list]) => {
    const certs = certsBySn[sn] || [];
    const currentCert = certs[0] || null;
    const openItem = list.find((i) => !CLOSED_ITEM_STATUSES.includes(i.status)) || null;
    const latestItem = list[0];
    const sample = latestItem;
    const equipment =
      (sample.equipment_code &&
        equipmentByCode[String(sample.equipment_code).trim().toUpperCase()]) ||
      (sample.equipment_id && equipmentById[sample.equipment_id]) ||
      null;

    let status;
    if (openItem?.status === "awaiting_certificate") {
      status = "awaiting_certificate";
    } else if (openItem?.status === "awaiting_validity_registration") {
      status = "awaiting_validity";
    } else if (currentCert && !currentCert.expires_at) {
      status = "awaiting_validity";
    } else if (!currentCert) {
      // Sem certificado registrado: em processo (fluxo aberto) ou aguardando
      // certificado (item concluído em fluxo antigo sem certificado anexado).
      status = openItem ? "in_process" : "awaiting_certificate";
    } else {
      const left = daysUntil(currentCert.expires_at, now);
      if (left == null) status = "awaiting_validity";
      else if (left < 0) status = "expired";
      else if (left <= EXPIRING_WINDOW_DAYS) status = "expiring";
      else status = "valid";
    }

    return {
      sn,
      equipment,
      equipmentName: equipment?.name || sample.equipment_name || "—",
      equipmentCode: sample.equipment_code || equipment?.code || "",
      category: equipment?.category || "other",
      manufacturer: equipment?.manufacturer || "",
      model: equipment?.model || "",
      vessels: [...new Set(list.map((i) => i.vessel_name).filter(Boolean))],
      vesselName: latestItem?.vessel_name || "",
      items: list,
      openItem,
      certificationsCount: certs.length,
      currentCert,
      history: certs,
      lastCertDate: currentCert?.certificate_date || null,
      nextExpiry: currentCert?.expires_at || null,
      daysLeft: currentCert?.expires_at ? daysUntil(currentCert.expires_at, now) : null,
      status,
    };
  });

  const rank = (r) =>
    ({
      expired: 0,
      expiring: 1,
      awaiting_certificate: 2,
      awaiting_validity: 3,
      in_process: 4,
      valid: 5,
    }[r.status] ?? 6);
  return records.sort((a, b) => rank(a) - rank(b) || a.equipmentName.localeCompare(b.equipmentName));
}

/** KPIs do dashboard de certificações. */
export function certKpis(records = []) {
  const count = (s) => records.filter((r) => r.status === s).length;
  const certified = count("valid");
  const expiring = count("expiring");
  const expired = count("expired");
  const inProcess =
    count("in_process") + count("awaiting_certificate") + count("awaiting_validity");
  const assessed = certified + expiring + expired;
  return {
    monitored: records.length,
    certified,
    expired,
    expiring,
    inProcess,
    // Conformidade: equipamentos com certificação dentro da validade (inclui os
    // próximos do vencimento) sobre o total avaliado (vigentes + vencidos).
    compliance: assessed > 0 ? ((certified + expiring) / assessed) * 100 : null,
  };
}

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const monthKey = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (key) => {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[Number(m) - 1]}/${y.slice(2)}`;
};

/** Certificações emitidas por mês (últimos N meses). */
export function certsByMonth(certs = [], months = 12, now = new Date()) {
  const keys = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const map = Object.fromEntries(keys.map((k) => [k, 0]));
  (certs || []).forEach((c) => {
    const k = monthKey(c.certificate_date || c.created_date);
    if (map[k] != null) map[k] += 1;
  });
  return keys.map((k) => ({ month: monthLabel(k), count: map[k] }));
}

/** Certificações vencidas agrupadas pelo mês de vencimento. */
export function expiredByPeriod(certs = [], now = new Date()) {
  const map = {};
  (certs || []).forEach((c) => {
    if (!c.expires_at || new Date(c.expires_at) >= now) return;
    const k = monthKey(c.expires_at);
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, count]) => ({ month: monthLabel(k), count }));
}

/** Certificações emitidas por embarcação. */
export function certsByVessel(certs = []) {
  const map = {};
  (certs || []).forEach((c) => {
    const v = c.vessel_name || "—";
    map[v] = (map[v] || 0) + 1;
  });
  return Object.entries(map)
    .map(([vessel, count]) => ({ vessel, count }))
    .sort((a, b) => b.count - a.count);
}

/** Equipamentos monitorados por tipo (categoria do cadastro). */
export function certsByEquipmentType(records = []) {
  const map = {};
  (records || []).forEach((r) => {
    const label = EQUIPMENT_CATEGORY_LABELS[r.category] || "Outros";
    map[label] = (map[label] || 0) + 1;
  });
  return Object.entries(map).map(([type, count]) => ({ type, count }));
}

/** Visão consolidada por embarcação: monitorados, vigentes, vencidos e conformidade. */
export function vesselCompliance(records = []) {
  const map = {};
  (records || []).forEach((r) => {
    const vessel = r.vesselName || "—";
    const entry = (map[vessel] =
      map[vessel] || { vessel, monitored: 0, certified: 0, expired: 0, expiring: 0 });
    entry.monitored += 1;
    if (r.status === "valid") entry.certified += 1;
    else if (r.status === "expired") entry.expired += 1;
    else if (r.status === "expiring") entry.expiring += 1;
  });
  return Object.values(map)
    .map((e) => {
      const vigentes = e.certified + e.expiring;
      const assessed = vigentes + e.expired;
      return { ...e, compliance: assessed > 0 ? (vigentes / assessed) * 100 : null };
    })
    .sort((a, b) => b.monitored - a.monitored);
}