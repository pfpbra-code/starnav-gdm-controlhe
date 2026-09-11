import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  ExternalLink,
  Package,
} from 'lucide-react';
import {
  ITEM_DESTINATION_LABELS,
  ITEM_STATUS_LABELS,
  ITEM_STATUS_COLORS,
  itemResponsible,
  warrantyInfo,
  WARRANTY_STATUS_LABELS,
  returnDeadlineState,
} from '@/lib/gdmItems';
import WarrantyStatusBadge from './WarrantyStatusBadge';
import ItemHistoryTimeline from './ItemHistoryTimeline';

const SUPPLIER_DESTINATIONS = ['repair', 'certification'];
const CLOSED = ['completed', 'cancelled', 'rejected', 'discard_approved'];

function currency(v) {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function filterSelect(value, onChange, options, placeholder) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full md:w-[12rem]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Controle completo de todos os itens de Manutenção e Operações destinados a
 * Reparo ou Certificação — do recebimento inicial pelo Almoxarifado até a
 * conclusão do serviço, com garantia, valores, PWT/OC e histórico por item.
 */
export default function RepairControlPanel() {
  const [sectorFilter, setSectorFilter] = useState('all');
  const [vesselFilter, setVesselFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deadlineFilter, setDeadlineFilter] = useState('all');
  const [warrantyFilter, setWarrantyFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const { data: gdms = [], isLoading: loadingGdms } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-created_date', 200),
  });
  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['gdmItems'],
    queryFn: () => base44.entities.GDMItem.list('-created_date', 500),
  });

  const gdmById = useMemo(
    () => Object.fromEntries(gdms.map((g) => [g.id, g])),
    [gdms],
  );

  const supplierItems = useMemo(
    () => items.filter((i) => SUPPLIER_DESTINATIONS.includes(i.destination)),
    [items],
  );

  const vesselOptions = useMemo(() => {
    const seen = new Map();
    gdms.forEach((g) => {
      if (g.vessel_id && g.vessel_name && !seen.has(g.vessel_id)) {
        seen.set(g.vessel_id, g.vessel_name);
      }
    });
    return [
      { value: 'all', label: 'Todas as embarcações' },
      ...Array.from(seen, ([value, label]) => ({ value, label })),
    ];
  }, [gdms]);

  const supplierOptions = useMemo(() => {
    const seen = new Map();
    supplierItems.forEach((i) => {
      if (i.supplier_id && i.supplier_name && !seen.has(i.supplier_id)) {
        seen.set(i.supplier_id, i.supplier_name);
      }
    });
    return [
      { value: 'all', label: 'Todos os fornecedores' },
      ...Array.from(seen, ([value, label]) => ({ value, label })),
    ];
  }, [supplierItems]);

  const statusOptions = useMemo(() => {
    const seen = new Set(supplierItems.map((i) => i.status));
    return [
      { value: 'all', label: 'Todas as situações' },
      ...Array.from(seen).map((s) => ({
        value: s,
        label: ITEM_STATUS_LABELS[s] || s,
      })),
    ];
  }, [supplierItems]);

  const rows = useMemo(() => {
    let list = supplierItems
      .map((item) => ({ item, gdm: gdmById[item.gdm_id] }))
      .filter((r) => r.gdm);
    if (sectorFilter !== 'all') {
      list = list.filter((r) => r.item.destination === sectorFilter);
    }
    if (vesselFilter !== 'all') {
      list = list.filter((r) => r.item.vessel_id === vesselFilter);
    }
    if (supplierFilter !== 'all') {
      list = list.filter((r) => r.item.supplier_id === supplierFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.item.status === statusFilter);
    }
    if (deadlineFilter !== 'all') {
      list = list.filter((r) => returnDeadlineState(r.item) === deadlineFilter);
    }
    if (warrantyFilter !== 'all') {
      list = list.filter((r) => warrantyInfo(r.item).status === warrantyFilter);
    }
    if (search) {
      const t = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.gdm.gdm_number?.toLowerCase().includes(t) ||
          r.item.equipment_name?.toLowerCase().includes(t) ||
          r.item.equipment_code?.toLowerCase().includes(t) ||
          r.item.serial_number?.toLowerCase().includes(t) ||
          r.item.supplier_name?.toLowerCase().includes(t),
      );
    }
    return list.sort(
      (a, b) =>
        (CLOSED.includes(a.item.status) ? 1 : 0) - (CLOSED.includes(b.item.status) ? 1 : 0) ||
        (a.gdm.created_date < b.gdm.created_date ? 1 : -1),
    );
  }, [
    supplierItems,
    gdmById,
    sectorFilter,
    vesselFilter,
    supplierFilter,
    statusFilter,
    deadlineFilter,
    warrantyFilter,
    search,
  ]);

  const kpis = useMemo(() => {
    const active = supplierItems.filter((i) => !CLOSED.includes(i.status)).length;
    const activeWarranty = supplierItems.filter(
      (i) => warrantyInfo(i).status === 'active',
    ).length;
    const expiredWarranty = supplierItems.filter(
      (i) => warrantyInfo(i).status === 'expired',
    ).length;
    const overdue = supplierItems.filter(
      (i) => returnDeadlineState(i) === 'overdue',
    ).length;
    return { total: supplierItems.length, active, activeWarranty, expiredWarranty, overdue };
  }, [supplierItems]);

  if (loadingGdms || loadingItems) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Controle de Reparos e Certificações
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Acompanhamento completo de cada equipamento, do recebimento inicial pelo
          Almoxarifado até a conclusão do serviço, com garantia vinculada ao item.
        </p>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Itens em Reparo/Certificação', value: kpis.total },
          { label: 'Em andamento', value: kpis.active },
          { label: 'Garantia vigente', value: kpis.activeWarranty },
          { label: 'Garantia vencida', value: kpis.expiredWarranty },
          { label: 'Prazo de retorno vencido', value: kpis.overdue },
        ].map((k) => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-slate-900">{k.value}</p>
              <p className="text-xs text-slate-500 mt-1">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por GDM, equipamento, código, número de série ou fornecedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-2">
            {filterSelect(sectorFilter, setSectorFilter, [
              { value: 'all', label: 'Manutenção e Operações' },
              { value: 'repair', label: 'Manutenção (Reparo)' },
              { value: 'certification', label: 'Operações (Certificação)' },
            ], 'Setor')}
            {filterSelect(vesselFilter, setVesselFilter, vesselOptions, 'Embarcação')}
            {filterSelect(supplierFilter, setSupplierFilter, supplierOptions, 'Fornecedor')}
            {filterSelect(statusFilter, setStatusFilter, statusOptions, 'Situação')}
            {filterSelect(deadlineFilter, setDeadlineFilter, [
              { value: 'all', label: 'Todos os prazos' },
              { value: 'overdue', label: 'Prazo de retorno vencido' },
              { value: 'near', label: 'Prazo próximo (3 dias)' },
              { value: 'ok', label: 'Dentro do prazo' },
            ], 'Prazo de retorno')}
            {filterSelect(warrantyFilter, setWarrantyFilter, [
              { value: 'all', label: 'Todas as garantias' },
              { value: 'active', label: 'Garantia vigente' },
              { value: 'expired', label: 'Garantia vencida' },
              { value: 'pending', label: 'Aguardando início' },
              { value: 'none', label: 'Sem garantia informada' },
            ], 'Situação da garantia')}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de controle */}
      {rows.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">
              Nenhum equipamento em reparo ou certificação corresponde aos filtros.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GDM / Item</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Embarcação</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Fornecedor / Proposta</TableHead>
                    <TableHead>Valores</TableHead>
                    <TableHead>PWT / OC</TableHead>
                    <TableHead>Datas</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Garantia</TableHead>
                    <TableHead>Docs</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ item, gdm }) => {
                    const warranty = warrantyInfo(item);
                    const cycleQuotes = (item.quotes_history || []).filter(
                      (q) => q.supplier_id === item.supplier_id,
                    );
                    const initialValue = cycleQuotes.length
                      ? cycleQuotes[0].quote_value
                      : null;
                    const ocStatus = item.oc_approval_confirmed_at
                      ? 'Aprovada e enviada'
                      : item.oc_number
                        ? 'Aguardando aprovação'
                        : null;
                    const deadline = item.quote_deadline
                      ? new Date(`${item.quote_deadline}T23:59:59`)
                      : null;
                    const overdue = returnDeadlineState(item) === 'overdue';
                    const isOpen = expandedId === item.id;
                    return (
                      <TableRow key={item.id} className={isOpen ? 'bg-slate-50' : ''}>
                        <TableCell>
                          <span className="font-semibold text-sky-600">
                            {gdm.gdm_number}
                          </span>
                          <span className="block text-xs text-slate-500">
                            Item {String(item.item_number).padStart(2, '0')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium block">
                            {item.equipment_name}
                          </span>
                          <span className="text-xs text-slate-500 block">
                            {item.equipment_code && `Cód. ${item.equipment_code}`}
                            {item.equipment_code && item.serial_number && ' · '}
                            {item.serial_number && `S/N ${item.serial_number}`}
                          </span>
                        </TableCell>
                        <TableCell>{gdm.vessel_name || '—'}</TableCell>
                        <TableCell>
                          {ITEM_DESTINATION_LABELS[item.destination] || item.destination}
                        </TableCell>
                        <TableCell>
                          <span className="block">{item.supplier_name || '—'}</span>
                          <span className="text-xs text-slate-500 block">
                            {item.quote_proposal_number
                              ? `Proposta nº ${item.quote_proposal_number}`
                              : item.quote_document_url
                                ? 'Ver proposta'
                                : ''}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="block text-xs text-slate-500">
                            Inicial: {currency(initialValue)}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {item.discount_percentage
                              ? `Desconto: ${item.discount_percentage}%`
                              : 'Sem desconto'}
                          </span>
                          <span className="block text-xs font-medium text-slate-700">
                            Final: {currency(item.quote_value)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="block text-xs">
                            PWT: {item.pwt_number || '—'}
                          </span>
                          <span className="block text-xs">
                            OC: {item.oc_number || '—'}
                          </span>
                          {ocStatus && (
                            <span className="block text-xs text-slate-500">{ocStatus}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="block text-xs text-slate-500">
                            Envio:{' '}
                            {item.sent_to_supplier_at
                              ? format(new Date(item.sent_to_supplier_at), 'dd/MM/yyyy')
                              : '—'}
                          </span>
                          <span
                            className={`block text-xs ${overdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}
                          >
                            Retorno prev.:{' '}
                            {deadline ? format(deadline, 'dd/MM/yyyy') : '—'}
                            {overdue ? ' (vencido)' : ''}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-block text-xs px-2 py-1 rounded-full ${ITEM_STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-700'}`}
                          >
                            {ITEM_STATUS_LABELS[item.status] || item.status}
                          </span>
                          <span className="block text-xs text-slate-500 mt-1">
                            Resp.: {itemResponsible(item)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <WarrantyStatusBadge item={item} />
                          <span className="block text-xs text-slate-500 mt-1">
                            {warranty.days ? `${warranty.days} dias` : ''}
                          </span>
                          {warranty.start && (
                            <span className="block text-xs text-slate-500">
                              {format(warranty.start, 'dd/MM/yyyy')} →{' '}
                              {format(warranty.end, 'dd/MM/yyyy')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {item.return_receipt_nf_url && (
                              <a
                                href={item.return_receipt_nf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-600 hover:underline text-xs inline-flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" /> NF
                              </a>
                            )}
                            {item.return_laudo_url && (
                              <a
                                href={item.return_laudo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-600 hover:underline text-xs inline-flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" /> Laudo
                              </a>
                            )}
                            {!item.return_receipt_nf_url && !item.return_laudo_url && (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => setExpandedId(isOpen ? null : item.id)}
                            className="p-1 rounded hover:bg-slate-200"
                            title="Detalhes e histórico"
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-500" />
                            )}
                          </button>
                        </TableCell>
                        {isOpen && (
                          <TableCell className="bg-slate-50" colSpan={12}>
                            <div className="flex flex-col lg:flex-row gap-6 py-2">
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold mb-2">
                                  Histórico completo do item
                                </h4>
                                <ItemHistoryTimeline itemId={item.id} />
                              </div>
                              <div className="lg:w-72 space-y-3">
                                <div className="text-sm space-y-1">
                                  <p className="flex justify-between">
                                    <span className="text-slate-500">Garantia:</span>
                                    <span className="font-medium">
                                      {warranty.days
                                        ? `${warranty.days} dias`
                                        : WARRANTY_STATUS_LABELS.none}
                                    </span>
                                  </p>
                                  <p className="flex justify-between">
                                    <span className="text-slate-500">Início:</span>
                                    <span className="font-medium">
                                      {warranty.start
                                        ? format(warranty.start, 'dd/MM/yyyy HH:mm')
                                        : '—'}
                                    </span>
                                  </p>
                                  <p className="flex justify-between">
                                    <span className="text-slate-500">Término:</span>
                                    <span className="font-medium">
                                      {warranty.end
                                        ? format(warranty.end, 'dd/MM/yyyy HH:mm')
                                        : '—'}
                                    </span>
                                  </p>
                                </div>
                                <a
                                  href={createPageUrl(`GDMDetail?id=${gdm.id}`)}
                                  className="inline-flex items-center gap-1 text-sky-600 hover:underline text-sm"
                                >
                                  <Eye className="h-3.5 w-3.5" /> Ver GDM completa
                                </a>
                              </div>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}