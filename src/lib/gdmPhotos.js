/**
 * Evidências fotográficas de GDMs: categorias, rótulos e utilitários de imagem.
 */

export const PHOTO_CATEGORIES = [
  { value: 'disembark_condition', label: 'Condição no desembarque' },
  { value: 'nameplate', label: 'Placa de identificação' },
  { value: 'serial_number', label: 'Número de série (SN)' },
  { value: 'damage', label: 'Danos encontrados' },
  { value: 'packaging', label: 'Estado da embalagem' },
  { value: 'maintenance', label: 'Evidência de manutenção' },
  { value: 'certification', label: 'Evidência de certificação' },
  { value: 'calibration', label: 'Evidência de calibração' },
  { value: 'post_repair', label: 'Após reparo' },
  { value: 'other', label: 'Outro' },
];

export const PHOTO_CATEGORY_LABELS = Object.fromEntries(
  PHOTO_CATEGORIES.map((c) => [c.value, c.label]),
);

/**
 * Comprime e redimensiona a imagem no próprio dispositivo antes do upload:
 * - limite de 1600px no maior lado (suficiente para leitura de placas e etiquetas);
 * - qualidade JPEG de 80%;
 * - arquivos já pequenos e dentro do limite são mantidos sem recompressão.
 * Mantém o dimensionamento leve e evita armazenamento excessivo.
 */
export async function compressImage(file, { maxDim = 1600, quality = 0.8 } = {}) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Arquivo selecionado não é uma imagem');
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const alreadyCompact =
    Math.max(img.naturalWidth, img.naturalHeight) <= maxDim && file.size <= 400 * 1024;
  if (alreadyCompact) return file;

  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) return file;

  const baseName = (file.name || 'foto').replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}