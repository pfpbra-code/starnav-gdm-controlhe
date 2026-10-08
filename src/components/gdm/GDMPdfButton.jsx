import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_LABELS, ROLE_LABELS } from '@/lib/gdmWorkflow';
import { computeGeneralStatus } from '@/lib/gdmOverview';
import { ITEM_DESTINATION_LABELS } from '@/lib/gdmItems';
import { drawPhotoEvidence } from '@/lib/pdfImage';

const treatmentLabels = {
  repair: 'Reparo',
  discard: 'Descarte',
  stock_return: 'Retorno ao Estoque',
};

const currency = (v) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export default function GDMPdfButton({ gdm, variant = 'ghost', size = 'sm', label, className }) {
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      // Fluxo real é por item: dados derivados dos itens da GDM
      const items = await base44.entities.GDMItem
        .filter({ gdm_id: gdm.id }, 'item_number')
        .catch(() => []);
      const general = computeGeneralStatus(items);
      const suppliers = Array.from(new Set(items.map((i) => i.supplier_name).filter(Boolean)));
      const destinations = Array.from(
        new Set(items.map((i) => i.destination).filter(Boolean).map((d) => ITEM_DESTINATION_LABELS[d] || d)),
      );

      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;
      let y = 0;

      const ensure = (h) => {
        if (y + h > pageH - 16) { doc.addPage(); y = margin; }
      };

      // ===== HEADER =====
      doc.setFillColor(2, 132, 199);
      doc.rect(0, 0, pageW, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('STARNAV SERVIÇOS MARÍTIMOS', margin, 10);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Controle de Materiais Desembarcados', margin, 16);
      doc.setFontSize(8);
      doc.text(`Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageW - margin, 16, { align: 'right' });
      y = 30;

      // Title box
      doc.setDrawColor(2, 132, 199);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, pageW - margin * 2, 12, 'S');
      doc.setTextColor(2, 132, 199);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`GDM Nº ${gdm.gdm_number || '-'}`, margin + 3, y + 8);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(general.label, pageW - margin - 3, y + 8, { align: 'right' });
      y += 18;

      // ===== SECTIONS =====
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

      const colW = (pageW - margin * 2) / 2;
      const left = margin + 2;
      const right = margin + colW + 2;

      const drawField = (label, value, x) => {
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(label, x, y);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(String(value || '-'), colW - 6);
        doc.text(lines, x, y + 4.5);
        return lines.length;
      };

      const rowGap = (linesA, linesB) => 5 + Math.max(linesA, linesB) * 4;

      // DADOS DO MATERIAL
      section('DADOS DO MATERIAL');
      let lA = drawField('Embarcação', gdm.vessel_name, left);
      let lB = drawField('Equipamento', gdm.equipment_name, right);
      y += rowGap(lA, lB);
      lA = drawField('Número de Série', gdm.serial_number, left);
      lB = drawField('Data de Desembarque', gdm.disembark_date ? format(new Date(gdm.disembark_date), 'dd/MM/yyyy', { locale: ptBR }) : '-', right);
      y += rowGap(lA, lB);
      lA = drawField('Tratativa', treatmentLabels[gdm.treatment] || gdm.treatment || '-', left);
      lB = drawField('Etapa Atual (derivada dos itens)', general.label, right);
      y += rowGap(lA, lB);
      lA = drawField('Itens', items.length, left);
      lB = drawField('Itens Finalizados', items.filter((i) => i.status === 'completed').length, right);
      y += rowGap(lA, lB);
      lA = drawField('Destinos (itens)', destinations.join(', '), left);
      lB = drawField('Fornecedores (itens)', suppliers.join(', '), right);
      y += rowGap(lA, lB) + 3;

      // DESCRIÇÃO
      section('DESCRIÇÃO / MOTIVO DO DESEMBARQUE');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const descLines = doc.splitTextToSize(gdm.description || 'Sem descrição informada.', pageW - margin * 2 - 6);
      descLines.forEach((line) => {
        ensure(5);
        doc.text(line, margin + 2, y);
        y += 4.5;
      });
      y += 4;

      // OBSERVAÇÕES DO COORDENADOR
      if (gdm.coordinator_notes) {
        section('OBSERVAÇÕES DO COORDENADOR');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const noteLines = doc.splitTextToSize(gdm.coordinator_notes, pageW - margin * 2 - 6);
        noteLines.forEach((line) => {
          ensure(5);
          doc.text(line, margin + 2, y);
          y += 4.5;
        });
        y += 4;
      }

      // ITENS DA GDM
      if (items.length) {
        section(`ITENS DA GDM (${items.length})`);
        items.forEach((item) => {
          ensure(14);
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, pageW - margin * 2, 12, 'F');
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(
            `#${item.item_number || '-'} — ${item.equipment_name || '-'}${item.serial_number ? ` (S/N: ${item.serial_number})` : ''}`,
            margin + 3,
            y + 5,
          );
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          const itemMeta = [
            item.supplier_name,
            item.quote_value != null ? currency(item.quote_value) : null,
            item.pwt_number ? `PWT: ${item.pwt_number}` : null,
            item.oc_number ? `OC: ${item.oc_number}` : null,
            item.warranty_days != null ? `Garantia: ${item.warranty_days} dias` : null,
          ].filter(Boolean).join('  •  ');
          doc.text(itemMeta || '-', margin + 3, y + 9.5);
          y += 14;
        });
        y += 2;
      }

      // EVIDÊNCIAS FOTOGRÁFICAS (todos os itens da GDM)
      const photoRecords = await base44.entities.GDMPhoto
        .filter({ gdm_id: gdm.id }, 'taken_at')
        .catch(() => []);
      if (photoRecords.length) {
        section(`EVIDÊNCIAS FOTOGRÁFICAS (${photoRecords.length} imagens)`);
        const groups = [];
        const byItem = {};
        photoRecords.forEach((p) => {
          const key = p.gdm_item_id || 'geral';
          if (!byItem[key]) {
            byItem[key] = [];
            groups.push(key);
          }
          byItem[key].push(p);
        });
        for (const key of groups) {
          const group = byItem[key];
          const it = key !== 'geral' ? items.find((i) => i.id === key) : null;
          ensure(10);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          const groupTitle = it
            ? `Item ${String(it.item_number).padStart(2, '0')} — ${it.equipment_name || '-'}${it.serial_number ? ` (S/N: ${it.serial_number})` : ''} · ${group.length} foto(s)`
            : `Fotos gerais · ${group.length} foto(s)`;
          doc.text(groupTitle, margin + 2, y);
          y += 5;
          y = await drawPhotoEvidence(doc, group, { y, margin, pageW, pageH });
          y += 3;
        }
      }

      // HISTÓRICO DO PROCESSO (TRAIL)
      const history = gdm.history || [];
      if (history.length) {
        section(`HISTÓRICO DO PROCESSO (${history.length} registros)`);
        history.forEach((ev) => {
          ensure(10);
          doc.setDrawColor(2, 132, 199);
          doc.setLineWidth(0.4);
          doc.circle(margin + 4, y + 2, 1.2, 'F');
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          const ts = ev.timestamp ? format(new Date(ev.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-';
          doc.text(`${ev.details || ev.action || 'Registro'}  —  ${ts}`, margin + 9, y + 3);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          const meta = [
            ev.user_name || ev.user,
            ev.role && ROLE_LABELS[ev.role],
            ev.step_name,
            ev.previous_status && ev.new_status && `${STATUS_LABELS[ev.previous_status] || ev.previous_status} → ${STATUS_LABELS[ev.new_status] || ev.new_status}`,
          ].filter(Boolean).join('  •  ');
          if (meta) {
            ensure(4);
            doc.text(meta, margin + 9, y + 7);
            y += 4;
          }
          if (ev.observation) {
            ensure(4);
            doc.setTextColor(71, 85, 105);
            doc.text(`Obs: ${ev.observation}`, margin + 9, y + 7);
            y += 4;
          }
          y += 6;
        });
      }

      // ASSINATURAS
      ensure(28);
      y += 10;
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.line(margin + 10, y, pageW / 2 - 10, y);
      doc.line(pageW / 2 + 10, y, pageW - margin - 10, y);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Responsável Embarcação', margin + 10, y + 6);
      doc.text('Responsável Recebimento', pageW / 2 + 10, y + 6);

      // FOOTER
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7);
        doc.text(`Starnav Control Tower — GDM ${gdm.gdm_number} — Página ${p} de ${pageCount}`, margin, pageH - 7);
        doc.text(format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR }), pageW - margin, pageH - 7, { align: 'right' });
      }

      doc.save(`GDM-${gdm.gdm_number || 'documento'}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={generate} disabled={generating} className={className}>
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {label && <span className="ml-1">{label}</span>}
    </Button>
  );
}