import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import InfoTooltip from '@/components/ui/InfoTooltip';

const TEMPO_REAL = 'Em tempo real, recalculado a cada atualização dos itens das GDMs.';
const ORIGEM = 'Itens das GDMs, contabilizados pela quantidade real desembarcada de cada item.';

const TOOLTIPS = {
  total: {
    conceito: 'Total de unidades identificadas nos processos, respeitando os filtros aplicados.',
    objetivo: 'Volume histórico de unidades desembarcadas da nomenclatura selecionada.',
    origem: ORIGEM,
    periodicidade: TEMPO_REAL,
  },
  open: {
    conceito: 'Unidades com processos ainda abertos (fora de finalizados, devolvidos ao estoque, descartados e cancelados).',
    objetivo: 'Distinção clara entre o total histórico e o que ainda está em processo ativo.',
    origem: ORIGEM,
    periodicidade: TEMPO_REAL,
  },
  inRepair: {
    conceito: 'Unidades que estão efetivamente em reparo no fornecedor (situação "Em Reparo").',
    objetivo: 'Nunca confundir o total desembarcado com o que está realmente em reparo agora.',
    origem: ORIGEM,
    periodicidade: TEMPO_REAL,
  },
  awaitingQuoteOrApproval: {
    conceito: 'Unidades aguardando cotação do fornecedor ou aprovação interna (coordenação, manutenção, PWT, OC).',
    origem: ORIGEM,
    periodicidade: TEMPO_REAL,
  },
  awaitingReturn: {
    conceito: 'Unidades enviadas ao fornecedor aguardando retorno do equipamento.',
    origem: ORIGEM,
    periodicidade: TEMPO_REAL,
  },
  finished: {
    conceito: 'Unidades com o processo finalizado (reparo ou calibração concluídos).',
    origem: ORIGEM,
    periodicidade: TEMPO_REAL,
  },
  stockReturned: {
    conceito: 'Unidades devolvidas ao estoque, separadas das que ainda estão com fornecedores.',
    origem: ORIGEM,
    periodicidade: TEMPO_REAL,
  },
  discarded: {
    conceito: 'Unidades descartadas — jamais apresentadas como disponíveis para reparo.',
    origem: ORIGEM,
    periodicidade: TEMPO_REAL,
  },
  overdue: {
    conceito: 'Unidades com prazo de retorno vencido, conforme o prazo informado na cotação do fornecedor.',
    formula: 'Atraso = data atual − prazo de execução da cotação (apenas quando o prazo existe e o processo segue em aberto).',
    objetivo: 'Sem prazo aplicável, o processo não é classificado como atrasado.',
    origem: ORIGEM,
    periodicidade: TEMPO_REAL,
  },
};

function KpiCard({ label, value, tooltip, tone }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-1">
          <p className={`text-2xl font-bold ${tone || 'text-slate-900'}`}>{value}</p>
          <InfoTooltip content={tooltip} />
        </div>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

/** Cards de indicadores da aba "Dados por Equipamento" (todos reagem aos filtros). */
export default function EquipmentControlKpis({ kpi }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      <KpiCard label="Total de unidades identificadas" value={kpi.total} tooltip={TOOLTIPS.total} />
      <KpiCard label="Unidades com processos abertos" value={kpi.open} tooltip={TOOLTIPS.open} />
      <KpiCard label="Unidades atualmente em reparo" value={kpi.inRepair} tooltip={TOOLTIPS.inRepair} tone="text-blue-700" />
      <KpiCard
        label="Aguardando cotação ou aprovação"
        value={kpi.awaitingQuoteOrApproval}
        tooltip={TOOLTIPS.awaitingQuoteOrApproval}
        tone="text-amber-700"
      />
      <KpiCard label="Aguardando retorno" value={kpi.awaitingReturn} tooltip={TOOLTIPS.awaitingReturn} tone="text-purple-700" />
      <KpiCard label="Unidades finalizadas" value={kpi.finished} tooltip={TOOLTIPS.finished} tone="text-emerald-700" />
      <KpiCard label="Devolvidas ao estoque" value={kpi.stockReturned} tooltip={TOOLTIPS.stockReturned} tone="text-teal-700" />
      <KpiCard label="Descartadas" value={kpi.discarded} tooltip={TOOLTIPS.discarded} tone="text-red-700" />
      <KpiCard label="Com prazo vencido" value={kpi.overdue} tooltip={TOOLTIPS.overdue} tone="text-red-600" />
    </div>
  );
}