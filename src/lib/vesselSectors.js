/**
 * Setores que podem ter responsáveis vinculados diretamente a uma embarcação.
 * Para adicionar um novo setor no futuro, basta incluir uma entrada aqui —
 * o seletor na edição da embarcação, o campo no modelo e as notificações
 * passam a considerá-lo automaticamente.
 */
export const VESSEL_SECTORS = [
  { key: 'services', label: 'Serviços', role: 'services' },
  { key: 'almoxarifado', label: 'Almoxarifado', role: 'almoxarifado' },
  { key: 'maintenance', label: 'Manutenção', role: 'maintenance' },
  { key: 'planejamento', label: 'Planejamento', role: 'planejamento' },
  { key: 'operations', label: 'Operações', role: 'operations' },
];