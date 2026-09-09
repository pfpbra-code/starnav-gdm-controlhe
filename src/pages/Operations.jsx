import React from 'react';
import SectorGDMBoard from '@/components/gdm/SectorGDMBoard';

/**
 * Setor de Operações: itens com destino Calibração/Certificação.
 * Acesso controlado pela permissão view_operations.
 */
export default function Operations() {
  return (
    <SectorGDMBoard
      sector="operations"
      title="Operações"
      description="Itens com destino Calibração / Certificação"
      emptyMessage="Nenhum item de operações encontrado"
    />
  );
}