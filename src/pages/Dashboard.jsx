import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatsCard from '@/components/dashboard/StatsCard';
import GDMKanban from '@/components/dashboard/GDMKanban';
import RepairCostPanel from '@/components/dashboard/RepairCostPanel';
import GDMCard from '@/components/gdm/GDMCard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DollarSign
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

const statusColors = {
  pending: '#f59e0b',
  inProgress: '#0284c7',
  completed: '#22c55e',
  rejected: '#ef4444',
};

const COMPLETED_STATUSES = ['completed'];
const APPROVED_STATUSES = ['approved', 'pwt_issued', 'oc_issued', 'ot_issued', 'completed'];

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: gdms = [], isLoading: loadingGDMs } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-created_date', 200),
  });

  const { data: vessels = [] } = useQuery({
    queryKey: ['vessels'],
    queryFn: () => base44.entities.Vessel.list(),
    enabled: user?.role === 'admin' || user?.role === 'coordinator',
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    enabled: user?.role === 'admin' || user?.role === 'services',
  });

  // KPIs reais
  const stats = React.useMemo(() => {
    const open = gdms.filter(g => ['pending_coordinator', 'pending_services', 'sent_to_supplier', 'awaiting_quote', 'quote_attached', 'quote_analysis', 'new_quote_requested'].includes(g.status)).length;
    const approved = gdms.filter(g => APPROVED_STATUSES.includes(g.status)).length;
    const rejected = gdms.filter(g => g.status === 'rejected').length;
    const finalized = gdms.filter(g => g.status === 'completed').length;
    const inProgress = gdms.filter(g => ['sent_to_supplier', 'awaiting_quote', 'quote_attached', 'quote_analysis', 'approved', 'pwt_issued', 'oc_issued', 'ot_issued'].includes(g.status)).length;
    const pending = gdms.filter(g => ['pending_coordinator', 'pending_services', 'new_quote_requested'].includes(g.status)).length;

    // Tempo médio de aprovação (criação -> conclusão) em dias
    const doneWithDates = gdms.filter(g => g.created_date && (g.completed_at || g.ot_issued_at || g.oc_issued_at));
    const avgDays = doneWithDates.length
      ? doneWithDates.reduce((s, g) => s + (differenceInDays(new Date(g.completed_at || g.ot_issued_at || g.oc_issued_at), new Date(g.created_date)) || 0), 0) / doneWithDates.length
      : 0;

    return { total: gdms.length, open, approved, rejected, finalized, inProgress, pending, avgDays };
  }, [gdms]);

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
      if (g.completed_at) {
        const d = new Date(g.completed_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const m = months.find((x) => x.key === key);
        if (m) m.completed += 1;
      }
    });
    return months;
  }, [gdms]);

  const statusChartData = [
    { name: 'Pendentes', value: stats.pending, color: statusColors.pending },
    { name: 'Em Andamento', value: stats.inProgress, color: statusColors.inProgress },
    { name: 'Concluídas', value: stats.finalized, color: statusColors.completed },
    { name: 'Reprovadas', value: stats.rejected, color: statusColors.rejected },
  ];

  const recentGDMs = gdms.slice(0, 6);

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

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-sky-600 to-sky-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Bem-vindo, {user?.full_name?.split(' ')[0] || 'Usuário'}!</h1>
        <p className="mt-1 text-sky-100">
          Sistema de Gestão de Materiais — Starnav Serviços Marítimos
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total de GDMs" value={stats.total} icon={FileText} color="sky" />
        <StatsCard title="Abertas / Pendentes" value={stats.open} icon={Clock} color="amber" />
        <StatsCard title="Aprovadas" value={stats.approved} icon={CheckCircle} color="green" />
        <StatsCard title="Finalizadas" value={stats.finalized} icon={CheckCircle} color="indigo" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Reprovadas" value={stats.rejected} icon={XCircle} color="red" />
        <StatsCard title="Em Andamento" value={stats.inProgress} icon={AlertTriangle} color="purple" />
        <StatsCard
          title="Tempo Médio de Aprovação"
          value={`${stats.avgDays.toFixed(1)} dias`}
          icon={Gauge}
          color="sky"
        />
        <StatsCard
          title="GDMs no Mês"
          value={monthlyData[monthlyData.length - 1]?.created || 0}
          icon={FileText}
          color="amber"
        />
      </div>

      {/* Kanban Board */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Fluxo de GDMs por Status</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <GDMKanban gdms={gdms} />
          </CardContent>
        </Card>
      </div>

      {/* Custos com reparos */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          Valor Gasto com Reparos de Equipamentos
        </h2>
        <RepairCostPanel gdms={gdms} />
      </div>

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
      {(user?.role === 'admin' || user?.role === 'services') && (
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
          <div className="flex gap-3">
            {(user?.role === 'admin' || user?.role === 'vessel_user') && (
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
    </div>
  );
}