import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { OT_OPEN_STATES } from '@/lib/workOrders';
import { Clock, FolderOpen, FolderCheck, PackageCheck, AlertTriangle, CalendarCheck } from 'lucide-react';

function isSameMonth(d, ref) {
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}
function isSameQuarter(d, ref) {
  return d.getFullYear() === ref.getFullYear() && Math.floor(d.getMonth() / 3) === Math.floor(ref.getMonth() / 3);
}
function isSameYear(d, ref) {
  return d.getFullYear() === ref.getFullYear();
}

function KpiCard({ icon, value, label, tone, children }) {
  return (
    <Card className={`border shadow-sm ${tone || ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
          <span className="text-slate-400">{icon}</span>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Indicadores do Controle de OT: abertas, fechadas, recebidas com OT aberta,
 * vencidas, fechadas no mês e tempo médio para fechamento (mensal,
 * trimestral e anual).
 */
export default function WorkOrderKpis({ rows }) {
  const [period, setPeriod] = useState('month');
  const now = new Date();

  const open = useMemo(() => rows.filter((r) => r.isOpen), [rows]);
  const closed = useMemo(() => rows.filter((r) => !r.isOpen), [rows]);
  const receivedOpen = useMemo(
    () => open.filter((r) => r.item.return_received_at),
    [open],
  );
  const overdue = useMemo(() => open.filter((r) => r.overdue), [open]);
  const closedThisMonth = useMemo(
    () => closed.filter((r) => r.item.ot_closed_at && isSameMonth(new Date(r.item.ot_closed_at), now)),
    [closed, now],
  );

  // KPI de performance: tempo médio para fechamento da OT (fechamento - abertura).
  const avgDays = useMemo(() => {
    const inPeriod = period === 'month' ? isSameMonth : period === 'quarter' ? isSameQuarter : isSameYear;
    const values = closed
      .filter((r) => r.item.ot_closed_at && inPeriod(new Date(r.item.ot_closed_at), now))
      .map((r) => r.cycleDays)
      .filter((d) => d !== null);
    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [closed, period, now]);

  const periodLabel =
    period === 'month' ? 'no mês' : period === 'quarter' ? 'no trimestre' : 'no ano';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <KpiCard icon={<FolderOpen className="h-5 w-5" />} value={open.length} label="OTs Abertas">
        <p className="text-[11px] text-amber-700 mt-1">
          {open.filter((r) => r.item.ot_status === 'open').length} aberta(s) ·{' '}
          {open.filter((r) => r.item.ot_status === 'in_service').length} em serviço
        </p>
      </KpiCard>
      <KpiCard icon={<FolderCheck className="h-5 w-5" />} value={closed.length} label="OTs Fechadas" />
      <KpiCard
        icon={<PackageCheck className="h-5 w-5" />}
        value={receivedOpen.length}
        label="Recebidos com OT Aberta"
        tone={receivedOpen.length > 0 ? 'border-red-200 bg-red-50' : ''}
      />
      <KpiCard
        icon={<AlertTriangle className="h-5 w-5" />}
        value={overdue.length}
        label="OTs Vencidas"
        tone={overdue.length > 0 ? 'border-red-200 bg-red-50' : ''}
      />
      <KpiCard icon={<CalendarCheck className="h-5 w-5" />} value={closedThisMonth.length} label="OTs Fechadas no Mês" />
      <KpiCard
        icon={<Clock className="h-5 w-5" />}
        value={avgDays === null ? '—' : `${avgDays.toFixed(1)} d`}
        label={`Tempo Médio de Fechamento ${periodLabel}`}
      >
        <div className="flex gap-1 mt-2">
          {[
            { v: 'month', l: 'Mês' },
            { v: 'quarter', l: 'Trim.' },
            { v: 'year', l: 'Ano' },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setPeriod(o.v)}
              className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                period === o.v
                  ? 'border-sky-500 bg-sky-50 text-sky-700 font-medium'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </KpiCard>
    </div>
  );
}