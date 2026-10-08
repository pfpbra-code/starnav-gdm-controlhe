/**
 * Ramos de atividade padronizados dos fornecedores.
 * Fonte única de nomenclatura — usada no cadastro, filtros,
 * importação, ficha e indicadores para evitar divergências.
 */
export const SUPPLIER_CATEGORIES = [
  'Caldeiraria',
  'Refrigeração',
  'Motores',
  'Elétrica',
  'Automação',
  'Calibração',
  'Radiadores',
];

/**
 * Constrói o histórico de alteração dos ramos de atividade.
 * Retorna o novo array de histórico, ou null quando nada mudou.
 */
export function appendCategoriesHistory(supplier, categories, userEmail) {
  const prev = (supplier?.categories || []).slice().sort().join('|');
  const next = (categories || []).slice().sort().join('|');
  if (prev === next) return null;
  return [
    ...(supplier?.categories_history || []),
    {
      categories: categories || [],
      changed_by: userEmail || 'sistema',
      changed_at: new Date().toISOString(),
    },
  ];
}