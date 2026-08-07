import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, FileText } from 'lucide-react';
import { fileNameFromUrl } from '@/lib/gdmWorkflow';

const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function ProposalsHistory({ gdm }) {
  const proposals = React.useMemo(() => {
    const list = [...(gdm.proposals || [])];
    if (
      gdm.quote_value != null &&
      !list.some((p) => p.quote_value === gdm.quote_value && (p.supplier_name || '') === (gdm.supplier_name || ''))
    ) {
      list.push({
        supplier_name: gdm.supplier_name,
        quote_value: gdm.quote_value,
        proposal_date: gdm.commercial_proposal_uploaded_at || gdm.created_date,
        registered_by: gdm.commercial_proposal_uploaded_by,
        file_url: gdm.commercial_proposal_url || gdm.quote_document_url,
      });
    }
    return list
      .filter((p) => p.quote_value != null)
      .sort((a, b) => new Date(a.proposal_date) - new Date(b.proposal_date));
  }, [gdm]);

  if (proposals.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Histórico de Propostas Comerciais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Empresa</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Arquivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposals.map((p, idx) => (
              <TableRow key={idx} className="hover:bg-slate-50">
                <TableCell className="font-medium">{p.supplier_name || '-'}</TableCell>
                <TableCell className="font-semibold text-slate-900">{fmt(p.quote_value)}</TableCell>
                <TableCell>
                  {p.proposal_date
                    ? format(new Date(p.proposal_date), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'}
                </TableCell>
                <TableCell className="text-sm text-slate-600">{p.registered_by || '-'}</TableCell>
                <TableCell>
                  {p.file_url ? (
                    <a
                      href={p.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-600 hover:underline text-sm"
                    >
                      <Download className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate max-w-[180px]">{fileNameFromUrl(p.file_url)}</span>
                    </a>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}