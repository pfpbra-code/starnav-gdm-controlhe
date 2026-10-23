// Permissões efetivas no servidor — espelha src/lib/permissions.js.
// Modelo reestruturado: setores vinculados (user.sectors) definem a base
// automática; autorizações individuais (user.permissions) são concedidas pelo
// ADM. Sem heranças por cargo, departamento ou perfil.

const ALL_IDS: string[] = [
  // Dashboards
  'view_dashboard', 'view_dashboard_gerencial', 'view_reliability', 'view_certifications',
  // GDM
  'view_gdm', 'view_all_gdms', 'create_gdm', 'edit_gdm', 'delete_gdm', 'approve_gdm',
  'reject_gdm', 'change_gdm_destination', 'generate_gdm_pdf',
  // Recebimento
  'confirm_receipt', 'report_not_received',
  // Descarte
  'confirm_disposal', 'upload_disposal_evidence', 'view_disposal_reports', 'generate_disposal_report',
  // Serviços / OC
  'send_to_supplier', 'register_warranty', 'manage_service_treatments',
  'view_oc', 'create_oc', 'edit_oc', 'approve_oc', 'issue_oc',
  // OT
  'view_ot', 'create_ot', 'issue_ot', 'edit_ot', 'confirm_return', 'close_ot',
  // Manutenção
  'quote_analysis', 'request_discount', 'request_new_quote', 'approve_maintenance',
  // Planejamento
  'issue_pwt',
  // Setores
  'view_maintenance', 'view_operations', 'view_maintenance_quotes', 'view_operations_quotes',
  'approve_maintenance_quote', 'approve_operations_quote',
  // Cadastros
  'view_vessels', 'view_equipment', 'manage_equipment',
  'import_equipment', 'import_spreadsheet',
  'view_suppliers', 'manage_suppliers',
  // Relatórios
  'view_reports', 'export_reports', 'view_cost_reports', 'view_analytics',
  'view_supplier_ranking', 'view_equipment_ranking', 'view_critical_equipment',
  // Administração
  'manage_users', 'edit_users', 'suspend_users', 'reset_user_access', 'manage_permissions',
  'view_audit_logs', 'export_audit_logs', 'system_settings',
];

// Funções exclusivas do Administrador — nunca concedidas automaticamente por setor.
const ADMIN_ONLY: string[] = [
  'manage_users', 'edit_users', 'suspend_users', 'reset_user_access', 'manage_permissions',
  'view_audit_logs', 'export_audit_logs', 'system_settings',
  'import_equipment', 'import_spreadsheet',
  'manage_equipment', 'manage_suppliers', 'delete_gdm',
];

// Dashboards (incluindo o Controle de OT): liberados exclusivamente pela
// autorização individual do ADM — nunca concedidos automaticamente por setor.
const DASHBOARD_PERMISSIONS: string[] = [
  'view_dashboard', 'view_dashboard_gerencial', 'view_reliability',
  'view_certifications', 'view_ot',
];

/** Permissões básicas automáticas de cada setor — espelha SECTOR_BASE_PERMISSIONS. */
export const SECTOR_BASE: Record<string, string[]> = {
  maintenance: [
    'view_gdm', 'view_all_gdms', 'generate_gdm_pdf',
    'view_disposal_reports', 'generate_disposal_report',
    'view_maintenance', 'view_maintenance_quotes', 'approve_maintenance_quote',
    'quote_analysis', 'request_discount', 'request_new_quote', 'approve_maintenance',
  ],
  operations: [
    'view_gdm', 'view_all_gdms', 'generate_gdm_pdf',
    'view_disposal_reports', 'generate_disposal_report',
    'view_operations', 'view_operations_quotes',
  ],
  almoxarifado: [
    'view_gdm', 'view_all_gdms', 'create_gdm',
    'generate_gdm_pdf', 'confirm_receipt', 'report_not_received', 'confirm_disposal',
    'upload_disposal_evidence', 'view_disposal_reports', 'generate_disposal_report',
    'confirm_return',
  ],
  planejamento: [
    'view_gdm', 'generate_gdm_pdf', 'view_disposal_reports',
    'generate_disposal_report', 'view_maintenance', 'issue_pwt',
    'view_equipment', 'view_analytics',
  ],
  services: ALL_IDS.filter(
    (id) => !ADMIN_ONLY.includes(id) && !DASHBOARD_PERMISSIONS.includes(id),
  ),
  // Coordenação: revisão das Guias de Desembarque — aprovar tratativa,
  // alterar destino dos itens (auditado) e relatórios de descarte.
  coordinator: [
    'view_gdm', 'view_all_gdms', 'approve_gdm',
    'change_gdm_destination', 'view_disposal_reports', 'generate_disposal_report',
  ],
};

/** Recupera o campo customizado do usuário (topo ou user.data). */
export function userCustomField(user: any, key: string): any {
  const custom = user?.data || {};
  return user?.[key] !== undefined ? user[key] : custom[key];
}

/** Nome de exibição do usuário (definido por ele em Meu Perfil); vazio usa o nome da conta. */
export function displayNameOf(user: any): string {
  const dn = userCustomField(user, 'display_name');
  return typeof dn === 'string' && dn.trim() ? dn.trim() : user?.full_name || user?.email || '';
}

/** Setores vinculados ao usuário. */
export function userSectors(user: any): string[] {
  const sectors = userCustomField(user, 'sectors');
  return Array.isArray(sectors) ? sectors : [];
}

/** Permissões concedidas automaticamente pelos setores do usuário. */
export function sectorBasePermissions(user: any): string[] {
  if (!user) return [];
  if (user.role === 'admin') return ALL_IDS;
  return userSectors(user).flatMap((s: string) => SECTOR_BASE[s] || []);
}

export function effectivePermissions(user: any): string[] {
  if (!user) return [];
  if (user.role === 'admin') return ['*'];
  const own = Array.isArray(userCustomField(user, 'permissions'))
    ? userCustomField(user, 'permissions').filter(Boolean)
    : [];
  return Array.from(new Set([...sectorBasePermissions(user), ...own]));
}

export function hasPermission(user: any, permission: string): boolean {
  if (!permission) return true;
  if (!user) return false;
  if (user.status && user.status !== 'active') return false;
  const perms = effectivePermissions(user);
  return perms.includes('*') || perms.includes(permission);
}

// ---------------------------------------------------------------------------
// Setores (Manutenção / Operações)
// ---------------------------------------------------------------------------

/** Setor responsável por cada destino de item. */
export const SECTOR_BY_DESTINATION: Record<string, string> = {
  repair: 'maintenance',
  stock_return: 'maintenance',
  discard: 'maintenance',
  certification: 'operations',
};

/** Permissão de visualização exigida para atuar em itens do setor. */
export function sectorViewPermission(sector: string): string {
  return sector === 'operations' ? 'view_operations' : 'view_maintenance';
}

// ---------------------------------------------------------------------------
// Etapa de confirmação do desembarque (ETAPA 4 do fluxo de aprovação)
// ---------------------------------------------------------------------------

/**
 * Ações da etapa de confirmação do desembarque, executadas pelos responsáveis
 * por setor vinculados à embarcação no cadastro (Configurações > Embarcações)
 * — as embarcações não possuem mais login próprio na plataforma.
 */
export const VESSEL_STAGE_ACTIONS = ['confirm_disembark', 'reschedule_disembark'];

/** E-mails dos responsáveis por setor vinculados à embarcação. */
export function vesselResponsibleEmails(vessel: any): string[] {
  return Object.values(vessel?.sector_responsibles || {})
    .flat()
    .filter(Boolean) as string[];
}

/** Usuário é responsável por setor da embarcação informada. */
export function isVesselResponsible(user: any, vessel: any): boolean {
  if (!user?.email || !vessel) return false;
  return vesselResponsibleEmails(vessel).includes(user.email);
}

/** Só o ADM ou um responsável vinculado à embarcação pode atuar nessa etapa. */
export function canActOnVesselItems(user: any, item: any, vessel: any): boolean {
  if (!user || !item) return false;
  if (user.role === 'admin') return true;
  return isVesselResponsible(user, vessel);
}

// ---------------------------------------------------------------------------
// Estado do cadastro (aprovação administrativa obrigatória)
// ---------------------------------------------------------------------------

/** Estados de cadastro que bloqueiam o acesso à plataforma. */
export const ACCOUNT_BLOCKED_STATUSES: string[] = [
  'pending_approval',
  'rejected',
  'disabled',
  'deleted',
];

/**
 * Estado do cadastro do usuário. Registros legados sem o campo são tratados
 * como aprovados (contas anteriores à implantação da aprovação obrigatória).
 */
export function accountStatusOf(user: any): string {
  const status = userCustomField(user, 'account_status');
  return typeof status === 'string' ? status : 'approved';
}

/** Conta liberada para operar na plataforma (cadastro aprovado, não bloqueado). */
export function isAccountAllowed(user: any): boolean {
  if (!user) return false;
  if (ACCOUNT_BLOCKED_STATUSES.includes(accountStatusOf(user))) return false;
  const status = userCustomField(user, 'status');
  if (status === 'deleted') return false;
  return true;
}