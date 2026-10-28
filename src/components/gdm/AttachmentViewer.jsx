import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmtDateTime = (d) =>
  d ? format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data não registrada';

/** Visualização ampliada de um documento do item (imagem ou arquivo). */
export default function AttachmentViewer({ doc, open, onOpenChange }) {
  if (!doc) return null;
  const url = doc.resolvedUrl || doc.url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {doc.type}
            {doc.versionCount > 1 ? ` · versão ${doc.version} de ${doc.versionCount}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {doc.isImage && url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={url}
                alt={doc.fileName}
                className="w-full max-h-[55vh] object-contain rounded-lg border border-slate-200 bg-slate-50"
              />
            </a>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              {doc.hasFile
                ? 'Documento disponível para abertura em nova aba.'
                : 'Este registro não possui arquivo digital anexado — consulte os números informados abaixo.'}
            </div>
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Arquivo</dt>
              <dd className="font-medium break-words">{doc.fileName}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Data</dt>
              <dd className="font-medium">{fmtDateTime(doc.date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Usuário</dt>
              <dd className="font-medium">{doc.user || 'Sistema'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Categoria</dt>
              <dd className="font-medium">{doc.categoryLabel || '—'}</dd>
            </div>
            {doc.note && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Observação</dt>
                <dd className="font-medium">{doc.note}</dd>
              </div>
            )}
          </dl>

          {url && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Abrir em nova aba
                </a>
              </Button>
              <Button asChild size="sm">
                <a href={url} download={doc.fileName} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-1" />
                  Baixar arquivo
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}