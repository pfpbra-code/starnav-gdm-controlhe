import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SectorGDMBoard from '@/components/gdm/SectorGDMBoard';
import CertificationsDashboard from '@/components/certifications/CertificationsDashboard';

/**
 * Setor de Operações: pendências de itens com destino Calibração/Certificação
 * e Gestão de Certificações (controle de validade, histórico por SN e
 * conformidade da frota). Acesso controlado pela permissão view_operations.
 */
export default function Operations() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="pendencias">
        <TabsList>
          <TabsTrigger value="pendencias">Pendências</TabsTrigger>
          <TabsTrigger value="certificacoes">Gestão de Certificações</TabsTrigger>
        </TabsList>
        <TabsContent value="pendencias">
          <SectorGDMBoard
            sector="operations"
            title="Operações"
            description="Itens com destino Calibração / Certificação"
            emptyMessage="Nenhum item de operações encontrado"
          />
        </TabsContent>
        <TabsContent value="certificacoes">
          <CertificationsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}