/**
 * STARNAV CONTROL 2.0 — Camada central de permissões e escopo de dados.
 *
 * Modelo reestruturado: o usuário possui apenas dois perfis no editor
 * (Administrador e Usuário; o login próprio das Embarcações é mantido à parte).
 * O que o usuário pode fazer vem exclusivamente de:
 *   1. Setores vinculados em Configurações > Responsáveis por Setor
 *      (user.sectors) — permissões básicas automáticas do setor;
 *   2. Autorizações individuais concedidas pelo ADM (user.permissions).
 * Não existem permissões herdadas por cargo, departamento ou perfil.
 */

// Setores da empresa — fonte única de vínculo usuário/setor.
export const SECTORS = [
  { key: 'maintenance', label: 'Manutenção' },
  { key: 'operations', label: 'Operações' },
  { key: 'almoxarifado', label: 'Almoxarifado' },
  { key: 'planejamento', label: 'Planejamento' },
  { key: 'services', label: 'Serviços' },
  { key: 'coordinator', label: 'Coordenação' },
];

export const SECTOR_KEYS = SECTORS.map((s) => s.key);

// Catálogo de permissões, agrupado por módulo.
export const AVAILABLE_PERMISSIONS = [
  // Dashboards (autorização individual — cada um é liberado isoladamente)
  { id: "view_dashboard", label: "Dashboard Operacional", category: "Dashboards" },
  { id: "view_dashboard_gerencial", label: "Dashboard Gerencial", category: "Dashboards" },
  { id: "view_reliability", label: "Dashboard de Confiabilidade (MTBF/MTTR)", category: "Dashboards" },
  { id: "view_certifications", label: "Dashboard de Certificações", category: "Dashboards" },

  // GDM
  { id: "view_gdm", label: "Visualizar GDM", category: "GDM" },
  { id: "view_all_gdms", label: "Visualizar todas as Guias de Desembarque", category: "GDM" },
  { id: "create_gdm", label: "Criar GDM", category: "GDM" },
  { id: "edit_gdm", label: "Editar GDM", category: "GDM" },
  { id: "delete_gdm", label: "Deletar GDM", category: "GDM" },
  { id: "approve_gdm", label: "Aprovar GDM", category: "GDM" },
  { id: "reject_gdm", label: "Rejeitar GDM", category: "GDM" },
  { id: "change_gdm_destination", label: "Alterar Destino da GDM", category: "GDM" },
  { id: "generate_gdm_pdf", label: "Gerar PDF da GDM", category: "GDM" },

  // Recebimento (Almoxarifado)
  { id: "confirm_receipt", label: "Confirmar Recebimento", category: "Recebimento" },
  { id: "report_not_received", label: "Informar Não Recebimento", category: "Recebimento" },

  // Descarte
  { id: "confirm_disposal", label: "Confirmar descarte", category: "Descarte" },
  { id: "upload_disposal_evidence", label: "Anexar comprovação de descarte", category: "Descarte" },
  { id: "view_disposal_reports", label: "Visualizar relatórios de descarte", category: "Descarte" },
  { id: "generate_disposal_report", label: "Gerar relatório de descarte", category: "Descarte" },

  // Serviços / OC
  { id: "send_to_supplier", label: "Enviar ao Fornecedor", category: "Serviços" },
  { id: "register_warranty", label: "Registrar/Alterar Garantia de Cotação", category: "Serviços" },
  { id: "manage_service_treatments", label: "Registrar Tratativas", category: "Serviços" },
  { id: "view_oc", label: "Visualizar OC", category: "OC" },
  { id: "create_oc", label: "Criar OC", category: "OC" },
  { id: "edit_oc", label: "Editar OC", category: "OC" },
  { id: "approve_oc", label: "Aprovar OC", category: "OC" },
  { id: "issue_oc", label: "Emitir OC", category: "OC" },

  // OT
  { id: "view_ot", label: "Visualizar OT", category: "OT" },
  { id: "create_ot", label: "Criar OT", category: "OT" },
  { id: "issue_ot", label: "Emitir OT", category: "OT" },
  { id: "edit_ot", label: "Editar OT", category: "OT" },
  { id: "confirm_return", label: "Confirmar Retorno", category: "OT" },
  { id: "close_ot", label: "Fechar OT", category: "OT" },

  // Manutenção
  { id: "quote_analysis", label: "Análise de Cotação", category: "Manutenção" },
  { id: "request_discount", label: "Solicitar Desconto", category: "Manutenção" },
  { id: "request_new_quote", label: "Solicitar Nova Cotação", category: "Manutenção" },
  { id: "approve_maintenance", label: "Aprovar Manutenção", category: "Manutenção" },

  // Planejamento
  { id: "issue_pwt", label: "Emitir PWT", category: "Planejamento" },

  // Setores (Manutenção / Operações)
  { id: "view_maintenance", label: "Acessar Manutenção", category: "Setores" },
  { id: "view_operations", label: "Acessar Operações", category: "Setores" },
  { id: "view_maintenance_quotes", label: "Cotações — Manutenção", category: "Setores" },
  { id: "view_operations_quotes", label: "Cotações — Operações", category: "Setores" },
  { id: "approve_maintenance_quote", label: "Aprovar Cotação — Manutenção", category: "Setores" },
  { id: "approve_operations_quote", label: "Aprovar Cotação — Operações", category: "Setores" },

  // Cadastros
  { id: "view_vessels", label: "Visualizar Embarcações", category: "Cadastros" },
  { id: "manage_vessels", label: "Gerenciar Embarcações", category: "Cadastros" },
  { id: "view_equipment", label: "Visualizar Equipamentos", category: "Cadastros" },
  { id: "manage_equipment", label: "Gerenciar Equipamentos", category: "Cadastros" },
  { id: "import_equipment", label: "Importar Equipamentos (planilha)", category: "Cadastros" },
  { id: "import_spreadsheet", label: "Importar Planilha", category: "Cadastros" },
  { id: "edit_vessel_photo", label: "Editar Foto da Embarcação", category: "Cadastros" },
  { id: "view_suppliers", label: "Visualizar Fornecedores", category: "Cadastros" },
  { id: "manage_suppliers", label: "Gerenciar Fornecedores", category: "Cadastros" },

  // Relatórios e inteligência
  { id: "view_reports", label: "Visualizar Relatórios", category: "Relatórios" },
  { id: "export_reports", label: "Exportar Relatórios", category: "Relatórios" },
  { id: "view_cost_reports", label: "Visualizar Relatórios de Custo", category: "Relatórios" },
  { id: "view_analytics", label: "Visualizar Indicadores", category: "Relatórios" },
  { id: "view_supplier_ranking", label: "Ranking de Fornecedores", category: "Relatórios" },
  { id: "view_equipment_ranking", label: "Ranking de Equipamentos", category: "Relatórios" },
  { id: "view_critical_equipment", label: "Equipamentos Críticos", category: "Relatórios" },

  // Administração (exclusivas do ADM)
  { id: "manage_users", label: "Gerenciar Usuários", category: "Administração" },
  { id: "edit_users", label: "Editar Usuários", category: "Administração" },
  { id: "suspend_users", label: "Suspender/Ativar Usuários", category: "Administração" },
  { id: "reset_user_access", label: "Redefinir Acesso de Usuários", category: "Administração" },
  { id: "manage_permissions", label: "Gerenciar Permissões", category: "Administração" },
  { id: "view_audit_logs", label: "Ver Logs de Auditoria", category: "Administração" },
  { id: "export_audit_logs", label: "Exportar Logs de Auditoria", category: "Administração" },
  { id: "system_settings", label: "Configurações do Sistema", category: "Administração" },
];

export const ALL_PERMISSION_IDS = AVAILABLE_PERMISSIONS.map((p) => p.id);

export const PERMISSION_LABELS = Object.fromEntries(
  AVAILABLE_PERMISSIONS.map((p) => [p.id, p.label]),
);

export const PERMISSION_CATEGORIES = AVAILABLE_PERMISSIONS.reduce((acc, p) => {
  (acc[p.category] = acc[p.category] || []).push(p);
  return acc;
}, {});

export const ROLE_LABELS = {
  admin: "Administrador",
  vessel_user: "Embarcação",
  user: "Usuário",
};

// Funções exclusivas do Administrador — nunca concedidas automaticamente por setor.
const ADMIN_ONLY = [
  "manage_users",
  "edit_users",
  "suspend_users",
  "reset_user_access",
  "manage_permissions",
  "view_audit_logs",
  "export_audit_logs",
  "system_settings",
  "import_equipment",
  "import_spreadsheet",
  // Escrita em cadastros e exclusões seguem restritas ao ADM (RLS).
  "manage_vessels",
  "manage_equipment",
  "manage_suppliers",
  "edit_vessel_photo",
  "delete_gdm",
];

/**
 * Permissões básicas automáticas de cada setor — concedidas ao vincular o
 * usuário ao setor em Configurações > Responsáveis por Setor. Qualquer acesso
 * adicional depende de autorização individual do ADM.
 */
export const SECTOR_BASE_PERMISSIONS = {
  // Manutenção: GDMs, dashboard operacional, descarte, aba Manutenção e todas
  // as suas funções, análise de cotações e confiabilidade (MTBF/MTTR/SN).
  maintenance: [
    "view_dashboard",
    "view_gdm",
    "view_all_gdms",
    "generate_gdm_pdf",
    "view_disposal_reports",
    "generate_disposal_report",
    "view_maintenance",
    "view_maintenance_quotes",
    "approve_maintenance_quote",
    "quote_analysis",
    "request_discount",
    "request_new_quote",
    "approve_maintenance",
    "view_reliability",
  ],
  // Operações: GDMs, dashboard operacional, descarte, aba Operações e a
  // gestão de certificações (validade, histórico e consultas).
  operations: [
    "view_dashboard",
    "view_gdm",
    "view_all_gdms",
    "generate_gdm_pdf",
    "view_disposal_reports",
    "generate_disposal_report",
    "view_operations",
    "view_operations_quotes",
    "view_certifications",
  ],
  // Almoxarifado: criar GDM, GDMs, aba Almoxarifado, descarte, dashboards
  // operacional e gerencial, controle de recebimento e movimentação.
  almoxarifado: [
    "view_dashboard",
    "view_dashboard_gerencial",
    "view_gdm",
    "view_all_gdms",
    "create_gdm",
    "generate_gdm_pdf",
    "confirm_receipt",
    "report_not_received",
    "confirm_disposal",
    "upload_disposal_evidence",
    "view_disposal_reports",
    "generate_disposal_report",
    "view_ot",
    "confirm_return",
  ],
  // Planejamento: dashboard operacional, descarte, aba Manutenção (consulta),
  // emissão de PWT, confiabilidade, consulta de equipamentos e indicadores.
  // Análise/Aprovação de cotações e Dashboard Gerencial ficam bloqueados.
  planejamento: [
    "view_dashboard",
    "view_gdm",
    "generate_gdm_pdf",
    "view_disposal_reports",
    "generate_disposal_report",
    "view_maintenance",
    "issue_pwt",
    "view_reliability",
    "view_equipment",
    "view_analytics",
  ],
  // Serviços: todas as funcionalidades operacionais da plataforma, exceto as
  // funções exclusivas do Administrador.
  services: ALL_PERMISSION_IDS.filter((id) => !ADMIN_ONLY.includes(id)),
  // Coordenação: revisão das Guias de Desembarque após a criação — visualizar
  // todas as GDMs, validar e alterar o destino dos itens com justificativa
  // (auditado), e consultar os Relatórios de Descarte. Demais módulos e
  // dashboards só via autorização individual do ADM.
  coordinator: [
    "view_dashboard",
    "view_gdm",
    "view_all_gdms",
    "approve_gdm",
    "change_gdm_destination",
    "view_disposal_reports",
    "generate_disposal_report",
  ],
};

// Permissões do login próprio das embarcações (perfil mantido à parte).
const VESSEL_PRESET = ["view_dashboard", "view_gdm", "create_gdm", "generate_gdm_pdf"];

// Campos customizados do usuário podem estar no topo ou em user.data (Base44).
function userField(user, key) {
  const custom = user?.data || {};
  return user?.[key] !== undefined ? user[key] : custom[key];
}

/** Setores vinculados ao usuário (Configurações > Responsáveis por Setor). */
export function userSectors(user) {
  const sectors = userField(user, "sectors");
  return Array.isArray(sectors) ? sectors.filter((s) => SECTOR_KEYS.includes(s)) : [];
}

/** Permissões concedidas automaticamente pelos setores do usuário. */
export function sectorBasePermissions(user) {
  if (user?.role === "admin") return ALL_PERMISSION_IDS;
  if (user?.role === "vessel_user") return [...VESSEL_PRESET];
  return userSectors(user).flatMap((s) => SECTOR_BASE_PERMISSIONS[s] || []);
}

/**
 * Permissões efetivas do usuário:
 * setores (base automática) + autorizações individuais do ADM.
 * O ADM tem acesso total; sem heranças por cargo, departamento ou perfil.
 */
export function effectivePermissions(user) {
  if (!user) return [];
  if (user.role === "admin") return ALL_PERMISSION_IDS;
  if (user.role === "vessel_user") return [...VESSEL_PRESET];
  const own = Array.isArray(userField(user, "permissions"))
    ? userField(user, "permissions").filter(Boolean)
    : [];
  return Array.from(new Set([...sectorBasePermissions(user), ...own]));
}

export function hasPermission(user, permission) {
  if (!permission) return true;
  if (!user) return false;
  if (user.status && user.status !== "active") return false;
  return effectivePermissions(user).includes(permission);
}

export function hasAnyPermission(user, permissions = []) {
  if (!permissions.length) return true;
  return permissions.some((p) => hasPermission(user, p));
}

export function hasAllPermissions(user, permissions = []) {
  return permissions.every((p) => hasPermission(user, p));
}

// ---------------------------------------------------------------------------
// Escopo de dados
// ---------------------------------------------------------------------------

/** Embarcações que o usuário pode acessar: null = todas. */
export function allowedVesselIds(user) {
  if (!user) return [];
  if (user.role === "admin") return null;
  const vesselId = userField(user, "vessel_id");
  const assigned = userField(user, "assigned_vessels");
  if (user.role === "vessel_user") return vesselId ? [vesselId] : [];
  if (Array.isArray(assigned) && assigned.length > 0) {
    return assigned;
  }
  return null;
}

export function canAccessVessel(user, vesselId) {
  const allowed = allowedVesselIds(user);
  if (allowed === null) return true;
  return !!vesselId && allowed.includes(vesselId);
}

/** Aplica o escopo de embarcação a uma lista de GDMs. */
export function scopeGdms(user, gdms = []) {
  const vessels = allowedVesselIds(user);
  return gdms.filter((g) => vessels === null || vessels.includes(g.vessel_id));
}

// ---------------------------------------------------------------------------
// Setores (Manutenção / Operações) — escopo dos itens por destino
// ---------------------------------------------------------------------------

/** Destinos de item que pertencem a cada setor. */
export const SECTOR_DESTINATIONS = {
  maintenance: ["repair", "stock_return", "discard"],
  operations: ["certification"],
};

/** Setor responsável por um destino de item. */
export function itemSector(destination) {
  if (SECTOR_DESTINATIONS.maintenance.includes(destination)) return "maintenance";
  if (SECTOR_DESTINATIONS.operations.includes(destination)) return "operations";
  return null;
}

/** Permissão de visualização do setor. */
export function sectorViewPermission(sector) {
  return sector === "operations" ? "view_operations" : "view_maintenance";
}

// ---------------------------------------------------------------------------
// Módulos (usado pela sidebar e pelas rotas)
// ---------------------------------------------------------------------------

/** Permissão mínima exigida por página. null = sempre liberado. */
export const MODULE_PERMISSIONS = {
  MyProfile: null,
  Dashboard: "view_dashboard",
  Notifications: null,
  NotificationPreferences: null,
  VesselDashboard: "view_dashboard",
  GDMList: "view_all_gdms",
  GDMDetail: "view_gdm",
  VesselGDMs: "view_gdm",
  CreateGDM: "create_gdm",
  ServicesTreatments: "manage_service_treatments",
  ServicesBoard: "send_to_supplier",
  AlmoxarifadoBoard: "confirm_receipt",
  Maintenance: "view_maintenance",
  Operations: "view_operations",
  // A Análise de Cotações controla as abas (Manutenção/Operações) internamente.
  MaintenanceAnalysis: null,
  Vessels: "view_vessels",
  Equipment: "view_equipment",
  Suppliers: "view_suppliers",
  DisposalReports: "view_disposal_reports",
  SupplierDetail: "view_suppliers",
  Users: "manage_users",
  AuditLogs: "view_audit_logs",
  ImportData: "import_spreadsheet",
  PasswordPolicies: "system_settings",
  Settings: "system_settings",
};

export function canAccessModule(user, moduleName) {
  const required = MODULE_PERMISSIONS[moduleName];
  if (required === undefined) return true;
  return hasPermission(user, required);
}