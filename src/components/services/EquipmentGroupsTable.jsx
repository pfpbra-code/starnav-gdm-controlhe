import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import InfoTooltip from '@/components/ui/InfoTooltip';

const ZERO = 'text-slate-300';

function Num({ value }) {
  return (
    <span className={cn('tabular-nums', !value ? ZERO : 'text-slate-900 font-medium')}>
      {value || '—'}
    </span>
  );
}

/**
 * Tabela de agrupamento por nomenclatura (§2): cada linha é um equipamento,
 * cada coluna uma categoria mutuamente exclusiva, contadas por unidade.
 * Clicar em uma nomenclatura filtra todo o dashboard.
 */
export default function EquipmentGroupsTable({ groups, selectedKey, onSelect }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[16rem]">Nomenclatura</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Em Reparo</TableHead>
                <TableHead className="text-right">Ag. Cotação</TableHead>
                <TableHead className="text-right">Ag. Aprovação</TableHead>
                <TableHead className="text-right">Ag. Fornecedor</TableHead>
                <TableHead className="text-right">Ag. Retorno</TableHead>
                <TableHead className="text-right">Finalizadas</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Descartadas</TableHead>
                <TableHead className="text-right">Atrasadas</TableHead>
                <TableHead className="text-right">Não identificadas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="py-10 text-center text-slate-500">
                    Nenhum equipamento corresponde aos filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => {
                  const t = group.totals;
                  return (
                    <TableRow
                      key={group.key}
                      onClick={() => onSelect(group.key)}
                      className={cn(
                        'cursor-pointer hover:bg-sky-50',
                        selectedKey === group.key && 'bg-sky-50',
                      )}
                    >
                      <TableCell>
                        <span className="font-medium">{group.name}</span>
                        {group.needsReview && (
                          <span className="inline-flex items-center gap-1 ml-2 align-middle">
                            <InfoTooltip
                              content="Existe outro agrupamento com a mesma nomenclatura normalizada, mas com identificador de cadastro diferente. Verifique a possibilidade de duplicidade de cadastro."
                              side="top"
                            />
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          </span>
                        )}
                        <span className="block text-xs text-slate-400">
                          {group.rows.length} item(ns) · {t.open} un. em processo ativo
                        </span>
                      </TableCell>
                      <TableCell className="text-right"><Num value={t.total} /></TableCell>
                      <TableCell className="text-right"><Num value={t.in_repair} /></TableCell>
                      <TableCell className="text-right"><Num value={t.awaiting_quote} /></TableCell>
                      <TableCell className="text-right"><Num value={t.awaiting_approval} /></TableCell>
                      <TableCell className="text-right"><Num value={t.awaiting_supplier} /></TableCell>
                      <TableCell className="text-right"><Num value={t.awaiting_return} /></TableCell>
                      <TableCell className="text-right"><Num value={t.finished} /></TableCell>
                      <TableCell className="text-right"><Num value={t.stock_returned} /></TableCell>
                      <TableCell className="text-right"><Num value={t.discarded} /></TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'tabular-nums',
                            t.overdue ? 'text-red-600 font-semibold' : ZERO,
                          )}
                        >
                          {t.overdue || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'tabular-nums',
                            t.unknown ? 'text-amber-600 font-semibold' : ZERO,
                          )}
                        >
                          {t.unknown || '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <p className="px-4 py-2 text-xs text-slate-400">
          Contagem por unidade (quantidade registrada de cada item), cada unidade em
          exatamente uma categoria. "Atrasadas" é uma marcação de prazo sobreposta,
          não uma categoria de status.
        </p>
      </CardContent>
    </Card>
  );
}