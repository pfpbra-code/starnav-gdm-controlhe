import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { ITEM_STATUS_LABELS, ITEM_STATUS_COLORS, itemResponsible } from '@/lib/gdmItems';
import { itemQty, controlRowMeta } from '@/lib/equipmentRepairControl';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 100;

/**
 * Tabela detalhada das unidades e dos processos (§6): uma linha por item real
 * da GDM, com a quantidade registrada — sem inventar identificadores individuais.
 */
export default function EquipmentItemsTable({ rows }) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  const slice = rows.slice(0, visible);
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[14rem]">Nomenclatura</TableHead>
                <TableHead>Identificação</TableHead>
                <TableHead>GDM</TableHead>
                <TableHead>Embarcação</TableHead>
                <TableHead>Desembarque</TableHead>
                <TableHead className="text-right">Qtde</TableHead>
                <TableHead>Status atual</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Retorno previsto</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Última atualização</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="py-10 text-center text-slate-500">
                    Nenhum processo corresponde aos filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                slice.map(({ item, gdm }) => {
                  const meta = controlRowMeta({ item });
                  const detailUrl = createPageUrl(`GDMDetail?id=${gdm.id}`);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.equipment_name}</TableCell>
                      <TableCell>
                        <span className="text-xs block">
                          {item.equipment_code ? `Cód. ${item.equipment_code}` : '—'}
                        </span>
                        <span className="text-xs text-slate-500 block">
                          {item.serial_number ? `S/N ${item.serial_number}` : ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        <a
                          href={detailUrl}
                          className="font-semibold text-sky-600 hover:underline"
                        >
                          {gdm.gdm_number}
                        </a>
                        <span className="block text-xs text-slate-500">
                          Item {String(item.item_number || 1).padStart(2, '0')}
                        </span>
                      </TableCell>
                      <TableCell>{item.vessel_name || gdm.vessel_name || '—'}</TableCell>
                      <TableCell className="text-xs">
                        {gdm.disembark_date
                          ? format(new Date(`${gdm.disembark_date}T12:00:00`), 'dd/MM/yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {itemQty(item)}
                      </TableCell>
                      <TableCell>
                        <a href={detailUrl} title="Ver detalhes e histórico da etapa">
                          <span
                            className={cn(
                              'inline-block text-xs px-2 py-1 rounded-full',
                              ITEM_STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-700',
                            )}
                          >
                            {ITEM_STATUS_LABELS[item.status] || item.status}
                          </span>
                        </a>
                      </TableCell>
                      <TableCell className="text-xs">{itemResponsible(item)}</TableCell>
                      <TableCell className="text-xs">{item.supplier_name || '—'}</TableCell>
                      <TableCell className="text-xs">
                        {meta.deadline ? (
                          <span className={meta.overdue ? 'text-red-600 font-medium' : ''}>
                            {format(meta.deadline, 'dd/MM/yyyy')}
                          </span>
                        ) : (
                          <span className="text-slate-400">Prazo não informado</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {meta.overdue ? (
                          <span className="text-red-600 font-medium">
                            {meta.daysLate}d de atraso
                          </span>
                        ) : (
                          <span>{meta.daysOpen ?? '—'}d em aberto</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.updated_date
                          ? format(new Date(item.updated_date), 'dd/MM/yyyy HH:mm')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <a
                          href={detailUrl}
                          className="inline-flex items-center gap-1 text-sky-600 hover:underline text-xs"
                          title="Abrir detalhe da GDM"
                        >
                          <Eye className="h-3.5 w-3.5" /> GDM
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {rows.length > visible && (
          <div className="p-3 border-t border-slate-100 text-center">
            <Button size="sm" variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Mostrar mais ({rows.length - visible} restantes)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}