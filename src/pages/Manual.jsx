import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Image as ImageIcon, PenLine } from 'lucide-react';
import { MANUAL_SECTORS, MANUAL_PROCESSES } from '@/lib/manualContent';
import ManualSteps from '@/components/manual/ManualSteps';
import ManualPdfButton from '@/components/manual/ManualPdfButton';
import MasterManualPdfButton from '@/components/manual/MasterManualPdfButton';
import ManualAttachments from '@/components/manual/ManualAttachments';

/**
 * Manual de Procedimentos — passo a passo do procedimento completo de cada
 * setor e de cada processo. Acesso por autorização individual (view_manual).
 */
export default function Manual() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <div className="space-y-4">
      <Card className="border-sky-200 bg-sky-50">
        <CardContent className="flex items-start gap-3 p-4">
          <PenLine className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-600" />
          <p className="text-sm text-slate-700">
            Todas as ações críticas do fluxo exigem <strong>assinatura eletrônica</strong> vinculada
            ao usuário autenticado e ficam registradas permanentemente no histórico, com assinatura,
            nome, data, hora e descrição da ação.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="master" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="master">Manual Completo</TabsTrigger>
          {MANUAL_SECTORS.map((sector) => (
            <TabsTrigger key={sector.key} value={sector.key}>
              {sector.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="processes">Processos</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="master">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Manual Mestre da Plataforma</CardTitle>
                  <CardDescription>
                    Material único para treinamento, onboarding e consulta operacional: capa, sumário
                    clicável, controle de versão, objetivo do sistema, glossário, fluxograma geral,
                    índice de funcionalidades, capítulos por setor e por funcionalidade, dashboards
                    com fórmulas dos indicadores, QR Code, assinatura eletrônica, 4 exemplos práticos
                    ponta a ponta e perguntas frequentes.
                  </CardDescription>
                </div>
                <MasterManualPdfButton />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700">
                O PDF é gerado com todos os capítulos em um único arquivo, com o mesmo padrão visual
                da plataforma. Cada passo a passo traz explicação dos campos, exemplos preenchidos,
                observações e alertas de erros comuns.
              </p>
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="flex items-start gap-3 p-4">
                  <ImageIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <p className="text-sm text-slate-700">
                    <strong>Prints das telas:</strong> para ilustrar os passos com capturas de tela
                    da plataforma, anexe as imagens na aba <strong>Documentos</strong> incluindo o
                    nome do capítulo no título do documento (ex.: "Criação de GDM — Passo 1").
                    Elas são embutidas automaticamente nos passos do capítulo correspondente na
                    ordem em que foram anexadas; passos sem print recebem um espaço reservado com a
                    indicação da tela a capturar.
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {MANUAL_SECTORS.map((sector) => (
          <TabsContent key={sector.key} value={sector.key}>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{sector.label}</CardTitle>
                    <CardDescription>{sector.intro}</CardDescription>
                  </div>
                  <ManualPdfButton section={sector} />
                </div>
              </CardHeader>
              <CardContent>
                <ManualSteps steps={sector.steps} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="processes" className="space-y-4">
          {MANUAL_PROCESSES.map((process) => (
            <Card key={process.key}>
              <CardHeader>
                <CardTitle>{process.label}</CardTitle>
                <CardDescription>{process.intro}</CardDescription>
              </CardHeader>
              <CardContent>
                <ManualSteps steps={process.steps} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="documents">
          <ManualAttachments user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}