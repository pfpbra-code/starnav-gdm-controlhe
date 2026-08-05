import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Package, Calendar, Ship, FileText, Upload, Loader2, Paperclip, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { buildHistoryEntry, snapshotCurrentQuote, STATUS_LABELS, STEP_NAMES } from '@/lib/gdmWorkflow';

export default function SupplierGDMs({ supplier, open, onClose }) {
  const queryClient = useQueryClient();
  const [uploadingId, setUploadingId] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: gdms = [], isLoading } = useQuery({
    queryKey: ['supplierGdms', supplier?.id],
    queryFn: () => base44.entities.GDM.filter({ supplier_id: supplier?.id }, '-sent_to_supplier_date'),
    enabled: !!supplier?.id && open,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GDM.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierGdms', supplier?.id] });
      queryClient.invalidateQueries({ queryKey: ['gdm'] });
    },
    onError: () => toast.error('Erro ao salvar proposta'),
  });

  const sentGdms = gdms.filter(
    (g) => g.sent_to_supplier_date || g.status === 'sent_to_supplier' || g.status === 'awaiting_quote' || g.status === 'quote_analysis' || g.status === 'approved' || g.status === 'completed'
  );

  const handleAttachProposal = async (gdm, file) => {
    if (!file) return;
    setUploadingId(gdm.id);
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const previousStatus = gdm.status;
      const newStatus = 'quote_analysis';
      // Preserve the previous proposal/quote if one already existed
      const quotesHistory = (gdm.commercial_proposal_url || gdm.quote_value)
        ? snapshotCurrentQuote(gdm, 'Substituída por nova proposta comercial anexada')
        : (gdm.quotes_history || []);
      const newHistory = [
        ...(gdm.history || []),
        buildHistoryEntry({
          action: 'commercial_proposal_attached',
          user,
          details: `Proposta comercial anexada por ${supplier?.company_name || 'fornecedor'}. Processo encaminhado à Manutenção.`,
          previousStatus,
          newStatus,
          stepName: STEP_NAMES.quote_attached,
          observation: 'Anexada via painel do fornecedor',
        }),
      ];
      await updateMutation.mutateAsync({
        id: gdm.id,
        data: {
          commercial_proposal_url: uploadRes.file_url,
          commercial_proposal_uploaded_at: new Date().toISOString(),
          commercial_proposal_uploaded_by: user?.email,
          quotes_history: quotesHistory,
          status: newStatus,
          history: newHistory,
        },
      });
      toast.success('Proposta anexada! Processo encaminhado à Manutenção.');
    } catch (err) {
      toast.error('Erro ao anexar proposta');
      console.error(err);
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-sky-600" />
            Equipamentos enviados — {supplier?.company_name}
          </DialogTitle>
          <DialogDescription>
            {sentGdms.length} equipamento(s) enviado(s) para este fornecedor. Selecione um equipamento para anexar a proposta comercial.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : sentGdms.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>GDM</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Embarcação</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Proposta Comercial</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentGdms.map((gdm) => (
                  <TableRow key={gdm.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-xs">
                      {gdm.gdm_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{gdm.equipment_name || '-'}</p>
                        {gdm.serial_number && (
                          <p className="text-xs text-slate-500">S/N: {gdm.serial_number}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Ship className="h-3.5 w-3.5 text-slate-400" />
                        {gdm.vessel_name || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {gdm.sent_to_supplier_date
                          ? format(new Date(gdm.sent_to_supplier_date), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={gdm.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        {gdm.commercial_proposal_url ? (
                          <a
                            href={gdm.commercial_proposal_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm">
                              <Paperclip className="h-4 w-4 mr-1" />
                              Ver proposta
                            </Button>
                          </a>
                        ) : null}
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.png"
                            className="hidden"
                            disabled={uploadingId === gdm.id}
                            onChange={(e) => {
                              const f = e.target.files[0];
                              if (f) handleAttachProposal(gdm, f);
                              e.target.value = '';
                            }}
                          />
                          <span className="inline-flex">
                            <Button
                              variant={gdm.commercial_proposal_url ? 'ghost' : 'default'}
                              size="sm"
                              className="bg-sky-600 hover:bg-sky-700"
                              disabled={uploadingId === gdm.id}
                              asChild
                            >
                              <span>
                                {uploadingId === gdm.id ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4 mr-1" />
                                )}
                                {gdm.commercial_proposal_url ? 'Trocar' : 'Anexar'}
                              </span>
                            </Button>
                          </span>
                        </label>
                        <Link to={createPageUrl('GDMDetail') + `?id=${gdm.id}`}>
                          <Button variant="ghost" size="sm" onClick={onClose}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">Nenhum equipamento enviado para este fornecedor</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}