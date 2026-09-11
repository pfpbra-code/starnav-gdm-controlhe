import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from "@/lib/utils";
import { hasPermission, hasAnyPermission } from "@/lib/permissions";
import {
  LayoutDashboard,
  FileText,
  FilePlus2,
  FileDown,
  Ship,
  Users,
  Building2,
  Settings,
  LogOut,
  Wrench,
  Cog,
  ClipboardList,
  ClipboardCheck,
  History,
  Upload,
  ChevronLeft,
  UserCircle,
  Bell,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';

// Estrutura principal do menu (STARNAV CONTROL 2.0) — cada item exige permissão.
const MENU_ITEMS = [
  { icon: UserCircle, label: 'Meu Perfil', page: 'MyProfile', permission: null },
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    page: 'Dashboard',
    permission: 'view_dashboard',
    resolvePage: (user) =>
      user?.role === 'vessel_user' ? 'VesselDashboard' : 'Dashboard',
  },
  { icon: FilePlus2, label: 'Criar GDM', page: 'CreateGDM', permission: 'create_gdm' },
  { icon: FileText, label: 'Guias de Desembarque', page: 'GDMList', permission: 'view_all_gdms' },
  { icon: Wrench, label: 'Manutenção', page: 'Maintenance', permission: 'view_maintenance' },
  { icon: Cog, label: 'Operações', page: 'Operations', permission: 'view_operations' },
  {
    icon: ClipboardCheck,
    label: 'Análise de Cotações',
    page: 'MaintenanceAnalysis',
    anyOf: ['view_maintenance_quotes', 'view_operations_quotes'],
  },
  { icon: Ship, label: 'Embarcações', page: 'Vessels', permission: 'view_vessels' },
  { icon: Building2, label: 'Fornecedores', page: 'Suppliers', permission: 'view_suppliers' },
  { icon: FileDown, label: 'Relatórios de Descarte', page: 'DisposalReports', permission: 'view_disposal_reports' },
  { icon: Upload, label: 'Importar Planilha', page: 'ImportData', permission: 'import_spreadsheet' },
  { icon: Settings, label: 'Configurações', page: 'Settings', permission: 'system_settings' },
];

// Módulos de apoio — preservados da estrutura anterior, também por permissão.
const EXTRA_ITEMS = [
  { icon: ClipboardList, label: 'Tratativas', page: 'ServicesTreatments', permission: 'manage_service_treatments' },
  { icon: FileText, label: 'Minhas GDMs', page: 'VesselGDMs', permission: null, roles: ['vessel_user'] },
  { icon: History, label: 'Auditoria', page: 'AuditLogs', permission: 'view_audit_logs' },
  { icon: Bell, label: 'Notificações', page: 'Notifications', permission: null },
];

function isVisible(item, user) {
  if (item.roles) return item.roles.includes(user?.role);
  if (item.anyOf) return hasAnyPermission(user, item.anyOf);
  if (item.permission) return hasPermission(user, item.permission);
  return true;
}

export default function Sidebar({ user, collapsed, setCollapsed, currentPage }) {
  const mainItems = MENU_ITEMS.filter((item) => isVisible(item, user)).map((item) => ({
    ...item,
    target: item.resolvePage ? item.resolvePage(user) : item.page,
  }));
  const extraItems = EXTRA_ITEMS.filter((item) => isVisible(item, user));

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const renderLink = (item, key) => {
    const Icon = item.icon;
    const isActive =
      currentPage === item.page ||
      currentPage === item.target ||
      (item.page === 'MaintenanceAnalysis' && currentPage === 'MaintenanceAnalysis');
    return (
      <Link
        key={key}
        to={createPageUrl(item.target || item.page)}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
          isActive
            ? "bg-sky-600 text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-white",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen bg-slate-900 text-white transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={cn(
          "flex items-center border-b border-slate-700 p-4",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center">
                <Ship className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold">STARNAV</h1>
                <p className="text-xs text-slate-400">Control 2.0</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center">
              <Ship className="h-5 w-5 text-white" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "text-slate-400 hover:text-white hover:bg-slate-800",
              collapsed && "absolute -right-3 top-6 bg-slate-800 rounded-full h-6 w-6"
            )}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>

        {/* Menu */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {mainItems.map((item) => renderLink(item, item.page))}

          {extraItems.length > 0 && (
            <>
              <div className={cn("pt-4 pb-1", !collapsed && "px-3")}>
                {!collapsed && (
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Outros Módulos
                  </p>
                )}
                {collapsed && <div className="h-px bg-slate-700" />}
              </div>
              {extraItems.map((item) => renderLink(item, `extra-${item.page}`))}
            </>
          )}
        </nav>

        {/* User Info */}
        <div className="border-t border-slate-700 p-3">
          {!collapsed && (
            <div className="mb-3 px-3">
              <p className="text-sm font-medium truncate">{user?.full_name || 'Usuário'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full text-slate-300 hover:text-white hover:bg-slate-800",
              collapsed ? "px-2" : "justify-start"
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="ml-3">Sair</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}