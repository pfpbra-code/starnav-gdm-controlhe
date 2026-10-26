// Conteúdo do Manual Mestre da Plataforma — material único de treinamento,
// onboarding e consulta operacional. Ajustes de texto: edite este arquivo.
// Os prints anexados pelo ADM na aba "Documentos" (título contendo o nome do
// capítulo) são embutidos automaticamente nos passos do capítulo correspondente.

import { MANUAL_SECTORS, MANUAL_PROCESSES } from './manualContent';
import {
  DASHBOARD_TOOLTIPS,
  MANAGERIAL_TOOLTIPS,
  RELIABILITY_TOOLTIPS,
  CERTIFICATION_TOOLTIPS,
  REPAIR_COST_TOOLTIPS,
  NEGOTIATION_TOOLTIPS,
} from './kpiTooltips';

const stepsOf = (arr, key) => (arr.find((x) => x.key === key) || {}).steps || [];

/* ------------------------------------------------------------------ */
/* Metadados do documento                                              */
/* ------------------------------------------------------------------ */

export const MASTER_MANUAL_META = {
  title: 'MANUAL MESTRE DA PLATAFORMA',
  subtitle: 'Starnav Control Tower — Gestão de Guias de Desembarque de Materiais (GDM)',
  version: '1.0',
  responsible: 'Gestão Starnav',
};

export const SYSTEM_OBJECTIVE =
  'A plataforma Starnav Control Tower gerencia, controla e rastreia materiais desembarcados de embarcações, ' +
  'otimizando o fluxo operacional desde o desembarque até a manutenção e os fornecedores. Cada equipamento é ' +
  'acompanhado individualmente por item de GDM, com histórico auditável, assinatura eletrônica obrigatória nas ' +
  'ações críticas, controle de OTs, cotações, certificações, prazos de retorno e indicadores de confiabilidade.';

/* ------------------------------------------------------------------ */
/* Glossário                                                           */
/* ------------------------------------------------------------------ */

export const GLOSSARY = [
  ['GDM', 'Guia de Desembarque de Materiais: documento que reúne os itens desembarcados de uma embarcação e acompanha todo o seu fluxo.'],
  ['Item de GDM', 'Cada equipamento desembarcado, rastreado individualmente (equipamento, número de série, quantidade e destino).'],
  ['SN', 'Número de Série (Serial Number): identificador físico único do equipamento, chave do histórico de reparos e certificações.'],
  ['Embarcação', 'Navio de origem do material desembarcado (PSV, AHTS, RSV, OSRV, FSV ou outro tipo).'],
  ['Destino', 'Tratativa do item: reparo, certificação/calibração, retorno ao estoque ou descarte.'],
  ['Fornecedor', 'Empresa contratada para executar reparos, certificações ou calibrações.'],
  ['OT', 'Ordem de Trabalho: emitida pelos Serviços quando o equipamento é enviado ao fornecedor; fechada pelo Almoxarifado ao concluir.'],
  ['OC', 'Ordem de Compra: documento de compra do serviço, emitida pelos Serviços após o PWT.'],
  ['PWT', 'Autorização interna emitida pelo Planejamento para itens com cotação aprovada.'],
  ['NF', 'Nota Fiscal: anexada no envio ao fornecedor (assinada) e no recebimento do retorno.'],
  ['CFOP', 'Código Fiscal de Operações e Prestações: selecionado em lista fixa na solicitação de NF.'],
  ['Cotação', 'Proposta do fornecedor com valor, prazo de execução, número da proposta e garantia; nunca é apagada.'],
  ['Follow-up', 'Alerta automático de cobrança (cotações dentro do prazo de 3 dias, prazos de retorno, OTs abertas).'],
  ['Garantia', 'Prazo em dias oferecido pelo fornecedor; inicia automaticamente na confirmação do recebimento do retorno.'],
  ['MTBF', 'Mean Time Between Failures: tempo médio entre falhas do equipamento (quanto maior, mais confiável).'],
  ['MTTR', 'Mean Time To Repair: tempo médio de reparo (quanto menor, mais rápida a recuperação).'],
  ['Certificação / Calibração', 'Registro do certificado do equipamento com validade e alertas automáticos de vencimento.'],
  ['Assinatura eletrônica', 'Registro permanente e imutável, vinculado ao usuário autenticado, exigido em toda ação crítica.'],
  ['QR Code', 'Código do item que abre uma página pública com o histórico do equipamento, certificados e fotos.'],
  ['Board', 'Painel de pendências por setor, agrupado por etapa do fluxo.'],
  ['Dashboard', 'Painel de indicadores; o acesso a cada dashboard é concedido individualmente pelo ADM.'],
  ['Permissão individual', 'Autorização concedida pelo Administrador a um usuário específico, sem concessão automática por setor.'],
];

/* ------------------------------------------------------------------ */
/* Fluxograma geral e índice de funcionalidades                        */
/* ------------------------------------------------------------------ */

export const GENERAL_FLOW = [
  { title: 'Desembarque', description: 'Material desembarcado da embarcação e registrado pelo Almoxarifado.' },
  { title: 'Criação da GDM', description: 'Número manual, embarcação, itens, destinos e fotos da condição.' },
  { title: 'Aprovação da Coordenação', description: 'Validação da tratativa, aprovação ou reprovação com assinatura eletrônica.' },
  { title: 'Recebimento do Almoxarifado', description: 'Confirmação física (ou registro de não recebimento e reprogramação).' },
  { title: 'Fornecedor', description: 'Definição pelo Serviços, envio com NF + foto e cotação (follow-up de 3 dias).' },
  { title: 'Decisão da Manutenção', description: 'Aprovação, desconto, nova cotação ou reprovação (outro fornecedor/descarte).' },
  { title: 'PWT → OC → OT', description: 'Planejamento emite o PWT; Serviços emitem OC e OT e enviam ao fornecedor.' },
  { title: 'Execução e retorno', description: 'Fornecedor executa; Almoxarifado recebe com NF e laudo (garantia inicia).' },
  { title: 'Conclusão', description: 'Certificado e validade (Operações), devolução ao estoque, descarte comprovado ou reparo concluído.' },
  { title: 'Fechamento da OT e finalização', description: 'Almoxarifado fecha a OT e o item é finalizado com histórico auditável.' },
];

export const FEATURE_INDEX = [
  ['Meu Perfil', 'Nome de exibição, cadastro/alteração da assinatura eletrônica e preferências de notificação.'],
  ['Dashboard', 'Painéis operacional, gerencial, confiabilidade, certificações, fornecedores e OT (acesso individual).'],
  ['Criar GDM', 'Registro da Guia de Desembarque com número manual, embarcação, itens, fotos e destinos.'],
  ['Guias de Desembarque', 'Consulta, pesquisa, filtros, detalhes, histórico auditável e PDF da GDM.'],
  ['Manutenção', 'Itens em manutenção, equipamentos em reparo, confiabilidade (MTBF/MTTR) e análise de cotações.'],
  ['Operações', 'Certificações e calibrações: registro de certificados, validade e alertas de vencimento.'],
  ['Serviços', 'Definição de fornecedor, cotações, emissão de OT/OC, solicitação de NF e follow-up de prazos.'],
  ['Almoxarifado', 'Recebimento, envio com comprovantes, retorno com NF e laudo, descarte e fechamento de OT.'],
  ['Análise de Cotações', 'Decisões de cotação da Manutenção com desconto, reprovação e renegociação.'],
  ['Fornecedores', 'Cadastro, foto, ramos de atividade, ranking, follow-up e visão Cobrar Retorno.'],
  ['Embarcações', 'Cadastro com foto e responsáveis por setor vinculados (confirmação de desembarque).'],
  ['Equipamentos', 'Cadastro de equipamentos com valor de aquisição para alertas de confiabilidade.'],
  ['Importar Planilha', 'Importação de dados em lote a partir de arquivos.'],
  ['Notificações', 'Central de alertas e pendências do usuário.'],
  ['Manual de Procedimentos', 'Procedimentos por setor e por processo, com PDF por setor e Manual Mestre.'],
  ['Configurações', 'Setores, responsáveis, políticas de senha e ajustes do sistema.'],
  ['Usuários', 'Gestão de cadastros, papéis e permissões individuais.'],
  ['Logs de Auditoria', 'Registro de ações administrativas para auditoria.'],
  ['QR Code público', 'Consulta externa do histórico do item: certificados, fotos e PDFs.'],
];

/* ------------------------------------------------------------------ */
/* Capítulos — visão por setor                                          */
/* ------------------------------------------------------------------ */

const sectorChapter = ({ key, label, objetivo, responsabilidades, funcionalidades, permissoes, exemplo }) => ({
  key,
  label,
  blocks: [
    { type: 'h', text: 'Objetivo do setor na plataforma' },
    { type: 'p', text: objetivo },
    { type: 'h', text: 'Responsabilidades' },
    { type: 'list', items: responsabilidades },
    { type: 'h', text: 'Funcionalidades disponíveis' },
    { type: 'list', items: funcionalidades },
    { type: 'h', text: 'Permissões padrão' },
    { type: 'list', items: permissoes },
    { type: 'h', text: 'Fluxo operacional passo a passo' },
    { type: 'steps', steps: stepsOf(MANUAL_SECTORS, key) },
    { type: 'note', text: `Exemplo prático: ${exemplo}` },
  ],
});

export const SECTOR_CHAPTERS = [
  sectorChapter({
    key: 'coordinator',
    label: 'Coordenação',
    objetivo: 'A Coordenação é a guardião da qualidade do processo: valida as GDMs criadas, aprova ou reprova o processo e garante que cada item siga o destino correto.',
    responsabilidades: [
      'Analisar e aprovar (ou reprovar) as GDMs pendentes, com assinatura eletrônica.',
      'Validar itens, destinos e evidências fotográficas antes de liberar o fluxo.',
      'Alterar destinos de itens quando necessário, registrando a justificativa.',
      'Acompanhar o histórico e os desvios das guias sob sua responsabilidade.',
    ],
    funcionalidades: [
      'Consulta e detalhamento de GDMs (Guias de Desembarque).',
      'Aprovação e reprovação com assinatura eletrônica.',
      'Alteração de destino de item com auditoria.',
      'Histórico completo por GDM e por item.',
    ],
    permissoes: [
      'Acesso às GDMs das embarcações às quais está vinculado.',
      'Aprovação/reprovação e alteração de destino exigem assinatura eletrônica.',
      'Dashboards e módulos adicionais somente por autorização individual do ADM.',
    ],
    exemplo: 'uma GDM com dois itens chega para aprovação. O coordenador confere as fotos do desembarque, mantém o item 1 em reparo, altera o item 2 para descarte com justificativa, assina eletronicamente e aprova a GDM.',
  }),
  sectorChapter({
    key: 'operations',
    label: 'Operações',
    objetivo: 'As Operações conduzem os itens de certificação e calibração e garantem que nenhum equipamento fique com certificado vencido.',
    responsabilidades: [
      'Acompanhar itens de calibração/certificação em todas as etapas do ciclo.',
      'Registrar o certificado (número, empresa certificadora, documento) e a validade.',
      'Monitorar vencimentos e agir sobre os alertas automáticos (90/60/30/15/0 dias e vencido).',
    ],
    funcionalidades: [
      'Board de itens de calibração por etapa (envio, cotação, retorno).',
      'Registro de certificado e validade (data direta ou meses — vencimento automático).',
      'Gestão de Certificações: equipamentos monitorados, válidos, vencidos e a vencer.',
      'Dashboard de Certificações (autorização individual do ADM).',
    ],
    permissoes: [
      'Acesso aos itens de certificação/calibração das embarcações vinculadas.',
      'O item de calibração só é finalizado após o certificado e a validade registrados.',
      'Dashboard de Certificações somente por autorização individual do ADM.',
    ],
    exemplo: 'uma válvula de segurança retorna da calibração. As Operações registram o certificado nº 3.456/2026 da certificadora, validade de 12 meses e anexam o PDF; o sistema calcula o vencimento e programará os alertas automáticos.',
  }),
  sectorChapter({
    key: 'maintenance',
    label: 'Manutenção',
    objetivo: 'A Manutenção decide sobre custos e desfechos: aprova cotações, negocia descontos, autoriza descartes e acompanha a confiabilidade da frota.',
    responsabilidades: [
      'Decidir sobre cada cotação: aprovar, solicitar desconto ou reprovar (outro fornecedor ou descarte).',
      'Conduzir a negociação de descontos com os fornecedores.',
      'Autorizar descartes de equipamentos.',
      'Interpretar os indicadores de confiabilidade (MTBF/MTTR) e custos de reparo.',
    ],
    funcionalidades: [
      'Itens em Manutenção (reparo, estoque e descarte).',
      'Análise de Cotações com histórico completo por item.',
      'Equipamentos em Reparo (controle operacional).',
      'Confiabilidade: MTBF, MTTR, alertas e histórico por SN (autorização individual).',
    ],
    permissoes: [
      'Decisões de cotação e autorização de descarte exigem assinatura eletrônica.',
      'Todas as decisões ficam registradas no histórico do item.',
      'Dashboards e Confiabilidade somente por autorização individual do ADM.',
    ],
    exemplo: 'a cotação de R$ 8.500 de um motor chega para decisão. A Manutenção solicita 10% de desconto; o fornecedor reapresenta a R$ 7.650 e a cotação é aprovada com assinatura eletrônica, liberando a emissão do PWT.',
  }),
  sectorChapter({
    key: 'services',
    label: 'Serviços',
    objetivo: 'Os Serviços são a ponte com os fornecedores: definem quem executa, conduzem cotações e prazos, emitem OT/OC e solicitam notas fiscais.',
    responsabilidades: [
      'Definir o fornecedor responsável por cada item, com previsão de envio.',
      'Anexar cotações completas (valor, documento, prazo, proposta e garantia).',
      'Emitir OT e OC e confirmar o envio da OC ao fornecedor.',
      'Solicitar NF com natureza da operação e CFOP da lista fixa.',
      'Registrar tratativas, saída para entrega e follow-up de prazos.',
    ],
    funcionalidades: [
      'Board de pendências de Serviços (fornecedor, cotação, OT, NF).',
      'Análise de Cotações e revisão do prazo de execução contratado (exclusiva do setor).',
      'Solicitação de NF com exportação CSV/PDF e impressão.',
      'Controle de prazos de retorno com alertas em 15/7 dias, vencido e atrasos.',
    ],
    permissoes: [
      'Definição de fornecedor, emissão de OT/OC e solicitação de NF exigem assinatura eletrônica.',
      'Revisão do prazo de execução contratado é exclusiva dos Serviços.',
      'Dashboards somente por autorização individual do ADM.',
    ],
    exemplo: 'para a bomba hidráulica aprovada, os Serviços definem a Fornecedor X com envio previsto, solicitam a NF (CFOP da lista fixa), emitem OT 2026-014 e OC 4.455 e acompanham o prazo de retorno acordado de 20 dias.',
  }),
  sectorChapter({
    key: 'almoxarifado',
    label: 'Almoxarifado',
    objetivo: 'O Almoxarifado é o ponto de entrada e saída física do material: cria as GDMs, confirma recebimentos, prepara envios e retornos e fecha as OTs.',
    responsabilidades: [
      'Criar a GDM com número manual, embarcação, itens, destinos e fotos.',
      'Confirmar recebimentos físicos (ou registrar não recebimento).',
      'Enviar material ao fornecedor com NF assinada + foto do envio (obrigatórios).',
      'Receber retornos com NF e laudo técnico (início automático da garantia).',
      'Confirmar descartes físicos com comprovações e fechar as OTs.',
    ],
    funcionalidades: [
      'Criar GDM e Guias de Desembarque.',
      'Board do Almoxarifado por etapa do fluxo.',
      'Comprovantes de envio, retorno e descarte (fotos/PDFs anexados ao item).',
      'Dashboard de Controle de OT compartilhado (autorização individual do ADM).',
    ],
    permissoes: [
      'Ações de recebimento, envio, descarte e fechamento de OT exigem assinatura eletrônica.',
      'Aba de anexos da GDM é somente visualização (sem inserção/remoção).',
      'Dashboards somente por autorização individual do ADM.',
    ],
    exemplo: 'ao enviar o motor ao fornecedor, o Almoxarifado anexa a NF assinada e a foto da embalagem — sem os dois anexos o item não avança. No retorno, anexa a NF e o laudo, confirmando o recebimento e iniciando a garantia.',
  }),
  sectorChapter({
    key: 'planejamento',
    label: 'Planejamento',
    objetivo: 'O Planejamento autoriza a execução dos serviços aprovados, emitindo o PWT de cada item, e acompanha equipamentos e indicadores.',
    responsabilidades: [
      'Monitorar itens com cotação aprovada aguardando PWT.',
      'Emitir o PWT com assinatura eletrônica, liberando a emissão da OC.',
      'Consultar o cadastro de equipamentos e os indicadores autorizados.',
    ],
    funcionalidades: [
      'Painel de itens aguardando emissão de PWT.',
      'Cadastro de Equipamentos.',
      'Dashboards e indicadores (autorização individual do ADM).',
    ],
    permissoes: [
      'Emissão de PWT exige assinatura eletrônica.',
      'Sem PWT emitido, o item não avança para emissão da OC.',
      'Dashboards somente por autorização individual do ADM.',
    ],
    exemplo: 'com a cotação da bomba aprovada pela Manutenção, o Planejamento emite o PWT 2026-089 com assinatura eletrônica; o item passa a constar como "aguardando emissão de OC" no board dos Serviços.',
  }),
];

/* ------------------------------------------------------------------ */
/* Capítulo Administrador                                              */
/* ------------------------------------------------------------------ */

const ADMIN_CHAPTER = {
  key: 'admin',
  label: 'Administrador',
  blocks: [
    { type: 'h', text: 'Objetivo do setor na plataforma' },
    { type: 'p', text: 'O Administrador (ADM) governa a plataforma: gerencia usuários e permissões individuais, cadastros-base (embarcações, equipamentos e fornecedores), configurações, auditoria e importações.' },
    { type: 'h', text: 'Responsabilidades' },
    { type: 'list', items: [
      'Aprovar ou recusar cadastros de novos usuários e definir papéis (ADM/Usuário).',
      'Conceder permissões individuais — inclusive o acesso a cada dashboard.',
      'Definir os responsáveis por setor vinculados a cada embarcação.',
      'Manter cadastros de embarcações, equipamentos e fornecedores.',
      'Auditar ações do sistema (Logs de Auditoria) e importar planilhas.',
    ] },
    { type: 'h', text: 'Gestão de usuários e permissões' },
    { type: 'steps', steps: [
      { title: 'Aprovar cadastros pendentes', description: 'Em "Usuários", revise as solicitações de acesso e aprove ou recuse cada cadastro. O usuário só acessa os módulos após a aprovação.', print: 'Lista de cadastros pendentes com os botões Aprovar/Recusar destacados' },
      { title: 'Definir o papel', description: 'Atribua o papel ADM (acesso administrativo) ou Usuário (acesso operacional restrito às permissões concedidas).', print: 'Seletor de papel no cadastro do usuário destacado' },
      { title: 'Conceder permissões individuais', description: 'Em cada usuário, marque as autorizações específicas: dashboards (Operacional, Gerencial, Confiabilidade, Certificações, Fornecedores, Controle de OT), Manual de Procedimentos e demais módulos. Nenhuma permissão é concedida automaticamente por setor.', print: 'Painel de permissões individuais do usuário, com as caixas de seleção destacadas' },
      { title: 'Vincular embarcações', description: 'Associe o usuário às embarcações de seu escopo de trabalho para definir quais GDMs e itens ele visualiza.', print: 'Área de vinculação de embarcações do usuário destacada' },
    ] },
    { type: 'h', text: 'Responsáveis por setor e embarcações' },
    { type: 'steps', steps: [
      { title: 'Cadastrar a embarcação', description: 'Em "Embarcações", cadastre nome, código, tipo e foto da embarcação.', print: 'Formulário de cadastro de embarcação com o campo de foto destacado' },
      { title: 'Definir responsáveis por setor', description: 'Em cada embarcação, vincule os e-mails dos responsáveis por setor (Serviços, Almoxarifado, Manutenção, Planejamento e Operações). Os responsáveis assumem a etapa de confirmação do desembarque dos itens da embarcação.', print: 'Seletor de responsáveis por setor da embarcação destacado' },
    ] },
    { type: 'h', text: 'Configurações, auditoria e importação' },
    { type: 'list', items: [
      'Configurações: setores, responsáveis gerais e políticas de senha (comprimento, expiração, bloqueio por tentativas).',
      'Embarcações e Fornecedores: cadastro completo, com foto do fornecedor e ramos de atividade (com histórico de alterações).',
      'Logs de Auditoria: consulta das ações administrativas com usuário, data e detalhes.',
      'Importar Planilha: importação de dados em lote (a importação adiciona registros; use com atenção).',
      'Dashboards: o ADM acessa todos os painéis para acompanhar a operação.',
    ] },
    { type: 'note', text: 'Exemplo prático: um novo analista de Serviços é aprovado no cadastro, recebe o papel Usuário, a permissão do board de Serviços, o vínculo às embarcações PSV-01 e PSV-02 e — apenas depois de decisão formal — a autorização individual do Dashboard de Fornecedores.' },
  ],
};

/* ------------------------------------------------------------------ */
/* Capítulos — funcionalidades                                         */
/* ------------------------------------------------------------------ */

const CREATE_GDM_CHAPTER = {
  key: 'create_gdm',
  label: 'Criação de GDM',
  blocks: [
    { type: 'p', text: 'A GDM é o documento que origina todo o processo. A criação é responsabilidade do Almoxarifado e exige número manual único por embarcação.' },
    { type: 'h', text: 'Passo a passo da criação' },
    { type: 'steps', steps: [
      { title: 'Abra "Criar GDM"', description: 'No menu lateral, clique em "Criar GDM".', print: 'Menu lateral com a opção Criar GDM destacada e seta indicando o clique' },
      { title: 'Informe o Número da GDM', description: 'Digite o número manualmente (exemplo preenchido: GDM-001/2026). O número não pode se repetir na mesma embarcação.', alert: 'Erro comum: número já existente na embarcação — o sistema recusa o cadastro duplicado.', print: 'Campo Número da GDM preenchido com GDM-001/2026 e destacado' },
      { title: 'Selecione a embarcação', description: 'Escolha a embarcação de origem do material (exemplo preenchido: PSV Starnav 01).', print: 'Campo Embarcação aberto com a lista de opções destacada' },
      { title: 'Preencha data e descrição', description: 'Informe a data de desembarque e a descrição do problema/motivo do desembarque (exemplo preenchido: "Bomba hidráulica com vazamento no eixo").', print: 'Campos Data de Desembarque e Descrição preenchidos e destacados' },
      { title: 'Cadastre os itens', description: 'Adicione cada equipamento: nome/código (busca no cadastro), número de série (exemplo: SN 7H2K-8891), quantidade, número da OS quando houver e o destino — Reparo, Certificação, Retorno ao Estoque ou Descarte.', alert: 'Atenção: o destino define todo o fluxo do item. Certifique-se antes de finalizar.', print: 'Área de itens da GDM com os campos de equipamento, SN, quantidade e destino destacados' },
      { title: 'Anexe as fotos do item', description: 'Registre a condição no desembarque, a placa de identificação e o número de série. As fotos ficam permanentemente vinculadas ao item.', print: 'Área de anexo de fotos com a condição no desembarque destacada' },
      { title: 'Anexe documentos', description: 'Anexe documentos comprobatórios quando existirem (laudos, relatórios, ordens).', print: 'Área de anexos de documento destacada' },
      { title: 'Revise e finalize', description: 'Confira número, embarcação, itens e destinos e finalize a criação. A GDM segue para aprovação da Coordenação e os itens entram no fluxo dos setores.', print: 'Botão de finalizar/salvar a GDM destacado com seta de clique' },
    ] },
    { type: 'alert', text: 'Erros comuns na criação: número de GDM repetido na embarcação; itens sem número de série (prejudicam o histórico de confiabilidade e certificações); ausência das fotos da condição no desembarque.' },
  ],
};

const GDM_LIST_CHAPTER = {
  key: 'gdm_list',
  label: 'Guias de Desembarque',
  blocks: [
    { type: 'p', text: 'O módulo "Guias de Desembarque" é a central de consulta e gestão das GDMs: filtros, pesquisa, detalhes, histórico e ações de coordenação.' },
    { type: 'h', text: 'Consulta, pesquisa e filtros' },
    { type: 'steps', steps: [
      { title: 'Acesse a listagem', description: 'No menu, abra "Guias de Desembarque". A listagem exibe as GDMs com número, embarcação, situação e data.', print: 'Listagem de GDMs com as colunas de número, embarcação e situação destacadas' },
      { title: 'Pesquise', description: 'Use a pesquisa para localizar por número da GDM, embarcação ou item.', print: 'Campo de pesquisa com um exemplo digitado e destacado' },
      { title: 'Filtre por situação', description: 'Filtre por situação (aguardando coordenador, em andamento, concluída etc.) para focar nas pendências do seu setor.', print: 'Seletor de filtro de situação destacado' },
      { title: 'Abra a GDM', description: 'Clique na GDM para ver o detalhamento: dados gerais, itens com seus destinos e situações, fotos, anexos e histórico.', print: 'Uma GDM aberta com o painel de itens destacado' },
    ] },
    { type: 'h', text: 'Histórico e auditoria' },
    { type: 'p', text: 'Cada GDM e cada item possuem histórico completo: ação, responsável com sua assinatura eletrônica, data, hora e descrição. O histórico é permanente — a assinatura vinculada a um processo concluído não pode ser alterada ou excluída.' },
    { type: 'h', text: 'Aprovação do Coordenador e alteração de destino' },
    { type: 'steps', steps: [
      { title: 'Aprovar ou reprovar a GDM', description: 'Com a GDM aberta, o Coordenador aprova (liberando os itens ao fluxo dos setores) ou reprova com justificativa. Ambas as ações exigem assinatura eletrônica.', print: 'Botões Aprovar/Reprovar com a etapa de assinatura eletrônica destacada' },
      { title: 'Alterar o destino de um item', description: 'Quando necessário, altere o destino do item (reparo, certificação, estoque ou descarte) informando a justificativa. A alteração é auditada com assinatura eletrônica.', print: 'Ação de alterar destino do item com o campo de justificativa destacado' },
      { title: 'Exportar o PDF da GDM', description: 'Gere o PDF da GDM para arquivamento e compartilhamento interno.', print: 'Botão de PDF da GDM destacado' },
    ] },
    { type: 'h', text: 'Fluxo entre setores' },
    { type: 'list', items: [
      'Após a aprovação, cada item segue o fluxo do seu destino: Almoxarifado (recebimento), Serviços (fornecedor), Manutenção (decisão), Planejamento (PWT) e Operações (certificados).',
      'A situação de cada item é independente: a GDM é concluída quando todos os itens concluem seus fluxos.',
      'Cada transição de situação gera registro auditável no histórico do item.',
    ] },
  ],
};

const MAINTENANCE_CHAPTER = {
  key: 'maintenance_module',
  label: 'Módulo Manutenção',
  blocks: [
    { type: 'p', text: 'O módulo Manutenção reúne as abas Itens em Manutenção, Equipamentos em Reparo, Confiabilidade e Análise de Cotações (esta última exclusiva do setor e do ADM conforme permissão).' },
    { type: 'h', text: 'Itens em Manutenção e Equipamentos em Reparo' },
    { type: 'list', items: [
      'Itens em Manutenção: board com os itens de reparo, retorno ao estoque e descarte em cada etapa.',
      'Equipamentos em Reparo: controle operacional dos equipamentos em tratamento, agrupados por etapa e fornecedor.',
      'Da listagem é possível executar as ações permitidas ao setor (decidir cotação, autorizar descarte etc.), sempre com assinatura eletrônica.',
    ] },
    { type: 'h', text: 'Análise de Cotações' },
    { type: 'steps', steps: [
      { title: 'Localize a cotação pendente', description: 'Na Análise de Cotações, veja os itens com cotação anexada aguardando decisão, com valor, prazo, proposta e garantia.', print: 'Listagem de cotações pendentes com o valor e o prazo destacados' },
      { title: 'Decida', description: 'Aprove, solicite desconto (percentual) ou reprove escolhendo o desfecho: outro fornecedor ou descarte.', print: 'Botões de decisão da cotação com a etapa de assinatura eletrônica destacada' },
      { title: 'Acompanhe a renegociação', description: 'Itens em "Negociação de Desconto" retornam ao fornecedor; a nova proposta reaparece para decisão, e o histórico preserva todas as cotações.', print: 'Item em negociação de desconto com o percentual destacado' },
    ] },
    { type: 'h', text: 'Confiabilidade: MTBF, MTTR e histórico por SN' },
    { type: 'cards', items: [
      { name: 'MTBF (Tempo Médio Entre Falhas)', objetivo: 'Avaliar a confiabilidade do equipamento.', formula: 'MTBF = Tempo Total em Operação ÷ Quantidade de Falhas', origem: 'Histórico de reparos por número de série (SN).', interpretacao: 'Quanto maior o MTBF, mais tempo o equipamento opera sem falhar.', exemplo: 'Um motor com 200 dias de operação e 4 falhas tem MTBF = 50 dias.' },
      { name: 'MTTR (Tempo Médio de Reparo)', objetivo: 'Avaliar a manutenibilidade.', formula: 'MTTR = Tempo Total de Reparo ÷ Quantidade de Reparos', origem: 'Histórico de reparos por número de série (SN).', interpretacao: 'Quanto menor o MTTR, mais rápida a recuperação do equipamento.', exemplo: 'Um equipamento com 30 dias de reparo somados em 3 intervenções tem MTTR = 10 dias.' },
    ] },
    { type: 'p', text: 'O histórico por número de série concentra todos os reparos, custos, cotações e garantias do equipamento ao longo do tempo, permitindo identificar equipamentos críticos por custo ou frequência de falha.' },
  ],
};

const OPERATIONS_CHAPTER = {
  key: 'operations_module',
  label: 'Módulo Operações',
  blocks: [
    { type: 'p', text: 'O módulo Operações gerencia certificações e calibrações: registro dos certificados, controle de validade, equipamentos a vencer e alertas automáticos.' },
    { type: 'h', text: 'Inclusão de certificados' },
    { type: 'steps', steps: [
      { title: 'Localize o item retornado', description: 'Após o retorno do material de calibração, o item aguarda o registro do certificado.', print: 'Item na situação "aguardando certificado" destacado no board' },
      { title: 'Registre o certificado', description: 'Informe o número do certificado (exemplo: 3.456/2026), a empresa certificadora, a data de emissão e anexe o documento (PDF ou imagem).', print: 'Formulário de certificado com número, empresa certificadora e anexo destacados' },
      { title: 'Defina a validade', description: 'Escolha a forma de informar a validade: data de vencimento direta ou quantidade de meses — o vencimento é calculado automaticamente.', alert: 'O item de calibração/certificação só é finalizado após o certificado e a validade registrados.', print: 'Seletor de validade (data ou meses) com um exemplo preenchido destacado' },
    ] },
    { type: 'h', text: 'Controle de validade, a vencer e alertas' },
    { type: 'list', items: [
      'O sistema emite alertas automáticos de vencimento em 90, 60, 30, 15 e 0 dias e após o vencimento — cada marco é notificado uma única vez.',
      'A Gestão de Certificações mostra equipamentos monitorados, válidos, vencidos, a vencer (janela de 30 dias) e em processo.',
      'O Dashboard de Certificações apresenta a conformidade da frota (equipamentos válidos ÷ monitorados × 100) e os painéis por embarcação.',
    ] },
  ],
};

const ALMOX_CHAPTER = {
  key: 'almox_module',
  label: 'Módulo Almoxarifado',
  blocks: [
    { type: 'p', text: 'O board do Almoxarifado organiza as pendências físicas do fluxo: recebimentos, envios, retornos, descartes e fechamento de OTs.' },
    { type: 'h', text: 'Recebimento e movimentação' },
    { type: 'steps', steps: [
      { title: 'Confirme o recebimento', description: 'No board, confirme o recebimento físico de cada item desembarcado. Se o item não chegou, registre o não recebimento — o responsável vinculado à embarcação confirmará o desembarque ou reprogramará.', print: 'Card do item com o botão de confirmar recebimento destacado' },
      { title: 'Prepare o envio ao fornecedor', description: 'Após a definição do fornecedor, embale o material e anexe o comprovante: NF assinada + foto do envio.', alert: 'Sem NF assinada e foto do envio o item não avança ao fornecedor.', print: 'Formulário de envio com os anexos de NF e foto destacados' },
      { title: 'Informe o prazo de retorno', description: 'No envio, registre o prazo de retorno acordado em dias ou a data prevista de retorno.', print: 'Campo de prazo de retorno (dias ou data) com exemplo preenchido destacado' },
      { title: 'Receba o retorno', description: 'Anexe a NF do material retornado e o laudo técnico e confirme o recebimento — a garantia inicia automaticamente nessa confirmação.', print: 'Formulário de retorno com os anexos de NF e laudo destacados' },
    ] },
    { type: 'h', text: 'Descarte e fechamento de OT' },
    { type: 'steps', steps: [
      { title: 'Confirme o descarte físico', description: 'Após a autorização da Manutenção, confirme o descarte com responsável, data e comprovações (fotos e/ou PDF).', print: 'Diálogo de confirmação de descarte com os anexos destacados' },
      { title: 'Feche a OT', description: 'Itens com OT aberta devem ter a OT fechada pelo Almoxarifado ao concluir o processo, com assinatura eletrônica.', print: 'Ação de fechamento de OT com a etapa de assinatura eletrônica destacada' },
    ] },
    { type: 'h', text: 'Dashboard de Controle de OT' },
    { type: 'list', items: [
      'Painel compartilhado entre Serviços e Almoxarifado com o status unificado das OTs: aberta, em serviço, aguardando fechamento e fechada.',
      'Alertas automáticos de OTs envelhecidas e de OTs aguardando fechamento.',
      'Exportação das OTs para CSV com os filtros aplicados.',
    ] },
  ],
};

const SERVICES_CHAPTER = {
  key: 'services_module',
  label: 'Módulo Serviços',
  blocks: [
    { type: 'p', text: 'O board de Serviços conduz a tratativa com fornecedores: definição do fornecedor, cotação, emissão de OT/OC, solicitação de NF e controle de prazos.' },
    { type: 'h', text: 'Envio para fornecedores e cadastro de OT' },
    { type: 'steps', steps: [
      { title: 'Defina o fornecedor', description: 'Abra o item em "Definição de Fornecedor", selecione o fornecedor e informe a previsão de envio. Marque "Solicitar NF" para abrir a solicitação logo após a definição.', print: 'Seletor de fornecedor e previsão de envio destacados' },
      { title: 'Emite a OT', description: 'Após o PWT, emita a OT do item — ela acompanha o equipamento até o fechamento pelo Almoxarifado.', print: 'Campo de emissão de OT com exemplo de número preenchido destacado' },
      { title: 'Emite a OC e confirme o envio', description: 'Emita a OC e, em seguida, confirme a aprovação e o envio da OC ao fornecedor.', print: 'Campos de emissão de OC e confirmação de envio destacados' },
    ] },
    { type: 'h', text: 'Solicitação de NF' },
    { type: 'steps', steps: [
      { title: 'Abra a solicitação de NF', description: 'Selecione o fornecedor e abra a solicitação de NF — funcionalidade restrita ao setor de Serviços.', print: 'Ação "Solicitar NF" destacada na tela do fornecedor' },
      { title: 'Preencha a operação fiscal', description: 'Selecione a Natureza da Operação e o CFOP na lista fixa (7 opções com código e descrição), informe a transportadora, o tipo de frete e quem paga o frete.', alert: 'O CFOP é obrigatoriamente escolhido na lista fixa — não é digitado livremente.', print: 'Lista de CFOP aberta com uma opção destacada' },
      { title: 'Revise os itens e finalize', description: 'Os itens da NF são preenchidos automaticamente a partir do item da GDM e podem ser ajustados. Exporte em CSV/PDF ou imprima.', print: 'Tabela de itens da NF com os campos de valor unitário destacados' },
    ] },
    { type: 'h', text: 'Follow-up e controle de prazos de retorno' },
    { type: 'list', items: [
      'Cotação: o fornecedor tem 3 dias corridos para apresentar a cotação; o sistema emite follow-up automático para os Serviços.',
      'Retorno: alertas automáticos em 15 e 7 dias antes do prazo, no vencimento e nos atrasos de 15 e 30 dias.',
      'Tratativas: registre os contatos com o fornecedor durante o ciclo e, ao final, a saída para entrega.',
      'Dashboard de Fornecedores: itens em posse, em tratamento e prazos por fornecedor (autorização individual).',
    ] },
  ],
};

const SUPPLIERS_CHAPTER = {
  key: 'suppliers',
  label: 'Fornecedores',
  blocks: [
    { type: 'p', text: 'O módulo Fornecedores gerencia o cadastro dos parceiros e a operação com eles, com classificação operacional por volume de equipamentos em posse do fornecedor.' },
    { type: 'h', text: 'Cadastro' },
    { type: 'steps', steps: [
      { title: 'Cadastre o fornecedor', description: 'Informe a razão social (exemplo: Reparos Hidráulicos Marítimos Ltda), o CNPJ, os contatos e o endereço completo.', print: 'Formulário de cadastro de fornecedor com razão social e CNPJ destacados' },
      { title: 'Anexe a foto', description: 'Anexe a foto/logomarca do fornecedor (JPG, PNG ou WEBP), exibida na plataforma via link temporário.', print: 'Campo de foto do fornecedor destacado' },
      { title: 'Defina os ramos de atividade', description: 'Marque os ramos: Caldeiraria, Refrigeração, Motores, Elétrica, Automação, Calibração ou Radiadores. Alterações ficam registradas em histórico de auditoria.', print: 'Caixas de seleção de ramos de atividade destacadas' },
    ] },
    { type: 'h', text: 'Operação e acompanhamento' },
    { type: 'list', items: [
      'Ranking de Fornecedores: classificação operacional por volume de equipamentos em posse do fornecedor (acesso por permissão).',
      'Follow-up: acompanhamento das tratativas em andamento com cada fornecedor.',
      'Visão Cobrar Retorno: materiais que devem ser cobrados/devolvidos pelos fornecedores.',
      'Indicadores de Fornecedores: itens em posse, em tratamento e aguardando retorno (acesso por permissão).',
      'Solicitação de NF é feita a partir da seleção do fornecedor.',
    ] },
  ],
};

/* ------------------------------------------------------------------ */
/* Capítulo Dashboards                                                 */
/* ------------------------------------------------------------------ */

const card = (name, t, extra = {}) => ({
  name,
  objetivo: t.objetivo || t.conceito,
  formula: t.formula || 'Contagem direta dos registros correspondentes, recalculada ao abrir a página.',
  origem: t.origem,
  interpretacao: extra.interpretacao || '',
  exemplo: extra.exemplo || '',
});

const DASHBOARDS_CHAPTER = {
  key: 'dashboards',
  label: 'Dashboards',
  blocks: [
    { type: 'p', text: 'Cada dashboard exige autorização individual concedida pelo ADM — o acesso não é automático por setor. Para cada card: objetivo, fórmula de cálculo, origem dos dados, como interpretar e exemplo prático.' },
    { type: 'h', text: 'Dashboard Operacional' },
    { type: 'cards', items: [
      card('Total de GDMs', DASHBOARD_TOOLTIPS.totalGdms, { interpretacao: 'Volume total de guias sob gestão.', exemplo: '120 GDMs registradas desde o início da operação.' }),
      card('GDMs Abertas', DASHBOARD_TOOLTIPS.abertas, { interpretacao: 'Carga de trabalho em andamento.', exemplo: '34 GDMs entre aprovação e conclusão.' }),
      card('Aguardando Coordenação', DASHBOARD_TOOLTIPS.aguardandoCoordenacao, { interpretacao: 'Gargalo de aprovação; acompanhe o tempo médio de espera.', exemplo: '5 guias aguardando há 2 dias em média.' }),
      card('Aprovadas', DASHBOARD_TOOLTIPS.aprovadas, { interpretacao: 'Itens liberados para PWT/OC e retorno.', exemplo: '12 itens aprovados aguardando emissão.' }),
      card('Finalizadas', DASHBOARD_TOOLTIPS.finalizadas, { interpretacao: 'Processos completamente concluídos.', exemplo: '80 GDMs com todos os itens concluídos.' }),
      card('Reprovadas', DASHBOARD_TOOLTIPS.reprovadas, { interpretacao: 'Guias com reprovação ou cancelamento a tratar.', exemplo: '3 guias com item reprovado.' }),
      card('Em Andamento', DASHBOARD_TOOLTIPS.emAndamento, { interpretacao: 'Guias com itens em tratamento (fornecedor, PWT, OC ou retorno).', exemplo: '21 guias com itens no fornecedor.' }),
      card('Tempo Médio de Conclusão', DASHBOARD_TOOLTIPS.tempoMedio, { interpretacao: 'Quanto menor, mais ágil o fluxo.', exemplo: 'Média de 18 dias entre registro e conclusão.' }),
      card('GDMs no Mês', DASHBOARD_TOOLTIPS.gdmsMes, { interpretacao: 'Ritmo de entrada de novos processos.', exemplo: '9 GDMs criadas no mês corrente.' }),
      card('Itens em Manutenção', DASHBOARD_TOOLTIPS.itensManutencao, { interpretacao: 'Carga do fluxo de reparo, estoque e descarte.', exemplo: '45 itens em aberto na Manutenção.' }),
      card('Itens em Operações', DASHBOARD_TOOLTIPS.itensOperacoes, { interpretacao: 'Carga do fluxo de calibração/certificação.', exemplo: '18 itens em aberto nas Operações.' }),
      card('Em Reparo', DASHBOARD_TOOLTIPS.emReparo, { interpretacao: 'Volume de equipamentos em manutenção.', exemplo: '28 equipamentos em reparo.' }),
      card('Em Calibração', DASHBOARD_TOOLTIPS.emCalibracao, { interpretacao: 'Volume de equipamentos em calibração/certificação.', exemplo: '11 equipamentos no fornecedor.' }),
      card('Cotações Pendentes', DASHBOARD_TOOLTIPS.cotacoesPendentes, { interpretacao: 'Decisões aguardando a Gerência de Manutenção.', exemplo: '7 cotações aguardando decisão.' }),
      card('Aguardando Retorno', DASHBOARD_TOOLTIPS.aguardandoRetorno, { interpretacao: 'Materiais no fornecedor a devolver.', exemplo: '14 itens aguardando devolução.' }),
      card('Custo Total de Reparos', REPAIR_COST_TOOLTIPS.total, { interpretacao: 'Investimento total em reparos aprovados.', exemplo: 'R$ 182.400 em cotações aprovadas.' }),
      card('Custo no Mês', REPAIR_COST_TOOLTIPS.mes, { interpretacao: 'Gasto do mês corrente.', exemplo: 'R$ 21.700 no mês corrente.' }),
      card('Custo no Trimestre', REPAIR_COST_TOOLTIPS.trimestre, { interpretacao: 'Gasto do trimestre corrente.', exemplo: 'R$ 58.900 no trimestre.' }),
      card('Custo no Ano', REPAIR_COST_TOOLTIPS.ano, { interpretacao: 'Gasto do ano corrente.', exemplo: 'R$ 210.500 no ano.' }),
      card('Economia em Negociações', NEGOTIATION_TOOLTIPS.total, { interpretacao: 'Retorno financeiro das renegociações.', exemplo: 'R$ 14.300 economizados em renegociações.' }),
      card('Negociações Realizadas', NEGOTIATION_TOOLTIPS.negociacoes, { interpretacao: 'Volume de itens renegociados no ciclo.', exemplo: '9 itens com desconto solicitado.' }),
      card('Desconto Médio', NEGOTIATION_TOOLTIPS.descontoMedio, { interpretacao: 'Eficiência média das negociações.', exemplo: 'Desconto médio de 8%.' }),
      card('Maior Desconto', NEGOTIATION_TOOLTIPS.maiorDesconto, { interpretacao: 'Melhor resultado individual de negociação.', exemplo: 'R$ 4.200 economizados em um item.' }),
    ] },
    { type: 'h', text: 'Dashboard Gerencial' },
    { type: 'cards', items: [
      card('Itens no Mês', MANAGERIAL_TOOLTIPS.mes, { interpretacao: 'Comparativo com o mês anterior pela variação percentual.', exemplo: '31 itens no mês, +12% vs. mês anterior.' }),
      card('Itens no Trimestre', MANAGERIAL_TOOLTIPS.trimestre, { interpretacao: 'Comparativo com o trimestre anterior.', exemplo: '95 itens no trimestre, +5%.' }),
      card('Itens no Ano', MANAGERIAL_TOOLTIPS.ano, { interpretacao: 'Comparativo com o ano anterior.', exemplo: '380 itens no ano.' }),
      card('Itens no Período', MANAGERIAL_TOOLTIPS.periodo, { interpretacao: 'Análise livre com período personalizado e comparação automática com o período anterior.', exemplo: 'Período 01/09 a 30/09 com 33 itens.' }),
      card('Média Mensal', MANAGERIAL_TOOLTIPS.mediaMensal, { interpretacao: 'Ritmo médio de entrada de itens.', exemplo: 'Média de 30,5 itens/mês no período.' }),
    ] },
    { type: 'list', items: [
      'Painel de Evolução: série temporal de itens registrados no período filtrado.',
      'Painel de Destinos: distribuição dos itens entre reparo, certificação, estoque e descarte.',
      'Rankings: embarcações e equipamentos por volume de itens.',
      'Alertas gerenciais: gargalos e pendências destacadas do período.',
    ] },
    { type: 'h', text: 'Dashboard de Confiabilidade' },
    { type: 'cards', items: [
      card('Equipamentos Monitorados', RELIABILITY_TOOLTIPS.monitored, { interpretacao: 'Base de equipamentos com SN acompanhada.', exemplo: '240 equipamentos monitorados por SN.' }),
      card('Em Reparo', RELIABILITY_TOOLTIPS.inRepair, { interpretacao: 'Volume atual em manutenção.', exemplo: '28 equipamentos em reparo.' }),
      card('MTBF', RELIABILITY_TOOLTIPS.mtbf, { interpretacao: 'Quanto maior, mais confiável o equipamento.', exemplo: 'MTBF de 50 dias para um motor específico.' }),
      card('MTTR', RELIABILITY_TOOLTIPS.mttr, { interpretacao: 'Quanto menor, mais rápida a recuperação.', exemplo: 'MTTR de 10 dias para o mesmo motor.' }),
      card('Custo de Reparos', RELIABILITY_TOOLTIPS.cost, { interpretacao: 'Custo acumulado por SN; cruze com o valor de aquisição.', exemplo: 'R$ 45.000 acumulados em um equipamento de R$ 60.000.' }),
      card('Alertas de Confiabilidade', RELIABILITY_TOOLTIPS.alerts, { interpretacao: 'Equipamentos críticos por custo ou frequência de falha.', exemplo: '6 alertas ativos de equipamentos críticos.' }),
    ] },
    { type: 'h', text: 'Dashboard de Certificações' },
    { type: 'cards', items: [
      card('Equipamentos Monitorados', CERTIFICATION_TOOLTIPS.monitored, { interpretacao: 'Base de certificações acompanhada.', exemplo: '150 equipamentos monitorados.' }),
      card('Certificação Válida', CERTIFICATION_TOOLTIPS.certified, { interpretacao: 'Equipamentos dentro da validade hoje.', exemplo: '132 equipamentos com certificado válido.' }),
      card('Vencidas', CERTIFICATION_TOOLTIPS.expired, { interpretacao: 'Exigem recertificação imediata.', exemplo: '6 equipamentos vencidos.' }),
      card('A Vencer', CERTIFICATION_TOOLTIPS.expiring, { interpretacao: 'Vencem na janela de 30 dias — programe o envio.', exemplo: '12 equipamentos vencem em 30 dias.' }),
      card('Em Processo', CERTIFICATION_TOOLTIPS.inProcess, { interpretacao: 'Equipamentos em certificação/calibração em andamento.', exemplo: '9 equipamentos em processo.' }),
      card('Conformidade', CERTIFICATION_TOOLTIPS.compliance, { interpretacao: 'Aderência da frota às exigências de certificação.', exemplo: 'Conformidade de 88% da frota monitorada.' }),
    ] },
    { type: 'h', text: 'Dashboard de Fornecedores' },
    { type: 'cards', items: [
      { name: 'Itens por Fornecedor', objetivo: 'Medir o volume de equipamentos em posse de cada fornecedor.', formula: 'Contagem de itens com o fornecedor como responsável atual.', origem: 'Itens de GDM com fornecedor definido.', interpretacao: 'Classificação operacional por volume; quanto mais itens em posse, maior a criticidade do acompanhamento.', exemplo: 'Fornecedor X com 15 equipamentos em posse.' },
      { name: 'Em Tratamento', objetivo: 'Equipamentos em execução no fornecedor.', formula: 'Contagem de itens em tratamento.', origem: 'Itens de GDM em tratamento.', interpretacao: 'Volume de serviços em execução simultânea.', exemplo: '22 equipamentos em tratamento.' },
      { name: 'Aguardando Retorno', objetivo: 'Materiais que devem ser devolvidos pelos fornecedores.', formula: 'Contagem de itens aguardando retorno.', origem: 'Itens de GDM aguardando retorno.', interpretacao: 'Priorize cobranças conforme os alertas de prazo.', exemplo: '14 materiais a cobrar retorno.' },
      { name: 'Ranking de Fornecedores', objetivo: 'Comparar fornecedores por volume operacional.', formula: 'Ordenação por quantidade de equipamentos em posse.', origem: 'Itens de GDM com fornecedor definido.', interpretacao: 'Use o ranking para distribuir carga e avaliar parcerias.', exemplo: 'Fornecedor Y lidera com 18 equipamentos.' },
    ] },
    { type: 'h', text: 'Dashboard de Controle de OT' },
    { type: 'cards', items: [
      { name: 'OTs Abertas', objetivo: 'Ordens de trabalho ativas com fornecedor.', formula: 'Contagem de itens com OT aberta.', origem: 'Itens de GDM com OT emitida.', interpretacao: 'Volume de processos em campo; acompanhe a idade de cada OT.', exemplo: '19 OTs abertas.' },
      { name: 'OTs em Serviço', objetivo: 'OTs com o fornecedor executando o serviço.', formula: 'Contagem de itens em serviço.', origem: 'Itens de GDM com OT em serviço.', interpretacao: 'Serviços em execução — confira os prazos de retorno.', exemplo: '11 OTs em serviço.' },
      { name: 'Aguardando Fechamento', objetivo: 'OTs de materiais já recebidos e a concluir.', formula: 'Contagem de itens recebidos com OT aberta.', origem: 'Itens de GDM recebidos com OT pendente.', interpretacao: 'Pendência do Almoxarifado: feche as OTs para concluir os processos.', exemplo: '4 OTs aguardando fechamento.' },
      { name: 'OTs Fechadas', objetivo: 'Processos totalmente concluídos.', formula: 'Contagem de OTs fechadas.', origem: 'Itens de GDM com OT fechada.', interpretacao: 'Histórico de conclusão; compare com o total aberto.', exemplo: '57 OTs fechadas no ano.' },
      { name: 'Alertas de OT', objetivo: 'Sinalizar OTs envelhecidas ou paradas.', formula: 'Idade da OT comparada aos marcos (15, 30 e 60 dias).', origem: 'Datas de emissão e situação das OTs.', interpretacao: 'Cada marco é notificado uma única vez; trate os alertas ativos.', exemplo: '3 OTs com mais de 30 dias em aberto.' },
    ] },
  ],
};

/* ------------------------------------------------------------------ */
/* QR Code e Assinatura Eletrônica                                     */
/* ------------------------------------------------------------------ */

const QR_CHAPTER = {
  key: 'qr_code',
  label: 'QR Code',
  blocks: [
    { type: 'p', text: 'Cada item de GDM possui um QR Code que abre uma página pública com o histórico do equipamento — para consulta externa sem login, por qualquer pessoa com o código.' },
    { type: 'steps', steps: [
      { title: 'Gere o QR Code do item', description: 'No detalhe do item, gere o QR Code do item da GDM.', print: 'Botão de QR Code do item destacado com o código exibido' },
      { title: 'Compartilhe ou imprima', description: 'Use o QR Code em etiquetas, documentos e embalagens para rastreio físico do material.', print: 'QR Code pronto para impressão exibido na tela' },
      { title: 'Consulte o histórico', description: 'Ao escanear, a página pública exibe os dados do item, o histórico do equipamento, os certificados, as fotos e os PDFs vinculados.', print: 'Página pública do item com o histórico aberto destacado' },
    ] },
    { type: 'alert', text: 'A visualização pública é limitada: o usuário externo consulta as informações do item, sem acesso a ações ou a dados de outros processos.' },
  ],
};

const SIGNATURE_CHAPTER = {
  key: 'signature',
  label: 'Assinatura Eletrônica',
  blocks: [
    { type: 'p', text: 'A assinatura eletrônica é obrigatória em toda ação crítica (aprovações, reprovações, alterações de destino, envios, retornos, descartes, decisões de cotação, PWT, OC, OT e fechamentos).' },
    { type: 'steps', steps: [
      { title: 'Cadastre sua assinatura', description: 'Em "Meu Perfil", desenha a assinatura no campo dedicado e salve. A assinatura fica vinculada à sua conta.', print: 'Campo de desenho da assinatura no Meu Perfil destacado' },
      { title: 'Altere quando necessário', description: 'Para alterar, redesenhe e salve novamente em "Meu Perfil". As assinaturas já vinculadas a processos concluídos não são afetadas.', print: 'Botão de salvar nova assinatura destacado' },
      { title: 'Assine as ações críticas', description: 'Ao executar uma ação crítica, o sistema pede a confirmação com assinatura: desenhe/assine no diálogo para concluir.', print: 'Diálogo de confirmação com assinatura destacado' },
      { title: 'Verifique no histórico', description: 'As assinaturas aparecem no histórico da GDM e do item, com assinatura, nome, data, hora e descrição da ação.', print: 'Histórico do item exibindo uma assinatura registrada destacada' },
    ] },
    { type: 'list', items: [
      'Validade jurídica interna: a assinatura é registrada permanentemente, vinculada ao usuário autenticado, com data, hora e contexto da ação.',
      'É proibida a alteração ou exclusão de assinatura vinculada a um processo concluído.',
      'Sem assinatura cadastrada, ações críticas não podem ser concluídas.',
    ] },
  ],
};

/* ------------------------------------------------------------------ */
/* Exemplos práticos e FAQ                                             */
/* ------------------------------------------------------------------ */

const CASES_CHAPTER = {
  key: 'cases',
  label: 'Exemplos Práticos',
  blocks: [
    { type: 'p', text: 'Quatro casos reais demonstrando o fluxo completo do início ao fim, do desembarque à finalização do item.' },
    { type: 'h', text: 'Caso 1 — Equipamento enviado para reparo' },
    { type: 'p', text: 'Uma bomba hidráulica (SN 7H2K-8891) desembarca com vazamento. O Almoxarifado cria a GDM-001/2026 com destino de reparo e fotos; a Coordenação aprova; o recebimento é confirmado; os Serviços definem a Fornecedor X e solicitam a NF; o material é enviado com NF assinada e foto; a cotação de R$ 7.650 é aprovada pela Manutenção; o Planejamento emite o PWT; os Serviços emitem OT e OC; o retorno é recebido com NF e laudo (início da garantia) e a OT é fechada.' },
    { type: 'steps', steps: stepsOf(MANUAL_PROCESSES, 'repair') },
    { type: 'h', text: 'Caso 2 — Equipamento enviado para certificação' },
    { type: 'p', text: 'Uma válvula de segurança desembarca para calibração anual. O fluxo segue como no reparo até o retorno do fornecedor; as Operações registram o certificado nº 3.456/2026 com validade de 12 meses e o item só então é finalizado, entrando no ciclo de alertas de vencimento.' },
    { type: 'steps', steps: stepsOf(MANUAL_PROCESSES, 'certification') },
    { type: 'h', text: 'Caso 3 — Equipamento descartado' },
    { type: 'p', text: 'Um motor elétrico irrecuperável recebe destino de descarte na GDM. A Manutenção autoriza o descarte com assinatura eletrônica; o Almoxarifado confirma o descarte físico com responsável e data e anexa as comprovações (fotos e PDF); o item é finalizado e consultável nos Relatórios de Descarte.' },
    { type: 'steps', steps: stepsOf(MANUAL_PROCESSES, 'discard') },
    { type: 'h', text: 'Caso 4 — Equipamento retornado ao estoque' },
    { type: 'p', text: 'Um instrumento em bom estado recebe destino de retorno ao estoque. Após a aprovação e o recebimento, o Almoxarifado confirma a devolução ao estoque com o número da devolução e o item é finalizado com o histórico completo.' },
    { type: 'steps', steps: stepsOf(MANUAL_PROCESSES, 'stock_return') },
  ],
};

const FAQ_CHAPTER = {
  key: 'faq',
  label: 'Perguntas Frequentes',
  blocks: [
    { type: 'h', text: 'Dúvidas frequentes' },
    { type: 'faq', items: [
      ['Esqueci minha senha. Como proceder?', 'Use a opção de recuperação na tela de login. A política de senha da empresa define expiração e bloqueio por tentativas.'],
      ['Não vejo um módulo no menu. Por quê?', 'O menu exibe apenas os módulos autorizados. Solicite ao ADM a permissão individual — nada é concedido automaticamente por setor.'],
      ['Como altero meu nome exibido no sistema?', 'Em "Meu Perfil", edite seu nome de exibição. O nome da conta em si não é editável pelo próprio usuário.'],
      ['A GDM não avança. O que verificar?', 'Verifique se há itens com pendências: aprovação da Coordenação, recebimento, comprovantes obrigatórios (NF assinada + foto no envio) ou decisões de cotação pendentes.'],
      ['O sistema recusa o número da GDM. Qual o motivo?', 'O número é manual e único por embarcação. Use outro número para a mesma embarcação.'],
      ['Não consigo concluir uma ação crítica.', 'Verifique se sua assinatura eletrônica está cadastrada em "Meu Perfil" e se você tem a permissão da ação.'],
      ['O comprovante de envio não é aceito.', 'Anexe os dois obrigatórios: NF assinada e foto do envio, nos formatos aceitos (JPG, PNG, WEBP ou PDF).'],
      ['Como consulto o histórico de um equipamento?', 'Pelo QR Code do item, pela busca do item nas GDMs ou pelo histórico de confiabilidade do número de série (SN).'],
      ['Um certificado venceu. O que fazer?', 'Programa a recertificação: crie a tratativa de certificação para o equipamento. Os alertas automáticos avisam em 90/60/30/15/0 dias e após o vencimento.'],
      ['Como o item chega ao fornecedor?', 'Somente com a NF assinada e a foto do envio anexadas pelo Almoxarifado — sem os dois anexos o item permanece parado.'],
      ['A garantia começou quando?', 'Na confirmação do recebimento do retorno pelo Almoxarifado, com o prazo em dias informado na cotação.'],
      ['Posso apagar uma assinatura do histórico?', 'Não. Assinaturas vinculadas a processos concluídos são permanentes e imutáveis, por exigência de auditoria.'],
    ] },
    { type: 'h', text: 'Erros comuns e como corrigir' },
    { type: 'list', items: [
      'Criar GDM sem fotos da condição no desembarque — complemente o registro antes da aprovação.',
      'Informar número de série incorreto — prejudica todo o histórico de confiabilidade e certificações; confira a placa do equipamento.',
      'Escolher destino errado no item — a Coordenação pode alterar com justificativa; não deixe para depois do envio ao fornecedor.',
      'Deixar OTs abertas após o recebimento — feche as OTs para concluir os processos e evitar alertas de envelhecimento.',
    ] },
    { type: 'h', text: 'Boas práticas' },
    { type: 'list', items: [
      'Registre as evidências no momento da ação: fotos do desembarque, anexos de envio/retorno e certificados.',
      'Acompanhe diariamente o board do seu setor e os alertas de notificação.',
      'Use a Análise de Cotações para decisões rastreáveis e o histórico por SN antes de aprovar reparos caros.',
      'Mantenha cadastros atualizados: embarcações, responsáveis por setor, equipamentos e fornecedores.',
    ] },
  ],
};

/* ------------------------------------------------------------------ */
/* Estrutura final                                                     */
/* ------------------------------------------------------------------ */

export const MASTER_MANUAL_CHAPTERS = [
  ...SECTOR_CHAPTERS,
  ADMIN_CHAPTER,
  CREATE_GDM_CHAPTER,
  GDM_LIST_CHAPTER,
  MAINTENANCE_CHAPTER,
  OPERATIONS_CHAPTER,
  ALMOX_CHAPTER,
  SERVICES_CHAPTER,
  SUPPLIERS_CHAPTER,
  DASHBOARDS_CHAPTER,
  QR_CHAPTER,
  SIGNATURE_CHAPTER,
  CASES_CHAPTER,
  FAQ_CHAPTER,
];

export const MANUAL_PARTS = [
  { title: 'Visão por Setor', from: 0, to: SECTOR_CHAPTERS.length + 1 }, // setores + Administrador
  { title: 'Funcionalidades e Fluxos', from: SECTOR_CHAPTERS.length + 1, to: MASTER_MANUAL_CHAPTERS.length },
];