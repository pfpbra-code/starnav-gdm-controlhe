import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const ENTITIES = [
  { value: 'Vessel', label: 'Embarcações' },
  { value: 'Equipment', label: 'Equipamentos' },
  { value: 'Supplier', label: 'Fornecedores' },
  { value: 'GDM', label: 'GDMs (Guias de Desembarque)' },
];

export default function ImportData() {
  const queryClient = useQueryClient();
  const [entity, setEntity] = useState('Vessel');
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [result, setResult] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: async (f) => {
      const res = await base44.integrations.Core.UploadFile({ file: f });
      return res.file_url;
    },
    onSuccess: (url) => {
      setFileUrl(url);
      toast.success('Arquivo enviado. Agora clique em "Importar dados".');
    },
    onError: () => toast.error('Erro ao enviar arquivo'),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const schema = await base44.entities[entity].schema();
      const extractRes = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: schema,
      });
      if (extractRes.status !== 'success' || !extractRes.output) {
        throw new Error(extractRes.details || 'Não foi possível extrair os dados do arquivo.');
      }
      const records = Array.isArray(extractRes.output) ? extractRes.output : [extractRes.output];
      if (records.length === 0) throw new Error('Nenhum registro encontrado no arquivo.');
      const created = await base44.entities[entity].bulkCreate(records);
      return { created: created.length, total: records.length };
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: [entity.toLowerCase() + 's'] });
      toast.success(`${data.created} de ${data.total} registro(s) importado(s) com sucesso!`);
      setFile(null);
      setFileUrl('');
    },
    onError: (err) => {
      toast.error('Erro na importação: ' + (err.message || 'verifique o formato do arquivo.'));
    },
  });

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setFileUrl('');
    uploadMutation.mutate(f);
  };

  const handleImport = () => {
    if (!fileUrl) {
      toast.error('Aguarde o envio do arquivo.');
      return;
    }
    importMutation.mutate();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Importar Planilha</h1>
        <p className="text-slate-500 mt-1">
          Importe dados da sua planilha Excel (ou CSV/JSON) diretamente para a plataforma.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-sky-600" />
            Importação de Dados
          </CardTitle>
          <CardDescription>
            Selecione o tipo de dado, envie a planilha e importe. As colunas devem corresponder aos campos da entidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Tipo de dado a importar</Label>
            <Select value={entity} onValueChange={(v) => { setEntity(v); setResult(null); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITIES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Arquivo da planilha</Label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6">
              <div className="text-center">
                <input
                  type="file"
                  id="import-file"
                  accept=".xlsx,.xls,.csv,.json"
                  onChange={handleFile}
                  className="hidden"
                  disabled={uploadMutation.isPending}
                />
                <label
                  htmlFor="import-file"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  {uploadMutation.isPending ? 'Enviando...' : 'Selecionar arquivo'}
                </label>
                {file && (
                  <p className="mt-3 text-sm text-slate-600">
                    {file.name}
                    {fileUrl && <span className="text-green-600 ml-2">✓ enviado</span>}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  Formatos suportados: Excel (.xlsx, .xls), CSV, JSON
                </p>
              </div>
            </div>
          </div>

          {result && (
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Importação concluída!</p>
                <p className="text-sm text-green-700">
                  {result.created} de {result.total} registro(s) importado(s) para {entity}.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 bg-sky-600 hover:bg-sky-700"
              onClick={handleImport}
              disabled={importMutation.isPending || !fileUrl}
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Importar dados
                </>
              )}
            </Button>
          </div>

          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Dica de formatação</p>
              <p className="mt-1">
                O sistema lê automaticamente sua planilha. Certifique-se de que os cabeçalhos
                das colunas correspondam aos campos da entidade (ex.: <code>name</code>,
                <code> code</code>, <code> cnpj</code> para fornecedores). Os dados são adicionados
                aos registros existentes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}