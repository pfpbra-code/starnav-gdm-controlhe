import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import {
  SUPPLIER_ITEM_STATUS,
  SUPPLIER_ITEM_STATUS_COLORS,
  supplierItemStatusKey,
  formatBRL,
} from '@/lib/supplierControl';

const fmtDateTime = (value) =>
  value ? format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—';

const fmtDate = (value) =>
  value ? format(new Date(value), 'dd/MM/yyyy', { locale: ptBR }) : '—';

const ACTION_LABELS = {
  approve: 'Aprovado pelo Coordenador',
  reject: 'Reprovado pelo Coordenador',
  confirm_receipt: 'Recebimento confirmado (Almoxarifado)',
  report_not_received: 'Não recebido (Almoxarifado)',
  confirm_disembark: 'Desembarque confirmado (Embarcação)',
  reschedule_disembark: 'Desembarque reprogramado (Embarcação)',
  confirm_stock_return: 'Devolução ao estoque confirmada',
  authorize_discard: 'Descarte autorizado (Manutenção)',
  confirm_discard: 'Descarte confirmado (Almoxarifado)',
  complete: 'Item finalizado',
  cancel: 'Item cancelado',
  advance_treatment: 'Avanço de tratativa (Serviços)',
  select_supplier: 'Fornecedor definido (Serviços)',
  attach_shipping_proof: 'Comprovante de envio anexado (Almoxarifado)',
  attach_quote: 'Cotação anexada (Serviços)',
  maintenance_decision: 'Decisão da Manutenção sobre a cotação',
  renegotiate_quote: 'Nova proposta inserida (Serviços)',
  register_supplier_return: 'NF de retorno registrada (Serviços)',
  confirm_supplier_return: 'Retorno confirmado (Almoxarifado)',
  start_repair: 'Reparo iniciado (Serviços)',
};

function HistoryRow({ itemId }) {
  const { data: histories = [], isLoading } = useQuery({
    queryKey: ['itemHistory', itemId],
    queryFn: () => base44.entities.GDMItemHistory.filter({ item_id: itemId }),
    enabled: !!itemId,
  });

  if (isLoading) return <Skeleton className="h-20 w-full" />;

  return (
    <div className="space-y-2">
      {histories.length === 0 && (
        <p className="text-sm text-slate-500">Nenhum registro de histórico.</p>
      )}
      {histories.map((h) => (
        <div
          key={h.id}
          className="flex flex-col md:flex-row md:items-start gap-1 md:gap-4 p-2 rounded-lg bg-slate-50"
        >
          <span className="text-xs text-slate-500 md:w-36 shrink-0">
            {fmtDateTime(h.created_date)}
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800">
              {ACTION_LABELS[h.action] || h.action}
            </p>
            {h.observation && <p className="text-sm text-slate-600">Obs.: {h.observation}</p>}
          </div>
          <span className="text-xs text-slate-500 md:text-right md:w-52 shrink-0">
            {h.user_email}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Todas as cotações preservadas: no item (fluxo atual) e na GDM (legado). */
function QuotesPanel({ item, gdm }) {
  const itemQuotes = item?.quotes_history || [];
  const gdmQuotes = [...(gdm?.proposals || []), ...(gdm?.quotes_history || [])];
  const allQuotes = [
    ...itemQuotes.map((q) => ({ ...q, registered_by: q.registered_by, date: q.registered_at })),
    ...gdmQuotes.map((q) => ({
      ...q,
      date: q.proposal_date || q.preserved_at || null,
    })),
  ];
  if (allQuotes.length === 0) return null;
  return (
    <div className="mt-4 p-3 rounded-lg border border-slate-200 bg-slate-50">
      <p className="text-sm font-semibold text-slate-700 flex items-center gap-1 mb-2">
        <FileText className="h-4 w-4 text-sky-600" />
        Cotações e propostas preservadas ({allQuotes.length})
      </p>
      <div className="space-y-1">
        {allQuotes.map((q, idx) => (
          <div
            key={idx}
            className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-sm"
          >
            <span className="md:w-32 shrink-0 font-medium">{formatBRL(q.quote_value)}</span>
            <span className="text-slate-500 flex-1">
              {q.supplier_name || item?.supplier_name || gdm?.supplier_name || '—'}
              {q.outcome ? ` — desfecho: ${q.outcome}` : ''}
              {q.discount_percentage ? ` (desconto solicitado: ${q.discount_percentage}%)` : ''}
              {q.reason ? ` — ${q.reason}` : ''}
            </span>
            <span className="text-xs text-slate-400 md:w-56 shrink-0">
              {q.date ? fmtDateTime(q.date) : ''}
              {q.registered_by ? ` • ${q.registered_by}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Fornecedores anteriores (ciclos encerrados — histórico nunca removido). */
function PreviousSuppliers({ item }) {
  const previous = item?.previous_suppliers || [];
  if (previous.length === 0) return null;
  return (
    <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
      <p className="text-sm font-semibold text-amber-900 mb-1">
        Fornecedores anteriores ({previous.length})
      </p>
      {previous.map((p, idx) => (
        <p key={idx} className="text-xs text-amber-800">
          {p.supplier_name} · enviado {fmtDate(p.sent_at)} · retorno {fmtDate(p.returned_at)}
          {p.reason ? ` · ${p.reason}` : ''}
        </p>
      ))}
    </div>
  );
}

/**
 * Equipamentos vinculados ao fornecedor (rastreabilidade total):
 * GDM, embarcação, envio, situação, valor, prazo, responsável interno,
 * histórico completo e cotações preservadas.
 */
export default function SupplierEquipmentTable({ items, gdms }) {
  const [expandedId, setExpandedId] = useState(null);
  const gdmById = new Map((gdms || []).map((g) => [g.id, g]));

  if (!items || items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500">Nenhum equipamento vinculado a este fornecedor.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-8" />
            <TableHead>GDM</TableHead>
            <TableHead>Embarcação</TableHead>
            <TableHead>Equipamento</TableHead>
            <TableHead>Nº Série</TableHead>
            <TableHead>Envio</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Valor Cotação</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead>Resp. Interno</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const gdm = gdmById.get(item.gdm_id);
            const statusKey = supplierItemStatusKey(item, gdm);
            const expanded = expandedId === item.id;
            const quoteValue = item.quote_value ?? gdm?.quote_value;
            const quoteDeadline = item.quote_deadline ?? gdm?.expected_return_date;
            return (
              <React.Fragment key={item.id}>
                <TableRow
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                >
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      {expanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{gdm?.gdm_number || '—'}</TableCell>
                  <TableCell>{item.vessel_name || gdm?.vessel_name || '—'}</TableCell>
                  <TableCell>
                    <p className="font-medium">{item.equipment_name}</p>
                    {item.os_number && (
                      <p className="text-xs text-slate-500">OS {item.os_number}</p>
                    )}
                  </TableCell>
                  <TableCell>{item.serial_number || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {fmtDateTime(item.sent_to_supplier_at)}
                  </TableCell>
                  <TableCell>
                    {statusKey && (
                      <Badge className={SUPPLIER_ITEM_STATUS_COLORS[statusKey]}>
                        {SUPPLIER_ITEM_STATUS[statusKey]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{quoteValue ? formatBRL(quoteValue) : '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{quoteDeadline ? fmtDate(quoteDeadline) : '—'}</TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {item.shipping_proof_by || item.sent_by || item.supplier_selected_by || '—'}
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow>
                    <TableCell colSpan={10} className="bg-slate-50/50">
                      <HistoryRow itemId={item.id} />
                      <QuotesPanel item={item} gdm={gdm} />
                      <PreviousSuppliers item={item} />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}