import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Undo2, Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SECTORS } from '@/lib/permissions';
import { ITEM_STATUS_LABELS, itemSectorOfStatus } from '@/lib/gdmItems';

const SECTOR_LABELS = Object.fromEntries(SECTORS.map((s) => [s.key, s.label]));

/**
 * Relatório de Devoluções (Retorno de Etapas): todas as correções de fluxo
 * registradas na plataforma — GDM, equipamento, etapas de origem/destino,
 * usuário, data e justificativa obrigatória.
 */
export default function StepReturnReports() {
  const [search, setSearch] = useState('');

  const { data: historyPage, isLoading } = useQuery({
    queryKey: ['stepReturnHistory'],
    queryFn: () =>
      base44.entities.GDMItemHistory.filter(
        { action: 'return_step' },
        { sort: '-created_date', limit: 300 },
      ),
  });
  const history = historyPage?.items || [];

  const itemIds = useMemo(
    () => [...new Set(history.map((h) => h.item_id).filter(Boolean))],
    [history],
  );
  const { data: items = [] } = useQuery({
    queryKey: ['stepReturnItems', itemIds],
    queryFn: () => base44.entities.GDMItem.filter({ id: { $in: itemIds } }),
    enabled: itemIds.length > 0,
  });

  const gdmIds = useMemo(
    () => [...new Set(history.map((h) => h.gdm_id).filter(Boolean))],
    [history],
  );
  const { data: gdms = [] } = useQuery({
    queryKey: ['stepReturnGdms', gdmIds],
    queryFn: () => base44.entities.GDM.filter({ id: { $in: gdmIds } }),
    enabled: gdmIds.length > 0,
  });

  const rows = useMemo(
    () =>
      history.map((h) => {
        const item = items.find((i) => i.id === h.item_id) || {};
        const gdm = gdms.find((g) => g.id === h.gdm_id) || {};
        return {
          id: h.id,
          date: h.created_date,
          gdmNumber: gdm.gdm_number || '—',
          vessel: gdm.vessel_name || item.vessel_name || '—',
          equipment: item.equipment_name || '—',
          serial: item.serial_number || '',
          fromStatus: h.previous_status,
          toStatus: h.new_status,
          user: h.user_email || '—',
          justification: h.observation || '—',
        };
      }),
    [history, items, gdms],
  );

  const filtered = rows.filter((r) =>
    !search.trim()
      ? true
      : `${r.gdmNumber} ${r.equipment} ${r.serial} ${r.user} ${r.justification}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
  );

  const exportCsv = () => {
    const header = [
      'Data/Hora',
      'GDM',
      'Embarcação',
      'Equipamento',
      'SN',
      'Etapa de Origem',
      'Setor de Origem',
      'Etapa de Destino',
      'Setor de Destino',
      'Usuário',
      'Justificativa',
    ];
    const lines = filtered.map((r) =>
      [
        r.date ? format(new Date(r.date), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
        r.gdmNumber,
        r.vessel,
        r.equipment,
        r.serial,
        ITEM_STATUS_LABELS[r.fromStatus] || r.fromStatus || '',
        SECTOR_LABELS[itemSectorOfStatus(r.fromStatus, 'repair')] || '',
        ITEM_STATUS_LABELS[r.toStatus] || r.toStatus || '',
        SECTOR_LABELS[itemSectorOfStatus(r.toStatus, 'repair')] || '',
        r.user,
        r.justification,
      ]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(';'),
    );
    const blob = new Blob([`\uFEFF${[header.join(';'), ...lines].join('\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-devolucoes-${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Undo2 className="h-6 w-6" />
            Relatório de Devoluções
          </h1>
          <p className="text-slate-500 mt-1">
            {filtered.length} retorno(s) de etapa registrados — correções de fluxo com
            justificativa e auditoria completa.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportCsv}
          disabled={!filtered.length}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por GDM, equipamento, usuário ou justificativa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              Nenhuma devolução de etapa registrada até o momento.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Data / Hora</TableHead>
                    <TableHead>GDM</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>De (origem)</TableHead>
                    <TableHead>Para (destino)</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Justificativa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id} className="hover:bg-slate-50">
                      <TableCell className="whitespace-nowrap text-sm">
                        {r.date
                          ? format(new Date(r.date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <p className="font-medium">{r.gdmNumber}</p>
                        <p className="text-xs text-slate-500">{r.vessel}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{r.equipment}</p>
                        {r.serial && <p className="text-xs text-slate-500">SN {r.serial}</p>}
                      </TableCell>
                      <TableCell className="text-sm">
                        <p>{ITEM_STATUS_LABELS[r.fromStatus] || r.fromStatus || '—'}</p>
                        <p className="text-xs text-slate-500">
                          {SECTOR_LABELS[itemSectorOfStatus(r.fromStatus, 'repair')] || '—'}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        <p className="text-amber-700">
                          {ITEM_STATUS_LABELS[r.toStatus] || r.toStatus || '—'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {SECTOR_LABELS[itemSectorOfStatus(r.toStatus, 'repair')] || '—'}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{r.user}</TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-xs">
                        <span className="line-clamp-3">{r.justification}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}