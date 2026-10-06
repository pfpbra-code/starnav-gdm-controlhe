import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PendingBoard from '@/components/gdm/PendingBoard';
import RepairControlPanel from '@/components/gdm/RepairControlPanel';
import ServicesKpis from '@/components/gdm/ServicesKpis';

// Pendências exclusivas do setor de Serviços, por categoria.
// Cada item sai da pendência assim que a ação é concluída e permanece no histórico.
const CATEGORIES = [
  {
    key: 'supplier',
    label: 'Definir Fornecedor (após recebimento do Almoxarifado)',
    match: (i) => ['awaiting_supplier_definition', 'pending_services', 'return_confirmed'].includes(i.status),
  },
  {
    key: 'quote',
    label: 'Anexar Proposta (aguardando cotação do fornecedor)',
    match: (i) => i.status === 'sent_to_supplier',
  },
  {
    key: 'negotiation',
    label: 'Inserir Nova Proposta (negociação de desconto)',
    match: (i) => i.status === 'discount_negotiation',
  },
  {
    key: 'oc',
    label: 'GDMs Aguardando Emissão da OC',
    match: (i) => i.status === 'awaiting_oc_issuance',
  },
  {
    key: 'oc_approval',
    label: 'GDMs Aguardando Aprovação e Envio da OC ao Fornecedor',
    match: (i) => i.status === 'awaiting_oc_approval',
  },
  {
    key: 'dispatch',
    label: 'Registrar Saída para Entrega',
    match: (i) => i.status === 'awaiting_return' && !i.return_dispatched_at,
  },
];

/** Aba Serviços: pendências do setor + controle completo de reparos e certificações. */
export default function ServicesBoard() {
  return (
    <Tabs defaultValue="pending" className="space-y-6">
      <TabsList>
        <TabsTrigger value="pending">Pendências do Setor</TabsTrigger>
        <TabsTrigger value="control">Controle de Reparos e Certificações</TabsTrigger>
      </TabsList>
      <TabsContent value="pending">
        <PendingBoard
          title="Serviços"
          description="GDMs e itens que aguardam ação do setor de Serviços"
          emptyMessage="Nenhuma pendência para o setor de Serviços"
          categories={CATEGORIES}
          showDeadlineAlerts
          showCategoryFilter
          headerExtra={<ServicesKpis />}
        />
      </TabsContent>
      <TabsContent value="control">
        <RepairControlPanel />
      </TabsContent>
    </Tabs>
  );
}