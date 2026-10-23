import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import ItemActionRouter from '@/components/gdm/ItemActionRouter';
import { OT_STATUS_LABELS, OT_STATUS_COLORS } from '@/lib/gdmItems';
import OtStatusActionDialog from './OtStatusActionDialog';
import { Eye, PackageX, Play, RotateCcw } from 'lucide-react';

function formatDate(value) {
  return value ? format(new Date(value), 'dd/MM/yyyy') : '—';
}

/**
 * Tabela de controle de OT — rastreio completo de cada Ordem de Trabalho.
 * O fechamento da OT pelo Almoxarifado usa a mesma função (gdmItemAction)
 * de todos os módulos, com assinatura eletrônica e registro no histórico.
 */
export default function WorkOrderTable({ rows, canCloseOT, canManageOT }) {
  const [pending, setPending] = useState(null);
  const [pendingOtStatus, setPendingOtStatus] = useState(null);

  const canClose = (item) =>
    canCloseOT &&
    item.ot_number &&
    item.ot_status !== 'closed' &&
    item.return_received_at;

  return (
    <>
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-12 text-center">
              <PackageX className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">
                Nenhuma OT corresponde aos filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OT</TableHead>
                    <TableHead>GDM / Item</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Embarcação</TableHead>
                    <TableHead>Data de Envio</TableHead>
                    <TableHead>Data de Recebimento</TableHead>
                    <TableHead>Responsável pelo Recebimento</TableHead>
                    <TableHead>Status da OT</TableHead>
                    <TableHead>Dias em Aberto</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ item, gdm, gdm_number, daysOpen, overdue }) => (
                    <TableRow
                      key={item.id}
                      className={item.ot_status === 'awaiting_close' ? 'bg-red-50/60' : ''}
                    >
                      <TableCell className="font-semibold text-sky-700">
                        {item.ot_number}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{gdm_number}</span>
                        <span className="block text-xs text-slate-500">
                          Item {String(item.item_number).padStart(2, '0')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium block">{item.equipment_name}</span>
                        <span className="text-xs text-slate-500 block">
                          {item.serial_number ? `SN ${item.serial_number}` : ''}
                        </span>
                      </TableCell>
                      <TableCell>{item.supplier_name || '—'}</TableCell>
                      <TableCell>{item.vessel_name || gdm?.vessel_name || '—'}</TableCell>
                      <TableCell>{formatDate(item.sent_to_supplier_at)}</TableCell>
                      <TableCell>{formatDate(item.return_received_at)}</TableCell>
                      <TableCell>
                        <span className="text-xs">{item.return_received_by || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                            OT_STATUS_COLORS[item.ot_status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {OT_STATUS_LABELS[item.ot_status] || item.ot_status || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-medium ${
                            item.ot_status !== 'closed' && overdue
                              ? 'text-red-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {daysOpen === null
                            ? '—'
                            : item.ot_status === 'closed'
                              ? `${daysOpen} dia(s) (ciclo total)`
                              : `${daysOpen} dia(s)`}
                          {item.ot_status !== 'closed' && overdue ? ' · vencida' : ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canManageOT && item.ot_status === 'open' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setPendingOtStatus({
                                  item,
                                  ot_status: 'in_service',
                                  label: 'Iniciar Serviço da OT',
                                })
                              }
                              title="OT passa para Em Serviço"
                            >
                              <Play className="h-3.5 w-3.5" />
                              Iniciar Serviço
                            </Button>
                          )}
                          {canManageOT && item.ot_status === 'in_service' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setPendingOtStatus({
                                  item,
                                  ot_status: 'open',
                                  label: 'Retornar OT para Aberta',
                                })
                              }
                              title="OT volta para Aberta"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Reabrir
                            </Button>
                          )}
                          {canClose(item) && (
                            <Button
                              size="sm"
                              onClick={() =>
                                setPending({ item, action: 'close_ot', label: 'Fechar OT' })
                              }
                            >
                              Fechar OT
                            </Button>
                          )}
                          <a
                            href={createPageUrl(`GDMDetail?id=${item.gdm_id}`)}
                            title="Ver GDM"
                            className="p-1.5 rounded hover:bg-slate-200 text-slate-500"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <ItemActionRouter pending={pending} onClose={() => setPending(null)} />
      <OtStatusActionDialog
        pending={pendingOtStatus}
        onClose={() => setPendingOtStatus(null)}
      />
    </>
  );
}