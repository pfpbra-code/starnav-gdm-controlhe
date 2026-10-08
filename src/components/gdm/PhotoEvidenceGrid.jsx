import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PHOTO_CATEGORY_LABELS } from '@/lib/gdmPhotos';

/**
 * Galeria de evidências fotográficas: miniaturas com legenda, data de captura
 * e responsável pelo registro. Clique abre a imagem em tamanho original.
 * photos: [{ url, caption, category, taken_at, registered_by }]
 */
export default function PhotoEvidenceGrid({ photos, emptyText = 'Nenhuma foto registrada.' }) {
  if (!photos || photos.length === 0) {
    return <p className="text-sm text-slate-400">{emptyText}</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {photos.map((p) => (
        <a
          key={p.id || p.url}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-lg border border-slate-200 overflow-hidden bg-white hover:shadow-md transition-shadow"
        >
          <img
            src={p.url}
            alt={p.caption || PHOTO_CATEGORY_LABELS[p.category] || 'Evidência fotográfica'}
            loading="lazy"
            className="w-full h-28 object-cover group-hover:scale-[1.02] transition-transform"
          />
          <div className="p-2 text-xs space-y-0.5">
            <p className="font-medium text-slate-700 truncate">
              {p.caption || PHOTO_CATEGORY_LABELS[p.category] || 'Evidência'}
            </p>
            <p className="text-slate-400">
              {p.taken_at
                ? format(new Date(p.taken_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                : ''}
            </p>
            {p.registered_by && (
              <p className="text-slate-400 truncate">{p.registered_by}</p>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}