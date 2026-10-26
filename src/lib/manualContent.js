// Conteúdo fixo do Manual de Procedimentos — passo a passo do procedimento
// completo de cada setor e de cada processo ponta a ponta da plataforma.
// Ajustes no conteúdo: edite este arquivo. Documentos complementares são
// anexados pelo ADM na aba "Documentos" do módulo Manual.

export const MANUAL_SECTORS = [
  {
    key: 'coordinator',
    label: 'Coordenação',
    intro: 'A Coordenação revisa as Guias de Desembarque (GDMs) após a criação: valida a tratativa, aprova ou reprova o processo e ajusta o destino dos itens quando necessário.',
    steps: [
      {
        title: 'Monitorar pendências',
        description: 'Em "Guias de Desembarque", acompanhe as GDMs com situação "Aguardando Aprovação do Coordenador".',
      },
      {
        title: 'Analisar a GDM',
        description: 'Abra a GDM e confira o número, a embarcação, os itens (equipamento, número de série e quantidade), o destino proposto, as fotos da condição no desembarque e a descrição do problema.',
      },
      {
        title: 'Aprovar ou reprovar',
        description: 'Aprove a GDM para liberar os itens ao fluxo do setor responsável, ou a reprove informando a justificativa. Ambas as ações exigem assinatura eletrônica e ficam registradas no histórico.',
      },
      {
        title: 'Alterar destino do item',
        description: 'Quando necessário, altere o destino do item (reparo, certificação, retorno ao estoque ou descarte) informando a justificativa. A alteração é auditada com assinatura eletrônica.',
      },
      {
        title: 'Acompanhar o processo',
        description: 'Consulte o histórico da GDM (assinatura, responsável, data, hora e descrição de cada etapa) e os Relatórios de Descarte quando aplicável.',
      },
    ],
  },
  {
    key: 'almoxarifado',
    label: 'Almoxarifado',
    intro: 'O Almoxarifado é o ponto de entrada física do material: cria a GDM, confirma o recebimento, prepara os envios ao fornecedor, recebe os retornos e confirma descartes.',
    steps: [
      {
        title: 'Criar a GDM',
        description: 'Em "Criar GDM", informe o número da GDM (preenchimento manual, ex.: GDM-001/2026 — não pode se repetir na mesma embarcação), a embarcação, a data de desembarque e os itens com destino. Anexe as fotos de condição no desembarque, placa de identificação e número de série.',
      },
      {
        title: 'Confirmar o recebimento',
        description: 'No board do Almoxarifado, confirme o recebimento físico de cada item desembarcado. Se o item não chegou, registre o "não recebimento": o responsável vinculado à embarcação confirmará o desembarque ou reprogramará a data.',
      },
      {
        title: 'Preparar o envio ao fornecedor',
        description: 'Após a definição do fornecedor por Serviços, embale o material e anexe o comprovante de envio: NF assinada + foto do envio. Sem os dois anexos o item não avança ao fornecedor.',
      },
      {
        title: 'Receber o retorno',
        description: 'Quando o material retorna do fornecedor, anexe a NF do material retornado e o laudo técnico e confirme o recebimento. A garantia do item inicia automaticamente nessa confirmação.',
      },
      {
        title: 'Confirmar o descarte',
        description: 'Para itens de descarte, após a autorização da Manutenção, confirme o descarte físico informando o responsável e a data, e anexe as comprovações (fotos e/ou PDF).',
      },
      {
        title: 'Fechar a OT',
        description: 'Itens com OT aberta devem ter a OT fechada pelo Almoxarifado após a conclusão do processo, com assinatura eletrônica.',
      },
    ],
  },
  {
    key: 'services',
    label: 'Serviços',
    intro: 'Os Serviços conduzem a tratativa com os fornecedores: definição do fornecedor, cotação, emissão de OT/OC, solicitação de NF e controle de prazos.',
    steps: [
      {
        title: 'Definir o fornecedor',
        description: 'No board de Serviços, abra o item em "Definição de Fornecedor": selecione o fornecedor e informe a previsão de envio. Se necessário, marque a opção "Solicitar NF" para abrir a solicitação logo após a definição. A ação exige assinatura eletrônica.',
      },
      {
        title: 'Acompanhar a cotação',
        description: 'O fornecedor tem 3 dias corridos para apresentar a cotação (contador automático). O sistema emite follow-up de cotação para os Serviços; acompanhe o andamento em "Análise de Cotações".',
      },
      {
        title: 'Anexar a cotação',
        description: 'Registre o valor, o documento da cotação, o prazo de execução, o número da proposta comercial e a garantia em dias. A cotação fica preservada no histórico e nunca é apagada.',
      },
      {
        title: 'Rever o prazo de execução contratado',
        description: 'Após a aprovação da cotação, revise o prazo de execução contratado — etapa exclusiva dos Serviços.',
      },
      {
        title: 'Emitir OT e OC',
        description: 'Com o PWT emitido pelo Planejamento, emita a OT e a OC do item e, em seguida, confirme a aprovação e o envio da OC ao fornecedor.',
      },
      {
        title: 'Solicitar a NF',
        description: 'Ao enviar material ao fornecedor, gere a solicitação de NF: informe a natureza da operação e o CFOP (lista fixa com código e descrição), a transportadora, o tipo de frete e os itens da nota. A solicitação pode ser exportada em CSV/PDF e impressa.',
      },
      {
        title: 'Registrar tratativas e devoluções',
        description: 'Registre as tratativas do item durante o ciclo com o fornecedor e, quando o material sair do fornecedor para entrega, registre a saída para entrega.',
      },
    ],
  },
  {
    key: 'maintenance',
    label: 'Manutenção',
    intro: 'A Manutenção decide sobre as cotações dos itens de reparo, retorno ao estoque e descarte, autoriza descartes e acompanha os custos do processo.',
    steps: [
      {
        title: 'Monitorar as cotações',
        description: 'Na aba Manutenção (e na Análise de Cotações), acompanhe os itens de reparo, estoque e descarte com cotação anexada aguardando decisão.',
      },
      {
        title: 'Decidir sobre a cotação',
        description: 'Aprove a cotação, solicite desconto (percentual) ou a reprove. Na reprovação, escolha o desfecho: enviar para outro fornecedor ou descartar o equipamento. Toda decisão exige assinatura eletrônica e fica registrada no histórico.',
      },
      {
        title: 'Negociar o desconto',
        description: 'Itens em "Negociação de Desconto" retornam ao fornecedor com o percentual solicitado. Acompanhe a nova proposta e decida novamente sobre a cotação.',
      },
      {
        title: 'Autorizar o descarte',
        description: 'Para itens com destino de descarte, registre a autorização do descarte para liberar a confirmação física pelo Almoxarifado.',
      },
      {
        title: 'Acompanhar custos e confiabilidade',
        description: 'Com autorização individual do ADM, acompanhe os custos de reparo e os indicadores de confiabilidade (MTBF/MTTR) nos dashboards.',
      },
    ],
  },
  {
    key: 'planejamento',
    label: 'Planejamento',
    intro: 'O Planejamento emite o PWT dos itens aprovados e acompanha equipamentos e indicadores do processo.',
    steps: [
      {
        title: 'Monitorar itens aprovados',
        description: 'Acompanhe os itens com cotação aprovada aguardando a emissão do PWT.',
      },
      {
        title: 'Emitir o PWT',
        description: 'Registre o número do PWT do item, com assinatura eletrônica. A emissão avança o item para a emissão da OC pelos Serviços.',
      },
      {
        title: 'Consultar equipamentos e indicadores',
        description: 'Consulte o cadastro de equipamentos e, com autorização individual do ADM, os indicadores e dashboards do processo.',
      },
    ],
  },
  {
    key: 'operations',
    label: 'Operações',
    intro: 'As Operações cuidam dos itens de certificação e calibração: acompanham o ciclo com o fornecedor, registram o certificado e a validade e monitoram os vencimentos.',
    steps: [
      {
        title: 'Monitorar itens de calibração',
        description: 'Na aba Operações, acompanhe os itens com destino "certificação" em cada etapa (envio ao fornecedor, cotação e retorno).',
      },
      {
        title: 'Acompanhar as cotações das calibrações',
        description: 'Acompanhe os prazos e os valores das cotações dos itens de calibração/certificação.',
      },
      {
        title: 'Registrar o certificado',
        description: 'No retorno do item, registre o certificado: número, empresa certificadora, data de emissão, documento e validade (data direta ou quantidade de meses — o vencimento é calculado automaticamente). O item só é finalizado após o certificado e a validade registrados.',
      },
      {
        title: 'Acompanhar os vencimentos',
        description: 'O sistema emite alertas automáticos em 90, 60, 30, 15 e 0 dias e após o vencimento. Acompanhe os certificados no Dashboard de Certificações (autorização individual do ADM).',
      },
    ],
  },
];

export const MANUAL_PROCESSES = [
  {
    key: 'repair',
    label: 'Processo completo de Reparo',
    intro: 'Fluxo ponta a ponta de um item desembarcado com destino de reparo, da criação da GDM ao fechamento da OT.',
    steps: [
      { title: 'Criação da GDM', description: 'O Almoxarifado cria a GDM com número manual, embarcação, itens e fotos da condição no desembarque.' },
      { title: 'Aprovação da Coordenação', description: 'A Coordenação valida a GDM e aprova o processo — ou a reprova com justificativa.' },
      { title: 'Confirmação do desembarque', description: 'O responsável por setor vinculado à embarcação confirma o desembarque do item.' },
      { title: 'Recebimento físico', description: 'O Almoxarifado confirma o recebimento do item desembarcado.' },
      { title: 'Definição do fornecedor', description: 'Os Serviços selecionam o fornecedor e informam a previsão de envio (opcionalmente já solicitando a NF).' },
      { title: 'Envio ao fornecedor', description: 'O Almoxarifado anexa a NF assinada e a foto do envio; o item segue ao fornecedor com prazo de retorno acordado.' },
      { title: 'Cotação', description: 'O fornecedor apresenta a cotação (prazo de 3 dias com follow-up automático) e os Serviços a anexam com valor, documento, prazo, proposta e garantia.' },
      { title: 'Decisão da Manutenção', description: 'A Manutenção aprova, solicita desconto, solicita nova cotação ou reprova (outro fornecedor ou descarte).' },
      { title: 'Emissão do PWT', description: 'O Planejamento emite o PWT do item aprovado.' },
      { title: 'Emissão da OC e da OT', description: 'Os Serviços emitem a OT e a OC e confirmam a aprovação e o envio da OC ao fornecedor.' },
      { title: 'Execução e retorno', description: 'O fornecedor executa o serviço; os Serviços registram a saída para entrega e o Almoxarifado recebe o retorno com NF e laudo técnico — a garantia inicia automaticamente.' },
      { title: 'Fechamento da OT e finalização', description: 'O Almoxarifado fecha a OT e o item é finalizado, com todo o histórico auditável.' },
    ],
  },
  {
    key: 'certification',
    label: 'Processo completo de Certificação / Calibração',
    intro: 'Fluxo dos itens com destino de certificação ou calibração — a finalização depende do certificado e da validade registrados pelas Operações.',
    steps: [
      { title: 'Criação e aprovação', description: 'GDM criada pelo Almoxarifado, aprovada pela Coordenação, com desembarque confirmado e recebimento físico pelo Almoxarifado.' },
      { title: 'Definição do fornecedor e envio', description: 'Os Serviços definem o fornecedor de calibração e o Almoxarifado envia o material com NF assinada e foto do envio.' },
      { title: 'Cotação e aprovação', description: 'A cotação é anexada e decidida conforme o fluxo; o item segue ao fornecedor para calibração/certificação.' },
      { title: 'Retorno do material', description: 'O Almoxarifado recebe o material retornado com NF e laudo técnico e confirma o recebimento.' },
      { title: 'Registro do certificado e da validade', description: 'As Operações registram o certificado (número, empresa certificadora, documento) e a validade (data ou meses). O item só é finalizado após essa etapa.' },
      { title: 'Monitoramento dos vencimentos', description: 'Alertas automáticos em 90/60/30/15/0 dias e após o vencimento, acompanhados no Dashboard de Certificações.' },
    ],
  },
  {
    key: 'discard',
    label: 'Processo completo de Descarte',
    intro: 'Fluxo dos itens com destino de descarte, da autorização ao relatório.',
    steps: [
      { title: 'Destino de descarte definido', description: 'O item recebe destino "descarte" na GDM (definido na criação ou alterado pela Coordenação com justificativa).' },
      { title: 'Autorização da Manutenção', description: 'A Manutenção autoriza o descarte do item, com assinatura eletrônica.' },
      { title: 'Confirmação do descarte físico', description: 'O Almoxarifado confirma o descarte físico, informando o responsável e a data.' },
      { title: 'Comprovações do descarte', description: 'O Almoxarifado anexa as comprovações exigidas: fotos e/ou PDF do descarte.' },
      { title: 'Finalização e relatório', description: 'O item é finalizado e o descarte pode ser consultado nos Relatórios de Descarte.' },
    ],
  },
  {
    key: 'stock_return',
    label: 'Processo completo de Retorno ao Estoque',
    intro: 'Fluxo dos itens com destino de retorno ao estoque.',
    steps: [
      { title: 'Destino de retorno definido', description: 'O item recebe destino "retorno ao estoque" na GDM.' },
      { title: 'Aprovação e recebimento', description: 'A GDM é aprovada pela Coordenação, o desembarque é confirmado e o Almoxarifado confirma o recebimento físico.' },
      { title: 'Confirmação da devolução ao estoque', description: 'O Almoxarifado confirma a devolução ao estoque, informando o número da devolução quando houver.' },
      { title: 'Finalização', description: 'O item é finalizado com o histórico completo da devolução.' },
    ],
  },
  {
    key: 'not_received',
    label: 'Não recebimento e reprogramação do desembarque',
    intro: 'Fluxo quando um item previsto na GDM não chega ao Almoxarifado.',
    steps: [
      { title: 'Registro do não recebimento', description: 'O Almoxarifado registra que o item não foi recebido.' },
      { title: 'Acionamento do responsável', description: 'O responsável por setor vinculado à embarcação (cadastrado em Configurações > Embarcações) é acionado para tratar a pendência.' },
      { title: 'Confirmação ou reprogramação', description: 'O responsável confirma o desembarque do item ou informa a nova data prevista com justificativa de reprogramação.' },
      { title: 'Retorno ao fluxo normal', description: 'Com o item desembarcado, o fluxo segue normalmente pelo recebimento do Almoxarifado.' },
    ],
  },
];