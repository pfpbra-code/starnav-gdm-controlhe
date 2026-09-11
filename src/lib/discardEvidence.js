import { base44 } from '@/api/base44Client';

/**
 * Comprovações de descarte: validação, upload (armazenamento privado) e
 * acesso via URL assinada. Compartilhado entre o diálogo de confirmação
 * do Almoxarifado e os relatórios de descarte.
 */

export const DISPOSAL_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];
export const DISPOSAL_ACCEPT_ATTRIBUTE = '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf';
export const DISPOSAL_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB por arquivo

export const DISPOSAL_ATTACHMENT_TYPE_LABELS = {
  descarte_foto: 'Foto do descarte',
  descarte_pdf: 'PDF do descarte',
  documento_descarte: 'Documento comprobatório',
};

/** Tipo de comprovação conforme o arquivo enviado. */
export function attachmentTypeForFile(file) {
  return file?.type === 'application/pdf' ? 'descarte_pdf' : 'descarte_foto';
}

/** Validação de tipo e tamanho — usada no frontend (o backend revalida). */
export function validateDisposalFile(file) {
  if (!file) return 'Arquivo inválido';
  const mime = (file.type || '').toLowerCase();
  if (!DISPOSAL_ALLOWED_MIME_TYPES.includes(mime)) {
    return 'formato não permitido (use JPG, JPEG, PNG, WEBP ou PDF)';
  }
  if (file.size > DISPOSAL_MAX_FILE_SIZE) {
    return `arquivo maior que ${DISPOSAL_MAX_FILE_SIZE / (1024 * 1024)} MB`;
  }
  return null;
}

/** Envia os arquivos ao armazenamento privado e registra cada anexo no item. */
export async function uploadDisposalFiles(files = [], item, user) {
  const created = [];
  for (const file of files) {
    const error = validateDisposalFile(file);
    if (error) throw new Error(`${file.name}: ${error}`);
    const res = await base44.integrations.Core.UploadPrivateFile({ file });
    const fileUri = res?.file_uri || res?.data?.file_uri;
    if (!fileUri) throw new Error(`Não foi possível enviar o arquivo ${file.name}`);
    const record = await base44.entities.GDMAttachment.create({
      gdm_id: item.gdm_id,
      gdm_item_id: item.id,
      vessel_id: item.vessel_id || null,
      file_name: file.name,
      file_uri: fileUri,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size || 0,
      attachment_type: attachmentTypeForFile(file),
      uploaded_by: user?.email || null,
      uploaded_at: new Date().toISOString(),
    });
    created.push(record);
  }
  return created;
}

/** Anexos de comprovação de um item (fotos, PDFs e documentos). */
export async function fetchItemAttachments(itemId) {
  try {
    return await base44.entities.GDMAttachment.filter({ gdm_item_id: itemId });
  } catch {
    return [];
  }
}

/** URL temporária e assinada de um arquivo privado. */
export async function signedAttachmentUrl(fileUri, expiresIn = 3600) {
  const res = await base44.integrations.Core.CreateFileSignedUrl({
    file_uri: fileUri,
    expires_in: expiresIn,
  });
  return res?.signed_url || res?.data?.signed_url;
}