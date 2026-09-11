import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import SupplierFlowActionDialog from '@/components/gdm/SupplierFlowActionDialog';
import { SECTOR_DESTINATIONS } from '@/lib/permissions';
import { formatBRL } from '@/lib/supplierControl';
import {
  Wrench,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Percent,
  FileText,
  ShieldX,
} from 'lucide-react';

/**
 * ANÁLISE DE COTAÇÕES — centraliza a decisão da Gerência de Manutenção
 * sobre cotações, por item e por setor (Manutenção / Operações).
 * Usa o mesmo fluxo único dos demais módulos (gdmItemAction), então
 * aprovar/reprovar aqui atualiza GDM, Serviços, Almoxarifado e Dashboard.
 */
const SECTOR_TABS = [
  {
    key: 'maintenance',
    label: 'Manutenção',
    viewPermission: 'view_maintenance_quotes',
    approvePermission: 'approve_maintenance_quote',
    destinations: SECTOR_DESTINATIONS.maintenance,
  },
  {
    key: 'operations',
    label: 'Operações',
    viewPermission: 'view_operations_quotes',
    approvePermission: 'approve_operations_quote',
    destinations: SECTOR_DESTINATIONS.operations,
  },
];

export default function MaintenanceAnalysis({ embedded = false }) {
  const { hasPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [pending, setPending] = useState(null); // { item, action, label }

  const visibleTabs = SECTOR_TABS.filter((t) => hasPermission(t.viewPermission));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key || 'maintenance');
  const tab = visibleTabs.find((t) => t.key === activeTab) || visibleTabs[0];

  const { data: gdms = [], isLoading } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-created_date', 200),
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['gdmItems'],
    queryFn: () => base44.entities.GDMItem.list('-created_date', 500),
  });

  const gdmById = useMemo(() => new Map(gdms.map((g) => [g.id, g])), [gdms]);

  const tabItems = useMemo(
    () =>
      items.filter(
        (i) => tab && tab.destinations.includes(i.destination),
      ),
    [items, tab],
  );

  // Cotações aguardando decisão da Gerência.
  const analysisItems = useMemo(
    () => tabItems.filter((i) => i.status === 'awaiting_maintenance_authorization'),
    [tabItems],
  );

  const decidedItems = useMemo(
    () => tabItems.filter((i) => i.maintenance_decision),
    [tabItems],
  );

  const filteredItems = useMemo(() => {
    if (!searchTerm) return analysisItems;
    const term = searchTerm.toLowerCase();
    return analysisItems.filter((i) => {
      const gdm = gdmById.get(i.gdm_id);
      return (
        gdm?.gdm_number?.toLowerCase().includes(term) ||
        i.equipment_name?.toLowerCase().includes(term) ||
        i.supplier_name?.toLowerCase().includes(term)
      );
    });
  }, [analysisItems, searchTerm, gdmById]);

  const canApprove = !!tab && hasPermission(tab.approvePermission);

  if (isLoading || loadingItems) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 mb-4" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!visibleTabs.length) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-16 text-center">
          <ShieldX className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">Acesso Negado</h2>
          <p className="text-slate-500 mt-1">
            Você não possui permissão para analisar cotações. Solicite acesso ao administrador.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header (oculto quando embutido na aba Manutenção) */}
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Análise de Cotações</h1>
          <p className="text-slate-500 mt-1">
            Decisão da Gerência por item: aprovar, solicitar desconto ou reprovar (com troca de
            fornecedor ou descarte). Todo o histórico é preservado.
          </p>
        </div>
      )}

      {/* Abas por setor */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {visibleTabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.key === 'maintenance' ? (
                <Wrench className="h-4 w-4 mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Stats da aba ativa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Wrench className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900">{analysisItems.length}</p>
                <p className="text-sm text-amber-700">Aguardando Análise</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">
                  {decidedItems.filter((i) => i.maintenance_decision === 'approved').length}
                </p>
                <p className="text-sm text-green-700">Aprovadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-900">
                  {decidedItems.filter((i) => i.maintenance_decision === 'rejected').length}
                </p>
                <p className="text-sm text-red-700">Reprovadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por GDM, equipamento ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela de cotações por item */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>GDM</TableHead>
                <TableHead>Item / Equipamento</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Valor Cotação</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const gdm = gdmById.get(item.gdm_id);
                return (
                  <TableRow key={item.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{gdm?.gdm_number || '—'}</p>
                        <p className="text-sm text-slate-500">{item.vessel_name || gdm?.vessel_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{item.equipment_name}</p>
                      {item.serial_number && (
                        <p className="text-xs text-slate-500">S/N {item.serial_number}</p>
                      )}
                    </TableCell>
                    <TableCell>{item.supplier_name || '—'}</TableCell>
                    <TableCell className="font-semibold text-green-700">
                      {item.quote_value != null ? formatBRL(item.quote_value) : '—'}
                    </TableCell>
                    <TableCell>{item.quote_deadline || '—'}</TableCell>
                    <TableCell>
                      {item.quote_document_url ? (
                        <a
                          href={item.quote_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 hover:text-sky-700"
                        >
                          <FileText className="h-4 w-4" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canApprove && (
                          <Button
                            size="sm"
                            className="bg-sky-600 hover:bg-sky-700"
                            onClick={() =>
                              setPending({
                                item,
                                action: 'maintenance_decision',
                                label: `Analisar Cotação — ${item.equipment_name}`,
                              })
                            }
                          >
                            <Wrench className="h-4 w-4 mr-1" />
                            Analisar
                          </Button>
                        )}
                        <Link to={`/GDMDetail?id=${item.gdm_id}`}>
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Wrench className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500">Nenhuma cotação aguardando análise</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Diálogo de decisão (mesma função gdmItemAction dos demais módulos) */}
      <SupplierFlowActionDialog pending={pending} onClose={() => setPending(null)} />
    </div>
  );
}