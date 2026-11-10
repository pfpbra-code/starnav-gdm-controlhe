// Validação de URLs de documentos recebidas do corpo das requisições.
// Somente http(s) é aceito: impede que valores como "javascript:", "data:"
// ou "vbscript:" sejam gravados e depois renderizados como links no app.

export function sanitizeDocumentUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return raw;
  } catch {
    return null;
  }
}