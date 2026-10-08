import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SectorGDMBoard from '@/components/gdm/SectorGDMBoard';
import CertificationsDashboard from '@/components/certifications/CertificationsDashboard';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * Setor de Operações: pendências de itens com destino Calibração/Certificação
 * e a Gestão de Certificações (controle de validade, histórico por SN e
 * conformidade da frota), com autorização individual (view_certifications).
 */
export default function Operations() {
  const { hasPermission } = usePermissions();
  const canViewCertifications = hasPermission('view_certifications');

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pendencias">
        <TabsList>
          <TabsTrigger value="pendencias">Pendências</TabsTrigger>
          {canViewCertifications && (
            <TabsTrigger value="certificacoes">Gestão de Certificações</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="pendencias">
          <SectorGDMBoard
            sector="operations"
            title="Operações"
            description="Itens com destino Calibração / Certificação"
            emptyMessage="Nenhum item de operações encontrado"
          />
        </TabsContent>
        {canViewCertifications && (
          <TabsContent value="certificacoes">
            <CertificationsDashboard />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}