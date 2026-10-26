import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, ExternalLink, FileText, Loader2, Paperclip, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ManualUploadForm from '@/components/manual/ManualUploadForm';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Aba Documentos do manual: anexos do ADM, visualização por link assinado. */
export default function ManualAttachments({ user }) {
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [openingId, setOpeningId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['manualAttachments'],
    queryFn: () => base44.entities.ManualAttachment.list({ sort: '-created_date', limit: 200 }),
  });
  const attachments = data?.items || [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['manualAttachments'] });

  const handleOpen = async (attachment) => {
    setOpeningId(attachment.id);
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: attachment.file_uri,
        expires_in: 300,
      });
      window.open(signed_url, '_blank');
    } catch (error) {
      toast.error('Não foi possível abrir o documento.');
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await base44.entities.ManualAttachment.delete(deleteTarget.id);
      toast.success('Documento removido do manual.');
      setDeleteTarget(null);
      refresh();
    } catch (error) {
      toast.error('Não foi possível remover o documento.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Anexar documento complementar</CardTitle>
            <CardDescription>
              Inclua procedimentos internos, normas e instruções complementares. Os arquivos ficam
              armazenados de forma privada (stored privately) e são abertos por link temporário assinado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ManualUploadForm userEmail={user?.email} onUploaded={refresh} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documentos do manual</CardTitle>
          <CardDescription>
            {attachments.length === 0
              ? 'Nenhum documento complementar anexado até o momento.'
              : `${attachments.length} documento(s) complementar(es) anexado(s) pelo ADM.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
            </div>
          ) : attachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Paperclip className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                O conteúdo do manual está nas abas por setor e por processo.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {attachments.map((attachment) => (
                <li key={attachment.id} className="flex items-center gap-3 py-3">
                  <FileText className="h-5 w-5 flex-shrink-0 text-sky-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{attachment.title}</p>
                    {attachment.description && (
                      <p className="truncate text-xs text-slate-500">{attachment.description}</p>
                    )}
                    <p className="truncate text-xs text-slate-400">
                      {attachment.file_name}
                      {attachment.file_size ? ` · ${formatBytes(attachment.file_size)}` : ''}
                      {attachment.uploaded_at
                        ? ` · Anexado em ${moment(attachment.uploaded_at).format('DD/MM/YYYY HH:mm')}`
                        : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpen(attachment)}
                    disabled={openingId === attachment.id}
                  >
                    {openingId === attachment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Abrir
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(attachment)}
                      aria-label="Remover documento"
                    >
                      <Trash2 className="h-4 w-4 text-slate-400" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento do manual?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" deixará de ser exibido na aba Documentos. A ação não afeta o
              conteúdo fixo do manual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}