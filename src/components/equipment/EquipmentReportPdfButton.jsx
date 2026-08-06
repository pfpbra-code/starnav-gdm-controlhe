import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const categoryLabels = {
  navigation: 'Navegação',
  communication: 'Comunicação',
  safety: 'Segurança',
  deck: 'Convés',
  engine: 'Motor',
  electrical: 'Elétrica',
  hydraulic: 'Hidráulica',
  other: 'Outros',
};

const statusLabels = {
  active: 'Ativo',
  inactive: 'Inativo',
};

export default function EquipmentReportPdfButton({ equipment = [] }) {
  const [generating, setGenerating] = useState(false);

  const generate = () => {
    if (!equipment.length) return;
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;
      let y = 0;

      const ensure = (h) => {
        if (y + h > pageH - 18) { doc.addPage(); y = margin; }
      };

      // Header bar
      doc.setFillColor(2, 132, 199);
      doc.rect(0, 0, pageW, 26, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('RELATÓRIO DE EQUIPAMENTOS', margin, 11);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Starnav Serviços Marítimos — Controle de Materiais Desembarcados', margin, 18);
      doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageW - margin, 18, { align: 'right' });
      y = 34;

      // Summary
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Total de equipamentos: ${equipment.length}`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const activeCount = equipment.filter(e => e.status === 'active').length;
      doc.text(`Ativos: ${activeCount}   |   Inativos: ${equipment.length - activeCount}`, pageW - margin, y, { align: 'right' });
      y += 8;

      // Table header
      const cols = [
        { title: 'Código', w: 30 },
        { title: 'Descrição', w: 70 },
        { title: 'Localização', w: 45 },
        { title: 'Fabricante', w: 45 },
        { title: 'Modelo', w: 35 },
        { title: 'Status', w: 25 },
        { title: 'Cadastro', w: 30 },
      ];
      const tableX = margin;
      const tableW = pageW - margin * 2;

      const drawHeader = () => {
        doc.setFillColor(2, 132, 199);
        doc.rect(tableX, y, tableW, 9, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        let cx = tableX + 2;
        cols.forEach((c) => {
          doc.text(c.title, cx, y + 6);
          cx += c.w;
        });
        y += 9;
      };

      const drawRow = (e) => {
        ensure(12);
        const zebra = (doc.getNumberOfPages() + Math.floor(y / 12)) % 2 === 0;
        if (zebra) {
          doc.setFillColor(248, 250, 252);
          doc.rect(tableX, y, tableW, 10, 'F');
        }
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const values = [
          e.code || '-',
          e.name || '-',
          e.location || '-',
          e.manufacturer || '-',
          e.model || '-',
          statusLabels[e.status] || e.status || '-',
          e.created_date ? format(new Date(e.created_date), 'dd/MM/yyyy', { locale: ptBR }) : '-',
        ];
        let cx = tableX + 2;
        values.forEach((v, i) => {
          const maxW = cols[i].w - 4;
          const lines = doc.splitTextToSize(String(v), maxW);
          doc.text(lines.slice(0, 2), cx, y + 4);
          cx += cols[i].w;
        });
        y += 10;
      };

      drawHeader();
      equipment.forEach(drawRow);

      // Footer on every page
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7);
        doc.text(`Starnav Control Tower — Relatório de Equipamentos — Página ${p} de ${pageCount}`, margin, pageH - 7);
        doc.text(format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR }), pageW - margin, pageH - 7, { align: 'right' });
      }

      doc.save(`Relatorio-Equipamentos-${format(new Date(), 'yyyyMMdd')}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={generate}
      disabled={generating || !equipment.length}
    >
      {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
      Gerar Relatório de Equipamentos
    </Button>
  );
}