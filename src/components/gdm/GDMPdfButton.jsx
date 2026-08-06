import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_LABELS, STEP_NAMES, ROLE_LABELS } from '@/lib/gdmWorkflow';

const treatmentLabels = {
  repair: 'Reparo',
  discard: 'Descarte',
  stock_return: 'Retorno ao Estoque',
};

const currency = (v) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export default function GDMPdfButton({ gdm, variant = 'ghost', size = 'sm', label, className }) {
  const [generating, setGenerating] = useState(false);

  const generate = () => {
    setGenerating(true);
    try {
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
      doc.text('Controle de Materiais Desembarcados — Controle de Materiais Desembarcados', margin, 16);
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
      doc.text(STATUS_LABELS[gdm.status] || gdm.status || '-', pageW - margin - 3, y + 8, { align: 'right' });
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
      lB = drawField('Etapa Atual', STATUS_LABELS[gdm.status] || gdm.status || '-', right);
      y += rowGap(lA, lB);
      lA = drawField('Destino Definido', gdm.destination, left);
      lB = drawField('Fornecedor', gdm.supplier_name, right);
      y += rowGap(lA, lB);
      lA = drawField('Nota Fiscal', gdm.invoice_number, left);
      lB = drawField('Data Envio Fornecedor', gdm.sent_to_supplier_date ? format(new Date(gdm.sent_to_supplier_date), 'dd/MM/yyyy', { locale: ptBR }) : '-', right);
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

      // COTAÇÃO ATUAL
      if (gdm.quote_value || gdm.quote_document_url || gdm.commercial_proposal_url || gdm.technical_report_url) {
        section('COTAÇÃO / PROPOSTA ATUAL');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        ensure(6);
        doc.text(`Valor da Cotação: ${currency(gdm.quote_value)}`, margin + 2, y);
        y += 6;
        if (gdm.discount_percentage) {
          ensure(5);
          doc.setTextColor(194, 65, 12);
          doc.setFontSize(9);
          doc.text(`Desconto solicitado: ${gdm.discount_percentage}%`, margin + 2, y);
          y += 5;
          doc.setTextColor(15, 23, 42);
        }
        const linkField = (label, url) => {
          if (!url) return;
          ensure(5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`${label}:`, margin + 2, y);
          doc.setTextColor(2, 132, 199);
          const lines = doc.splitTextToSize(String(url), pageW - margin * 2 - 40);
          doc.text(lines, margin + 36, y);
          y += Math.max(5, lines.length * 4);
        };
        linkField('Documento da Cotação', gdm.quote_document_url);
        linkField('Laudo Técnico', gdm.technical_report_url);
        linkField('Proposta Comercial', gdm.commercial_proposal_url);
        y += 3;
      }

      // HISTÓRICO DE COTAÇÕES ANTERIORES
      const histQuotes = gdm.quotes_history || [];
      if (histQuotes.length) {
        section(`HISTÓRICO DE COTAÇÕES ANTERIORES (${histQuotes.length})`);
        histQuotes.forEach((q, idx) => {
          ensure(14);
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, pageW - margin * 2, 12, 'F');
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(`#${idx + 1} — ${currency(q.quote_value)}  ${q.supplier_name ? `(${q.supplier_name})` : ''}`, margin + 3, y + 5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(q.preserved_at ? format(new Date(q.preserved_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-', margin + 3, y + 9.5);
          if (q.reason) {
            doc.text(`Motivo: ${q.reason}`, margin + 60, y + 9.5);
          }
          y += 14;
        });
        y += 2;
      }

      // PWT / OC / OT
      const hasOrders = gdm.pwt_number || gdm.oc_number || gdm.ot_number;
      if (hasOrders) {
        section('PWT / OC / OT EMITIDOS');
        const orderField = (label, num, by, at) => {
          if (!num) return;
          ensure(8);
          doc.setTextColor(100, 116, 139);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.text(label, margin + 2, y);
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(String(num), margin + 30, y);
          if (by || at) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text(`${by ? `por ${by}` : ''}${at ? ` em ${format(new Date(at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}` : ''}`, margin + 60, y);
          }
          y += 7;
        };
        orderField('PWT', gdm.pwt_number, gdm.pwt_issued_by, gdm.pwt_issued_at);
        orderField('OC', gdm.oc_number, gdm.oc_issued_by, gdm.oc_issued_at);
        orderField('OT', gdm.ot_number, gdm.ot_issued_by, gdm.ot_issued_at);
        y += 3;
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