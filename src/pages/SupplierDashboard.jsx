import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatsCard from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Package,
  Clock,
  CheckCircle,
  DollarSign,
  ArrowRight,
  FileText,
  Building2
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export default function SupplierDashboard() {
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: supplier } = useQuery({
    queryKey: ['supplier', user?.supplier_id],
    queryFn: () => base44.entities.Supplier.filter({ id: user?.supplier_id }).then(res => res[0]),
    enabled: !!user?.supplier_id,
  });

  const { data: gdms = [], isLoading: loadingGDMs } = useQuery({
    queryKey: ['supplierGDMs', user?.supplier_id],
    queryFn: () => base44.entities.GDM.filter({ supplier_id: user?.supplier_id }),
    enabled: !!user?.supplier_id,
  });

  const stats = {
    total: gdms.length,
    awaiting: gdms.filter(g => g.status === 'awaiting_quote').length,
    inAnalysis: gdms.filter(g => g.status === 'quote_analysis').length,
    approved: gdms.filter(g => g.status === 'approved').length,
  };

  const recentGDMs = gdms.slice(0, 5);

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
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{supplier?.company_name || 'Fornecedor'}</h1>
            <p className="text-indigo-100">Portal do Fornecedor - Starnav Serviços Marítimos</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Materiais"
          value={stats.total}
          icon={Package}
          color="indigo"
        />
        <StatsCard
          title="Aguardando Cotação"
          value={stats.awaiting}
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Em Análise"
          value={stats.inAnalysis}
          icon={DollarSign}
          color="purple"
        />
        <StatsCard
          title="Aprovados"
          value={stats.approved}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Recent Materials */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Materiais Recentes</CardTitle>
          <Link to={createPageUrl('SupplierMaterials')}>
            <Button variant="ghost" size="sm">
              Ver todos <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentGDMs.map((gdm) => (
              <div
                key={gdm.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium">{gdm.equipment_name}</p>
                    <p className="text-sm text-slate-500">
                      GDM: {gdm.gdm_number} | {gdm.vessel_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={gdm.status} />
                  <Link to={createPageUrl(`GDMDetail?id=${gdm.id}`)}>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}

            {recentGDMs.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum material recebido ainda</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Cards */}
      {stats.awaiting > 0 && (
        <Card className="border-0 shadow-sm bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900">Cotações Pendentes</h3>
                  <p className="text-sm text-amber-700">
                    Você tem {stats.awaiting} material(is) aguardando cotação
                  </p>
                </div>
              </div>
              <Link to={createPageUrl('SupplierMaterials')}>
                <Button className="bg-amber-600 hover:bg-amber-700">
                  Enviar Cotações
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}