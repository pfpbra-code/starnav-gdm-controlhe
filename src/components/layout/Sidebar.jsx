import React, { useEffect } from 'react';
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
  Building2,
  Settings,
  LogOut,
  Wrench,
  Cog,
  ClipboardList,
  Handshake,
  Warehouse,
  History,
  Upload,
  ChevronLeft,
  UserCircle,
  Bell,
  X,
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
  { icon: Handshake, label: 'Serviços', page: 'ServicesBoard', permission: 'send_to_supplier' },
  { icon: Warehouse, label: 'Almoxarifado', page: 'AlmoxarifadoBoard', permission: 'confirm_receipt' },
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

export default function Sidebar({ user, collapsed, setCollapsed, currentPage, mobileOpen = false, onMobileClose }) {
  const mainItems = MENU_ITEMS.filter((item) => isVisible(item, user)).map((item) => ({
    ...item,
    target: item.resolvePage ? item.resolvePage(user) : item.page,
  }));
  const extraItems = EXTRA_ITEMS.filter((item) => isVisible(item, user));

  // No celular/tablet o menu é um gaveta sobreposta: sempre expandida quando aberta.
  const isCollapsed = collapsed && !mobileOpen;

  // Bloqueia a rolagem do conteúdo enquanto o menu mobile está aberto.
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [mobileOpen]);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const renderLink = (item, key) => {
    const Icon = item.icon;
    const isActive = currentPage === item.page || currentPage === item.target;
    return (
      <Link
        key={key}
        to={createPageUrl(item.target || item.page)}
        onClick={onMobileClose}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
          isActive
            ? "bg-sky-600 text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-white",
          isCollapsed && "justify-center px-2"
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!isCollapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[35] bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 text-white transition-all duration-300",
        isCollapsed ? "md:w-16" : "md:w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            "flex items-center border-b border-slate-700 p-4",
            isCollapsed ? "justify-center" : "justify-between"
          )}>
            {!isCollapsed && (
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
            {isCollapsed && (
              <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center">
                <Ship className="h-5 w-5 text-white" />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onMobileClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 md:hidden"
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "hidden text-slate-400 hover:text-white hover:bg-slate-800 md:inline-flex",
                isCollapsed && "absolute -right-3 top-6 bg-slate-800 rounded-full h-6 w-6"
              )}
            >
              <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
            </Button>
          </div>

          {/* Menu */}
          <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
            {mainItems.map((item) => renderLink(item, item.page))}

            {extraItems.length > 0 && (
              <>
                <div className={cn("pt-4 pb-1", !isCollapsed && "px-3")}>
                  {!isCollapsed && (
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Outros Módulos
                    </p>
                  )}
                  {isCollapsed && <div className="h-px bg-slate-700" />}
                </div>
                {extraItems.map((item) => renderLink(item, `extra-${item.page}`))}
              </>
            )}
          </nav>

          {/* User Info */}
          <div className="border-t border-slate-700 p-3">
            {!isCollapsed && (
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
                isCollapsed ? "px-2" : "justify-start"
              )}
            >
              <LogOut className="h-5 w-5" />
              {!isCollapsed && <span className="ml-3">Sair</span>}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}