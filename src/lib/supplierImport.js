/**
 * Importação em massa de fornecedores — normalização, deduplicação por CNPJ,
 * mapeamento de categorias e classificação das linhas da planilha.
 */

// Schema de extração compatível com a planilha homologada de fornecedores
// (colunas: FORNECEDOR, CNPJ, Estado, CEP, Cidade, Endereço, Ramo de Atividade,
// Telefone, Celular, Contato).
export const SUPPLIER_IMPORT_SCHEMA = {
  type: 'object',
  properties: {
    FORNECEDOR: { type: 'string', description: 'Nome da empresa fornecedora' },
    CNPJ: { type: 'string' },
    Estado: { type: 'string' },
    CEP: { type: 'string' },
    Cidade: { type: 'string' },
    Endereco: { type: 'string', description: 'Endereço (logradouro, número, bairro)' },
    RamoAtividade: { type: 'string', description: 'Ramo de Atividade' },
    Telefone: { type: 'string' },
    Celular: { type: 'string' },
    Contato: { type: 'string', description: 'Nome da pessoa de contato' },
  },
};

// Regras de categorização por palavra-chave do ramo de atividade.
// Saída restrita aos ramos padronizados (SUPPLIER_CATEGORIES):
// ramos não reconhecidos ficam sem classificação para revisão manual.
const CATEGORY_RULES = [
  ['Caldeiraria', ['CALDEIRARIA']],
  ['Refrigeração', ['REFRIG', 'AR CONDICIONADO', 'COMPRESSOR', 'BITZER', 'SAUER']],
  ['Radiadores', ['RADIADOR']],
  ['Calibração', ['CALIBRA']],
  ['Automação', ['AUTOMACAO']],
  ['Elétrica', ['ELETRIC', 'ELETRONI']],
  ['Motores', ['MOTOR']],
];

const clean = (v) => (v == null ? '' : String(v).trim());

const isPlaceholder = (v) => {
  const t = clean(v).toUpperCase();
  return !t || ['-', '--', '.', ',', 'X', 'N/A', 'NAO', 'S/N'].includes(t);
};

export function normalizeCnpjDigits(value) {
  return clean(value).replace(/\D/g, '');
}

export function formatCnpj(raw) {
  const d = normalizeCnpjDigits(raw);
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return clean(raw);
}

export function formatCep(raw) {
  const d = clean(raw).replace(/\D/g, '');
  if (d.length === 8) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return clean(raw);
}

export function mapCategories(ramo) {
  const r = clean(ramo).toUpperCase();
  if (!r || isPlaceholder(r)) return [];
  const found = [];
  for (const [category, keywords] of CATEGORY_RULES) {
    if (keywords.some((k) => r.includes(k))) found.push(category);
  }
  return found;
}

/**
 * Converte uma linha crua da planilha em registro de fornecedor,
 * listando os campos ausentes para revisão manual.
 */
export function normalizeSheetRow(raw) {
  const name = clean(raw.FORNECEDOR);
  const cnpjRaw = clean(raw.CNPJ);
  const cnpjDigits = normalizeCnpjDigits(cnpjRaw);

  const missing = [];
  if (!name || name.toUpperCase() === 'FORNECEDOR') missing.push('Razão Social');
  if (!cnpjDigits) missing.push('CNPJ');
  if (cnpjDigits && cnpjDigits.length !== 14) missing.push('CNPJ incompleto');
  const valid = !!name && !!cnpjDigits && name.toUpperCase() !== 'FORNECEDOR';

  const cidade = clean(raw.Cidade);
  const estado = clean(raw.Estado);
  const cep = clean(raw.CEP);
  const endereco = clean(raw.Endereco);
  const cityUf = [cidade, estado].filter(Boolean).join(' - ');
  const address = [endereco, cityUf, cep && !isPlaceholder(cep) ? `CEP ${formatCep(cep)}` : '']
    .filter(Boolean)
    .join(', ');

  const phone = [clean(raw.Telefone), clean(raw.Celular)]
    .filter((v) => v && !isPlaceholder(v))
    .join(' / ');
  if (!phone) missing.push('Telefone');

  const contato = clean(raw.Contato);
  const contact_name = isPlaceholder(contato) ? '' : contato;
  if (!contact_name) missing.push('Contato');

  const categories = mapCategories(raw.RamoAtividade);
  if (!categories.length) missing.push('Ramo de Atividade');

  const record = {
    company_name: name,
    cnpj: formatCnpj(cnpjRaw),
    email: clean(raw.Email),
    phone,
    contact_name,
    address,
    categories,
    status: 'active',
  };
  return { record, cnpjDigits, missing, valid };
}

export const IMPORT_STATUS_LABELS = {
  create: 'Novo',
  existing: 'Já cadastrado',
  duplicate: 'Duplicado na planilha',
  invalid: 'Inconsistente',
};

/**
 * Classifica as linhas extraídas contra os fornecedores já cadastrados:
 * deduplica por CNPJ (no sistema e dentro da própria planilha) e retorna
 * os registros prontos para criação + resumo da importação.
 */
export function classifyImportRows(rawRows, existingSuppliers = []) {
  const existingByCnpj = new Map();
  (existingSuppliers || []).forEach((s) => {
    const d = normalizeCnpjDigits(s.cnpj);
    if (d) existingByCnpj.set(d, s);
  });

  const rows = [];
  const seen = new Set();
  (rawRows || []).forEach((raw) => {
    const norm = normalizeSheetRow(raw || {});
    let status;
    if (!norm.valid) status = 'invalid';
    else if (existingByCnpj.has(norm.cnpjDigits)) status = 'existing';
    else if (seen.has(norm.cnpjDigits)) status = 'duplicate';
    else {
      status = 'create';
      seen.add(norm.cnpjDigits);
    }
    rows.push({ raw, ...norm, status });
  });

  const toCreate = rows.filter((r) => r.status === 'create').map((r) => r.record);
  const summary = {
    total: rows.length,
    create: toCreate.length,
    existing: rows.filter((r) => r.status === 'existing').length,
    duplicate: rows.filter((r) => r.status === 'duplicate').length,
    invalid: rows.filter((r) => r.status === 'invalid').length,
    needReview: rows.filter((r) => r.status === 'create' && r.missing.length > 0).length,
  };
  return { rows, toCreate, summary };
}