import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, Wrench, TrendingUp } from 'lucide-react';

const currency = (v) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

// GDMs whose repair cost is considered "gasto" (aprovada em diante, tratativa reparo, com valor)
const COST_STATUSES = ['approved', 'pwt_issued', 'oc_issued', 'ot_issued', 'completed'];

export default function RepairCostPanel({ gdms = [] }) {
  const repairGdms = gdms.filter(
    (g) => g.treatment === 'repair' && COST_STATUSES.includes(g.status) && g.quote_value
  );

  const totalCost = repairGdms.reduce((sum, g) => sum + (g.quote_value || 0), 0);

  // Per equipment
  const perEquipment = React.useMemo(() => {
    const map = {};
    repairGdms.forEach((g) => {
      const key = g.equipment_name || 'Não informado';
      map[key] = (map[key] || 0) + (g.quote_value || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [repairGdms]);

  const topEquipment = perEquipment.slice(0, 6);

  // Monthly expense (last 12 months)
  const monthlyData = React.useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        name: format(d, 'MMM/yy', { locale: ptBR }),
        value: 0,
      });
    }
    repairGdms.forEach((g) => {
      const ref = g.completed_at || g.ot_issued_at || g.oc_issued_at || g.maintenance_decided_at || g.sent_to_supplier_date || g.disembark_date;
      if (!ref) return;
      const d = new Date(ref);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((x) => x.key === key);
      if (m) m.value += g.quote_value || 0;
    });
    return months.map((m) => ({ name: m.name, value: m.value }));
  }, [repairGdms]);

  // Period totals (current quarter / year)
  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const sumSince = (start) =>
  repairGdms
    .filter((g) => {
      const ref = g.completed_at || g.ot_issued_at || g.oc_issued_at || g.maintenance_decided_at || g.sent_to_supplier_date || g.disembark_date;
      return ref && new Date(ref) >= start;
    })
      .reduce((s, g) => s + (g.quote_value || 0), 0);

  const monthCost = sumSince(monthStart);
  const quarterCost = sumSince(quarterStart);
  const yearCost = sumSince(yearStart);

  return (
    <div className="space-y-6">
      {/* Total + periods */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Total gasto com reparos
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{currency(totalCost)}</p>
            <p className="text-xs text-slate-400 mt-1">{repairGdms.length} reparos considerados</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Wrench className="h-4 w-4 text-sky-600" />
              Gasto no mês
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{currency(monthCost)}</p>
            <p className="text-xs text-slate-400 mt-1">{format(now, 'MMMM', { locale: ptBR })}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Wrench className="h-4 w-4 text-indigo-600" />
              Gasto no trimestre
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{currency(quarterCost)}</p>
            <p className="text-xs text-slate-400 mt-1">Trimestre corrente</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Wrench className="h-4 w-4 text-purple-600" />
              Gasto no ano
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{currency(yearCost)}</p>
            <p className="text-xs text-slate-400 mt-1">{now.getFullYear()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-sky-600" />
            Despesas com Reparos por Mês (últimos 12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `R$ ${v}`} />
                <Tooltip formatter={(v) => currency(v)} />
                <Bar dataKey="value" fill="#0284c7" radius={[4, 4, 0, 0]} name="Despesa (R$)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Ranking de Equipamentos com Maior Custo de Manutenção</CardTitle>
        </CardHeader>
        <CardContent>
          {topEquipment.length === 0 ? (
            <p className="text-slate-500 text-sm py-6 text-center">Nenhum gasto com reparos registrado.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEquipment} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `R$ ${v}`} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={130} />
                  <Tooltip formatter={(v) => currency(v)} />
                  <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} name="Custo (R$)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}