import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Truck, Search, History } from 'lucide-react';
import {
  possessionItems,
  followUpRow,
  formatDateBR,
  DEADLINE_STATES,
} from '@/lib/supplierControl';
import { ITEM_STATUS_LABELS, ITEM_STATUS_COLORS } from '@/lib/gdmItems';

/**
 * Follow-up de Fornecedores — equipamentos em posse dos fornecedores, com OC,
 * previsão de retorno (registrada exclusivamente após a emissão da OC),
 * dias restantes/atraso e histórico de alterações de prazo.
 */
export default function SupplierFollowUp({ items, gdms, histories = [] }) {
  const [supplierF, setSupplierF] = useState('all');
  const [vesselF, setVesselF] = useState('all');
  const [statusF, setStatusF] = useState('all');
  const [equipmentTerm, setEquipmentTerm] = useState('');
  const [gdmTerm, setGdmTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const rows = useMemo(() => {
    const gdmById = new Map((gdms || []).map((g) => [g.id, g]));
    return possessionItems(items).map((i) => followUpRow(i, gdmById.get(i.gdm_id)));
  }, [items, gdms]);

  // Histórico de alterações de previsão de retorno por item (ação Serviços).
  const deadlineChangesByItem = useMemo(() => {
    const map = new Map();
    (histories || [])
      .filter((h) => h.action === 'set_return_deadline' && h.item_id)
      .forEach((h) => {
        if (!map.has(h.item_id)) map.set(h.item_id, []);
        map.get(h.item_id).push(h);
      });
    map.forEach((list) =>
      list.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
    );
    return map;
  }, [histories]);

  const supplierOptions = useMemo(
    () => [...new Set(rows.map((r) => r.supplierName))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [rows],
  );
  const vesselOptions = useMemo(
    () => [...new Set(rows.map((r) => r.vesselName))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [rows],
  );
  // Status exibidos: o próprio status do item (fonte única do fluxo), sempre
  // refletindo a etapa real do processo.
  const statusOptions = useMemo(
    () => [...new Set(rows.map((r) => r.item.status).filter(Boolean))],
    [rows],
  );

  const filtered = useMemo(() => {
    const eq = equipmentTerm.toLowerCase().trim();
    const gn = gdmTerm.toLowerCase().trim();
    return rows.filter((r) => {
      if (supplierF !== 'all' && r.supplierName !== supplierF) return false;
      if (vesselF !== 'all' && r.vesselName !== vesselF) return false;
      if (statusF !== 'all' && r.item.status !== statusF) return false;
      if (eq && !`${r.equipment} ${r.serialNumber}`.toLowerCase().includes(eq)) return false;
      if (gn && !r.gdmNumber.toLowerCase().includes(gn)) return false;
      if (fromDate && (!r.sentAt || r.sentAt.slice(0, 10) < fromDate)) return false;
      if (toDate && (!r.sentAt || r.sentAt.slice(0, 10) > toDate)) return false;
      return true;
    });
  }, [rows, supplierF, vesselF, statusF, equipmentTerm, gdmTerm, fromDate, toDate]);

  const hasFilter =
    supplierF !== 'all' ||
    vesselF !== 'all' ||
    statusF !== 'all' ||
    !!equipmentTerm.trim() ||
    !!gdmTerm.trim() ||
    !!fromDate ||
    !!toDate;

  const clearFilters = () => {
    setSupplierF('all');
    setVesselF('all');
    setStatusF('all');
    setEquipmentTerm('');
    setGdmTerm('');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <Select value={supplierF} onValueChange={setSupplierF}>
              <SelectTrigger>
                <SelectValue placeholder="Fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os fornecedores</SelectItem>
                {supplierOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Equipamento ou SN..."
              value={equipmentTerm}
              onChange={(e) => setEquipmentTerm(e.target.value)}
            />
            <Input
              placeholder="GDM..."
              value={gdmTerm}
              onChange={(e) => setGdmTerm(e.target.value)}
            />
            <Select value={vesselF} onValueChange={setVesselF}>
              <SelectTrigger>
                <SelectValue placeholder="Embarcação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as embarcações</SelectItem>
                {vesselOptions.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusF} onValueChange={setStatusF}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ITEM_STATUS_LABELS[s] || s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              title="Período de envio — início"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              title="Período de envio — fim"
            />
            {hasFilter && (
              <Button variant="outline" onClick={clearFilters} className="h-9">
                <Search className="h-4 w-4 mr-2" />
                Limpar filtros
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Período filtra pela data de envio ao fornecedor. A previsão de retorno e a contagem
            de prazo iniciam somente após a emissão da OC. {filtered.length} equipamento(s) em
            posse de fornecedores.
          </p>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Fornecedor</TableHead>
                <TableHead>Equipamento</TableHead>
                <TableHead>SN</TableHead>
                <TableHead>GDM</TableHead>
                <TableHead>Embarcação</TableHead>
                <TableHead>Envio</TableHead>
                <TableHead>OC</TableHead>
                <TableHead>Data da OC</TableHead>
                <TableHead>Prazo (dias)</TableHead>
                <TableHead>Retorno previsto</TableHead>
                <TableHead>Status atual</TableHead>
                <TableHead>Dias em posse</TableHead>
                <TableHead>Dias restantes</TableHead>
                <TableHead>Alterações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const ds = DEADLINE_STATES[r.deadlineKey];
                const changes = deadlineChangesByItem.get(r.item.id) || [];
                return (
                  <TableRow key={r.item.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{r.supplierName}</TableCell>
                    <TableCell>{r.equipment}</TableCell>
                    <TableCell className="text-slate-500">{r.serialNumber}</TableCell>
                    <TableCell>{r.gdmNumber}</TableCell>
                    <TableCell className="text-slate-500">{r.vesselName}</TableCell>
                    <TableCell>{formatDateBR(r.sentAt)}</TableCell>
                    <TableCell className="font-medium">{r.ocNumber || '—'}</TableCell>
                    <TableCell>{formatDateBR(r.ocDate)}</TableCell>
                    <TableCell>{r.prazoDays ? `${r.prazoDays} dias` : '—'}</TableCell>
                    <TableCell>{formatDateBR(r.expectedReturn)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={ITEM_STATUS_COLORS[r.item.status] || ''}
                      >
                        {ITEM_STATUS_LABELS[r.item.status] || r.item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.daysInPossession === null ? '—' : `${r.daysInPossession} dias`}
                    </TableCell>
                    <TableCell>
                      {r.deadlineKey === 'overdue' ? (
                        <Badge variant="outline" className={ds.badge}>
                          {ds.emoji} {r.daysOverdue} dias em atraso
                        </Badge>
                      ) : r.dueDate ? (
                        <Badge variant="outline" className={ds.badge}>
                          {ds.emoji} {r.daysRemaining} dias
                        </Badge>
                      ) : (
                        <span className="text-slate-400">Sem previsão</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {changes.length > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                              <History className="h-3 w-3 mr-1" />
                              {changes.length}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-3" align="start">
                            <p className="text-xs font-semibold text-slate-700 mb-2">
                              Histórico de alterações de prazo
                            </p>
                            {changes.map((h) => (
                              <div
                                key={h.id}
                                className="text-xs border-b border-slate-100 last:border-0 py-1.5"
                              >
                                <p className="font-medium text-slate-700">
                                  {formatDateBR(h.created_date)} — {h.user_email}
                                </p>
                                <p className="text-slate-500">
                                  Novo prazo: {h.data?.expected_return_date || '—'}
                                  {h.data?.return_deadline_days
                                    ? ` (${h.data.return_deadline_days} dias)`
                                    : ''}
                                </p>
                                {h.observation && (
                                  <p className="text-slate-500 italic">“{h.observation}”</p>
                                )}
                              </div>
                            ))}
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={14} className="h-32 text-center">
                    <Truck className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500">
                      Nenhum equipamento em posse de fornecedores com os filtros atuais.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}