import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import PhotoEvidenceGrid from './PhotoEvidenceGrid';

/** Evidências fotográficas permanentes vinculadas a um item da GDM. */
export default function ItemPhotoGallery({ itemId }) {
  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['gdmPhotos', itemId],
    queryFn: () => base44.entities.GDMPhoto.filter({ gdm_item_id: itemId }, 'taken_at'),
    enabled: !!itemId,
  });

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-slate-400" />;
  }

  return (
    <PhotoEvidenceGrid
      photos={photos}
      emptyText="Nenhuma evidência fotográfica registrada para este item."
    />
  );
}