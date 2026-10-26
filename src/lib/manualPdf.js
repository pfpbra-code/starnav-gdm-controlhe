// Geração do PDF do Manual de Procedimentos (por setor) — jsPDF.
// Segue o padrão visual dos demais relatórios da plataforma.
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function downloadManualPdf({ sectionKey, label, intro, steps = [] }) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const textW = pageW - margin * 2;
  let y = 0;

  const ensure = (h) => {
    if (y + h > pageH - 22) {
      doc.addPage();
      y = margin;
    }
  };

  // Cabeçalho
  doc.setFillColor(2, 132, 199);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`MANUAL DE PROCEDIMENTOS — ${label.toUpperCase()}`, margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Starnav Serviços Marítimos — Controle de Materiais Desembarcados', margin, 19);
  doc.text(
    `Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    pageW - margin,
    19,
    { align: 'right' }
  );
  y = 40;

  // Introdução
  if (intro) {
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    const introLines = doc.splitTextToSize(intro, textW);
    doc.text(introLines, margin, y);
    y += introLines.length * 5 + 6;
  }

  // Aviso de assinatura eletrônica
  doc.setDrawColor(2, 132, 199);
  doc.setFillColor(240, 249, 255);
  const notice =
    'Todas as ações críticas exigem assinatura eletrônica vinculada ao usuário e ficam registradas permanentemente no histórico do processo.';
  const noticeLines = doc.splitTextToSize(notice, textW - 8);
  const noticeH = noticeLines.length * 4.5 + 8;
  doc.roundedRect(margin, y, textW, noticeH, 2, 2, 'FD');
  doc.setTextColor(2, 132, 199);
  doc.setFontSize(9);
  doc.text(noticeLines, margin + 4, y + 7);
  y += noticeH + 8;

  // Passo a passo
  steps.forEach((step, index) => {
    const descLines = doc.splitTextToSize(step.description || '', textW - 18);
    const blockH = 8 + descLines.length * 5 + 4;
    ensure(blockH);

    // Círculo numerado
    doc.setFillColor(2, 132, 199);
    doc.circle(margin + 5, y + 4, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(String(index + 1), margin + 5, y + 6.5, { align: 'center' });

    // Título e descrição
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(step.title || `Passo ${index + 1}`, margin + 16, y + 5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(descLines, margin + 16, y + 11);

    y += blockH + 4;
  });

  // Rodapé em todas as páginas
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text(
      `Starnav Control Tower — Manual de Procedimentos — Página ${p} de ${pageCount}`,
      margin,
      pageH - 9
    );
    doc.text(format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR }), pageW - margin, pageH - 9, {
      align: 'right',
    });
  }

  doc.save(
    `Manual-Procedimentos-${sectionKey || label}-${format(new Date(), 'yyyyMMdd')}.pdf`
  );
}