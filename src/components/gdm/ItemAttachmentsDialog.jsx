import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Paperclip } from 'lucide-react';
import { hasPermission } from '@/lib/permissions';
import { signedAttachmentUrl } from '@/lib/discardEvidence';
import {
  buildItemDocuments,
  documentTypeOptions,
  documentUserOptions,
  filterDocuments,
  groupDocuments,
} from '@/lib/itemDocuments';
import AttachmentFilters from './AttachmentFilters';
import AttachmentRow from './AttachmentRow';
import AttachmentViewer from './AttachmentViewer';

const EMPTY_FILTERS = { type: 'all', category: 'all', user: 'all', from: '', to: '' };

/**
 * Repositório único de documentos e anexos do item da GDM: todas as versões de
 * cotações, propostas, OC, comprovantes, certificados e evidências fotográficas
 * em um só lugar, com filtros por tipo, categoria, usuário e período.
 */
export default function ItemAttachmentsDialog({ item, gdm, user, open, onOpenChange }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [expandedTypes, setExpandedTypes] = useState({});
  const [viewer, setViewer] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['itemDocuments', item?.id],
    queryFn: async () => {
      const [photos, attachments, certifications] = await Promise.all([
        base44.entities.GDMPhoto.filter({ gdm_item_id: item.id }, '-taken_at').catch(() => []),
        base44.entities.GDMAttachment.filter({ gdm_item_id: item.id }, '-uploaded_at').catch(
          () => [],
        ),
        base44.entities.Certification.filter({ item_id: item.id }, '-created_date').catch(
          () => [],
        ),
      ]);
      return { photos, attachments, certifications };
    },
    enabled: open && !!item?.id,
  });

  const documents = useMemo(
    () =>
      buildItemDocuments({
        item: item || {},
        gdm: gdm || {},
        photos: data?.photos || [],
        attachments: data?.attachments || [],
        certifications: data?.certifications || [],
      }),
    [item, gdm, data],
  );

  const visible = useMemo(() => filterDocuments(documents, filters), [documents, filters]);
  const groups = useMemo(() => groupDocuments(visible), [visible]);
  const typeOptions = useMemo(() => documentTypeOptions(documents), [documents]);
  const userOptions = useMemo(() => documentUserOptions(documents), [documents]);

  const openDocument = async (doc) => {
    if (!doc.url && doc.fileUri) {
      const signed = await signedAttachmentUrl(doc.fileUri);
      setViewer({ ...doc, resolvedUrl: signed });
      return;
    }
    setViewer(doc);
  };

  if (!hasPermission(user, 'view_item_attachments')) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-sky-600" />
              Documentos e Anexos
            </DialogTitle>
            <DialogDescription>
              {item?.equipment_name} · GDM {gdm?.gdm_number || '—'} · Item{' '}
              {String(item?.item_number ?? '').padStart(2, '0')} — todos os arquivos do ciclo de
              vida do item, em qualquer etapa.
            </DialogDescription>
          </DialogHeader>

          <AttachmentFilters
            filters={filters}
            setFilters={setFilters}
            typeOptions={typeOptions}
            userOptions={userOptions}
          />

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {visible.length} de {documents.length} documento(s)
            </span>
            <Badge variant="outline">Somente leitura</Badge>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            </div>
          ) : documents.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Nenhum documento ou anexo registrado para este item.
            </p>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Nenhum documento corresponde aos filtros selecionados.
            </p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const previous = group.versions.slice(0, -1).reverse();
                const showPrevious = !!expandedTypes[group.type];
                return (
                  <div key={group.type} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {group.type}
                      </p>
                      {previous.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTypes((prev) => ({
                              ...prev,
                              [group.type]: !prev[group.type],
                            }))
                          }
                          className="text-xs text-sky-600 hover:underline"
                        >
                          {showPrevious
                            ? 'Ocultar versões anteriores'
                            : `Ver versões anteriores (${previous.length})`}
                        </button>
                      )}
                    </div>
                    <AttachmentRow doc={group.latest} onOpen={openDocument} />
                    {showPrevious && (
                      <div className="space-y-2 pl-4 border-l-2 border-slate-100">
                        {previous.map((doc) => (
                          <AttachmentRow key={doc.id} doc={doc} onOpen={openDocument} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-slate-400">
            Todas as versões são preservadas para auditoria — nenhum documento anterior é
            excluído.
          </p>
        </DialogContent>
      </Dialog>

      <AttachmentViewer
        doc={viewer}
        open={!!viewer}
        onOpenChange={(v) => !v && setViewer(null)}
      />
    </>
  );
}