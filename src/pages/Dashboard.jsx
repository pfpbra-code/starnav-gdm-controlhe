import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatsCard from '@/components/dashboard/StatsCard';
import GDMCard from '@/components/gdm/GDMCard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  FileText,
  Ship,
  CheckCircle,
  Clock,
  AlertTriangle,
  Building2,
  Plus,
  ArrowRight
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

const COLORS = ['#0284c7', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: gdms = [], isLoading: loadingGDMs } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-created_date', 100),
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

  // Calculate stats
  const stats = {
    total: gdms.length,
    pending: gdms.filter(g => g.status === 'pending_coordinator' || g.status === 'pending_services').length,
    inProgress: gdms.filter(g => ['sent_to_supplier', 'awaiting_quote', 'quote_analysis'].includes(g.status)).length,
    completed: gdms.filter(g => g.status === 'completed' || g.status === 'approved').length,
    urgent: gdms.filter(g => g.treatment === 'repair' && g.status !== 'completed').length,
  };

  // Chart data
  const statusChartData = [
    { name: 'Pendente', value: stats.pending, color: '#f59e0b' },
    { name: 'Em Andamento', value: stats.inProgress, color: '#0284c7' },
    { name: 'Concluído', value: stats.completed, color: '#22c55e' },
  ];

  const monthlyData = React.useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    return months.map((month, idx) => ({
      name: month,
      gdms: Math.floor(Math.random() * 20) + 5,
      completed: Math.floor(Math.random() * 15) + 3,
    }));
  }, []);

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
          Sistema de Gestão de Materiais - Starnav Serviços Marítimos
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total de GDMs"
          value={stats.total}
          icon={FileText}
          color="sky"
        />
        <StatsCard
          title="Pendentes"
          value={stats.pending}
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Em Andamento"
          value={stats.inProgress}
          icon={AlertTriangle}
          color="purple"
        />
        <StatsCard
          title="Concluídas"
          value={stats.completed}
          icon={CheckCircle}
          color="green"
        />
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
            <div className="flex justify-center gap-6 mt-4">
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
            <CardTitle className="text-lg font-semibold">GDMs por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="gdms" fill="#0284c7" radius={[4, 4, 0, 0]} name="Criadas" />
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