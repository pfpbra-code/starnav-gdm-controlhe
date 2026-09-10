import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { cn } from "@/lib/utils";
import { Loader2 } from 'lucide-react';

const pageTitles = {
  MyProfile: "Meu Perfil",
  Maintenance: "Manutenção",
  Operations: "Operações",
  Dashboard: "Dashboard",
  GDMList: "Guias de Desembarque",
  GDMDetail: "Detalhes da GDM",
  CreateGDM: "Nova GDM",
  Vessels: "Embarcações",
  Users: "Usuários",
  Equipment: "Equipamentos",
  Suppliers: "Fornecedores",
  AuditLogs: "Logs de Auditoria",
  Settings: "Configurações",
  ServicesTreatments: "Tratativas",
  MaintenanceAnalysis: "Análise de Cotações",
  SupplierDetail: "Detalhes do Fornecedor",
  VesselDashboard: "Painel da Embarcação",
  VesselGDMs: "Minhas GDMs",
  PasswordPolicies: "Políticas de Senha",
  Notifications: "Notificações",
  NotificationPreferences: "Preferências de Notificação",
};

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);
  
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-sky-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar 
        user={user} 
        collapsed={collapsed} 
        setCollapsed={setCollapsed}
        currentPage={currentPageName}
      />
      
      <div className={cn(
        "transition-all duration-300",
        collapsed ? "ml-16" : "ml-64"
      )}>
        <Header user={user} pageTitle={pageTitles[currentPageName] || currentPageName} />
        
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}