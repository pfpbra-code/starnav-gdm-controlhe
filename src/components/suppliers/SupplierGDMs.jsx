import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Package, Calendar, Ship, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { createPageUrl } from '@/utils';

export default function SupplierGDMs({ supplier, open, onClose }) {
  const { data: gdms = [], isLoading } = useQuery({
    queryKey: ['supplierGdms', supplier?.id],
    queryFn: () => base44.entities.GDM.filter({ supplier_id: supplier?.id }, '-sent_to_supplier_date'),
    enabled: !!supplier?.id && open,
  });

  const sentGdms = gdms.filter(
    (g) => g.sent_to_supplier_date || g.status === 'sent_to_supplier' || g.status === 'awaiting_quote' || g.status === 'quote_analysis' || g.status === 'approved' || g.status === 'completed'
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-sky-600" />
            Equipamentos enviados — {supplier?.company_name}
          </DialogTitle>
          <DialogDescription>
            {sentGdms.length} equipamento(s) enviado(s) para este fornecedor
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
                  <TableHead className="text-right">Ação</TableHead>
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
                      <Link to={createPageUrl('GDMDetail') + `?id=${gdm.id}`}>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                          <FileText className="h-4 w-4" />
                        </Button>
                      </Link>
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