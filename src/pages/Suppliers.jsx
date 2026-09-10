import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/hooks/usePermissions';
import { buildSupplierStats, formatBRL } from '@/lib/supplierControl';
import SupplierControlKpis from '@/components/suppliers/SupplierControlKpis';
import SupplierDialog from '@/components/suppliers/SupplierDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Building2, Edit, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Fornecedores — centro interno de controle e rastreabilidade.
 * Sem acesso de fornecedores ao sistema: apenas perfis autorizados
 * pelo ADM consultam os indicadores e o histórico dos equipamentos.
 */
export default function Suppliers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('manage_suppliers');

  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const { data: items = [] } = useQuery({
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

  // Sincronização em tempo real: vínculos de itens atualizam os indicadores.
  useEffect(() => {
    const unsubscribe = base44.entities.GDMItem.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
      queryClient.invalidateQueries({ queryKey: ['gdmItemHistories'] });
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const stats = useMemo(
    () => buildSupplierStats({ suppliers, items, gdms, histories }),
    [suppliers, items, gdms, histories]
  );

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editing
        ? base44.entities.Supplier.update(editing.id, data)
        : base44.entities.Supplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(editing ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!');
      setDialogOpen(false);
      setEditing(null);
    },
    onError: () => toast.error('Erro ao salvar fornecedor'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fornecedor removido!');
      setDeleting(null);
    },
    onError: () => toast.error('Erro ao remover fornecedor'),
  });

  const filteredStats = stats.filter((row) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const s = row.supplier;
    return (
      s.company_name?.toLowerCase().includes(term) ||
      s.trading_name?.toLowerCase().includes(term) ||
      s.cnpj?.includes(term)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fornecedores</h1>
          <p className="text-slate-500 mt-1">
            Centro interno de controle — {suppliers.length} fornecedores cadastrados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
            <Lock className="h-3 w-3 mr-1" />
            Sem acesso externo
          </Badge>
          {canManage && (
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Fornecedor
            </Button>
          )}
        </div>
      </div>

      {/* Indicadores internos */}
      <SupplierControlKpis stats={stats} />

      {/* Busca */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela de fornecedores */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Fornecedor</TableHead>
                <TableHead>Em posse</TableHead>
                <TableHead>Aguard. Cotação</TableHead>
                <TableHead>Em Reparo</TableHead>
                <TableHead>Aguard. Retorno</TableHead>
                <TableHead>Finalizados</TableHead>
                <TableHead>Valor em Orçamento</TableHead>
                {canManage && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStats.map((row) => (
                <TableRow
                  key={row.supplier.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => navigate(`/SupplierDetail?id=${row.supplier.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-sky-50 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-sky-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {row.supplier.trading_name || row.supplier.company_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          CNPJ {row.supplier.cnpj} • {row.supplier.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{row.inPossession}</TableCell>
                  <TableCell>
                    {row.awaitingQuote > 0 ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                        {row.awaitingQuote}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.inRepair > 0 ? (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        {row.inRepair}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.awaitingReturn > 0 ? (
                      <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                        {row.awaitingReturn}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">{row.completed}</TableCell>
                  <TableCell className="font-medium">{formatBRL(row.totalValue)}</TableCell>
                  {canManage && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Editar"
                          onClick={() => {
                            setEditing(row.supplier);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Remover"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeleting(row.supplier)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 8 : 7} className="h-32 text-center">
                    <Building2 className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500">
                      Nenhum fornecedor encontrado. Clique em uma linha para ver os detalhes.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <SupplierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={editing}
        onSubmit={(data) => saveMutation.mutate(data)}
        isSaving={saveMutation.isPending}
      />

      {/* Confirmação de remoção */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 space-y-4">
              <p className="font-medium">Remover fornecedor?</p>
              <p className="text-sm text-slate-500">
                {deleting.company_name} — o histórico dos equipamentos permanece preservado
                nas GDMs.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleting(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(deleting.id)}
                  disabled={deleteMutation.isPending}
                >
                  Remover
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}