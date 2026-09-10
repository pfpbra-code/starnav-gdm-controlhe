import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Paperclip, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Campo de anexo obrigatório do fluxo de itens: envia o arquivo para o
 * storage e devolve a URL via onChange(fileUrl).
 */
export default function AttachmentField({ label, value, onChange, required = true }) {
  const [fileName, setFileName] = useState('');

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const res = await base44.integrations.Core.UploadFile({ file });
      return res.file_url || res.data?.file_url;
    },
    onSuccess: (fileUrl) => {
      onChange(fileUrl);
      toast.success('Documento anexado');
    },
    onError: () => toast.error('Falha ao enviar o documento'),
  });

  return (
    <div className="space-y-2">
      <Label>{label}{required ? ' *' : ''}</Label>
      <div className="flex items-center gap-2">
        <label className="flex-1">
          <span
            className={`flex items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm cursor-pointer transition-colors ${
              value
                ? 'border-green-300 bg-green-50 text-green-700'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : value ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
            {value ? fileName || 'Documento anexado' : 'Selecionar arquivo (foto ou PDF)'}
          </span>
          <Input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setFileName(file.name);
                uploadMutation.mutate(file);
              }
            }}
          />
        </label>
        {value && (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange('')}>
            Remover
          </Button>
        )}
      </div>
      {value && (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-sky-600 hover:underline"
        >
          Visualizar documento anexado
        </a>
      )}
    </div>
  );
}

function Label({ children }) {
  return <span className="text-sm font-medium text-slate-700">{children}</span>;
}