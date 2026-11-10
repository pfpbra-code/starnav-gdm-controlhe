import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { fastestSuppliers, slowestSuppliers } from '@/lib/quoteFollowup';

const days = (v) => (v != null ? `${v.toFixed(1)} d` : '—');

function RankingList({ title, icon, rows, tone, emptyMessage }) {
  return (
    <div>
      <h4 className={`flex items-center gap-2 text-sm font-semibold ${tone}`}>
        {icon}
        {title}
      </h4>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">{emptyMessage}</p>
      ) : (
        <ol className="mt-2 space-y-1">
          {rows.map((s, idx) => (
            <li key={s.name} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-slate-700">
                {idx + 1}. {s.name}
              </span>
              <span className="whitespace-nowrap text-xs text-slate-500">
                {s.avgDays != null ? `média ${days(s.avgDays)}` : `${s.awaiting} aguardando`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Desempenho dos fornecedores nas cotações: tempo de resposta e rankings. */
export default function QuoteSupplierPerformance({ suppliers }) {
  const fastest = fastestSuppliers(suppliers);
  const slowest = slowestSuppliers(suppliers);
  const rows = suppliers
    .filter((s) => s.avgDays != null || s.awaiting > 0)
    .sort((a, b) => (b.avgDays || 0) - (a.avgDays || 0));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Desempenho dos Fornecedores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RankingList
            title="Mais Rápidos"
            icon={<TrendingUp className="h-4 w-4" />}
            tone="text-emerald-700"
            rows={fastest}
            emptyMessage="Nenhuma cotação concluída ainda."
          />
          <RankingList
            title="Mais Lentos"
            icon={<TrendingDown className="h-4 w-4" />}
            tone="text-red-700"
            rows={slowest}
            emptyMessage="Nenhum fornecedor com pendência ou atraso."
          />
        </div>

        {rows.length > 0 && (
          <div className="overflow-x-auto border-t border-slate-100 pt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-center">Cotações Enviadas</TableHead>
                  <TableHead className="text-center">Tempo Médio de Retorno</TableHead>
                  <TableHead className="text-center">Aguardando Agora</TableHead>
                  <TableHead className="text-center">Maior Espera</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-center">{s.responses}</TableCell>
                    <TableCell className="text-center">{days(s.avgDays)}</TableCell>
                    <TableCell className="text-center">{s.awaiting}</TableCell>
                    <TableCell className="text-center">
                      {s.maxWaitingDays ? `${s.maxWaitingDays} d` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}