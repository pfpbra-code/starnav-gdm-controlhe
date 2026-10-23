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
import { Truck, Search } from 'lucide-react';
import {
  possessionItems,
  followUpRow,
  formatDateBR,
  DEADLINE_STATES,
  SUPPLIER_ITEM_STATUS,
  SUPPLIER_ITEM_STATUS_COLORS,
} from '@/lib/supplierControl';

/**
 * Follow-up de Fornecedores — todos os equipamentos em posse dos fornecedores,
 * com dias em posse, dias restantes e situação automática de prazo.
 */
export default function SupplierFollowUp({ items, gdms }) {
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

  const supplierOptions = useMemo(
    () => [...new Set(rows.map((r) => r.supplierName))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [rows],
  );
  const vesselOptions = useMemo(
    () => [...new Set(rows.map((r) => r.vesselName))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [rows],
  );
  const statusOptions = useMemo(
    () => [...new Set(rows.map((r) => r.statusKey).filter(Boolean))],
    [rows],
  );

  const filtered = useMemo(() => {
    const eq = equipmentTerm.toLowerCase().trim();
    const gn = gdmTerm.toLowerCase().trim();
    return rows.filter((r) => {
      if (supplierF !== 'all' && r.supplierName !== supplierF) return false;
      if (vesselF !== 'all' && r.vesselName !== vesselF) return false;
      if (statusF !== 'all' && r.statusKey !== statusF) return false;
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
                    {SUPPLIER_ITEM_STATUS[s] || s}
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
            Período filtra pela data de envio ao fornecedor. {filtered.length} equipamento(s) em
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
                <TableHead>Prazo prometido</TableHead>
                <TableHead>Retorno previsto</TableHead>
                <TableHead>Status atual</TableHead>
                <TableHead>Dias em posse</TableHead>
                <TableHead>Dias restantes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const ds = DEADLINE_STATES[r.deadlineKey];
                return (
                  <TableRow key={r.item.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{r.supplierName}</TableCell>
                    <TableCell>{r.equipment}</TableCell>
                    <TableCell className="text-slate-500">{r.serialNumber}</TableCell>
                    <TableCell>{r.gdmNumber}</TableCell>
                    <TableCell className="text-slate-500">{r.vesselName}</TableCell>
                    <TableCell>{formatDateBR(r.sentAt)}</TableCell>
                    <TableCell>{formatDateBR(r.promisedDeadline)}</TableCell>
                    <TableCell>{formatDateBR(r.expectedReturn)}</TableCell>
                    <TableCell>
                      {r.statusKey ? (
                        <Badge
                          variant="outline"
                          className={SUPPLIER_ITEM_STATUS_COLORS[r.statusKey] || ''}
                        >
                          {SUPPLIER_ITEM_STATUS[r.statusKey] || r.statusKey}
                        </Badge>
                      ) : (
                        r.item.status
                      )}
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
                        <span className="text-slate-400">Sem prazo</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center">
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