import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SectorGDMBoard from '@/components/gdm/SectorGDMBoard';
import MaintenanceAnalysis from '@/pages/MaintenanceAnalysis';
import ReliabilityDashboard from '@/components/reliability/ReliabilityDashboard';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * Setor de Manutenção: itens com destino Reparo, Retorno ao Estoque ou Descarte.
 * Abas com autorização individual: Análise de Cotações (view_maintenance_quotes)
 * e Confiabilidade MTBF/MTTR (view_reliability).
 */
export default function Maintenance() {
  const { hasPermission } = usePermissions();
  const canViewQuotes = hasPermission('view_maintenance_quotes');
  const canViewReliability = hasPermission('view_reliability');

  return (
    <Tabs defaultValue="items" className="space-y-6">
      <TabsList>
        <TabsTrigger value="items">Itens do Setor</TabsTrigger>
        {canViewQuotes && <TabsTrigger value="quotes">Análise de Cotações</TabsTrigger>}
        {canViewReliability && <TabsTrigger value="reliability">Confiabilidade</TabsTrigger>}
      </TabsList>
      <TabsContent value="items">
        <SectorGDMBoard
          sector="maintenance"
          title="Manutenção"
          description="Itens com destino Reparo, Retorno ao Estoque ou Descarte"
          emptyMessage="Nenhum item de manutenção encontrado"
        />
      </TabsContent>
      {canViewQuotes && (
        <TabsContent value="quotes">
          <MaintenanceAnalysis embedded />
        </TabsContent>
      )}
      {canViewReliability && (
        <TabsContent value="reliability">
          <ReliabilityDashboard />
        </TabsContent>
      )}
    </Tabs>
  );
}