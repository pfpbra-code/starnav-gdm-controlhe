/**
 * Setores que podem ter responsáveis vinculados diretamente a uma embarcação
 * (roteamento de notificações). O vínculo de permissões é global e vive em
 * Configurações > Responsáveis por Setor (user.sectors).
 */
export const VESSEL_SECTORS = [
  { key: 'services', label: 'Serviços' },
  { key: 'almoxarifado', label: 'Almoxarifado' },
  { key: 'maintenance', label: 'Manutenção' },
  { key: 'planejamento', label: 'Planejamento' },
  { key: 'operations', label: 'Operações' },
];