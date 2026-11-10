/**
 * Retorna a URL apenas quando o esquema é http(s); caso contrário retorna null.
 * Usado antes de renderizar documentos (cotações, NFs, laudos, certificados)
 * como links, evitando que valores gravados disparem javascript:/data:.
 */
export function safeHref(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : null;
}