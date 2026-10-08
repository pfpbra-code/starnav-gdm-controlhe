/**
 * Descrições informativas (tooltips) dos cards e indicadores dos Dashboards.
 * Centralizadas para facilitar manutenção e tradução futura.
 * Estrutura de cada descrição: { conceito, formula?, objetivo?, origem?, periodicidade? }
 */

const TEMPO_REAL = "Em tempo real, recalculado ao abrir a página.";
const ORIGEM_ITENS = "Itens das GDMs (cada equipamento desembarcado é contabilizado individualmente).";

/* ---------- Dashboard Operacional (Dashboard.jsx) ---------- */
export const DASHBOARD_TOOLTIPS = {
  totalGdms: {
    conceito: "Quantidade total de GDMs registradas no sistema, do desembarque até a conclusão.",
    objetivo: "Mede o volume de guias sob gestão da plataforma.",
    origem: "Guias de Desembarque de Materiais (GDM).",
    periodicidade: TEMPO_REAL,
  },
  abertas: {
    conceito: "GDMs com itens aguardando aprovação do coordenador ou em andamento no fluxo operacional.",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
  aguardandoCoordenacao: {
    conceito: "GDMs e itens aguardando validação do destino e aprovação pelo setor de Coordenação, com o tempo médio de espera desde a criação do item.",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
  aprovadas: {
    conceito: "Itens com cotação aprovada pela Manutenção, aguardando emissão de PWT/OC ou retorno do fornecedor.",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
  finalizadas: {
    conceito: "GDMs em que todos os itens concluíram o fluxo (reparo, calibração, descarte ou retorno ao estoque).",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
  reprovadas: {
    conceito: "GDMs com pelo menos um item reprovado ou cancelado no fluxo.",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
  emAndamento: {
    conceito: "GDMs com itens em tratamento no fluxo operacional (fornecedor, PWT, OC ou retorno).",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
  tempoMedio: {
    conceito: "Tempo médio, em dias, entre o registro do item e a sua conclusão.",
    formula: "Tempo médio = Σ (conclusão − registro) ÷ itens concluídos",
    objetivo: "Avaliar a agilidade do fluxo operacional. Quanto menor, mais rápido o processo.",
    origem: "Itens concluídos (data de registro e de conclusão de cada item).",
    periodicidade: TEMPO_REAL,
  },
  gdmsMes: {
    conceito: "GDMs criadas no mês corrente.",
    origem: "Data de criação das GDMs.",
    periodicidade: TEMPO_REAL,
  },
  itensManutencao: {
    conceito: "Itens em aberto no fluxo atendido pela Manutenção (reparo, retorno ao estoque e descarte).",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
  itensOperacoes: {
    conceito: "Itens em aberto no fluxo atendido pelas Operações (calibração e certificação).",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
  emReparo: {
    conceito: "Quantidade de equipamentos atualmente em processo de manutenção ou aguardando conclusão do reparo.",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
  emCalibracao: {
    conceito: "Equipamentos em processo de calibração ou certificação junto ao fornecedor.",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
  cotacoesPendentes: {
    conceito: "Cotações anexadas pelos fornecedores aguardando decisão da Gerência de Manutenção.",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
  aguardandoRetorno: {
    conceito: "Itens enviados ao fornecedor aguardando a devolução do material.",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
};

/* ---------- Painel de custos com reparos (RepairCostPanel) ---------- */
export const REPAIR_COST_TOOLTIPS = {
  total: {
    conceito: "Soma dos valores das cotações aprovadas de todos os itens de reparo, concluídos ou em andamento.",
    formula: "Total = Σ valor da cotação aprovada de cada item",
    origem: "Cotação aprovada registrada individualmente por item.",
    periodicidade: TEMPO_REAL,
  },
  mes: {
    conceito: "Valor das cotações aprovadas com data de referência no mês corrente.",
    origem: "Data de aprovação/conclusão de cada item.",
    periodicidade: TEMPO_REAL,
  },
  trimestre: {
    conceito: "Valor das cotações aprovadas com data de referência no trimestre corrente.",
    origem: "Data de aprovação/conclusão de cada item.",
    periodicidade: TEMPO_REAL,
  },
  ano: {
    conceito: "Valor das cotações aprovadas com data de referência no ano corrente.",
    origem: "Data de aprovação/conclusão de cada item.",
    periodicidade: TEMPO_REAL,
  },
};

/* ---------- Economia em negociações (NegotiationSavings) ---------- */
export const NEGOTIATION_TOOLTIPS = {
  total: {
    conceito: "Soma da economia obtida nas renegociações de cotações.",
    formula: "Economia = primeira cotação do ciclo − último valor negociado",
    objetivo: "Medir o retorno financeiro das negociações conduzidas pelos Serviços.",
    origem: "Histórico de cotações do ciclo atual de cada item.",
    periodicidade: TEMPO_REAL,
  },
  negociacoes: {
    conceito: "Itens que tiveram desconto solicitado ou proposta renegociada no ciclo com o fornecedor vigente.",
    origem: "Histórico de cotações de cada item.",
    periodicidade: TEMPO_REAL,
  },
  descontoMedio: {
    conceito: "Desconto percentual médio obtido nas negociações realizadas.",
    formula: "Desconto médio = Σ descontos (%) ÷ negociações",
    origem: "Histórico de cotações de cada item.",
    periodicidade: TEMPO_REAL,
  },
  maiorDesconto: {
    conceito: "Maior valor economizado em uma única negociação.",
    origem: "Histórico de cotações de cada item.",
    periodicidade: TEMPO_REAL,
  },
};

/* ---------- Dashboard Gerencial (ManagerialKpis) ---------- */
export const MANAGERIAL_TOOLTIPS = {
  mes: {
    conceito: "Itens registrados no mês atual. A variação compara com o mês anterior.",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
  trimestre: {
    conceito: "Itens registrados no trimestre atual. A variação compara com o trimestre anterior.",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
  ano: {
    conceito: "Itens registrados no ano atual. A variação compara com o ano anterior.",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
  periodo: {
    conceito: "Itens registrados no período personalizado selecionado nos filtros. A variação compara com o período anterior equivalente.",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
  mediaMensal: {
    conceito: "Média de itens registrados por mês dentro do período selecionado.",
    formula: "Média mensal = itens do período ÷ meses do período",
    origem: ORIGEM_ITENS,
    periodicidade: TEMPO_REAL,
  },
};

/* ---------- Confiabilidade (ReliabilityKpis) ---------- */
export const RELIABILITY_TOOLTIPS = {
  monitored: {
    conceito: "Equipamentos com número de série acompanhados no módulo de Gestão de Confiabilidade.",
    origem: "Cadastro de equipamentos e histórico de reparos por número de série (SN).",
    periodicidade: TEMPO_REAL,
  },
  inRepair: {
    conceito: "Quantidade de equipamentos atualmente em processo de manutenção ou aguardando conclusão do reparo.",
    origem: "Histórico de reparos por número de série (SN).",
    periodicidade: TEMPO_REAL,
  },
  mtbf: {
    conceito:
      "Mean Time Between Failures (Tempo Médio Entre Falhas). Indica o tempo médio que o equipamento permanece em operação antes de apresentar uma nova falha.",
    formula: "MTBF = Tempo Total em Operação ÷ Quantidade de Falhas",
    objetivo: "Avaliar a confiabilidade dos equipamentos. Quanto maior o valor, maior a confiabilidade.",
    origem: "Histórico de reparos por número de série (SN).",
    periodicidade: TEMPO_REAL,
  },
  mttr: {
    conceito:
      "Mean Time To Repair (Tempo Médio de Reparo). Indica o tempo médio necessário para concluir um reparo.",
    formula: "MTTR = Tempo Total de Reparo ÷ Quantidade de Reparos",
    objetivo: "Avaliar a manutenibilidade. Quanto menor o valor, mais rápida a recuperação do equipamento.",
    origem: "Histórico de reparos por número de série (SN).",
    periodicidade: TEMPO_REAL,
  },
  cost: {
    conceito: "Soma dos custos dos reparos registrados por número de série.",
    origem: "Histórico de reparos por número de série (SN).",
    periodicidade: TEMPO_REAL,
  },
  alerts: {
    conceito: "Número de alertas ativos de confiabilidade (equipamentos críticos por custo ou frequência de falha).",
    origem: "Análise de reparos e valor de aquisição por número de série (SN).",
    periodicidade: TEMPO_REAL,
  },
};

/* ---------- Certificações (CertificationKpis) ---------- */
export const CERTIFICATION_TOOLTIPS = {
  monitored: {
    conceito: "Equipamentos com certificação ou calibração acompanhada no módulo de Certificações.",
    origem: "Certificações e calibrações registradas por número de série.",
    periodicidade: TEMPO_REAL,
  },
  certified: {
    conceito: "Equipamentos com certificação válida na data atual.",
    origem: "Certificações e calibrações registradas por número de série.",
    periodicidade: TEMPO_REAL,
  },
  expired: {
    conceito: "Equipamentos com certificação vencida na data atual.",
    objetivo: "Exigem ação imediata de recertificação.",
    origem: "Certificações e calibrações registradas por número de série.",
    periodicidade: TEMPO_REAL,
  },
  expiring: {
    conceito:
      "Quantidade de equipamentos com certificação próxima da data de vencimento dentro do período configurado (30 dias).",
    origem: "Certificações e calibrações registradas por número de série.",
    periodicidade: TEMPO_REAL,
  },
  inProcess: {
    conceito: "Equipamentos em processo de certificação ou calibração (aguardando certificado, validade ou conclusão).",
    origem: "Itens das GDMs com destino de certificação/calibração.",
    periodicidade: TEMPO_REAL,
  },
  compliance: {
    conceito: "Percentual de equipamentos monitorados com certificações dentro da validade.",
    formula: "Conformidade = equipamentos válidos ÷ equipamentos monitorados × 100",
    objetivo: "Medir a aderência da frota às exigências de certificação.",
    origem: "Certificações e calibrações registradas por número de série.",
    periodicidade: TEMPO_REAL,
  },
};