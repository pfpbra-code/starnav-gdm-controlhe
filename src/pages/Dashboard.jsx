import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatsCard from '@/components/dashboard/StatsCard';
import GDMKanban from '@/components/dashboard/GDMKanban';
import RepairCostPanel from '@/components/dashboard/RepairCostPanel';
import NegotiationSavings from '@/components/dashboard/NegotiationSavings';
import GDMCard from '@/components/gdm/GDMCard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FileText,
  Ship,
  CheckCircle,
  Clock,
  AlertTriangle,
  Building2,
  Plus,
  ArrowRight,
  XCircle,
  Gauge,
  DollarSign,
  Truck
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { usePermissions } from '@/hooks/usePermissions';
import { SECTOR_DESTINATIONS } from '@/lib/permissions';
import { groupItemsByGdm, computeGeneralStatus } from '@/lib/gdmOverview';
import { Wrench, Cog } from 'lucide-react';
import ManagerialDashboard from '@/components/dashboard/managerial/ManagerialDashboard';
import { DASHBOARD_TOOLTIPS } from '@/lib/kpiTooltips';

const statusColors = {
  pending: '#f59e0b',
  inProgress: '#0284c7',
  completed: '#22c55e',
  rejected: '#ef4444',
};

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { hasPermission } = usePermissions();
  const canViewMaintenance = hasPermission('view_maintenance');
  const canViewOperations = hasPermission('view_operations');

  const { data: items = [] } = useQuery({
    queryKey: ['gdmItems'],
    queryFn: () => base44.entities.GDMItem.list('-created_date', 1000),
  });

  const { data: gdms = [], isLoading: loadingGDMs } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-created_date', 200),
  });

  // Itens anexados a cada GDM: base de derivação do status geral
  const gdmViews = React.useMemo(() => {
    const byGdm = groupItemsByGdm(items);
    return gdms.map((g) => ({ ...g, items: byGdm[g.id] || [] }));
  }, [gdms, items]);

  const { data: vessels = [] } = useQuery({
    queryKey: ['vessels'],
    queryFn: () => base44.entities.Vessel.list(),
    enabled: hasPermission('view_vessels'),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    enabled: hasPermission('view_suppliers'),
  });

  // KPIs reais — derivados dos itens (o status do cabeçalho da GDM é legado)
  const stats = React.useMemo(() => {
    const generalOf = (g) => computeGeneralStatus(g.items || []);
    const open = gdmViews.filter(g => ['pending', 'awaiting_approval', 'in_progress'].includes(generalOf(g).key)).length;
    // Itens com cotação aprovada, aguardando emissão de documentos ou retorno
    const approved = items.filter(i =>
      ['awaiting_pwt', 'awaiting_oc_issuance', 'awaiting_oc_approval', 'awaiting_return'].includes(i.status)
    ).length;
    const rejected = gdmViews.filter(g => generalOf(g).hasCancelled).length;
    const finalized = gdmViews.filter(g => generalOf(g).key === 'completed').length;
    const inProgress = gdmViews.filter(g => generalOf(g).key === 'in_progress').length;
    const pending = gdmViews.filter(g => ['pending', 'awaiting_approval'].includes(generalOf(g).key)).length;

    // Tempo médio de aprovação (criação -> conclusão do item) em dias
    const doneItems = items.filter(i => i.created_date && i.completed_at);
    const avgDays = doneItems.length
      ? doneItems.reduce((s, i) => s + (differenceInDays(new Date(i.completed_at), new Date(i.created_date)) || 0), 0) / doneItems.length
      : 0;

    return { total: gdmViews.length, open, approved, rejected, finalized, inProgress, pending, avgDays };
  }, [gdmViews, items]);

  // Indicadores por setor: Manutenção + Operações = Dashboard geral
  const sectorStats = React.useMemo(() => {
    // Processos encerrados (inclusive descarte aprovado) não contam como abertos.
    const isOpen = (i) =>
      !['completed', 'cancelled', 'rejected', 'discard_approved'].includes(i.status);
    return {
      maintenance: items.filter((i) => SECTOR_DESTINATIONS.maintenance.includes(i.destination) && isOpen(i)).length,
      operations: items.filter((i) => SECTOR_DESTINATIONS.operations.includes(i.destination) && isOpen(i)).length,
      inRepair: items.filter((i) => i.destination === 'repair' && i.status === 'in_treatment').length,
      inCalibration: items.filter((i) => i.destination === 'certification' && i.status === 'in_treatment').length,
      // Cotações pendentes: situação real dos itens (o item é a fonte de
      // verdade do fluxo; o status 'quote_analysis' da GDM é legado).
      pendingQuotes: items.filter((i) => i.status === 'awaiting_maintenance_authorization').length,
      awaitingReturn: items.filter((i) => i.status === 'awaiting_return').length,
    };
  }, [items]);

  // Dados mensais reais (últimos 6 meses)
  const monthlyData = React.useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, name: format(d, 'MMM', { locale: ptBR }), created: 0, completed: 0 });
    }
    gdms.forEach((g) => {
      if (g.created_date) {
        const d = new Date(g.created_date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const m = months.find((x) => x.key === key);
        if (m) m.created += 1;
      }
    });
    // Conclusões derivadas dos itens (campo legado `completed_at` da GDM não é usado)
    items.forEach((i) => {
      if (i.completed_at) {
        const d = new Date(i.completed_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const m = months.find((x) => x.key === key);
        if (m) m.completed += 1;
      }
    });
    return months;
  }, [gdms, items]);

  const statusChartData = [
    { name: 'Pendentes', value: stats.pending, color: statusColors.pending },
    { name: 'Em Andamento', value: stats.inProgress, color: statusColors.inProgress },
    { name: 'Concluídas', value: stats.finalized, color: statusColors.completed },
    { name: 'Reprovadas', value: stats.rejected, color: statusColors.rejected },
  ];

  const recentGDMs = gdmViews.slice(0, 6);

  if (loadingGDMs) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const canViewManagerial = hasPermission('view_dashboard_gerencial');

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-sky-600 to-sky-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Bem-vindo, {user?.full_name?.split(' ')[0] || 'Usuário'}!</h1>
        <p className="mt-1 text-sky-100">
          Sistema de Gestão de Materiais — Starnav Serviços Marítimos
        </p>
      </div>

      <Tabs defaultValue="operational" className="space-y-6">
        <TabsList>
          <TabsTrigger value="operational">Visão Operacional</TabsTrigger>
          {canViewManagerial && <TabsTrigger value="managerial">Dashboard Gerencial</TabsTrigger>}
        </TabsList>

        <TabsContent value="operational" className="space-y-8">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard title="Total de GDMs" value={stats.total} icon={FileText} color="sky" tooltip={DASHBOARD_TOOLTIPS.totalGdms} />
            <StatsCard title="Abertas / Pendentes" value={stats.open} icon={Clock} color="amber" tooltip={DASHBOARD_TOOLTIPS.abertas} />
            <StatsCard title="Aprovadas" value={stats.approved} icon={CheckCircle} color="green" tooltip={DASHBOARD_TOOLTIPS.aprovadas} />
            <StatsCard title="Finalizadas" value={stats.finalized} icon={CheckCircle} color="indigo" tooltip={DASHBOARD_TOOLTIPS.finalizadas} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard title="Reprovadas" value={stats.rejected} icon={XCircle} color="red" tooltip={DASHBOARD_TOOLTIPS.reprovadas} />
            <StatsCard title="Em Andamento" value={stats.inProgress} icon={AlertTriangle} color="purple" tooltip={DASHBOARD_TOOLTIPS.emAndamento} />
            <StatsCard
              title="Tempo Médio de Aprovação"
              value={`${stats.avgDays.toFixed(1)} dias`}
              icon={Gauge}
              color="sky"
              tooltip={DASHBOARD_TOOLTIPS.tempoMedio}
            />
            <StatsCard
              title="GDMs no Mês"
              value={monthlyData[monthlyData.length - 1]?.created || 0}
              icon={FileText}
              color="amber"
              tooltip={DASHBOARD_TOOLTIPS.gdmsMes}
            />
          </div>

          {/* Indicadores por setor */}
          {(canViewMaintenance || canViewOperations) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {canViewMaintenance && (
                <StatsCard title="Itens em Manutenção" value={sectorStats.maintenance} icon={Wrench} color="amber" tooltip={DASHBOARD_TOOLTIPS.itensManutencao} />
              )}
              {canViewOperations && (
                <StatsCard title="Itens em Operações" value={sectorStats.operations} icon={Cog} color="indigo" tooltip={DASHBOARD_TOOLTIPS.itensOperacoes} />
              )}
              {canViewMaintenance && (
                <StatsCard title="Equipamentos em Reparo" value={sectorStats.inRepair} icon={Wrench} color="sky" tooltip={DASHBOARD_TOOLTIPS.emReparo} />
              )}
              {canViewOperations && (
                <StatsCard title="Equipamentos em Calibração" value={sectorStats.inCalibration} icon={Cog} color="purple" tooltip={DASHBOARD_TOOLTIPS.emCalibracao} />
              )}
              <StatsCard title="Cotações Pendentes" value={sectorStats.pendingQuotes} icon={AlertTriangle} color="red" tooltip={DASHBOARD_TOOLTIPS.cotacoesPendentes} />
              <StatsCard title="Aguardando Retorno do Fornecedor" value={sectorStats.awaitingReturn} icon={Truck} color="green" tooltip={DASHBOARD_TOOLTIPS.aguardandoRetorno} />
            </div>
          )}

          {/* Kanban Board */}
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Fluxo de GDMs por Status</h2>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <GDMKanban gdms={gdmViews} />
              </CardContent>
            </Card>
          </div>

          {/* Custos com reparos */}
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Valor Gasto com Reparos de Equipamentos
            </h2>
            <RepairCostPanel />
          </div>

          {/* Economia Obtida em Negociações */}
          {(hasPermission('view_cost_reports') || hasPermission('view_analytics')) && (
            <NegotiationSavings gdms={gdms} />
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">GDMs por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4 flex-wrap">
                  {statusChartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-slate-600">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">GDMs Criadas x Concluídas por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="created" fill="#0284c7" radius={[4, 4, 0, 0]} name="Criadas" />
                      <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} name="Concluídas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          {(hasPermission('view_vessels') || hasPermission('view_suppliers')) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Ship className="h-5 w-5 text-sky-600" />
                    Embarcações
                  </CardTitle>
                  <Link to={createPageUrl('Vessels')}>
                    <Button variant="ghost" size="sm">
                      Ver todas <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{vessels.length}</p>
                  <p className="text-sm text-slate-500 mt-1">embarcações cadastradas</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-600" />
                    Fornecedores
                  </CardTitle>
                  <Link to={createPageUrl('Suppliers')}>
                    <Button variant="ghost" size="sm">
                      Ver todos <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{suppliers.length}</p>
                  <p className="text-sm text-slate-500 mt-1">fornecedores ativos</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent GDMs */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">GDMs Recentes</h2>
              <div className="flex flex-wrap gap-3">
                {hasPermission('create_gdm') && (
                  <Link to={createPageUrl('CreateGDM')}>
                    <Button className="bg-sky-600 hover:bg-sky-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Nova GDM
                    </Button>
                  </Link>
                )}
                <Link to={createPageUrl('GDMList')}>
                  <Button variant="outline">
                    Ver todas <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentGDMs.map((gdm) => (
                <GDMCard key={gdm.id} gdm={gdm} />
              ))}
            </div>

            {recentGDMs.length === 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhuma GDM encontrada</p>
                  <Link to={createPageUrl('CreateGDM')}>
                    <Button className="mt-4 bg-sky-600 hover:bg-sky-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar primeira GDM
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {canViewManagerial && (
          <TabsContent value="managerial">
            <ManagerialDashboard items={items} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}