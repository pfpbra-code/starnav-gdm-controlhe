import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  SUPPLIER_IMPORT_SCHEMA,
  classifyImportRows,
  IMPORT_STATUS_LABELS,
} from '@/lib/supplierImport';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, Loader2, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLES = {
  create: 'bg-green-100 text-green-800 border-green-200',
  existing: 'bg-slate-100 text-slate-600 border-slate-200',
  duplicate: 'bg-amber-100 text-amber-800 border-amber-200',
  invalid: 'bg-red-100 text-red-800 border-red-200',
};

function SummaryGrid({ summary }) {
  const items = [
    ['Linhas na planilha', summary.total, 'text-slate-900'],
    ['Novos', summary.create, 'text-green-600'],
    ['Já cadastrados', summary.existing, 'text-slate-500'],
    ['Duplicados', summary.duplicate, 'text-amber-600'],
    ['Inconsistentes', summary.invalid, 'text-red-600'],
    ['P/ revisão manual', summary.needReview, 'text-orange-600'],
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map(([label, value, colorClass]) => (
        <div key={label} className="rounded-lg border bg-slate-50 p-3">
          <p className="text-xs text-slate-500">{label}</p>
          <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Importação em massa de fornecedores a partir de planilha (.xlsx/.csv).
 * Fluxo: upload privado -> extração -> prévia com validação por CNPJ -> importação.
 * O cadastro manual permanece disponível na página de Fornecedores.
 */
export default function SupplierImportDialog({ open, onOpenChange, suppliers }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('select'); // select | processing | preview | importing | done
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) {
      setStep('select');
      setResult(null);
    }
  }, [open]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep('processing');
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri,
        expires_in: 600,
      });
      const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: signed_url,
        json_schema: SUPPLIER_IMPORT_SCHEMA,
      });
      const rawRows = (res.output || []).filter((r) =>
        Object.values(r || {}).some((v) => v != null && String(v).trim() !== '')
      );
      const importResult = classifyImportRows(rawRows, suppliers);
      setResult(importResult);
      setStep('preview');
    } catch (err) {
      toast.error('Não foi possível ler a planilha. Verifique o formato do arquivo.');
      setStep('select');
    } finally {
      e.target.value = '';
    }
  };

  const confirmImport = async () => {
    setStep('importing');
    try {
      if (result.toCreate.length > 0) {
        await base44.entities.Supplier.bulkCreate(result.toCreate);
      }
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setStep('done');
    } catch (err) {
      toast.error('Erro ao importar fornecedores.');
      setStep('preview');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Fornecedores</DialogTitle>
          <DialogDescription>
            Envie a planilha de fornecedores homologados (.xlsx). O sistema valida
            duplicidades por CNPJ antes de cadastrar.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4 py-2">
          {step === 'select' && (
            <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-colors">
              <FileSpreadsheet className="h-10 w-10 text-sky-600" />
              <p className="text-sm font-medium text-slate-700">
                Clique para selecionar a planilha (.xlsx, .xls, .csv)
              </p>
              <p className="text-xs text-slate-500">
                Colunas esperadas: Fornecedor, CNPJ, Estado, CEP, Cidade,
                Endereço, Ramo de Atividade, Telefone, Celular, Contato
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFile}
              />
            </label>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center gap-3 p-10">
              <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
              <p className="text-sm text-slate-600">Analisando a planilha...</p>
            </div>
          )}

          {(step === 'preview' || step === 'importing') && result && (
            <>
              <SummaryGrid summary={result.summary} />
              <div className="rounded-lg border overflow-hidden">
                <div className="max-h-[40vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0">
                      <TableRow className="bg-slate-50">
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>CNPJ</TableHead>
                        <TableHead>Categoria(s)</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>Pendências</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.rows.map((row, idx) => (
                        <TableRow key={idx} className={row.status === 'invalid' ? 'bg-red-50/50' : ''}>
                          <TableCell className="font-medium max-w-[180px] truncate">
                            {row.record.company_name || <span className="text-red-500">—</span>}
                          </TableCell>
                          <TableCell className="text-xs">{row.record.cnpj}</TableCell>
                          <TableCell className="text-xs max-w-[160px]">
                            {row.record.categories.length
                              ? row.record.categories.join(', ')
                              : <span className="text-slate-400">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_STYLES[row.status]}>
                              {IMPORT_STATUS_LABELS[row.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-orange-600 max-w-[160px]">
                            {row.missing.length ? row.missing.join(', ') : <span className="text-slate-400">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}

          {step === 'done' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 p-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Importação concluída!</p>
                  <p className="text-sm text-green-700">
                    {result.summary.create} fornecedores cadastrados com sucesso.
                  </p>
                </div>
              </div>
              <SummaryGrid summary={result.summary} />
              <p className="text-xs text-slate-500">
                Fornecedores com pendências podem ser complementados a qualquer momento
                pelo cadastro manual na página de Fornecedores.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-sky-600 hover:bg-sky-700"
                onClick={confirmImport}
                disabled={result.toCreate.length === 0}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar {result.toCreate.length} fornecedores
              </Button>
            </>
          )}
          {step === 'importing' && (
            <Button disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importando...
            </Button>
          )}
          {step === 'done' && (
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => onOpenChange(false)}>
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}