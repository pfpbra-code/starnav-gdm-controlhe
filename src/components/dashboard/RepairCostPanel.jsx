import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, Wrench, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const currency = (v) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

// O custo é o valor da cotação APROVADA de cada item (GDMItem é a fonte de
// verdade — a cotação é registrada individualmente por item). Contam como
// gasto os itens com cotação aprovada em diante, até a conclusão.
const COST_STATUSES = [
  'repair_approved',
  'awaiting_pwt',
  'awaiting_oc_issuance',
  'awaiting_oc_approval',
  'awaiting_return',
  'in_treatment',
  'completed',
];

// Data de referência do gasto: da aprovação da cotação em diante.
function costDate(item) {
  return (
    item.completed_at ||
    item.oc_approval_confirmed_at ||
    item.oc_issued_at ||
    item.pwt_issued_at ||
    item.quote_attached_at ||
    item.created_date
  );
}

export default function RepairCostPanel() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['gdmItems'],
    queryFn: () => base44.entities.GDMItem.list('-created_date', 500),
  });

  const repairItems = React.useMemo(
    () =>
      items.filter(
        (i) =>
          i.destination === 'repair' &&
          COST_STATUSES.includes(i.status) &&
          Number(i.quote_value) > 0,
      ),
    [items],
  );

  const totalCost = repairItems.reduce((sum, i) => sum + (i.quote_value || 0), 0);

  // Per equipment
  const perEquipment = React.useMemo(() => {
    const map = {};
    repairItems.forEach((i) => {
      const key = i.equipment_name || 'Não informado';
      map[key] = (map[key] || 0) + (i.quote_value || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [repairItems]);

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
    repairItems.forEach((i) => {
      const ref = costDate(i);
      if (!ref) return;
      const d = new Date(ref);
      if (isNaN(d.getTime())) return;
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.value += i.quote_value || 0;
    });
    return months;
  }, [repairItems]);

  // Period totals (month / quarter / year)
  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const sumSince = (start) =>
    repairItems
      .filter((i) => {
        const ref = costDate(i);
        return ref && new Date(ref) >= start;
      })
      .reduce((s, i) => s + (i.quote_value || 0), 0);

  const monthCost = sumSince(monthStart);
  const quarterCost = sumSince(quarterStart);
  const yearCost = sumSince(yearStart);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

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
            <p className="text-xs text-slate-400 mt-1">{repairItems.length} reparos considerados</p>
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