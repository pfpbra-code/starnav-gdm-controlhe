import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlarmClock } from 'lucide-react';
import { possessionItems, followUpRow, formatDateBR, DEADLINE_STATES } from '@/lib/supplierControl';

/**
 * Cobrar Retorno — visão automática dos equipamentos próximos do vencimento
 * do prazo de retorno ou já atrasados, agrupados por urgência.
 */
export default function SupplierCollectReturn({ items, gdms }) {
  const rows = useMemo(() => {
    const gdmById = new Map((gdms || []).map((g) => [g.id, g]));
    return possessionItems(items).map((i) => followUpRow(i, gdmById.get(i.gdm_id)));
  }, [items, gdms]);

  const buckets = useMemo(() => {
    const due = rows.filter((r) => r.dueDate);
    const byUrgency = (a, b) =>
      (a.daysOverdue || 0) > (b.daysOverdue || 0)
        ? -1
        : (a.daysRemaining ?? 0) < (b.daysRemaining ?? 0)
          ? -1
          : 0;
    return [
      {
        key: 'overdue',
        title: 'Atrasados',
        rows: due.filter((r) => r.deadlineKey === 'overdue').sort(byUrgency),
      },
      {
        key: 'near7',
        title: 'Vence em até 7 dias',
        rows: due.filter((r) => r.deadlineKey === 'near7').sort(byUrgency),
      },
      {
        key: 'near15',
        title: 'Vence em até 15 dias',
        rows: due.filter((r) => r.deadlineKey === 'near15').sort(byUrgency),
      },
    ];
  }, [rows]);

  const onTimeCount = rows.filter((r) => r.deadlineKey === 'on_time' && r.dueDate).length;
  const noDeadline = rows.filter((r) => !r.dueDate).length;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-2 font-medium text-slate-700">
            <AlarmClock className="h-4 w-4 text-sky-600" />
            {rows.length} equipamentos em posse de fornecedores
          </span>
          <span className="text-slate-500">
            <span className="font-semibold text-green-700">{onTimeCount}</span> dentro do prazo
          </span>
          <span className="text-slate-500">
            <span className="font-semibold text-red-700">{buckets[0].rows.length}</span> atrasados
          </span>
          {noDeadline > 0 && (
            <span className="text-slate-400">
              {noDeadline} aguardando previsão de retorno (pós-OC)
            </span>
          )}
        </CardContent>
      </Card>

      {buckets.map(({ key, title, rows: bucketRows }) => {
        const meta = DEADLINE_STATES[key];
        return (
          <Card key={key} className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span>{meta.emoji}</span>
                {title}
                <Badge variant="outline" className={meta.badge}>
                  {bucketRows.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>SN</TableHead>
                      <TableHead>Data de envio</TableHead>
                      <TableHead>OC</TableHead>
                      <TableHead>Prazo acordado</TableHead>
                      <TableHead>{key === 'overdue' ? 'Dias em atraso' : 'Dias restantes'}</TableHead>
                      <TableHead>Responsável interno</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bucketRows.map((r) => (
                      <TableRow key={r.item.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{r.supplierName}</TableCell>
                        <TableCell>{r.equipment}</TableCell>
                        <TableCell className="text-slate-500">{r.serialNumber}</TableCell>
                        <TableCell>{formatDateBR(r.sentAt)}</TableCell>
                        <TableCell>
                          {r.ocNumber ? (
                            <span>
                              {r.ocNumber}
                              <span className="block text-xs text-slate-500">
                                {formatDateBR(r.ocDate)}
                              </span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>{formatDateBR(r.dueDate)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={meta.badge}>
                            {key === 'overdue'
                              ? `${r.daysOverdue} dias em atraso`
                              : `${r.daysRemaining} dias`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">{r.sentBy}</TableCell>
                      </TableRow>
                    ))}
                    {bucketRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-16 text-center text-slate-500">
                          Nenhum equipamento nesta categoria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}