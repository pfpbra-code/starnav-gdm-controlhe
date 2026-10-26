import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

/** Formulário do ADM para anexar documentos complementares ao manual. */
export default function ManualUploadForm({ userEmail, onUploaded }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Informe o título do documento.');
      return;
    }
    if (!file) {
      toast.error('Selecione um arquivo para anexar.');
      return;
    }
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await base44.entities.ManualAttachment.create({
        title: title.trim(),
        description: description.trim(),
        file_name: file.name,
        file_uri,
        file_type: file.type || '',
        file_size: file.size || 0,
        uploaded_by: userEmail || '',
        uploaded_at: new Date().toISOString(),
      });
      toast.success('Documento anexado ao manual.');
      setTitle('');
      setDescription('');
      setFile(null);
      e.target.querySelector('input[type="file"]').value = '';
      onUploaded?.();
    } catch (error) {
      toast.error('Não foi possível anexar o documento.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="manual-attachment-title">Título do documento *</Label>
          <Input
            id="manual-attachment-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Instruções internas de envio ao fornecedor"
            disabled={uploading}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-attachment-file">Arquivo (PDF, imagem ou planilha) *</Label>
          <Input
            id="manual-attachment-file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx,.csv,.txt,.md"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={uploading}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="manual-attachment-description">Descrição (opcional)</Label>
        <Input
          id="manual-attachment-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Para que serve este documento / a quem se aplica"
          disabled={uploading}
        />
      </div>
      <Button type="submit" disabled={uploading}>
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" /> Anexar documento
          </>
        )}
      </Button>
    </form>
  );
}