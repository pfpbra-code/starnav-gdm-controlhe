import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmtDateTime = (d) =>
  d ? format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data não registrada';

/** Anexos consultáveis na página pública do equipamento (QR Code). */
export default function PublicAttachmentsPanel({ documents = [] }) {
  if (documents.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-10 text-center text-sm text-slate-500">
          Nenhum documento vinculado a este equipamento até o momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Anexos do equipamento ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-slate-100">
        {documents.map((doc) => (
          <div key={doc.id} className="py-3 flex items-start gap-3">
            {doc.isImage && doc.url ? (
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="h-14 w-14 flex-shrink-0 rounded-md overflow-hidden border border-slate-200 bg-slate-50"
              >
                <img
                  src={doc.url}
                  alt={doc.fileName}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </a>
            ) : (
              <div className="h-14 w-14 flex-shrink-0 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                <FileText className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">
                {doc.type}
                {doc.versionCount > 1 ? ` · v${doc.version}` : ''}
              </p>
              <p className="text-xs text-slate-500 truncate">{doc.fileName}</p>
              <p className="text-xs text-slate-400">
                {fmtDateTime(doc.date)} · {doc.user || 'Sistema'}
              </p>
            </div>
            {doc.url && (
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-600 hover:underline flex-shrink-0 pt-1"
              >
                Visualizar
              </a>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}