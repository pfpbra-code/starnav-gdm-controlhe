import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, DollarSign, Percent, Handshake, Trophy } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORY_LABELS = {
  navigation: 'Navegação',
  communication: 'Comunicação',
  safety: 'Segurança',
  deck: 'Convés',
  engine: 'Motor',
  electrical: 'Elétrico',
  hydraulic: 'Hidráulico',
  other: 'Outro',
};

const fmtBRL = (v) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function groupSum(rows, key) {
  const map = {};
  rows.forEach((r) => {
    const k = r[key] || '—';
    map[k] = (map[k] || 0) + r.economy;
  });
  return Object.entries(map)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

function BreakdownList({ title, rows, limit = 6 }) {
  const list = rows.slice(0, limit);
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {list.length === 0 && (
          <p className="text-sm text-slate-400">Sem negociações registradas</p>
        )}
        {list.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate min-w-0">{r.name}</span>
            <span className="font-medium text-emerald-700 whitespace-nowrap">
              {fmtBRL(r.total)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * ECONOMIA OBTIDA EM NEGOCIAÇÕES — calculada por item individual (GDMItem é
 * a fonte de verdade: cada item registra as cotações do seu ciclo com o
 * fornecedor vigente em quotes_history).
 * Regra: para todo item que teve desconto solicitado ou proposta renegociada,
 * Economia = Primeira cotação do ciclo atual − Valor negociado vigente.
 */
export default function NegotiationSavings({ gdms = [] }) {
  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['gdmItems'],
    queryFn: () => base44.entities.GDMItem.list('-created_date', 500),
  });

  const { data: equipment = [], isLoading: loadingEquipment } = useQuery({
    queryKey: ['equipmentList'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const negotiations = useMemo(() => {
    const categoryById = {};
    equipment.forEach((e) => {
      categoryById[e.id] = e.category || 'other';
    });
    const gdmNumberById = {};
    gdms.forEach((g) => {
      gdmNumberById[g.id] = g.gdm_number;
    });

    const rows = [];
    items.forEach((item) => {
      if (!['repair', 'certification'].includes(item.destination)) return;
      const history = Array.isArray(item.quotes_history) ? item.quotes_history : [];
      // Cotações do ciclo atual (fornecedor vigente do item).
      const cycleQuotes = history.filter(
        (q) => q.supplier_id === item.supplier_id && q.quote_value != null,
      );
      if (!cycleQuotes.length) return;

      // Houve negociação quando o ciclo teve desconto solicitado, proposta
      // renegociada ou mais de uma proposta do mesmo fornecedor.
      const hadDiscount =
        cycleQuotes.length > 1 ||
        (typeof item.discount_percentage === 'number' && item.discount_percentage > 0) ||
        cycleQuotes.some(
          (q) => q.outcome === 'discount_requested' || q.outcome === 'renegotiated',
        );
      if (!hadDiscount) return;

      const initial = cycleQuotes[0].quote_value;
      const final =
        item.quote_value != null
          ? item.quote_value
          : cycleQuotes[cycleQuotes.length - 1].quote_value;
      if (!initial || !final || final >= initial) return;

      rows.push({
        id: item.id,
        gdm_number: gdmNumberById[item.gdm_id] || '—',
        vessel: item.vessel_name || '—',
        supplier: item.supplier_name || '—',
        equipment: item.equipment_name || '—',
        category: CATEGORY_LABELS[categoryById[item.equipment_id]] || CATEGORY_LABELS.other,
        initial,
        final,
        economy: initial - final,
        discountPct: ((initial - final) / initial) * 100,
        date: cycleQuotes[cycleQuotes.length - 1].registered_at || item.updated_date,
      });
    });
    return rows;
  }, [items, equipment, gdms]);

  const totalEconomy = negotiations.reduce((s, n) => s + n.economy, 0);
  const avgPct = negotiations.length
    ? negotiations.reduce((s, n) => s + n.discountPct, 0) / negotiations.length
    : 0;

  const byMonth = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        name: format(d, 'MMM', { locale: ptBR }),
        economy: 0,
        count: 0,
      });
    }
    negotiations.forEach((n) => {
      if (!n.date) return;
      const d = new Date(n.date);
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) {
        m.economy += n.economy;
        m.count += 1;
      }
    });
    return months;
  }, [negotiations]);

  const ranking = [...negotiations].sort((a, b) => b.economy - a.economy).slice(0, 5);

  if (loadingItems || loadingEquipment) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-emerald-600" />
          Economia Obtida em Negociações
        </h2>
        <p className="text-sm text-slate-500">
          Por item: valor inicial cotado no ciclo do fornecedor menos o último valor
          negociado, em cotações com desconto solicitado ou proposta renegociada.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-emerald-900 truncate">{fmtBRL(totalEconomy)}</p>
                <p className="text-xs text-emerald-700">Economia Total Acumulada</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-100">
                <Handshake className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{negotiations.length}</p>
                <p className="text-xs text-slate-500">Negociações Realizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Percent className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{avgPct.toFixed(1)}%</p>
                <p className="text-xs text-slate-500">Desconto Médio (Serviços)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Trophy className="h-5 w-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900 truncate">
                  {fmtBRL(ranking[0]?.economy)}
                </p>
                <p className="text-xs text-slate-500">Maior Desconto Obtido</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {negotiations.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Handshake className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">
              Nenhuma negociação com desconto registrada até o momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Economia por mês */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Economia por Mês</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value) => [fmtBRL(value), 'Economia']}
                    />
                    <Bar dataKey="economy" fill="#10b981" radius={[4, 4, 0, 0]} name="Economia" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quebras: embarcação, fornecedor, categoria */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BreakdownList title="Economia por Embarcação" rows={groupSum(negotiations, 'vessel')} />
            <BreakdownList title="Economia por Fornecedor" rows={groupSum(negotiations, 'supplier')} />
            <BreakdownList title="Economia por Categoria de Equipamento" rows={groupSum(negotiations, 'category')} />
          </div>

          {/* Ranking dos maiores descontos */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Maiores Descontos Obtidos</CardTitle>
              <CardDescription>Top 5 negociações por valor economizado</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>GDM / Item</TableHead>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Embarcação</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Valor Inicial</TableHead>
                      <TableHead>Valor Negociado</TableHead>
                      <TableHead>Economia</TableHead>
                      <TableHead>Desconto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((n) => (
                      <TableRow key={n.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{n.gdm_number}</TableCell>
                        <TableCell>{n.equipment}</TableCell>
                        <TableCell>{n.vessel}</TableCell>
                        <TableCell>{n.supplier}</TableCell>
                        <TableCell>{n.category}</TableCell>
                        <TableCell>{fmtBRL(n.initial)}</TableCell>
                        <TableCell>{fmtBRL(n.final)}</TableCell>
                        <TableCell className="font-semibold text-emerald-700">
                          {fmtBRL(n.economy)}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            {n.discountPct.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}