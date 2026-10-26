import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadManualPdf } from '@/lib/manualPdf';

/** Baixa o PDF do passo a passo de um setor do manual. */
export default function ManualPdfButton({ section }) {
  const [generating, setGenerating] = useState(false);

  const generate = () => {
    setGenerating(true);
    try {
      downloadManualPdf(section);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={generate} disabled={generating} className="flex-shrink-0">
      {generating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Baixar PDF
    </Button>
  );
}