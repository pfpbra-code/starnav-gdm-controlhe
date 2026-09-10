import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/hooks/usePermissions';
import { buildSupplierStats, formatBRL } from '@/lib/supplierControl';
import SupplierEquipmentTable from '@/components/suppliers/SupplierEquipmentTable';
import SupplierDialog from '@/components/suppliers/SupplierDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Building2, Mail, Phone, MapPin, User, Edit, CheckCircle } from 'lucide-react';

/**
 * Detalhes do fornecedor — consulta interna com rastreabilidade total:
 * equipamentos em posse, histórico completo por item e cotações preservadas.
 */
export default function SupplierDetail() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('manage_suppliers');
  const [editOpen, setEditOpen] = useState(false);

  const supplierId = new URLSearchParams(window.location.search).get('id');

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    enabled: !!supplierId,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['gdmItems'],
    queryFn: () => base44.entities.GDMItem.list('-updated_date', 500),
  });

  const { data: gdms = [] } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-updated_date', 300),
  });

  const { data: histories = [] } = useQuery({
    queryKey: ['gdmItemHistories'],
    queryFn: () => base44.entities.GDMItemHistory.list('-created_date', 1000),
  });

  // Tempo real: ações sobre itens refletem imediatamente aqui.
  useEffect(() => {
    const unsubscribe = base44.entities.GDMItem.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
      queryClient.invalidateQueries({ queryKey: ['gdmItemHistories'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const supplier = suppliers.find((s) => s.id === supplierId);
  const items = useMemo(
    () => allItems.filter((i) => i.supplier_id === supplierId),
    [allItems, supplierId]
  );
  const stats = useMemo(
    () =>
      buildSupplierStats({
        suppliers: supplier ? [supplier] : [],
        items,
        gdms,
        histories,
      }),
    [supplier, items, gdms, histories]
  );
  const stat = stats[0];

  const updateMutation = {
    mutate: async (data) => {
      await base44.entities.Supplier.update(supplier.id, data);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setEditOpen(false);
    },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-16 text-center">
          <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">Fornecedor não encontrado</h2>
          <Link to="/Suppliers" className="text-sky-600 hover:underline mt-2 inline-block">
            Voltar para Fornecedores
          </Link>
        </CardContent>
      </Card>
    );
  }

  const completedItems = items.filter((i) => i.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/Suppliers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {supplier.trading_name || supplier.company_name}
            </h1>
            <p className="text-slate-500">{supplier.company_name}</p>
          </div>
        </div>
        {canManage && (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dados cadastrais */}
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-sky-600" />
              Dados do Fornecedor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex items-center gap-2 text-slate-600">
              <Mail className="h-4 w-4 text-slate-400" />
              {supplier.email}
            </p>
            {supplier.phone && (
              <p className="flex items-center gap-2 text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" />
                {supplier.phone}
              </p>
            )}
            {supplier.contact_name && (
              <p className="flex items-center gap-2 text-slate-600">
                <User className="h-4 w-4 text-slate-400" />
                {supplier.contact_name}
              </p>
            )}
            {supplier.address && (
              <p className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400" />
                {supplier.address}
              </p>
            )}
            <p className="text-slate-600">CNPJ: {supplier.cnpj}</p>
            <Badge
              className={
                supplier.status === 'active'
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }
            >
              {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
            </Badge>
          </CardContent>
        </Card>

        {/* Histórico de serviços executados */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Histórico de Serviços Executados
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Em posse</p>
              <p className="text-2xl font-bold text-slate-900">{stat?.inPossession ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Finalizados</p>
              <p className="text-2xl font-bold text-emerald-600">{completedItems.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tempo médio de resposta</p>
              <p className="text-2xl font-bold text-slate-900">
                {stat?.avgResponseDays !== null && stat?.avgResponseDays !== undefined
                  ? `${stat.avgResponseDays.toFixed(1)} dias`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Valor em orçamento</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatBRL(stat?.totalValue)}
              </p>
            </div>
            {completedItems.length > 0 && (
              <div className="col-span-2 md:col-span-4">
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">
                  Últimos equipamentos finalizados
                </p>
                <div className="space-y-1">
                  {completedItems.slice(0, 5).map((i) => (
                    <p key={i.id} className="text-sm text-slate-600">
                      {i.equipment_name}
                      {i.serial_number ? ` (S/N ${i.serial_number})` : ''}
                      {i.completed_at
                        ? ` — finalizado em ${new Date(i.completed_at).toLocaleDateString('pt-BR')}`
                        : ''}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Equipamentos e rastreabilidade */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Equipamentos e Rastreabilidade</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <SupplierEquipmentTable items={items} gdms={gdms} />
        </CardContent>
      </Card>

      <SupplierDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        supplier={supplier}
        onSubmit={(data) => updateMutation.mutate(data)}
      />
    </div>
  );
}