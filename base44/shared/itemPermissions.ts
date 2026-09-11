// Permissões efetivas no servidor — espelha src/lib/permissions.js.
// Usado pelas funções backend para validar permissões de ação sobre itens de GDM.

const PRESETS: Record<string, any> = {
  admin: '*',
  coordinator: [
    'view_dashboard', 'view_maintenance', 'view_operations', 'view_gdm', 'create_gdm',
    'edit_gdm', 'approve_gdm', 'reject_gdm', 'generate_gdm_pdf', 'view_oc', 'view_ot',
    'view_vessels', 'view_equipment', 'view_suppliers', 'view_reports', 'export_reports',
    'view_cost_reports', 'view_analytics', 'view_critical_equipment',
  ],
  services: [
    'view_dashboard', 'view_maintenance', 'view_operations', 'view_gdm', 'edit_gdm',
    'change_gdm_destination', 'send_to_supplier', 'generate_gdm_pdf',
    'manage_service_treatments', 'view_oc', 'create_oc', 'issue_oc', 'approve_oc', 'view_ot', 'create_ot',
    'issue_ot', 'edit_ot', 'confirm_return', 'close_ot', 'view_vessels', 'view_equipment',
    'view_suppliers', 'view_reports', 'export_reports', 'view_cost_reports', 'view_analytics',
    'view_supplier_ranking', 'view_equipment_ranking', 'view_critical_equipment',
  ],
  maintenance: [
    'view_dashboard', 'view_gdm', 'generate_gdm_pdf', 'quote_analysis', 'request_discount',
    'request_new_quote', 'approve_maintenance', 'view_oc', 'view_ot', 'view_equipment',
    'view_suppliers', 'view_reports', 'view_cost_reports', 'view_analytics',
    'view_supplier_ranking', 'view_equipment_ranking', 'view_critical_equipment',
  ],
  operations: [
    'view_dashboard', 'view_gdm', 'generate_gdm_pdf', 'view_operations',
    'view_operations_quotes', 'approve_operations_quote', 'view_equipment',
    'view_suppliers', 'view_reports', 'view_cost_reports', 'view_analytics',
  ],
  almoxarifado: [
    'view_dashboard', 'view_maintenance', 'view_operations', 'view_gdm',
    'generate_gdm_pdf', 'confirm_receipt', 'report_not_received', 'view_ot',
    'confirm_return', 'view_equipment',
  ],
  planejamento: [
    'view_dashboard', 'view_maintenance', 'view_operations', 'view_gdm',
    'generate_gdm_pdf', 'issue_pwt', 'view_oc', 'view_ot', 'view_reports',
    'view_cost_reports', 'view_analytics',
  ],
  vessel_user: ['view_dashboard', 'view_gdm', 'create_gdm', 'generate_gdm_pdf'],
  user: ['view_dashboard', 'view_gdm', 'generate_gdm_pdf'],
};

// Permissões implícitas do perfil — espelham ROLE_IMPLIED_PERMISSIONS do frontend.
const ROLE_IMPLIED: Record<string, string[]> = {
  maintenance: ['view_maintenance', 'view_maintenance_quotes', 'approve_maintenance_quote'],
  operations: ['view_operations', 'view_operations_quotes', 'approve_operations_quote'],
  coordinator: ['view_maintenance', 'view_operations'],
  services: ['view_maintenance', 'view_operations'],
  almoxarifado: ['view_maintenance', 'view_operations'],
  planejamento: ['view_maintenance', 'view_operations'],
};

const DEFAULT_IMPLIED = ['view_dashboard'];

export function effectivePermissions(user: any): string[] {
  if (!user) return [];
  if (user.role === 'admin') return ['*'];
  const custom = user.data || {};
  const own = Array.isArray(user.permissions)
    ? user.permissions.filter(Boolean)
    : Array.isArray(custom.permissions)
      ? custom.permissions.filter(Boolean)
      : [];
  const base: any = own.length > 0 ? own : (PRESETS[user.role] || PRESETS.user);
  const implied = ROLE_IMPLIED[user.role] || [];
  return Array.from(new Set([...base, ...implied, ...DEFAULT_IMPLIED]));
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

/** Recupera o campo customizado do usuário (topo ou user.data). */
export function userCustomField(user: any, key: string): any {
  const custom = user?.data || {};
  return user?.[key] !== undefined ? user[key] : custom[key];
}

/** Usuário da embarcação só pode atuar em itens da própria embarcação. */
export function canActOnVesselItems(user: any, item: any): boolean {
  if (!user || !item) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'vessel_user') return false;
  const vesselId = userCustomField(user, 'vessel_id');
  return !!vesselId && vesselId === item.vessel_id;
}