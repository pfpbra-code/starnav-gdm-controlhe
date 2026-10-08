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
  'view_vessels', 'manage_vessels', 'view_equipment', 'manage_equipment',
  'import_equipment', 'import_spreadsheet', 'edit_vessel_photo',
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
  'manage_vessels', 'manage_equipment', 'manage_suppliers', 'edit_vessel_photo', 'delete_gdm',
];

/** Permissões básicas automáticas de cada setor — espelha SECTOR_BASE_PERMISSIONS. */
export const SECTOR_BASE: Record<string, string[]> = {
  maintenance: [
    'view_dashboard', 'view_gdm', 'view_all_gdms', 'generate_gdm_pdf',
    'view_disposal_reports', 'generate_disposal_report',
    'view_maintenance', 'view_maintenance_quotes', 'approve_maintenance_quote',
    'quote_analysis', 'request_discount', 'request_new_quote', 'approve_maintenance',
    'view_reliability',
  ],
  operations: [
    'view_dashboard', 'view_gdm', 'view_all_gdms', 'generate_gdm_pdf',
    'view_disposal_reports', 'generate_disposal_report',
    'view_operations', 'view_operations_quotes', 'view_certifications',
  ],
  almoxarifado: [
    'view_dashboard', 'view_dashboard_gerencial', 'view_gdm', 'view_all_gdms', 'create_gdm',
    'generate_gdm_pdf', 'confirm_receipt', 'report_not_received', 'confirm_disposal',
    'upload_disposal_evidence', 'view_disposal_reports', 'generate_disposal_report',
    'view_ot', 'confirm_return',
  ],
  planejamento: [
    'view_dashboard', 'view_gdm', 'generate_gdm_pdf', 'view_disposal_reports',
    'generate_disposal_report', 'view_maintenance', 'issue_pwt', 'view_reliability',
    'view_equipment', 'view_analytics',
  ],
  services: ALL_IDS.filter((id) => !ADMIN_ONLY.includes(id)),
};

// Login próprio das embarcações (perfil mantido à parte).
const VESSEL_PRESET: string[] = ['view_dashboard', 'view_gdm', 'create_gdm', 'generate_gdm_pdf'];

/** Recupera o campo customizado do usuário (topo ou user.data). */
export function userCustomField(user: any, key: string): any {
  const custom = user?.data || {};
  return user?.[key] !== undefined ? user[key] : custom[key];
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
  if (user.role === 'vessel_user') return VESSEL_PRESET;
  return userSectors(user).flatMap((s: string) => SECTOR_BASE[s] || []);
}

export function effectivePermissions(user: any): string[] {
  if (!user) return [];
  if (user.role === 'admin') return ['*'];
  if (user.role === 'vessel_user') return VESSEL_PRESET;
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
// Etapa de confirmação da embarcação (ETAPA 4 do fluxo de aprovação)
// ---------------------------------------------------------------------------

/** Ações executadas pela própria embarcação: validadas por vínculo com o item. */
export const VESSEL_STAGE_ACTIONS = ['confirm_disembark', 'reschedule_disembark'];

/** Usuário da embarcação só pode atuar em itens da própria embarcação. */
export function canActOnVesselItems(user: any, item: any): boolean {
  if (!user || !item) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'vessel_user') return false;
  const vesselId = userCustomField(user, 'vessel_id');
  return !!vesselId && vesselId === item.vessel_id;
}