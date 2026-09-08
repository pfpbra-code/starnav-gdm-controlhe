import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import {
  ITEM_DESTINATION_LABELS,
  ITEM_STATUS_LABELS,
  ITEM_ACTION_LABELS,
  itemResponsible,
  nextActionText,
} from '@/lib/gdmItems';
import { itemQrImageUrl, itemPublicUrl } from './GDMItemQrCode';

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

export default function GDMItemPdfButton({
  item,
  gdm,
  variant = 'outline',
  size = 'sm',
  label = 'PDF do item',
  className,
}) {
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const history = await base44.entities.GDMItemHistory.filter(
        { item_id: item.id },
        'created_date',
      ).catch(() => []);

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
      doc.text('Ficha individual do equipamento', margin, 16);
      doc.setFontSize(8);
      doc.text(
        `Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
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
      doc.text(ITEM_STATUS_LABELS[item.status] || item.status || '-', pageW - margin - 3, y + 8, {
        align: 'right',
      });
      y += 18;

      // QR
      try {
        const qrData = await loadImageAsDataURL(itemQrImageUrl(item.id, 320), 'png');
        const qrSize = 26;
        const qrX = pageW - margin - qrSize;
        const boxH = qrSize + 8;
        ensure(boxH + 2);
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, pageW - margin * 2, boxH, 'F');
        doc.addImage(qrData, 'PNG', qrX, y + 4, qrSize, qrSize);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('QR CODE DO EQUIPAMENTO', margin + 3, y + 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const cap = doc.splitTextToSize(
          `Fixe este código no equipamento. Ao escanear, abre a consulta pública deste item.\n${itemPublicUrl(item.id)}`,
          qrX - margin - 6,
        );
        doc.text(cap, margin + 3, y + 14);
        y += boxH + 4;
      } catch (e) {
        /* QR indisponível */
      }

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

      section('DADOS DO EQUIPAMENTO');
      let lA = drawField('Equipamento', item.equipment_name, left);
      let lB = drawField('Código', item.equipment_code, right);
      y += rowGap(lA, lB);
      lA = drawField('Número de série', item.serial_number, left);
      lB = drawField('Quantidade', item.quantity, right);
      y += rowGap(lA, lB);
      lA = drawField('OS', item.os_number, left);
      lB = drawField('Tratativa', ITEM_DESTINATION_LABELS[item.destination] || item.destination, right);
      y += rowGap(lA, lB);
      lA = drawField('Situação', ITEM_STATUS_LABELS[item.status] || item.status, left);
      lB = drawField('Responsável atual', itemResponsible(item), right);
      y += rowGap(lA, lB);
      lA = drawField('Fornecedor', item.supplier_name, left);
      lB = drawField('Embarcação', gdm?.vessel_name, right);
      y += rowGap(lA, lB) + 2;

      section('DATAS E CONTROLES');
      lA = drawField('Data de desembarque', fmtDate(gdm?.disembark_date), left);
      lB = drawField('Recebido no almoxarifado', fmtDateTime(item.stock_received_at), right);
      y += rowGap(lA, lB);
      lA = drawField('Devolução ao estoque', fmtDateTime(item.stock_return_at), left);
      lB = drawField('Número da devolução', item.stock_return_number, right);
      y += rowGap(lA, lB);
      lA = drawField('Descarte autorizado em', fmtDateTime(item.discard_authorized_at), left);
      lB = drawField('Descarte confirmado em', fmtDateTime(item.discard_confirmed_at), right);
      y += rowGap(lA, lB);
      lA = drawField('Finalizado em', fmtDateTime(item.completed_at), left);
      lB = drawField('PWT / OC / OT', [gdm?.pwt_number, gdm?.oc_number, gdm?.ot_number].filter(Boolean).join(' / ') || '-', right);
      y += rowGap(lA, lB) + 2;

      section('PRÓXIMA AÇÃO');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.splitTextToSize(nextActionText(item) || '-', pageW - margin * 2 - 6).forEach((line) => {
        ensure(5);
        doc.text(line, margin + 2, y);
        y += 4.5;
      });
      y += 4;

      if (item.notes) {
        section('OBSERVAÇÕES DO ITEM');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.splitTextToSize(item.notes, pageW - margin * 2 - 6).forEach((line) => {
          ensure(5);
          doc.text(line, margin + 2, y);
          y += 4.5;
        });
        y += 4;
      }

      // Documentação vinculada
      const docs = [
        ['Documento da cotação', gdm?.quote_document_url],
        ['Laudo técnico', gdm?.technical_report_url],
        ['Proposta comercial', gdm?.commercial_proposal_url],
        ['Nota fiscal de retorno', gdm?.return_nf_url],
      ].filter(([, v]) => !!v);
      if (docs.length) {
        section('DOCUMENTAÇÃO VINCULADA');
        docs.forEach(([labelTxt, url]) => {
          ensure(5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`${labelTxt}:`, margin + 2, y);
          doc.setTextColor(2, 132, 199);
          const lines = doc.splitTextToSize(String(url), pageW - margin * 2 - 45);
          doc.text(lines, margin + 42, y);
          y += Math.max(5, lines.length * 4);
        });
        y += 3;
      }

      // Histórico do item
      section(`HISTÓRICO DO ITEM (${history.length} registros)`);
      if (!history.length) {
        ensure(6);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Nenhuma movimentação registrada.', margin + 2, y);
        y += 6;
      }
      history.forEach((h) => {
        ensure(12);
        doc.setFillColor(2, 132, 199);
        doc.circle(margin + 4, y + 2, 1.2, 'F');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(
          `${ITEM_ACTION_LABELS[h.action] || h.action} - ${fmtDateTime(h.created_date)}`,
          margin + 9,
          y,
        );
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        const who = h.user_email || 'Sistema';
        const transition =
          h.previous_status || h.new_status
            ? ` | ${ITEM_STATUS_LABELS[h.previous_status] || '—'} > ${ITEM_STATUS_LABELS[h.new_status] || '—'}`
            : '';
        doc.text(`${who}${transition}`, margin + 9, y);
        y += 3.5;
        if (h.observation) {
          doc.setTextColor(71, 85, 105);
          doc
            .splitTextToSize(`Obs: ${h.observation}`, pageW - margin * 2 - 12)
            .forEach((line) => {
              ensure(4);
              doc.text(line, margin + 9, y);
              y += 3.5;
            });
        }
        y += 3;
      });

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
      doc.text('Responsável Embarcação', margin + 10, y + 6);
      doc.text('Responsável Recebimento', pageW / 2 + 10, y + 6);

      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7);
        doc.text(
          `Starnav Control Tower — GDM ${gdm?.gdm_number || ''} — Item ${String(item.item_number).padStart(2, '0')} — Página ${p} de ${pageCount}`,
          margin,
          pageH - 7,
        );
      }

      const safeName = String(item.equipment_name || 'item').replace(/[^\w\-]+/g, '_').slice(0, 40);
      doc.save(`GDM-${gdm?.gdm_number || 'documento'}-item-${String(item.item_number).padStart(2, '0')}-${safeName}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={generate} disabled={generating} className={className}>
      {generating ? (
        <Loader2 className="h-4 w-4 animate-spin mr-1" />
      ) : (
        <FileDown className="h-4 w-4 mr-1" />
      )}
      {label}
    </Button>
  );
}