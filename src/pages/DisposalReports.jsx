import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, FileDown, Download, Trash2, Package, Ship, CalendarDays } from 'lucide-react';
import DiscardReportButton from '@/components/gdm/DiscardReportButton';
import { hasPermission } from '@/lib/permissions';
import { ITEM_STATUS_LABELS } from '@/lib/gdmItems';

const EQUIPMENT_CATEGORY_LABELS = {
  navigation: 'Navegação',
  communication: 'Comunicação',
  safety: 'Segurança',
  deck: 'Convés',
  engine: 'Máquina',
  electrical: 'Elétrica',
  hydraulic: 'Hidráulica',
  other: 'Outros',
};

const CLOSED_DISCARD_STATUSES = ['completed', 'discard_approved'];

const fmtDate = (d) => (d ? format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) : '-');
const fmtDateTime = (d) => (d ? format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-');

/** Tela consolidada de materiais descartados, com filtros, indicadores e exportação. */
export default function DisposalReports() {
  const [search, setSearch] = useState('');
  const [vesselFilter, setVesselFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('closed');
  const [responsibleFilter, setResponsibleFilter] = useState('all');
  const [confirmedByFilter, setConfirmedByFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['discardItems'],
    queryFn: () => base44.entities.GDMItem.filter({ destination: 'discard' }, '-created_date'),
  });

  const { data: gdms = [] } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-created_date', 500),
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['disposalAttachments'],
    queryFn: () => base44.entities.GDMAttachment.list('-created_date', 1000),
  });

  const { data: equipmentList = [] } = useQuery({
    queryKey: ['equipmentList'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['usersDirectory'],
    queryFn: () => base44.entities.User.list().catch(() => []),
  });

  const gdmById = useMemo(() => {
    const map = {};
    gdms.forEach((g) => { map[g.id] = g; });
    return map;
  }, [gdms]);

  const equipmentById = useMemo(() => {
    const map = {};
    equipmentList.forEach((e) => { map[e.id] = e; });
    return map;
  }, [equipmentList]);

  const userNames = useMemo(() => {
    const map = {};
    (users || []).forEach((u) => { if (u?.id) map[u.id] = u.full_name || u.email; });
    return map;
  }, [users]);

  const attachmentsByItem = useMemo(() => {
    const map = {};
    attachments.forEach((a) => {
      if (!a.gdm_item_id) return;
      if (!map[a.gdm_item_id]) map[a.gdm_item_id] = [];
      map[a.gdm_item_id].push(a);
    });
    return map;
  }, [attachments]);

  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter === 'closed') {
      list = list.filter((i) => CLOSED_DISCARD_STATUSES.includes(i.status));
    } else if (statusFilter === 'awaiting') {
      list = list.filter((i) => !CLOSED_DISCARD_STATUSES.includes(i.status));
    }
    if (vesselFilter !== 'all') list = list.filter((i) => i.vessel_name === vesselFilter);
    if (responsibleFilter !== 'all') {
      list = list.filter((i) => (i.discard_responsible || '') === responsibleFilter);
    }
    if (confirmedByFilter !== 'all') {
      list = list.filter((i) => (i.discard_confirmed_by || '') === confirmedByFilter);
    }
    if (dateFrom) {
      list = list.filter(
        (i) => i.discard_confirmed_at && new Date(i.discard_confirmed_at) >= new Date(dateFrom),
      );
    }
    if (dateTo) {
      list = list.filter(
        (i) =>
          i.discard_confirmed_at &&
          new Date(i.discard_confirmed_at) <= new Date(`${dateTo}T23:59:59`),
      );
    }
    if (search) {
      const term = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.equipment_name?.toLowerCase().includes(term) ||
          i.equipment_code?.toLowerCase().includes(term) ||
          i.serial_number?.toLowerCase().includes(term) ||
          i.supplier_name?.toLowerCase().includes(term) ||
          (gdmById[i.gdm_id]?.gdm_number || '').toLowerCase().includes(term),
      );
    }
    return list;
  }, [items, gdmById, statusFilter, vesselFilter, responsibleFilter, confirmedByFilter, dateFrom, dateTo, search]);

  const closed = useMemo(() => filtered.filter((i) => CLOSED_DISCARD_STATUSES.includes(i.status)), [filtered]);

  const byVessel = useMemo(() => {
    const counts = {};
    closed.forEach((i) => {
      const name = i.vessel_name || '—';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [closed]);

  const byPeriod = useMemo(() => {
    const counts = {};
    closed.forEach((i) => {
      if (!i.discard_confirmed_at) return;
      const key = format(new Date(i.discard_confirmed_at), 'MM/yyyy');
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [closed]);

  const byEquipmentType = useMemo(() => {
    const counts = {};
    closed.forEach((i) => {
      const category = equipmentById[i.equipment_id]?.category || 'other';
      const label = EQUIPMENT_CATEGORY_LABELS[category] || 'Outros';
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [closed, equipmentById]);

  const relatedGdmCount = useMemo(
    () => new Set(closed.map((i) => i.gdm_id)).size,
    [closed],
  );

  const vesselOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.vessel_name).filter(Boolean))).sort(),
    [items],
  );
  const responsibleOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.discard_responsible).filter(Boolean))).sort(),
    [items],
  );
  const confirmedByOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.discard_confirmed_by).filter(Boolean))),
    [items],
  );

  const canExport = hasPermission(user, 'generate_disposal_report');

  const exportCsv = () => {
    const rows = [
      ['Nº GDM', 'Item', 'Embarcação', 'Equipamento', 'Código', 'Série', 'Quantidade', 'Data do descarte', 'Responsável', 'Confirmado por', 'Confirmado em', 'Status', 'Anexos', 'Fornecedor'],
      ...filtered.map((i) => [
        gdmById[i.gdm_id]?.gdm_number || '',
        String(i.item_number).padStart(2, '0'),
        i.vessel_name || '',
        i.equipment_name || '',
        i.equipment_code || '',
        i.serial_number || '',
        i.quantity,
        i.discard_date || '',
        i.discard_responsible || '',
        userNames[i.discard_confirmed_by] || i.discard_confirmed_by || '',
        fmtDateTime(i.discard_confirmed_at),
        ITEM_STATUS_LABELS[i.status] || i.status,
        (attachmentsByItem[i.id] || []).length,
        i.supplier_name || '',
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `descartes-${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 0;
    const ensure = (h) => {
      if (y + h > pageH - 16) {
        doc.addPage();
        y = margin;
      }
    };

    doc.setFillColor(2, 132, 199);
    doc.rect(0, 0, pageW, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('STARNAV SERVIÇOS MARÍTIMOS', margin, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Relatório consolidado de materiais descartados', margin, 16);
    doc.setFontSize(8);
    doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageW - margin, 16, { align: 'right' });
    y = 30;

    const section = (title) => {
      ensure(12);
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, pageW - margin * 2, 8, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(title, margin + 3, y + 5.5);
      y += 11;
    };

    doc.setTextColor(15, 23, 42);
    section('RESUMO');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const summary = [
      `Total de materiais descartados: ${closed.length}`,
      `GDMs relacionadas: ${relatedGdmCount}`,
      `Total de anexos de comprovação: ${closed.reduce((s, i) => s + (attachmentsByItem[i.id] || []).length, 0)}`,
    ];
    summary.forEach((line) => {
      ensure(6);
      doc.text(line, margin + 2, y);
      y += 6;
    });
    y += 4;

    section('QUANTIDADE POR EMBARCAÇÃO');
    if (!byVessel.length) {
      doc.text('—', margin + 2, y);
      y += 6;
    }
    byVessel.forEach(([name, count]) => {
      ensure(6);
      doc.text(`${name}: ${count}`, margin + 2, y);
      y += 6;
    });
    y += 4;

    section('QUANTIDADE POR PERÍODO');
    if (!byPeriod.length) {
      doc.text('—', margin + 2, y);
      y += 6;
    }
    byPeriod.forEach(([period, count]) => {
      ensure(6);
      doc.text(`${period}: ${count}`, margin + 2, y);
      y += 6;
    });
    y += 4;

    section('QUANTIDADE POR TIPO DE EQUIPAMENTO');
    if (!byEquipmentType.length) {
      doc.text('—', margin + 2, y);
      y += 6;
    }
    byEquipmentType.forEach(([label, count]) => {
      ensure(6);
      doc.text(`${label}: ${count}`, margin + 2, y);
      y += 6;
    });
    y += 4;

    section(`RELAÇÃO COMPLETA (${filtered.length} itens)`);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    ensure(6);
    doc.text('GDM / Item / Embarcação / Equipamento / Série / Data / Responsável / Confirmado por / Status', margin + 2, y);
    y += 5;
    filtered.forEach((i) => {
      ensure(10);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8);
      doc.text(
        `${gdmById[i.gdm_id]?.gdm_number || '-'} / ${String(i.item_number).padStart(2, '0')} / ${i.vessel_name || '-'} / ${i.equipment_name || '-'} / ${i.serial_number || '-'}`,
        margin + 2,
        y,
      );
      y += 4;
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.text(
        `${fmtDate(i.discard_date)} / ${i.discard_responsible || '-'} / ${userNames[i.discard_confirmed_by] || '-'} / ${ITEM_STATUS_LABELS[i.status] || i.status} / ${(attachmentsByItem[i.id] || []).length} anexo(s)`,
        margin + 2,
        y,
      );
      y += 6;
    });

    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.text(`Starnav Control Tower — Relatório Consolidado de Descartes — Página ${p} de ${pageCount}`, margin, pageH - 7);
    }
    doc.save(`Relatorio-Consolidado-Descartes-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios de Descarte</h1>
          <p className="text-slate-500 mt-1">
            {closed.length} materiais descartados · {relatedGdmCount} GDMs relacionadas
          </p>
        </div>
        {canExport && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={exportPdf}>
              <FileDown className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        )}
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-red-50 text-red-700 mb-2">
              <Trash2 className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900 leading-none">{closed.length}</p>
            <p className="text-xs text-slate-500 mt-1">Materiais descartados</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-sky-50 text-sky-700 mb-2">
              <Ship className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900 leading-none">{byVessel.length}</p>
            <p className="text-xs text-slate-500 mt-1">Embarcações envolvidas</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-amber-50 text-amber-700 mb-2">
              <Package className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900 leading-none">
              {closed.reduce((s, i) => s + (attachmentsByItem[i.id] || []).length, 0)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Anexos de comprovação</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-indigo-50 text-indigo-700 mb-2">
              <CalendarDays className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900 leading-none">{byPeriod.length}</p>
            <p className="text-xs text-slate-500 mt-1">Períodos com descartes</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuições */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Por embarcação', data: byVessel },
          { title: 'Por período', data: byPeriod },
          { title: 'Por tipo de equipamento', data: byEquipmentType },
        ].map(({ title, data }) => (
          <Card key={title} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">{title}</h3>
              {data.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum descarte no filtro atual.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.map(([label, count]) => (
                    <li key={label} className="flex justify-between text-sm">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-semibold">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por Nº GDM, equipamento, código, série ou fornecedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="closed">Descartes finalizados</SelectItem>
                <SelectItem value="awaiting">Em andamento</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vesselFilter} onValueChange={setVesselFilter}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Embarcação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Embarcações</SelectItem>
                {vesselOptions.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Responsável pelo descarte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {responsibleOptions.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={confirmedByFilter} onValueChange={setConfirmedByFilter}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Confirmado por" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os confirmadores</SelectItem>
                {confirmedByOptions.map((id) => (
                  <SelectItem key={id} value={id}>{userNames[id] || id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Descarte — início" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Descarte — fim" />
          </div>
        </CardContent>
      </Card>

      {/* Relação completa */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Nº GDM</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Embarcação</TableHead>
                <TableHead>Equipamento</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>Data Descarte</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Confirmado por</TableHead>
                <TableHead>Anexos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50">
                  <TableCell>
                    <Link
                      to={createPageUrl(`GDMDetail?id=${item.gdm_id}`)}
                      className="text-sky-600 hover:underline font-medium"
                    >
                      {gdmById[item.gdm_id]?.gdm_number || '—'}
                    </Link>
                  </TableCell>
                  <TableCell>{String(item.item_number).padStart(2, '0')}</TableCell>
                  <TableCell>{item.vessel_name || '—'}</TableCell>
                  <TableCell>{item.equipment_name || '—'}</TableCell>
                  <TableCell>{item.serial_number || '—'}</TableCell>
                  <TableCell>{item.discard_date ? fmtDate(item.discard_date) : '—'}</TableCell>
                  <TableCell>{item.discard_responsible || '—'}</TableCell>
                  <TableCell>{userNames[item.discard_confirmed_by] || item.discard_confirmed_by || '—'}</TableCell>
                  <TableCell>{(attachmentsByItem[item.id] || []).length}</TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                      {ITEM_STATUS_LABELS[item.status] || item.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {canExport && CLOSED_DISCARD_STATUSES.includes(item.status) ? (
                      <DiscardReportButton
                        item={item}
                        gdm={gdmById[item.gdm_id]}
                        variant="ghost"
                        size="sm"
                        label="Relatório"
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center">
                    <Trash2 className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500">Nenhum material descartado encontrado</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}