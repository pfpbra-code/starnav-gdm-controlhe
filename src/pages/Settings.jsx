import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { hasPermission } from '@/lib/permissions';
import SectorResponsibles from '@/components/settings/SectorResponsibles';
import Equipment from '@/pages/Equipment';
import Users from '@/pages/Users';
import PasswordPolicies from '@/pages/PasswordPolicies';
import {
  Settings as SettingsIcon,
  Ship,
  Package,
  Building2,
  Users as UsersIcon,
  Shield,
  Database,
  ArrowRight,
  FileText
} from 'lucide-react';

// Itens de atalho da Visão Geral — "tab" abre aba interna; "page" navega para página própria.
const settingsGroups = [
  {
    title: "Cadastros",
    description: "Gerenciar dados mestres do sistema",
    items: [
      {
        title: "Embarcações",
        description: "Cadastrar e gerenciar embarcações da frota",
        icon: Ship,
        color: "sky",
        page: "Vessels"
      },
      {
        title: "Equipamentos",
        description: "Cadastrar tipos de equipamentos",
        icon: Package,
        color: "purple",
        tab: "Equipment",
        permission: "view_equipment"
      },
      {
        title: "Fornecedores",
        description: "Cadastrar fornecedores parceiros",
        icon: Building2,
        color: "indigo",
        page: "Suppliers"
      }
    ]
  },
  {
    title: "Usuários e Permissões",
    description: "Controle de acesso ao sistema",
    items: [
      {
        title: "Usuários",
        description: "Gerenciar usuários e perfis de acesso",
        icon: UsersIcon,
        color: "green",
        tab: "Users",
        permission: "manage_users"
      },
      {
        title: "Logs de Auditoria",
        description: "Visualizar histórico de ações",
        icon: Shield,
        color: "amber",
        page: "AuditLogs"
      },
      {
        title: "Políticas de Senha",
        description: "Configurar regras de segurança",
        icon: Shield,
        color: "green",
        tab: "PasswordPolicies",
        permission: "system_settings"
      }
    ]
  }
];

const colorClasses = {
  sky: "bg-sky-100 text-sky-600",
  purple: "bg-purple-100 text-purple-600",
  indigo: "bg-indigo-100 text-indigo-600",
  green: "bg-green-100 text-green-600",
  amber: "bg-amber-100 text-amber-600",
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: stats } = useQuery({
    queryKey: ['settingsStats'],
    queryFn: async () => {
      const [vessels, equipment, suppliers, gdms] = await Promise.all([
        base44.entities.Vessel.list(),
        base44.entities.Equipment.list(),
        base44.entities.Supplier.list(),
        base44.entities.GDM.list()
      ]);
      return {
        vessels: vessels.length,
        equipment: equipment.length,
        suppliers: suppliers.length,
        gdms: gdms.length
      };
    }
  });

  const isAdmin = user?.role === 'admin';
  const can = (key) => hasPermission(user, key);

  const tabs = [
    { value: 'overview', label: 'Visão Geral' },
    { value: 'Equipment', label: 'Equipamentos', icon: Package, permission: 'view_equipment' },
    { value: 'Users', label: 'Usuários', icon: UsersIcon, permission: 'manage_users' },
    { value: 'PasswordPolicies', label: 'Políticas de Senha', icon: Shield, permission: 'system_settings' },
  ].filter((t) => !t.permission || can(t.permission));

  if (!isAdmin) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <SettingsIcon className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Acesso restrito a administradores</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 mt-1">Gerencie os dados mestres e configurações do sistema</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          {tabs.map((t) => {
            const TabIcon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value} className="gap-2">
                {TabIcon && <TabIcon className="h-4 w-4" />}
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <Ship className="h-8 w-8 mx-auto text-sky-500 mb-2" />
                <p className="text-2xl font-bold">{stats?.vessels || 0}</p>
                <p className="text-sm text-slate-500">Embarcações</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <Package className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                <p className="text-2xl font-bold">{stats?.equipment || 0}</p>
                <p className="text-sm text-slate-500">Equipamentos</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <Building2 className="h-8 w-8 mx-auto text-indigo-500 mb-2" />
                <p className="text-2xl font-bold">{stats?.suppliers || 0}</p>
                <p className="text-sm text-slate-500">Fornecedores</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <FileText className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">{stats?.gdms || 0}</p>
                <p className="text-sm text-slate-500">GDMs</p>
              </CardContent>
            </Card>
          </div>

          {/* Atalhos */}
          {settingsGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">{group.title}</h2>
              <p className="text-sm text-slate-500 mb-4">{group.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.filter((item) => !item.permission || can(item.permission)).map((item) => {
                  const Icon = item.icon;
                  const inner = (
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${colorClasses[item.color]}`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">{item.title}</h3>
                              <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                  return item.tab ? (
                    <button key={item.tab} type="button" className="text-left" onClick={() => setActiveTab(item.tab)}>
                      {inner}
                    </button>
                  ) : (
                    <Link key={item.page} to={createPageUrl(item.page)} className="block text-left">
                      {inner}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Responsáveis por Setor */}
          <SectorResponsibles />

          {/* System Info */}
          <Card className="border-0 shadow-sm bg-slate-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-slate-500" />
                Informações do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Versão</p>
                  <p className="font-medium">1.0.0</p>
                </div>
                <div>
                  <p className="text-slate-500">Ambiente</p>
                  <p className="font-medium">Produção</p>
                </div>
                <div>
                  <p className="text-slate-500">Gestor</p>
                  <p className="font-medium">Paulo Vitor</p>
                </div>
                <div>
                  <p className="text-slate-500">Empresa</p>
                  <p className="font-medium">Starnav Serviços Marítimos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Abas dos módulos — conteúdo original, sem alteração de funções */}
        {tabs.some((t) => t.value === 'Equipment') && (
          <TabsContent value="Equipment">
            <Equipment />
          </TabsContent>
        )}
        {tabs.some((t) => t.value === 'Users') && (
          <TabsContent value="Users">
            <Users />
          </TabsContent>
        )}
        {tabs.some((t) => t.value === 'PasswordPolicies') && (
          <TabsContent value="PasswordPolicies">
            <PasswordPolicies />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}