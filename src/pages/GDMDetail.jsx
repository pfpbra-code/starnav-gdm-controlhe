import React, { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import GDMTimeline from '@/components/gdm/GDMTimeline';
import GDMPdfButton from '@/components/gdm/GDMPdfButton';
import GDMItemsPanel from '@/components/gdm/GDMItemsPanel';
import GDMItemsSummary from '@/components/gdm/GDMItemsSummary';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Ship,
  Package,
  Calendar,
  Hash,
  FileText,
  ArrowLeft,
  History,
  Image,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Skeleton } from "@/components/ui/skeleton";
import {
  STATUS_LABELS,
  STEP_NAMES,
  ROLE_LABELS,
} from '@/lib/gdmWorkflow';
import { ITEM_STATUS_LABELS } from '@/lib/gdmItems';
import { Badge } from "@/components/ui/badge";

export default function GDMDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const gdmId = urlParams.get('id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: gdm, isLoading } = useQuery({
    queryKey: ['gdm', gdmId],
    queryFn: () => base44.entities.GDM.filter({ id: gdmId }).then(res => res[0]),
    enabled: !!gdmId,
  });

  const { data: gdmItems = [] } = useQuery({
    queryKey: ['gdmItems', gdmId],
    queryFn: () => base44.entities.GDMItem.filter({ gdm_id: gdmId }, 'item_number'),
    enabled: !!gdmId,
  });

  // Etapa atual derivada dos itens (o status geral acompanha os itens)
  const currentStep = useMemo(() => {
    const items = gdmItems || [];
    if (!items.length) return null;
    const closed = ['completed', 'cancelled', 'rejected', 'discard_approved'];
    const openItems = items.filter((i) => !closed.includes(i.status));
    if (!openItems.length) {
      return { label: 'Concluída', step: 'Todos os itens foram finalizados' };
    }
    const statuses = [...new Set(openItems.map((i) => i.status))];
    if (statuses.length === 1) {
      return {
        label: ITEM_STATUS_LABELS[statuses[0]] || statuses[0],
        step: `${openItems.length} ${openItems.length === 1 ? 'item nesta etapa' : 'itens nesta etapa'}`,
      };
    }
    return {
      label: 'Em Andamento',
      step: `${openItems.length} itens em ${statuses.length} etapas distintas — acompanhe o status de cada item`,
    };
  }, [gdmItems]);

  // Real-time: reflect status changes live
  useEffect(() => {
    if (!gdmId) return;
    const unsubscribe = base44.entities.GDM.subscribe((event) => {
      if (event?.data?.id === gdmId || event?.id === gdmId) {
        queryClient.invalidateQueries({ queryKey: ['gdm', gdmId] });
      }
    });
    return unsubscribe;
  }, [gdmId, queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!gdm) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">GDM não encontrada</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(createPageUrl('GDMList'))}>
            Voltar para lista
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('GDMList'))}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">GDM {gdm.gdm_number}</h1>
            <div className="flex items-center gap-2 mt-1">
              {currentStep ? (
                <Badge className="bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100">
                  {currentStep.label}
                </Badge>
              ) : (
                <StatusBadge status={gdm.status} />
              )}
              <StatusBadge status={gdm.treatment} type="treatment" />
            </div>
          </div>
        </div>

        {/* Action Buttons based on status and role */}
        <div className="flex gap-3 items-center">
          <GDMPdfButton gdm={gdm} variant="outline" label="Gerar PDF" />
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GDMItemsSummary gdmId={gdmId} />
          <GDMItemsPanel gdmId={gdmId} user={user} gdm={gdm} />

          <Tabs defaultValue="details" className="space-y-6">
            <TabsList>
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="photos">Fotos</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Informações da GDM</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current step & responsible */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-sky-50 rounded-xl border border-sky-100">
                    <div>
                      <p className="text-xs text-sky-700 font-medium uppercase tracking-wide">Etapa atual do processo</p>
                      <p className="text-base font-semibold text-slate-900">
                        {currentStep ? currentStep.label : (STATUS_LABELS[gdm.status] || gdm.status)}
                      </p>
                      <p className="text-sm text-slate-600">
                        {currentStep ? currentStep.step : (STEP_NAMES[gdm.status] || '-')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-sky-600" />
                      <div>
                        <p className="text-xs text-slate-500">Responsável atual</p>
                        <p className="font-medium text-slate-900">
                          {user?.full_name || user?.email || '-'}
                        </p>
                        <p className="text-xs text-slate-500">{ROLE_LABELS[user?.role] || user?.role}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-sky-100 flex items-center justify-center">
                        <Ship className="h-5 w-5 text-sky-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Embarcação</p>
                        <p className="font-medium">{gdm.vessel_name || '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Package className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Equipamento</p>
                        <p className="font-medium">{gdm.equipment_name || '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Data de Desembarque</p>
                        <p className="font-medium">
                          {gdm.disembark_date
                            ? format(new Date(gdm.disembark_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                            : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Hash className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Número de Série</p>
                        <p className="font-medium">{gdm.serial_number || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {gdm.description && (
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Descrição</p>
                      <p className="text-slate-700 bg-slate-50 p-4 rounded-lg">{gdm.description}</p>
                    </div>
                  )}

                  {gdm.coordinator_notes && (
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Observações do Coordenador</p>
                      <p className="text-slate-700 bg-slate-50 p-4 rounded-lg">{gdm.coordinator_notes}</p>
                    </div>
                  )}

                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="photos">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Fotos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {gdm.photos && gdm.photos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {gdm.photos.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={url}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-40 object-cover rounded-lg hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma foto anexada</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>

        {/* Timeline */}
        <div>
          <Card className="border-0 shadow-sm sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GDMTimeline history={gdm.history} />
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}