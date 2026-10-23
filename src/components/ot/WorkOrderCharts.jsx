import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function ChartCard({ title, subtitle, children, className }) {
  return (
    <Card className={`border shadow-sm ${className || ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-800">{title}</CardTitle>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </CardHeader>
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function RankingCard({ title, entries, emptyMessage }) {
  const max = entries.length ? entries[0].total : 1;
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 && (
          <p className="text-xs text-slate-400">{emptyMessage}</p>
        )}
        {entries.map((e, idx) => (
          <div key={e.name}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="font-medium text-slate-700 truncate pr-2">
                {idx + 1}. {e.name}
              </span>
              <span className="text-slate-500">{e.total} OT(s)</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full"
                style={{ width: `${Math.max(6, (e.total / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Gráficos do Controle de OT: abertas por fornecedor, fechadas por mês,
 * rankings de fornecedores e equipamentos e pendências de fechamento.
 */
export default function WorkOrderCharts({ rows }) {
  const open = useMemo(() => rows.filter((r) => r.isOpen), [rows]);
  const closed = useMemo(() => rows.filter((r) => !r.isOpen), [rows]);

  const openBySupplier = useMemo(() => {
    const map = new Map();
    open.forEach((r) => {
      const k = r.item.supplier_name || '—';
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map, ([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [open]);

  const closedByMonth = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: format(d, 'MMM/yy', { locale: ptBR }),
        total: 0,
      });
    }
    const byKey = Object.fromEntries(months.map((m) => [m.key, m]));
    closed.forEach((r) => {
      if (!r.item.ot_closed_at) return;
      const d = new Date(r.item.ot_closed_at);
      const m = byKey[`${d.getFullYear()}-${d.getMonth()}`];
      if (m) m.total += 1;
    });
    return months;
  }, [closed]);

  const supplierRanking = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const k = r.item.supplier_name || '—';
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map, ([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [rows]);

  const equipmentRanking = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const k = r.item.equipment_name || '—';
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map, ([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [rows]);

  const pendingClose = useMemo(
    () => open.filter((r) => r.item.ot_status === 'awaiting_close'),
    [open],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="OTs Abertas por Fornecedor"
          subtitle="Quantidade de OTs ainda não encerradas, por fornecedor"
        >
          <BarChart data={openBySupplier} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-15}
              height={50}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="total" name="OTs abertas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard
          title="OTs Fechadas por Mês"
          subtitle="Encerramentos de OT nos últimos 12 meses"
        >
          <BarChart data={closedByMonth} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-30} height={50} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="total" name="OTs fechadas" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingCard
          title="Ranking de Fornecedores por Quantidade de OTs"
          entries={supplierRanking}
          emptyMessage="Nenhuma OT registrada"
        />
        <RankingCard
          title="Ranking de Equipamentos por Quantidade de OTs"
          entries={equipmentRanking}
          emptyMessage="Nenhuma OT registrada"
        />
      </div>
      <Card className={`border shadow-sm ${pendingClose.length > 0 ? 'border-red-200' : ''}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">
            OTs Pendentes de Fechamento ({pendingClose.length})
          </CardTitle>
          <p className="text-xs text-slate-500">
            Equipamentos recebidos pelo Almoxarifado com a OT ainda aberta
          </p>
        </CardHeader>
        <CardContent>
          {pendingClose.length === 0 ? (
            <p className="text-xs text-slate-400">
              Nenhuma OT pendente de fechamento — todos os equipamentos recebidos tiveram suas OTs encerradas.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {pendingClose.map((r) => (
                <li
                  key={r.item.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2"
                >
                  <span className="font-semibold text-red-800">OT {r.item.ot_number}</span>
                  <span className="text-slate-700">
                    {r.item.equipment_name}
                    {r.item.serial_number ? ` · SN ${r.item.serial_number}` : ''}
                  </span>
                  <span className="text-slate-500">
                    {r.item.supplier_name || '—'} · GDM {r.gdm_number}
                  </span>
                  <span className="text-red-700 font-medium">
                    Recebido em{' '}
                    {r.item.return_received_at
                      ? format(new Date(r.item.return_received_at), 'dd/MM/yyyy')
                      : '—'}{' '}
                    · {r.daysOpen} dia(s) com OT aberta
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}