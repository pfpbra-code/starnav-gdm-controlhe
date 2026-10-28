import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, ImageOff } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmtDateTime = (d) =>
  d ? format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Data não registrada';

/** Linha de um documento do item: tipo, data, usuário, arquivo e ação. */
export default function AttachmentRow({ doc, onOpen }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
      {doc.isImage && doc.url ? (
        <button
          type="button"
          onClick={() => onOpen(doc)}
          className="h-14 w-14 flex-shrink-0 rounded-md overflow-hidden border border-slate-200 bg-slate-50"
        >
          <img
            src={doc.url}
            alt={doc.fileName}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </button>
      ) : (
        <div className="h-14 w-14 flex-shrink-0 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
          {doc.hasFile ? <FileText className="h-6 w-6" /> : <ImageOff className="h-6 w-6" />}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 flex flex-wrap items-center gap-2">
          {doc.type}
          {doc.versionCount > 1 && (
            <span className="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
              versão {doc.version} de {doc.versionCount}
            </span>
          )}
        </p>
        <p className="text-xs text-slate-500 truncate">{doc.fileName}</p>
        <p className="text-xs text-slate-400">
          {fmtDateTime(doc.date)} · {doc.user || 'Sistema'}
        </p>
        {doc.note && <p className="text-xs text-slate-500 mt-0.5">{doc.note}</p>}
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="flex-shrink-0"
        onClick={() => onOpen(doc)}
      >
        Visualizar
      </Button>
    </div>
  );
}