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
  Ship,
  FileText,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export default function VesselDashboard() {
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: vessel } = useQuery({
    queryKey: ['vessel', user?.vessel_id],
    queryFn: () => base44.entities.Vessel.filter({ id: user?.vessel_id }).then(res => res[0]),
    enabled: !!user?.vessel_id,
  });

  const { data: gdms = [], isLoading: loadingGDMs } = useQuery({
    queryKey: ['vesselGDMs', user?.vessel_id],
    queryFn: () => base44.entities.GDM.filter({ vessel_id: user?.vessel_id }),
    enabled: !!user?.vessel_id,
  });

  const stats = {
    total: gdms.length,
    pending: gdms.filter(g => g.status === 'pending_coordinator').length,
    inProgress: gdms.filter(g => ['pending_services', 'sent_to_supplier', 'awaiting_quote', 'quote_analysis'].includes(g.status)).length,
    completed: gdms.filter(g => ['approved', 'completed'].includes(g.status)).length,
  };

  const recentGDMs = gdms.slice(0, 4);

  if (loadingUser || loadingGDMs) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-sky-600 to-sky-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Ship className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{vessel?.name || 'Embarcação'}</h1>
              <p className="text-sky-100">
                {vessel?.code} | {vessel?.type || 'Tipo não definido'}
              </p>
            </div>
          </div>
          <Link to={createPageUrl('CreateGDM')}>
            <Button className="bg-white text-sky-700 hover:bg-sky-50">
              <Plus className="h-4 w-4 mr-2" />
              Nova GDM
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total de GDMs"
          value={stats.total}
          icon={FileText}
          color="sky"
        />
        <StatsCard
          title="Aguardando Aprovação"
          value={stats.pending}
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Em Andamento"
          value={stats.inProgress}
          icon={FileText}
          color="purple"
        />
        <StatsCard
          title="Concluídas"
          value={stats.completed}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Recent GDMs */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">Minhas GDMs Recentes</h2>
          <Link to={createPageUrl('VesselGDMs')}>
            <Button variant="outline">
              Ver todas <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recentGDMs.map((gdm) => (
            <GDMCard key={gdm.id} gdm={gdm} />
          ))}
        </div>

        {recentGDMs.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">Nenhuma GDM criada ainda</p>
              <Link to={createPageUrl('CreateGDM')}>
                <Button className="bg-sky-600 hover:bg-sky-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira GDM
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm bg-slate-50">
        <CardHeader>
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to={createPageUrl('CreateGDM')}>
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <Plus className="h-5 w-5 mr-3 text-sky-600" />
                <div className="text-left">
                  <p className="font-medium">Nova GDM</p>
                  <p className="text-sm text-slate-500">Criar guia de desembarque</p>
                </div>
              </Button>
            </Link>
            <Link to={createPageUrl('VesselGDMs')}>
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <FileText className="h-5 w-5 mr-3 text-purple-600" />
                <div className="text-left">
                  <p className="font-medium">Minhas GDMs</p>
                  <p className="text-sm text-slate-500">Ver todas as guias</p>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}