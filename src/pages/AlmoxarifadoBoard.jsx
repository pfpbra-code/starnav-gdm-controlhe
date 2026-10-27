import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PendingBoard from '@/components/gdm/PendingBoard';
import WorkOrderDashboard from '@/components/ot/WorkOrderDashboard';
import OpenOTSummaryCard from '@/components/ot/OpenOTSummaryCard';
import { usePermissions } from '@/hooks/usePermissions';

// Pendências exclusivas do Almoxarifado, por categoria.
// A ação tomada retira o item da pendência ativa, sem excluir dados da GDM.
const CATEGORIES = [
  {
    key: 'receipt',
    label: 'Recebimento Inicial de Materiais Desembarcados',
    match: (i) => i.status === 'pending_almoxarifado',
  },
  {
    key: 'awaiting_receipt',
    label: 'Aguardando Recebimento (GDM aberta sem recebimento físico)',
    match: (i) => i.status === 'awaiting_receipt',
  },
  {
    key: 'shipping',
    label: 'Comprovante de Envio ao Fornecedor (NF + Foto)',
    match: (i) => i.status === 'awaiting_shipping_proof',
  },
  {
    key: 'supplier_return',
    label: 'Recebimento de Material Retornado do Fornecedor',
    match: (i) => i.status === 'awaiting_supplier_return' && !!i.return_nf_url,
  },
  {
    key: 'return_receipt',
    label: 'Recebimento Final do Material Retornado (NF + Laudo)',
    match: (i) => i.status === 'awaiting_return' && !!i.return_dispatched_at,
  },
  {
    key: 'stock',
    label: 'Confirmação de Devolução ao Estoque',
    match: (i) => i.destination === 'stock_return' && i.status === 'received',
  },
  {
    key: 'discard',
    label: 'Confirmação Final de Descarte',
    match: (i) => i.status === 'awaiting_discard_confirmation',
  },
];

/** Aba Almoxarifado: pendências do setor + Controle de OT (tempo real). */
export default function AlmoxarifadoBoard() {
  const { hasPermission } = usePermissions();
  const canViewOt = hasPermission('view_ot');

  return (
    <Tabs defaultValue="pending" className="space-y-6">
      <TabsList>
        <TabsTrigger value="pending">Pendências do Setor</TabsTrigger>
        {canViewOt && <TabsTrigger value="ot">Controle de OT</TabsTrigger>}
      </TabsList>
      <TabsContent value="pending" className="space-y-4">
        {canViewOt && (
          <div className="max-w-sm">
            <OpenOTSummaryCard />
          </div>
        )}
        <PendingBoard
          title="Almoxarifado"
          description="GDMs e itens que aguardam ação do Almoxarifado"
          emptyMessage="Nenhuma pendência para o Almoxarifado"
          categories={CATEGORIES}
        />
      </TabsContent>
      {canViewOt && (
      <TabsContent value="ot">
        <WorkOrderDashboard />
      </TabsContent>
      )}
    </Tabs>
  );
}