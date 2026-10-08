/**
 * Utilitários de imagem para geração de PDFs (evidências fotográficas).
 */
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PHOTO_CATEGORY_LABELS } from '@/lib/gdmPhotos';

/** Carrega uma imagem remota e devolve data URL + dimensões naturais. */
export const loadImage = (url, fmt = 'jpeg', quality = 0.8) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve({
          dataUrl:
            fmt === 'png'
              ? canvas.toDataURL('image/png')
              : canvas.toDataURL('image/jpeg', quality),
          w: img.naturalWidth,
          h: img.naturalHeight,
        });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = url;
  });

/**
 * Desenha uma lista de evidências fotográficas no PDF: imagem redimensionada
 * proporcionalmente, com legenda, data de captura, categoria e responsável.
 * Retorna a posição Y final (controla quebra de página internamente).
 */
export async function drawPhotoEvidence(doc, photos, { y, margin, pageW, pageH }) {
  const ensure = (h) => {
    if (y + h > pageH - 16) {
      doc.addPage();
      y = margin;
    }
  };
  const maxW = pageW - margin * 2;
  const maxH = 86;

  for (const p of photos) {
    let info = null;
    try {
      info = await loadImage(p.url);
    } catch (e) {
      info = null;
    }
    if (!info) continue;

    const scale = Math.min(maxW / info.w, maxH / info.h);
    const iw = info.w * scale;
    const ih = info.h * scale;

    ensure(ih + 12);
    doc.addImage(info.dataUrl, 'JPEG', margin + (maxW - iw) / 2, y, iw, ih);
    y += ih + 3;

    const meta = [
      PHOTO_CATEGORY_LABELS[p.category] || 'Evidência',
      p.caption,
      p.taken_at ? format(new Date(p.taken_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : null,
      p.registered_by,
    ]
      .filter(Boolean)
      .join('  •  ');

    ensure(6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(meta.slice(0, 150), margin + 2, y + 4);
    y += 8;
  }

  return y;
}