import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SectorResponsibles from '@/components/settings/SectorResponsibles';
import {
  Settings as SettingsIcon,
  Ship,
  Package,
  Building2,
  Users,
  Shield,
  Database,
  ArrowRight,
  FileText
} from 'lucide-react';

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
        page: "Equipment"
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
        icon: Users,
        color: "green",
        page: "Users"
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
        page: "PasswordPolicies"
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 mt-1">Gerencie os dados mestres e configurações do sistema</p>
      </div>

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

      {/* Settings Groups */}
      {settingsGroups.map((group) => (
        <div key={group.title}>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{group.title}</h2>
          <p className="text-sm text-slate-500 mb-4">{group.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.page} to={createPageUrl(item.page)}>
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
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
    </div>
  );
}