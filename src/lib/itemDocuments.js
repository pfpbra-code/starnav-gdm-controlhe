/**
 * Repositório único de documentos por item da GDM.
 *
 * Reúne em uma lista normalizada tudo o que foi anexado ao item durante o
 * ciclo (cotações de todas as versões, propostas, laudos, OC, comprovantes de
 * envio/recebimento, notas fiscais, certificados, evidências fotográficas e
 * demais anexos), independentemente da etapa atual do processo.
 */
import { PHOTO_CATEGORY_LABELS } from '@/lib/gdmPhotos';
import { DISPOSAL_ATTACHMENT_TYPE_LABELS } from '@/lib/discardEvidence';

export const DOCUMENT_CATEGORIES = [
  { value: 'cotacao', label: 'Cotação' },
  { value: 'proposta', label: 'Proposta comercial' },
  { value: 'laudo', label: 'Laudo / Relatório técnico' },
  { value: 'compra', label: 'Compra (OC)' },
  { value: 'fiscal', label: 'Nota fiscal' },
  { value: 'certificado', label: 'Certificado' },
  { value: 'envio', label: 'Envio / Recebimento' },
  { value: 'foto', label: 'Evidência fotográfica' },
  { value: 'descarte', label: 'Descarte' },
  { value: 'outro', label: 'Outro' },
];

export const DOCUMENT_CATEGORY_LABELS = Object.fromEntries(
  DOCUMENT_CATEGORIES.map((c) => [c.value, c.label]),
);

const ATTACHMENT_CATEGORY = {
  descarte_foto: 'foto',
  descarte_pdf: 'descarte',
  documento_descarte: 'descarte',
};

const isImageUrl = (url) =>
  /\.(png|jpe?g|webp|gif|bmp)$/i.test(String(url || '').split('?')[0]);

const fileNameFromUrl = (url) => {
  const clean = String(url || '').split('?')[0].split('/').filter(Boolean).pop();
  return clean || 'Documento';
};

/** Rótulo da versão da cotação conforme o desfecho registrado no histórico. */
function quoteLabel(entry, index) {
  if (/renegocia|negocia|desconto/i.test(String(entry?.outcome || ''))) {
    return 'Cotação com Desconto';
  }
  return index === 0 ? 'Cotação Inicial' : 'Cotação Revisada';
}

/**
 * Lista completa de documentos do item.
 * Cada entrada: { id, type, category, categoryLabel, url, fileUri, isImage,
 * fileName, date, user, note, hasFile }.
 */
export function buildItemDocuments({
  item = {},
  gdm = {},
  photos = [],
  attachments = [],
  certifications = [],
} = {}) {
  const docs = [];
  const seen = new Set();

  const add = (doc) => {
    const key = `${doc.type}|${doc.url || doc.fileUri || doc.note || doc.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    const category = doc.category || 'outro';
    docs.push({
      id: `${doc.type}-${docs.length}`,
      category,
      categoryLabel: DOCUMENT_CATEGORY_LABELS[category],
      isImage: doc.isImage ?? isImageUrl(doc.url),
      hasFile: !!(doc.url || doc.fileUri),
      ...doc,
      url: doc.url || null,
      fileUri: doc.fileUri || null,
      fileName: doc.fileName || fileNameFromUrl(doc.url || doc.fileUri),
    });
  };

  // Cotações e propostas — todas as versões do histórico, nunca só a atual.
  const quotes = Array.isArray(item.quotes_history) ? item.quotes_history : [];
  quotes.forEach((q, index) => {
    const label = quoteLabel(q, index);
    const date = q.registered_at || q.decided_at || null;
    const user = q.registered_by || q.decided_by || null;
    if (q.quote_document_url) {
      add({
        type: label,
        category: 'cotacao',
        url: q.quote_document_url,
        date,
        user,
        note: q.quote_proposal_number ? `Proposta ${q.quote_proposal_number}` : null,
      });
    }
    if (q.technical_report_url) {
      add({ type: 'Laudo técnico', category: 'laudo', url: q.technical_report_url, date, user });
    }
    if (q.commercial_proposal_url) {
      add({
        type: 'Proposta comercial',
        category: 'proposta',
        url: q.commercial_proposal_url,
        date,
        user,
      });
    }
  });

  // Cotação atual do item, quando não estiver no histórico.
  const quoteInHistory = quotes.some(
    (q) => q.quote_document_url && q.quote_document_url === item.quote_document_url,
  );
  if (item.quote_document_url && !quoteInHistory) {
    add({
      type: quotes.length ? 'Cotação Atual' : 'Cotação Inicial',
      category: 'cotacao',
      url: item.quote_document_url,
      date: item.quote_attached_at,
      user: item.quote_attached_by,
      note: item.quote_proposal_number ? `Proposta ${item.quote_proposal_number}` : null,
    });
  }
  if (gdm.commercial_proposal_url) {
    add({
      type: 'Proposta comercial',
      category: 'proposta',
      url: gdm.commercial_proposal_url,
      date: gdm.commercial_proposal_uploaded_at,
      user: gdm.commercial_proposal_uploaded_by,
    });
  }
  if (gdm.technical_report_url) {
    add({
      type: 'Laudo técnico',
      category: 'laudo',
      url: gdm.technical_report_url,
      date: gdm.maintenance_decided_at,
      user: gdm.maintenance_decided_by,
    });
  }

  // Ordem de Compra — registro do processo, pode não ter arquivo digital.
  if (item.oc_number) {
    add({
      type: 'Ordem de Compra',
      category: 'compra',
      date: item.oc_issued_at,
      user: item.oc_issued_by,
      note: `OC nº ${item.oc_number}${item.oc_value ? ` · ${Number(item.oc_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}`,
    });
  }

  // Envio ao fornecedor e retorno.
  if (item.shipping_proof_url) {
    add({
      type: 'Comprovante de envio (NF assinada)',
      category: 'envio',
      url: item.shipping_proof_url,
      date: item.shipping_proof_at,
      user: item.shipping_proof_by,
    });
  }
  if (item.shipping_photo_url) {
    add({
      type: 'Foto do envio ao fornecedor',
      category: 'envio',
      url: item.shipping_photo_url,
      date: item.shipping_proof_at,
      user: item.shipping_proof_by,
      isImage: true,
    });
  }
  if (item.return_receipt_nf_url) {
    add({
      type: 'Nota fiscal de retorno',
      category: 'fiscal',
      url: item.return_receipt_nf_url,
      date: item.return_received_at,
      user: item.return_received_by,
    });
  }
  if (item.return_laudo_url) {
    add({
      type: 'Laudo técnico do retorno',
      category: 'laudo',
      url: item.return_laudo_url,
      date: item.return_received_at,
      user: item.return_received_by,
    });
  }
  if (item.return_nf_url) {
    add({
      type: 'NF de devolução do fornecedor anterior',
      category: 'fiscal',
      url: item.return_nf_url,
      date: item.return_registered_at,
      user: item.return_registered_by,
    });
  }
  if (item.return_proof_url) {
    add({
      type: 'Comprovante de devolução',
      category: 'envio',
      url: item.return_proof_url,
      date: item.return_registered_at,
      user: item.return_registered_by,
    });
  }

  // Certificados e calibrações registrados para o item.
  (certifications || []).forEach((c) => {
    const label = c.type === 'calibration' ? 'Certificado de calibração' : 'Certificado';
    const meta = [c.certificate_number, c.certifying_company].filter(Boolean).join(' · ');
    if (c.document_url) {
      add({
        type: `${label} (PDF)`,
        category: 'certificado',
        url: c.document_url,
        date: c.registered_at || c.certificate_date,
        user: c.registered_by,
        note: meta || null,
      });
    }
    if (c.image_url) {
      add({
        type: `${label} (imagem)`,
        category: 'certificado',
        url: c.image_url,
        date: c.registered_at || c.certificate_date,
        user: c.registered_by,
        note: meta || null,
        isImage: true,
      });
    }
  });

  // Evidências fotográficas do item (desembarque, danos, antes/depois, certificação).
  (photos || []).forEach((p) => {
    add({
      type: PHOTO_CATEGORY_LABELS[p.category] || 'Evidência fotográfica',
      category: 'foto',
      url: p.url,
      date: p.taken_at || p.registered_at,
      user: p.registered_by,
      fileName: p.caption || PHOTO_CATEGORY_LABELS[p.category] || 'Foto',
      note: p.caption || null,
      isImage: true,
    });
  });

  // Anexos enviados ao item (armazenamento privado, acesso por URL assinada).
  (attachments || []).forEach((a) => {
    add({
      type: DISPOSAL_ATTACHMENT_TYPE_LABELS[a.attachment_type] || 'Anexo do processo',
      category: ATTACHMENT_CATEGORY[a.attachment_type] || 'outro',
      fileUri: a.file_uri,
      date: a.uploaded_at,
      user: a.uploaded_by,
      fileName: a.file_name,
      note: a.description || null,
      isImage: String(a.file_type || '').startsWith('image/'),
    });
  });

  return docs;
}

/**
 * Agrupa por tipo de documento mantendo as versões — a mais recente fica em
 * destaque e as anteriores continuam disponíveis para consulta.
 */
export function groupDocuments(docs = []) {
  const groups = new Map();
  docs.forEach((d) => {
    if (!groups.has(d.type)) groups.set(d.type, []);
    groups.get(d.type).push(d);
  });
  return Array.from(groups.entries())
    .map(([type, items]) => {
      const versions = [...items].sort(
        (a, b) => new Date(a.date || 0) - new Date(b.date || 0),
      );
      versions.forEach((d, i) => {
        d.version = i + 1;
        d.versionCount = versions.length;
      });
      return {
        type,
        category: versions[0].category,
        versions,
        latest: versions[versions.length - 1],
      };
    })
    .sort((a, b) => new Date(b.latest.date || 0) - new Date(a.latest.date || 0));
}

/** Filtros por tipo, categoria, usuário e período. */
export function filterDocuments(docs = [], filters = {}) {
  const { type = 'all', category = 'all', user = 'all', from = '', to = '' } = filters;
  const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : null;
  const toTs = to ? new Date(`${to}T23:59:59`).getTime() : null;
  return docs.filter((d) => {
    if (type !== 'all' && d.type !== type) return false;
    if (category !== 'all' && d.category !== category) return false;
    if (user !== 'all' && d.user !== user) return false;
    if (fromTs || toTs) {
      const ts = d.date ? new Date(d.date).getTime() : null;
      if (!ts) return false;
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
    }
    return true;
  });
}

export function documentTypeOptions(docs = []) {
  return Array.from(new Set(docs.map((d) => d.type))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function documentUserOptions(docs = []) {
  return Array.from(new Set(docs.map((d) => d.user).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
}