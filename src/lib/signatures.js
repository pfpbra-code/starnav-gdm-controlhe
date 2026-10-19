import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const SIGNATURE_MISSING_MESSAGE =
  'A assinatura eletrônica ainda não foi cadastrada. Acesse Meu Perfil para configurar sua assinatura.';

/** URL da assinatura eletrônica cadastrada pelo usuário. */
export const getSignatureUrl = (user) =>
  user?.signature_url || user?.data?.signature_url || '';

export const hasSignature = (user) => !!getSignatureUrl(user);

/** Usuário atual + estado da assinatura eletrônica dele. */
export function useSigner() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  return {
    user,
    isLoading,
    signatureUrl: getSignatureUrl(user),
    hasSignature: hasSignature(user),
  };
}

let cachedIp = null;
async function resolveIpAddress() {
  if (cachedIp !== null) return cachedIp;
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const json = await res.json();
    cachedIp = json.ip || null;
  } catch {
    cachedIp = null;
  }
  return cachedIp;
}

/** Comprime a imagem da assinatura (fundo branco, JPEG) antes de salvar. */
export function compressSignature(dataUrl, maxWidth = 640, maxHeight = 260) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Salva a imagem da assinatura do usuário e devolve a URL pública. */
export async function saveSignatureImage(dataUrl) {
  const compressed = await compressSignature(dataUrl);
  const blob = await (await fetch(compressed)).blob();
  const file = new File([blob], 'assinatura-eletronica.jpg', { type: 'image/jpeg' });
  const res = await base44.integrations.Core.UploadPublicFile({ file });
  return res.file_url;
}

/**
 * Registra a assinatura eletrônica da ação que o usuário está executando.
 * Sem assinatura cadastrada, lança o erro de obrigatoriedade.
 */
export async function createSignatureRecord({
  action,
  actionLabel,
  item,
  justification,
  details,
}) {
  const user = await base44.auth.me();
  const signatureUrl = getSignatureUrl(user);
  if (!signatureUrl) throw new Error(SIGNATURE_MISSING_MESSAGE);

  let gdmNumber = null;
  if (item?.gdm_id) {
    try {
      const gdm = await base44.entities.GDM.get(item.gdm_id);
      gdmNumber = gdm?.gdm_number || null;
    } catch {
      gdmNumber = null;
    }
  }

  const ip = await resolveIpAddress();

  return base44.entities.Signature.create({
    user_id: user.id,
    user_email: user.email,
    user_name: user.full_name || '',
    user_job_title: user.job_title || user.data?.job_title || '',
    signature_url: signatureUrl,
    action,
    action_label: actionLabel || action,
    gdm_id: item?.gdm_id || undefined,
    gdm_number: gdmNumber || undefined,
    item_id: item?.id || undefined,
    item_number: item?.item_number,
    equipment_name: item?.equipment_name,
    serial_number: item?.serial_number,
    vessel_name: item?.vessel_name,
    justification: justification?.trim() || undefined,
    ip_address: ip || undefined,
    details: details || undefined,
    signed_at: new Date().toISOString(),
  });
}