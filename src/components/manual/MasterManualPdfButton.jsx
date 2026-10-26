import React, { useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { downloadMasterManualPdf } from '@/lib/masterManualPdf';

/**
 * Gera o Manual Mestre da Plataforma em PDF. Os prints anexados pelo ADM na
 * aba "Documentos" (imagens cujo título contém o nome do capítulo) são
 * embutidos automaticamente nos passos do capítulo correspondente.
 */
export default function MasterManualPdfButton() {
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      let images = [];
      const page = await base44.entities.ManualAttachment.filter(
        { file_type: { $regex: 'image/' } },
        { sort: 'uploaded_at', limit: 200 }
      );
      for (const att of page.items) {
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: att.file_uri,
        });
        images.push({
          title: att.title,
          description: att.description,
          signed_url,
        });
      }
      await downloadMasterManualPdf({ images });
      toast.success('Manual Mestre gerado com sucesso.');
    } catch (e) {
      toast.error('Não foi possível gerar o Manual Mestre.');
      throw e;
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button onClick={generate} disabled={generating}>
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
      {generating ? 'Gerando Manual Mestre...' : 'Baixar Manual Mestre (PDF)'}
    </Button>
  );
}