import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabels = {
  pending_coordinator: 'Aguardando Coordenador',
  pending_services: 'Aguardando Serviços',
  sent_to_supplier: 'Enviado ao Fornecedor',
  awaiting_quote: 'Aguardando Cotação',
  quote_analysis: 'Em Análise de Cotação',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  completed: 'Concluído',
};

const treatmentLabels = {
  repair: 'Reparo',
  discard: 'Descarte',
  stock_return: 'Retorno ao Estoque',
};

export default function GDMPdfButton({ gdm, variant = 'ghost', size = 'sm', label, className }) {
  const [generating, setGenerating] = useState(false);

  const generate = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      let y = 0;

      // Header bar
      doc.setFillColor(2, 132, 199);
      doc.rect(0, 0, pageW, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('GUIA DE DESEMBARQUE DE MATERIAL', margin, 13);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Starnav Serviços Marítimos — Controle de Materiais Desembarcados', margin, 20);
      y = 40;

      // GDM Number box
      doc.setDrawColor(2, 132, 199);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, pageW - margin * 2, 14, 'S');
      doc.setTextColor(2, 132, 199);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(`Nº ${gdm.gdm_number || '-'}`, margin + 4, y + 9.5);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageW - margin - 4, y + 9.5, { align: 'right' });
      y += 24;

      const section = (title) => {
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, pageW - margin * 2, 8, 'F');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(title, margin + 3, y + 5.5);
        y += 12;
      };

      const field = (label, value) => {
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(label, margin + 3, y);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(String(value || '-'), (pageW - margin * 2) / 2 - 6);
        doc.text(lines, margin + 3, y + 5);
        return lines.length;
      };

      const rowGap = (linesA, linesB) => 6 + (Math.max(linesA, linesB) - 1) * 5;

      // Material info
      section('DADOS DO MATERIAL');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      const colW = (pageW - margin * 2) / 2;
      const left = margin + 3;
      const right = margin + colW + 3;

      const drawField = (label, value, x) => {
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(label, x, y);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(String(value || '-'), colW - 6);
        doc.text(lines, x, y + 5);
        return lines.length;
      };

      let lA = drawField('Embarcação', gdm.vessel_name, left);
      let lB = drawField('Equipamento', gdm.equipment_name, right);
      y += rowGap(lA, lB);

      lA = drawField('Número de Série', gdm.serial_number, left);
      lB = drawField('Data de Desembarque', gdm.disembark_date ? format(new Date(gdm.disembark_date), 'dd/MM/yyyy', { locale: ptBR }) : '-', right);
      y += rowGap(lA, lB);

      lA = drawField('Tratativa', treatmentLabels[gdm.treatment] || gdm.treatment || '-', left);
      lB = drawField('Status', statusLabels[gdm.status] || gdm.status || '-', right);
      y += rowGap(lA, lB);

      lA = drawField('Destino Definido', gdm.destination || '-', left);
      lB = drawField('Fornecedor', gdm.supplier_name || '-', right);
      y += rowGap(lA, lB);

      lA = drawField('Nota Fiscal', gdm.invoice_number || '-', left);
      lB = drawField('Data Envio Fornecedor', gdm.sent_to_supplier_date ? format(new Date(gdm.sent_to_supplier_date), 'dd/MM/yyyy', { locale: ptBR }) : '-', right);
      y += rowGap(lA, lB) + 4;

      // Description
      section('DESCRIÇÃO / MOTIVO DO DESEMBARQUE');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const descLines = doc.splitTextToSize(gdm.description || 'Sem descrição informada.', pageW - margin * 2 - 6);
      doc.text(descLines, margin + 3, y);
      y += descLines.length * 5 + 6;

      // Coordinator notes
      if (gdm.coordinator_notes) {
        section('OBSERVAÇÕES DO COORDENADOR');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const noteLines = doc.splitTextToSize(gdm.coordinator_notes, pageW - margin * 2 - 6);
        doc.text(noteLines, margin + 3, y);
        y += noteLines.length * 5 + 6;
      }

      // Quote info
      if (gdm.quote_value) {
        section('COTAÇÃO / PROPOSTA');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Valor da Cotação: R$ ${gdm.quote_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 3, y);
        y += 7;
        if (gdm.quote_document_url) {
          doc.setTextColor(2, 132, 199);
          doc.text(`Proposta/Documento: ${gdm.quote_document_url}`, margin + 3, y);
          y += 7;
        }
        if (gdm.commercial_proposal_url) {
          doc.text(`Proposta Comercial: ${gdm.commercial_proposal_url}`, margin + 3, y);
          y += 7;
        }
        y += 4;
      }

      // Signatures
      if (y > pageH - 50) { doc.addPage(); y = margin + 5; }
      y += 20;
      doc.setDrawColor(150, 150, 150);
      doc.line(margin + 10, y, pageW / 2 - 10, y);
      doc.line(pageW / 2 + 10, y, pageW - margin - 10, y);
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.text('Responsável Embarcação', margin + 10, y + 6);
      doc.text('Responsável Recebimento', pageW / 2 + 10, y + 6);

      // Footer
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.text(`Documento gerado pelo Starnav Control Tower — GDM ${gdm.gdm_number}`, margin, pageH - 9);

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