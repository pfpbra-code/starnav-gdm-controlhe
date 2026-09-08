// Permissões efetivas no servidor — espelha src/lib/permissions.js.
// Usado pelas funções backend para validar permissões de ação sobre itens de GDM.

const PRESETS = {
  admin: '*',
  coordinator: [
    'view_gdm', 'create_gdm', 'edit_gdm', 'approve_gdm', 'reject_gdm',
    'generate_gdm_pdf', 'view_oc', 'view_ot', 'view_vessels', 'view_equipment',
    'view_suppliers', 'view_reports', 'export_reports', 'view_cost_reports',
    'view_analytics', 'view_critical_equipment',
  ],
  services: [
    'view_gdm', 'edit_gdm', 'change_gdm_destination', 'send_to_supplier',
    'generate_gdm_pdf', 'manage_service_treatments', 'view_oc', 'create_oc',
    'issue_oc', 'view_ot', 'create_ot', 'issue_ot', 'edit_ot', 'confirm_return',
    'close_ot', 'view_vessels', 'view_equipment', 'view_suppliers',
    'view_reports', 'export_reports', 'view_cost_reports', 'view_analytics',
    'view_supplier_ranking', 'view_equipment_ranking', 'view_critical_equipment',
  ],
  maintenance: [
    'view_gdm', 'generate_gdm_pdf', 'quote_analysis', 'request_discount',
    'request_new_quote', 'approve_maintenance', 'view_oc', 'view_ot',
    'view_equipment', 'view_suppliers', 'view_reports', 'view_cost_reports',
    'view_analytics', 'view_supplier_ranking', 'view_equipment_ranking',
    'view_critical_equipment',
  ],
  almoxarifado: [
    'view_gdm', 'generate_gdm_pdf', 'confirm_receipt', 'report_not_received',
    'view_ot', 'confirm_return', 'view_equipment',
  ],
  planejamento: [
    'view_gdm', 'generate_gdm_pdf', 'issue_pwt', 'view_oc', 'view_ot',
    'view_reports', 'view_cost_reports', 'view_analytics',
  ],
  supplier_user: [
    'view_gdm', 'submit_quote', 'attach_technical_report',
    'attach_commercial_proposal', 'view_ot',
  ],
  vessel_user: ['view_gdm', 'create_gdm', 'generate_gdm_pdf'],
  user: ['view_gdm', 'generate_gdm_pdf'],
};

export function effectivePermissions(user: any): string[] {
  if (!user) return [];
  if (user.role === 'admin') return ['*'];
  const custom = user.data || {};
  const own = Array.isArray(user.permissions)
    ? user.permissions.filter(Boolean)
    : Array.isArray(custom.permissions)
      ? custom.permissions.filter(Boolean)
      : [];
  if (own.length > 0) return own;
  return PRESETS[user.role] || PRESETS.user;
}

export function hasPermission(user: any, permission: string): boolean {
  if (!permission) return true;
  if (!user) return false;
  const perms = effectivePermissions(user);
  return perms.includes('*') || perms.includes(permission);
}