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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Boxes, Repeat } from 'lucide-react';

export default function ManagerialEquipmentRanking({ equipment }) {
  const { ranking = [], manufacturers = [], reincidences = [] } = equipment || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Boxes className="h-5 w-5 text-purple-600" />
            Equipamentos Mais Recorrentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">Nenhum item no filtro atual.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                  <TableHead className="text-right">GDMs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.slice(0, 10).map((r, i) => (
                  <TableRow key={`${r.name}-${r.code}-${i}`}>
                    <TableCell>
                      <span className="font-medium text-slate-800">{r.name}</span>
                      {r.serial !== '—' && (
                        <span className="block text-xs text-slate-400">S/N {r.serial}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">{r.manufacturer}</TableCell>
                    <TableCell className="text-right font-semibold">{r.count}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-sm ${
                          r.gdmCount >= 2 ? 'text-amber-600 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        {r.gdmCount >= 2 && <Repeat className="h-3.5 w-3.5" />}
                        {r.gdmCount}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {reincidences.length > 0 && (
            <p className="text-xs text-amber-600 mt-3 flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5" />
              {reincidences.length} equipamento(s) com reincidência (2+ GDMs).
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Histórico de Movimentação por Fabricante
          </CardTitle>
        </CardHeader>
        <CardContent>
          {manufacturers.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">Nenhum item no filtro atual.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={manufacturers.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    width={110}
                  />
                  <Tooltip />
                  <Bar dataKey="count" name="Itens" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}