import React from 'react';
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
import { MessageSquarePlus } from 'lucide-react';
import { QUOTE_CONTACT_LABELS } from '@/lib/quoteFollowup';
import { itemResponsible } from '@/lib/gdmItems';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

/** Listagem de follow-up: itens aguardando cotação com a idade da pendência. */
export default function QuoteFollowUpTable({ rows, gdmById, lastFollowupByItem, canFollowUp, onFollowUp }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>GDM</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Equipamento</TableHead>
            <TableHead>SN</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Data de Envio</TableHead>
            <TableHead className="text-center">Dias</TableHead>
            <TableHead>Responsável Atual</TableHead>
            <TableHead>Último Follow-up</TableHead>
            <TableHead>Status</TableHead>
            {canFollowUp && <TableHead className="text-right">Ação</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ item, days, label, className }) => {
            const gdm = gdmById[item.gdm_id];
            const last = lastFollowupByItem[item.id];
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  {gdm?.gdm_number || '—'}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {String(item.item_number ?? 1).padStart(2, '0')}
                </TableCell>
                <TableCell className="min-w-[180px]">{item.equipment_name || '—'}</TableCell>
                <TableCell className="whitespace-nowrap">{item.serial_number || '—'}</TableCell>
                <TableCell className="min-w-[150px]">{item.supplier_name || '—'}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(item.sent_to_supplier_at)}
                </TableCell>
                <TableCell className="text-center font-semibold">{days}</TableCell>
                <TableCell className="whitespace-nowrap">{itemResponsible(item)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-slate-600">
                  {last
                    ? `${formatDate(last.contact_date)} · ${
                        QUOTE_CONTACT_LABELS[last.contact_channel] || last.contact_channel
                      }`
                    : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={className}>
                    {label}
                  </Badge>
                </TableCell>
                {canFollowUp && (
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => onFollowUp(item)}>
                      <MessageSquarePlus className="h-4 w-4 mr-1" />
                      Registrar Follow-up
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}