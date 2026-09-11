import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import {
  ITEM_STATUS_LABELS,
  ITEM_ACTION_LABELS,
} from '@/lib/gdmItems';
import { fetchItemAttachments, signedAttachmentUrl } from '@/lib/discardEvidence';

const loadImageAsDataURL = (url, fmt = 'jpeg', quality = 0.82) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(fmt === 'png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = url;
  });

const fmtDate = (d) => (d ? format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) : '-');
const fmtDateTime = (d) => (d ? format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-');

/**
 * Relatório formal de descarte de um item da GDM: identificação da GDM,
 * do material, do processo e das comprovações (fotos incorporadas e PDFs listados).
 */
export default function DiscardReportButton({ item, gdm, variant = 'outline', size = 'sm', label = 'Relatório de descarte', className }) {
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const [history, attachments] = await Promise.all([
        base44.entities.GDMItemHistory.filter({ item_id: item.id }, 'created_date').catch(() => []),
        fetchItemAttachments(item.id),
      ]);

      let equipment = null;
      if (item.equipment_id) {
        try {
          const eqs = await base44.entities.Equipment.filter({ id: item.equipment_id });
          equipment = eqs && eqs[0];
        } catch {
          equipment = null;
        }
      }

      const authorizedBy = history.find((h) => h.action === 'authorize_discard')?.user_email || '-';
      const confirmedBy = history.find((h) => h.action === 'confirm_discard')?.user_email || '-';

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

      // Header
      doc.setFillColor(2, 132, 199);
      doc.rect(0, 0, pageW, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('STARNAV SERVIÇOS MARÍTIMOS', margin, 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Relatório formal de descarte de material', margin, 16);
      doc.setFontSize(8);
      doc.text('PIS ALMOX 001.07 - Formulário para Descarte de Materiais', margin, 21);
      doc.text(
        `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        pageW - margin,
        16,
        { align: 'right' },
      );
      y = 30;

      // Title box
      doc.setDrawColor(2, 132, 199);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, pageW - margin * 2, 12, 'S');
      doc.setTextColor(2, 132, 199);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(
        `GDM ${gdm?.gdm_number || '-'} — Item ${String(item.item_number).padStart(2, '0')}`,
        margin + 3,
        y + 8,
      );
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('DESCARTE REALIZADO', pageW - margin - 3, y + 8, { align: 'right' });
      y += 18;

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
      const drawField = (labelTxt, value, x) => {
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(labelTxt, x, y);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(String(value ?? '-') || '-', colW - 6);
        doc.text(lines, x, y + 4.5);
        return lines.length;
      };
      const rowGap = (a, b) => 5 + Math.max(a, b) * 4;

      // Identificação da GDM
      section('IDENTIFICAÇÃO DA GDM');
      let lA = drawField('Número da GDM', gdm?.gdm_number, left);
      let lB = drawField('Data de criação', fmtDateTime(gdm?.created_date), right);
      y += rowGap(lA, lB);
      lA = drawField('Embarcação', gdm?.vessel_name, left);
      lB = drawField('Código da embarcação', gdm?.vessel_code, right);
      y += rowGap(lA, lB);
      lA = drawField('Responsável pela criação', gdm?.history?.[0]?.user_name || gdm?.history?.[0]?.user || '-', left);
      lB = drawField('Coordenador responsável', gdm?.coordinator_approved_by || '-', right);
      y += rowGap(lA, lB);
      lA = drawField('Recebimento pelo Almoxarifado', fmtDateTime(item.stock_received_at), left);
      lB = drawField('Data de desembarque', fmtDate(gdm?.disembark_date), right);
      y += rowGap(lA, lB) + 2;

      // Identificação do material
      section('IDENTIFICAÇÃO DO MATERIAL');
      lA = drawField('Equipamento', item.equipment_name, left);
      lB = drawField('Código do equipamento', item.equipment_code, right);
      y += rowGap(lA, lB);
      lA = drawField('Número de série', item.serial_number, left);
      lB = drawField('Quantidade', item.quantity, right);
      y += rowGap(lA, lB);
      lA = drawField('Fabricante', equipment?.manufacturer, left);
      lB = drawField('Modelo', equipment?.model, right);
      y += rowGap(lA, lB);
      lA = drawField('Condição do material', 'Descartado', left);
      lB = drawField('Destino selecionado', 'Descarte', right);
      y += rowGap(lA, lB);
      lA = drawField('Status final', ITEM_STATUS_LABELS[item.status] || item.status, left);
      lB = drawField('Motivo do descarte', gdm?.description || item.notes || '-', right);
      y += rowGap(lA, lB) + 2;

      // Informações do processo
      section('INFORMAÇÕES DO PROCESSO');
      lA = drawField('Descarte autorizado em', fmtDateTime(item.discard_authorized_at), left);
      lB = drawField('Autorizado por', authorizedBy, right);
      y += rowGap(lA, lB);
      lA = drawField('Descarte confirmado em', fmtDateTime(item.discard_confirmed_at), left);
      lB = drawField('Confirmado por (Almoxarifado)', confirmedBy, right);
      y += rowGap(lA, lB);
      lA = drawField('Data do descarte', fmtDate(item.discard_date), left);
      lB = drawField('Responsável pelo descarte', item.discard_responsible, right);
      y += rowGap(lA, lB);
      lA = drawField('PWT / OC / OT', [gdm?.pwt_number, gdm?.oc_number, gdm?.ot_number].filter(Boolean).join(' / ') || '-', left);
      lB = drawField('Fornecedor', item.supplier_name || '—', right);
      y += rowGap(lA, lB);

      if (item.discard_notes) {
        ensure(14);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Observações', left, y);
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(9);
        doc.splitTextToSize(item.discard_notes, pageW - margin * 2 - 6).forEach((line) => {
          ensure(5);
          doc.text(line, margin + 2, y + 4.5);
          y += 4.5;
        });
        y += 6;
      }

      // Histórico das etapas
      section(`HISTÓRICO DAS ETAPAS (${history.length} registros)`);
      history.forEach((h) => {
        ensure(12);
        doc.setFillColor(2, 132, 199);
        doc.circle(margin + 4, y + 2, 1.2, 'F');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`${ITEM_ACTION_LABELS[h.action] || h.action} - ${fmtDateTime(h.created_date)}`, margin + 9, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`${h.user_email || 'Sistema'} | ${ITEM_STATUS_LABELS[h.previous_status] || '—'} > ${ITEM_STATUS_LABELS[h.new_status] || '—'}`, margin + 9, y);
        y += 3.5;
        if (h.observation) {
          doc.setTextColor(71, 85, 105);
          doc.splitTextToSize(`Obs: ${h.observation}`, pageW - margin * 2 - 12).forEach((line) => {
            ensure(4);
            doc.text(line, margin + 9, y);
            y += 3.5;
          });
        }
        y += 3;
      });
      y += 2;

      // Comprovação (fotos incorporadas + PDFs listados)
      const photos = attachments.filter((a) => (a.file_type || '').startsWith('image/'));
      const pdfs = attachments.filter((a) => a.file_type === 'application/pdf');

      section(`COMPROVAÇÃO DO DESCARTE (${attachments.length} documento(s))`);
      if (attachments.length === 0) {
        ensure(6);
        doc.setTextColor(150, 60, 60);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Descarte confirmado sem anexo comprobatório — justificativa registrada no histórico.', margin + 2, y);
        y += 8;
      }

      for (const att of photos) {
        try {
          const url = await signedAttachmentUrl(att.file_uri);
          const data = await loadImageAsDataURL(url);
          const imgW = pageW - margin * 2 - 8;
          const imgH = imgW * 0.62;
          ensure(imgH + 14);
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, pageW - margin * 2, imgH, 'F');
          try {
            doc.addImage(data, 'JPEG', margin + 4, y + 4, imgW, imgH - 8);
          } catch {
            // imagem não incorporável — mantém o quadro com o nome
          }
          y += imgH + 4;
          doc.setTextColor(100, 116, 139);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.text(
            `${att.file_name} — enviado por ${att.uploaded_by || '-'} em ${fmtDateTime(att.uploaded_at || att.created_date)}`,
            margin + 2,
            y,
          );
          y += 10;
        } catch {
          ensure(5);
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(8);
          doc.text(`Foto: ${att.file_name} (arquivo disponível no sistema)`, margin + 2, y);
          y += 6;
        }
      }

      for (const att of pdfs) {
        ensure(8);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`PDF: ${att.file_name}`, margin + 2, y);
        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Enviado por ${att.uploaded_by || '-'} em ${fmtDateTime(att.uploaded_at || att.created_date)} — documento arquivado no sistema.`,
          margin + 2,
          y,
        );
        y += 7;
      }

      // Assinaturas
      ensure(28);
      y += 10;
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.line(margin + 10, y, pageW / 2 - 10, y);
      doc.line(pageW / 2 + 10, y, pageW - margin - 10, y);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Responsável pelo descarte', margin + 10, y + 6);
      doc.text('Almoxarifado', pageW / 2 + 10, y + 6);

      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7);
        doc.text(
          `Starnav Control Tower — Relatório de Descarte — GDM ${gdm?.gdm_number || ''} — Item ${String(item.item_number).padStart(2, '0')} — Página ${p} de ${pageCount}`,
          margin,
          pageH - 7,
        );
      }

      const safeName = String(item.equipment_name || 'item').replace(/[^\w\-]+/g, '_').slice(0, 40);
      doc.save(`Relatorio-Descarte-GDM-${gdm?.gdm_number || 'documento'}-item-${String(item.item_number).padStart(2, '0')}-${safeName}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={generate} disabled={generating} className={className}>
      {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileDown className="h-4 w-4 mr-1" />}
      {label}
    </Button>
  );
}