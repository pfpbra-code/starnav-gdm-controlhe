import React from 'react';
import SectorGDMBoard from '@/components/gdm/SectorGDMBoard';

/**
 * Setor de Manutenção: itens com destino Reparo, Retorno ao Estoque ou Descarte.
 * Acesso controlado pela permissão view_maintenance.
 */
export default function Maintenance() {
  return (
    <SectorGDMBoard
      sector="maintenance"
      title="Manutenção"
      description="Itens com destino Reparo, Retorno ao Estoque ou Descarte"
      emptyMessage="Nenhum item de manutenção encontrado"
    />
  );
}