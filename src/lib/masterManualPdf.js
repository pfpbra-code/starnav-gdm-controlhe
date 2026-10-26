// Gerador do PDF do Manual Mestre — capa, sumário clicável, controle de versão,
// glossário, fluxograma geral, índice de funcionalidades, capítulos com blocos
// (listas, passo a passo, cards de indicadores, FAQ) e embutimento dos prints
// anexados pelo ADM na aba "Documentos".
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MASTER_MANUAL_META,
  SYSTEM_OBJECTIVE,
  GLOSSARY,
  GENERAL_FLOW,
  FEATURE_INDEX,
  MASTER_MANUAL_CHAPTERS,
} from './masterManualContent';

const SKY = [2, 132, 199];
const SLATE = [15, 23, 42];
const MUTED = [71, 85, 105];
const FAINT = [148, 163, 184];
const ZEBRA = [248, 250, 252];
const BORDER = [226, 232, 240];
const AMBER_BG = [255, 251, 235];
const AMBER = [180, 83, 9];
const AMBER_BD = [217, 119, 6];
const SKY_BG = [240, 249, 255];
const SKY_TXT = [7, 89, 133];

// Converte uma URL assinada em JPEG dataURL (canvas) para embutir no PDF.
const toDataUrl = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = url;
  });

export async function downloadMasterManualPdf({ images = [] } = {}) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const textW = pageW - margin * 2;
  const emission = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  let y = 0;
  const ensure = (h) => {
    if (y + h > pageH - 22) {
      doc.addPage();
      y = 22;
    }
  };

  // Escreve texto com quebra automática; retorna nº de linhas.
  const write = (text, { x = margin, w = textW, size = 9, color = SLATE, font = 'normal', lineH = 4.6, gap = 0 } = {}) => {
    doc.setFont('helvetica', font);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text), w);
    lines.forEach((ln) => {
      ensure(lineH);
      doc.text(ln, x, y);
      y += lineH;
    });
    y += gap;
    return lines.length;
  };

  /* ---------- Capa (página 1) ---------- */
  doc.setFillColor(...SKY);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 52, textW, 108, 6, 6, 'F');
  doc.setTextColor(...SKY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('MANUAL MESTRE', pageW / 2, 88, { align: 'center' });
  doc.setFontSize(15);
  doc.text('DA PLATAFORMA', pageW / 2, 100, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE);
  const subtitleLines = doc.splitTextToSize(MASTER_MANUAL_META.subtitle, textW - 24);
  subtitleLines.forEach((ln, i) => doc.text(ln, pageW / 2, 112 + i * 5, { align: 'center' }));
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('Starnav Serviços Marítimos', pageW / 2, 190, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Versão ${MASTER_MANUAL_META.version}  •  Emitido em ${emission}`, pageW / 2, 202, { align: 'center' });
  doc.setFontSize(9);
  doc.text('Treinamento, onboarding e consulta operacional', pageW / 2, 212, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Documento controlado — reprodução interna', pageW / 2, pageH - 20, { align: 'center' });

  doc.addPage(); // página 2 = sumário (preenchida ao final)

  /* ---------- Registro do sumário ---------- */
  const tocEntries = [];
  const pushToc = (label, page) => tocEntries.push({ label, page });
  let chapterNo = 0;

  const chapterTitle = (label, numbered = true) => {
    doc.addPage();
    y = 22;
    if (numbered) chapterNo += 1;
    doc.setFillColor(...SKY);
    doc.rect(0, 0, pageW, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...SLATE);
    const heading = numbered ? `${chapterNo}. ${label}` : label;
    doc.text(heading, margin, y + 8);
    doc.setDrawColor(...SKY);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 12, margin + Math.min(textW, heading.length * 3.4), y + 12);
    doc.setLineWidth(0.2);
    y += 22;
    pushToc(heading, doc.getCurrentPageInfo().pageNumber);
  };

  const subHeading = (text) => {
    ensure(26);
    y += 4;
    write(text, { size: 11, font: 'bold', color: SKY, gap: 2 });
  };

  const box = (text, { bg, border, color, accent }) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(text, textW - 12);
    const h = lines.length * 4.6 + 8;
    ensure(h);
    doc.setFillColor(...bg);
    doc.setDrawColor(...border);
    doc.roundedRect(margin, y, textW, h, 2, 2, 'FD');
    if (accent) {
      doc.setFillColor(...accent);
      doc.rect(margin, y, 2.5, h, 'F');
    }
    doc.setTextColor(...color);
    lines.forEach((ln, i) => doc.text(ln, margin + 7, y + 6 + i * 4.6));
    y += h + 5;
  };

  const drawImage = (dataUrl, caption) => {
    const iw = textW;
    const ih = Math.min(iw * 0.62, pageH - margin * 2 - 40);
    ensure(ih + 16);
    doc.addImage(dataUrl, 'JPEG', margin, y, iw, ih);
    y += ih + 4;
    if (caption) write(caption, { size: 8, color: FAINT, gap: 4 });
  };

  const drawPlaceholder = (hint) => {
    const h = 38;
    ensure(h + 4);
    doc.setDrawColor(...BORDER);
    doc.setLineDashPattern([3, 2], 0);
    doc.roundedRect(margin, y, textW, h, 2, 2, 'S');
    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...FAINT);
    doc.text('Espaço reservado para o print da tela', margin + 6, y + 12);
    const hintLines = doc.splitTextToSize(String(hint || ''), textW - 12);
    hintLines.slice(0, 3).forEach((ln, i) => doc.text(ln, margin + 6, y + 20 + i * 4));
    y += h + 5;
  };

  const renderTable = (rows) => {
    rows.forEach((row, ri) => {
      const colW = textW / row.length;
      const cells = row.map((cell) => doc.splitTextToSize(String(cell), colW - 4));
      const rowH = Math.max(...cells.map((c) => c.length)) * 4.2 + 4;
      ensure(rowH + 2);
      if (ri === 0) {
        doc.setFillColor(...SKY);
        doc.rect(margin, y, textW, rowH, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
      } else {
        if (ri % 2 === 0) {
          doc.setFillColor(...ZEBRA);
          doc.rect(margin, y, textW, rowH, 'F');
        }
        doc.setTextColor(...SLATE);
        doc.setFont('helvetica', 'normal');
      }
      doc.setFontSize(8.5);
      let cx = margin + 2;
      cells.forEach((cellLines) => {
        cellLines.forEach((ln, li) => doc.text(ln, cx, y + 4 + li * 4.2));
        cx += colW;
      });
      y += rowH + 1;
    });
    y += 4;
  };

  const renderCards = (items) => {
    items.forEach((c) => {
      const fields = [
        ['Objetivo', c.objetivo],
        ['Fórmula', c.formula],
        ['Origem dos dados', c.origem],
        ['Como interpretar', c.interpretacao],
        ['Exemplo', c.exemplo],
      ];
      const fieldLines = (label, value) =>
        value ? doc.splitTextToSize(`${label}: ${value}`, textW - 12).length * 4.2 + 1 : 0;
      const h = 12 + 5 + fields.reduce((acc, [l, v]) => acc + fieldLines(l, v), 0) + 4;
      ensure(h + 2);
      const top = y;
      doc.setFillColor(...ZEBRA);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(margin, y, textW, h, 2, 2, 'FD');
      y += 5;
      write(c.name, { size: 10, font: 'bold', gap: 1.5 });
      fields.forEach(([fl, fv]) => {
        if (!fv) return;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const labelW = doc.getTextWidth(`${fl}: `);
        doc.setTextColor(...SKY);
        doc.text(`${fl}: `, margin + 4, y);
        doc.setTextColor(...SLATE);
        const vLines = doc.splitTextToSize(String(fv), textW - 14 - labelW);
        vLines.forEach((ln, i) => doc.text(ln, margin + 6 + labelW, y + i * 4.2));
        y += vLines.length * 4.2 + 1;
      });
      y = top + h + 4;
    });
    y += 2;
  };

  const renderFlow = (nodes) => {
    nodes.forEach((node, i) => {
      const descLines = doc.splitTextToSize(node.description || '', textW - 12);
      const nodeH = 12 + descLines.length * 4.2 + 3;
      ensure(nodeH + (i < nodes.length - 1 ? 13 : 0));
      doc.setFillColor(...SKY_BG);
      doc.setDrawColor(...SKY);
      doc.roundedRect(margin, y, textW, nodeH, 3, 3, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...SLATE);
      doc.text(node.title, margin + 4, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      descLines.forEach((ln, j) => doc.text(ln, margin + 4, y + 12 + j * 4.2));
      y += nodeH;
      if (i < nodes.length - 1) {
        doc.setDrawColor(...SKY);
        doc.line(pageW / 2, y + 2, pageW / 2, y + 8);
        doc.setFillColor(...SKY);
        doc.triangle(pageW / 2 - 2, y + 8, pageW / 2 + 2, y + 8, pageW / 2, y + 11, 'F');
        y += 13;
      }
    });
    y += 4;
  };

  const renderList = (items) => {
    items.forEach((item) => {
      const lines = doc.splitTextToSize(String(item), textW - 8);
      ensure(lines.length * 4.6 + 2);
      doc.setFillColor(...SKY);
      doc.circle(margin + 2, y - 1.2, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...SLATE);
      lines.forEach((ln, i) => doc.text(ln, margin + 7, y + i * 4.6));
      y += lines.length * 4.6 + 2;
    });
    y += 3;
  };

  const renderFaq = (items) => {
    items.forEach(([q, a]) => {
      ensure(16);
      write(`P: ${q}`, { size: 9.5, font: 'bold', gap: 1 });
      write(`R: ${a}`, { size: 9, color: MUTED, gap: 3 });
    });
  };

  const renderSteps = (steps, chapterImages) => {
    let imgIndex = 0;
    steps.forEach((step, index) => {
      const descLines = doc.splitTextToSize(step.description || '', textW - 18);
      let blockH = 10 + descLines.length * 4.6 + 2;
      if (step.alert) blockH += 4;
      ensure(blockH + 6);

      doc.setFillColor(...SKY);
      doc.circle(margin + 4, y + 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(String(index + 1), margin + 4, y + 6, { align: 'center' });

      doc.setTextColor(...SLATE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(step.title || `Passo ${index + 1}`, margin + 14, y + 5);

      doc.setTextColor(...MUTED);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      descLines.forEach((ln, i) => doc.text(ln, margin + 14, y + 11 + i * 4.6));
      y += blockH;

      if (step.alert) write(`Alerta: ${step.alert}`, { x: margin + 14, w: textW - 18, size: 8.5, color: AMBER, gap: 3 });
      y += 4;

      if (chapterImages && chapterImages.length > 0) {
        const img = chapterImages[imgIndex];
        if (img) {
          drawImage(img.dataUrl, img.title);
          imgIndex += 1;
        } else {
          drawPlaceholder(step.print || step.title);
        }
      } else if (step.print) {
        drawPlaceholder(step.print);
      }
    });
    y += 2;
  };

  // Prepara (dataURL) as imagens anexadas cujo título/descrição contém o nome do capítulo.
  const prepareChapterImages = async (label) => {
    const matched = images.filter((img) =>
      `${img.title} ${img.description || ''}`.toLowerCase().includes(label.toLowerCase())
    );
    const prepared = [];
    for (const img of matched) {
      const dataUrl = await toDataUrl(img.signed_url);
      prepared.push({ ...img, dataUrl });
    }
    return prepared;
  };

  const renderBlocks = async (blocks, label) => {
    let chapterImages = null;
    for (const block of blocks) {
      switch (block.type) {
        case 'h': subHeading(block.text); break;
        case 'p': write(block.text, { size: 9.5, color: SLATE, gap: 3 }); break;
        case 'list': renderList(block.items); break;
        case 'steps':
          if (images.length > 0) chapterImages = await prepareChapterImages(label);
          renderSteps(block.steps, chapterImages);
          break;
        case 'note': box(block.text, { bg: SKY_BG, border: SKY, color: SKY_TXT }); break;
        case 'alert': box(block.text, { bg: AMBER_BG, border: AMBER_BD, color: AMBER, accent: [245, 158, 11] }); break;
        case 'faq': renderFaq(block.items); break;
        case 'cards': renderCards(block.items); break;
        case 'flow': renderFlow(block.nodes); break;
        case 'table': renderTable(block.rows); break;
        default: break;
      }
    }
  };

  /* ---------- Apresentação, controle de versão e objetivo ---------- */
  chapterTitle('Apresentação e Controle de Versão', false);
  write(
    'Este é o Manual Mestre da Plataforma: material único, padronizado e detalhado para treinamento de usuários, onboarding de novos colaboradores e consulta operacional no dia a dia. Navegue pelo sumário clicável e pelos capítulos numerados.',
    { size: 10, gap: 4 }
  );
  subHeading('Controle de versão');
  renderTable([
    ['Versão', 'Data', 'Responsável', 'Descrição'],
    [MASTER_MANUAL_META.version, format(new Date(), 'dd/MM/yyyy'), MASTER_MANUAL_META.responsible, 'Emissão inicial do Manual Mestre da Plataforma.'],
  ]);
  write(`Data de emissão deste exemplar: ${emission}.`, { size: 9, color: MUTED, gap: 4 });
  subHeading('Objetivo do sistema');
  write(SYSTEM_OBJECTIVE, { size: 9.5, gap: 4 });
  box('Todas as ações críticas exigem assinatura eletrônica vinculada ao usuário autenticado e ficam registradas permanentemente no histórico do processo, com assinatura, nome, data, hora e descrição da ação.', { bg: SKY_BG, border: SKY, color: SKY_TXT });

  /* ---------- Glossário ---------- */
  chapterTitle('Glossário de Termos', false);
  renderTable([['Termo', 'Definição'], ...GLOSSARY]);

  /* ---------- Fluxograma geral ---------- */
  chapterTitle('Fluxograma Geral do Processo', false);
  renderFlow(GENERAL_FLOW);
  box('O fluxo acima é o caminho completo de um item de reparo. Itens de certificação seguem o mesmo caminho e, no retorno, exigem o registro do certificado e da validade pelas Operações antes da finalização.', { bg: AMBER_BG, border: AMBER_BD, color: AMBER });

  /* ---------- Índice de funcionalidades ---------- */
  chapterTitle('Índice de Funcionalidades', false);
  renderTable([['Funcionalidade', 'O que faz'], ...FEATURE_INDEX]);

  /* ---------- Capítulos ---------- */
  for (const chapter of MASTER_MANUAL_CHAPTERS) {
    chapterTitle(chapter.label);
    await renderBlocks(chapter.blocks, chapter.label);
  }

  /* ---------- Rodapé em todas as páginas ---------- */
  const pageCount = doc.getNumberOfPages();
  for (let p = 2; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(...BORDER);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setTextColor(...FAINT);
    doc.setFontSize(7);
    doc.text(`Manual Mestre da Plataforma — Starnav Control Tower — Página ${p} de ${pageCount}`, margin, pageH - 9);
    doc.text(`Versão ${MASTER_MANUAL_META.version} — Emitido em ${emission}`, pageW - margin, pageH - 9, { align: 'right' });
  }

  /* ---------- Sumário clicável (página 2) ---------- */
  doc.setPage(2);
  doc.setFillColor(...SKY);
  doc.rect(0, 0, pageW, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...SLATE);
  doc.text('SUMÁRIO', margin, 30);
  doc.setDrawColor(...SKY);
  doc.setLineWidth(0.8);
  doc.line(margin, 34, margin + 40, 34);
  doc.setLineWidth(0.2);
  let ty = 46;
  tocEntries.forEach((entry, i) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE);
    const labelText = `${i + 1}. ${entry.label}`;
    doc.textWithLink(labelText, margin, ty, { pageNumber: entry.page });
    const tw = doc.getTextWidth(labelText);
    doc.setTextColor(...FAINT);
    doc.text(String(entry.page), pageW - margin, ty, { align: 'right' });
    doc.setDrawColor(...BORDER);
    doc.line(margin + tw + 4, ty - 1, pageW - margin - 12, ty - 1);
    ty += 7.4;
  });

  doc.save(`Manual-Mestre-Starnav-${format(new Date(), 'yyyyMMdd')}.pdf`);
}