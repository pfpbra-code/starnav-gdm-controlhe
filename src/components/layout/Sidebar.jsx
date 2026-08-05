import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Ship,
  Users,
  Package,
  Building2,
  Settings,
  LogOut,
  Wrench,
  ClipboardList,
  History,
  Upload,
  ChevronLeft
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';

const menuItems = {
  admin: [
    { icon: LayoutDashboard, label: "Dashboard", page: "Dashboard" },
    { icon: FileText, label: "GDMs", page: "GDMList" },
    { icon: Ship, label: "Embarcações", page: "Vessels" },
    { icon: Users, label: "Usuários", page: "Users" },
    { icon: Package, label: "Equipamentos", page: "Equipment" },
    { icon: Building2, label: "Fornecedores", page: "Suppliers" },
    { icon: History, label: "Auditoria", page: "AuditLogs" },
    { icon: Upload, label: "Importar Planilha", page: "ImportData" },
    { icon: Settings, label: "Políticas de Senha", page: "PasswordPolicies" },
    { icon: Settings, label: "Configurações", page: "Settings" },
  ],
  coordinator: [
    { icon: LayoutDashboard, label: "Dashboard", page: "Dashboard" },
    { icon: FileText, label: "GDMs", page: "GDMList" },
    { icon: Ship, label: "Minhas Embarcações", page: "Vessels" },
  ],
  services: [
    { icon: LayoutDashboard, label: "Dashboard", page: "Dashboard" },
    { icon: FileText, label: "GDMs", page: "GDMList" },
    { icon: ClipboardList, label: "Tratativas", page: "ServicesTreatments" },
  ],
  maintenance: [
    { icon: LayoutDashboard, label: "Dashboard", page: "Dashboard" },
    { icon: Wrench, label: "Análise de Cotações", page: "MaintenanceAnalysis" },
  ],
  supplier_user: [
    { icon: LayoutDashboard, label: "Dashboard", page: "SupplierDashboard" },
    { icon: FileText, label: "Materiais Recebidos", page: "SupplierMaterials" },
  ],
  vessel_user: [
    { icon: LayoutDashboard, label: "Dashboard", page: "VesselDashboard" },
    { icon: FileText, label: "Criar GDM", page: "CreateGDM" },
    { icon: ClipboardList, label: "Minhas GDMs", page: "VesselGDMs" },
  ],
};

export default function Sidebar({ user, collapsed, setCollapsed, currentPage }) {
  const userRole = user?.role || 'user';
  const items = menuItems[userRole] || menuItems.services;

  const handleLogout = async () => {
    await base44.auth.logout();
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
                <p className="text-xs text-slate-400">Serviços Marítimos</p>
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
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
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
          })}
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