import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SectorGDMBoard from '@/components/gdm/SectorGDMBoard';
import MaintenanceAnalysis from '@/pages/MaintenanceAnalysis';

/**
 * Setor de Manutenção: itens com destino Reparo, Retorno ao Estoque ou Descarte
 * e a Análise de Cotações (Manutenção e Operações) como aba interna.
 * Acesso controlado pela permissão view_maintenance.
 */
export default function Maintenance() {
  return (
    <Tabs defaultValue="items" className="space-y-6">
      <TabsList>
        <TabsTrigger value="items">Itens do Setor</TabsTrigger>
        <TabsTrigger value="quotes">Análise de Cotações</TabsTrigger>
      </TabsList>
      <TabsContent value="items">
        <SectorGDMBoard
          sector="maintenance"
          title="Manutenção"
          description="Itens com destino Reparo, Retorno ao Estoque ou Descarte"
          emptyMessage="Nenhum item de manutenção encontrado"
        />
      </TabsContent>
      <TabsContent value="quotes">
        <MaintenanceAnalysis embedded />
      </TabsContent>
    </Tabs>
  );
}