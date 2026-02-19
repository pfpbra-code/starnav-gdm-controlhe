import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ClipboardList,
  Search,
  Send,
  Eye,
  Building2,
  FileText,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";

export default function ServicesTreatments() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [selectedGDM, setSelectedGDM] = useState(null);
  const [sendData, setSendData] = useState({
    supplier_id: '',
    invoice_number: ''
  });
  const [serviceNotes, setServiceNotes] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: gdms = [], isLoading } = useQuery({
    queryKey: ['gdms'],
    queryFn: () => base44.entities.GDM.list('-created_date', 100),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.filter({ status: 'active' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GDM.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
      toast.success('GDM atualizada!');
      setShowSendDialog(false);
      setShowNotesDialog(false);
    },
    onError: () => toast.error('Erro ao atualizar')
  });

  // Filter GDMs that are pending services or require action
  const serviceGDMs = gdms.filter(gdm => 
    ['pending_services', 'approved', 'awaiting_quote', 'quote_analysis'].includes(gdm.status) ||
    (gdm.maintenance_decision === 'discount_requested' && gdm.status === 'awaiting_quote')
  );

  const filteredGDMs = serviceGDMs.filter(gdm => {
    const matchesSearch = gdm.gdm_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gdm.vessel_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gdm.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || gdm.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSendToSupplier = () => {
    if (!sendData.supplier_id) {
      toast.error('Selecione um fornecedor');
      return;
    }

    const supplier = suppliers.find(s => s.id === sendData.supplier_id);
    const history = [
      ...(selectedGDM.history || []),
      {
        action: 'sent_to_supplier',
        user: user?.email,
        timestamp: new Date().toISOString(),
        details: `Material enviado para ${supplier?.company_name}. NF: ${sendData.invoice_number || 'N/A'}`
      }
    ];

    updateMutation.mutate({
      id: selectedGDM.id,
      data: {
        status: 'awaiting_quote',
        supplier_id: sendData.supplier_id,
        supplier_name: supplier?.company_name,
        invoice_number: sendData.invoice_number,
        sent_to_supplier_date: new Date().toISOString(),
        sent_by: user?.email,
        history
      }
    });
  };

  const handleAddNotes = () => {
    const history = [
      ...(selectedGDM.history || []),
      {
        action: 'service_note_added',
        user: user?.email,
        timestamp: new Date().toISOString(),
        details: serviceNotes
      }
    ];

    updateMutation.mutate({
      id: selectedGDM.id,
      data: {
        service_notes: (selectedGDM.service_notes || '') + '\n' + `[${format(new Date(), 'dd/MM/yyyy HH:mm')}] ${serviceNotes}`,
        history
      }
    });
    setServiceNotes('');
  };

  const canServicesAct = user?.role === 'services' || user?.role === 'admin';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 mb-4" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tratativas</h1>
        <p className="text-slate-500 mt-1">Gerencie o envio de materiais e comunicação com fornecedores</p>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por número, embarcação ou equipamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending_services">Aguardando Envio</SelectItem>
                <SelectItem value="awaiting_quote">Aguardando Cotação</SelectItem>
                <SelectItem value="quote_analysis">Em Análise</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>GDM</TableHead>
              <TableHead>Embarcação</TableHead>
              <TableHead>Equipamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGDMs.map((gdm) => (
              <TableRow key={gdm.id} className="hover:bg-slate-50">
                <TableCell className="font-medium">{gdm.gdm_number}</TableCell>
                <TableCell>{gdm.vessel_name || '-'}</TableCell>
                <TableCell>{gdm.equipment_name || '-'}</TableCell>
                <TableCell>
                  <StatusBadge status={gdm.status} />
                </TableCell>
                <TableCell>
                  {gdm.supplier_name ? (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      {gdm.supplier_name}
                    </div>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {gdm.status === 'pending_services' && canServicesAct && (
                      <Button
                        size="sm"
                        className="bg-sky-600 hover:bg-sky-700"
                        onClick={() => {
                          setSelectedGDM(gdm);
                          setSendData({ supplier_id: '', invoice_number: '' });
                          setShowSendDialog(true);
                        }}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Enviar
                      </Button>
                    )}
                    {gdm.status !== 'pending_services' && canServicesAct && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedGDM(gdm);
                          setServiceNotes('');
                          setShowNotesDialog(true);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Registrar
                      </Button>
                    )}
                    <Link to={createPageUrl(`GDMDetail?id=${gdm.id}`)}>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredGDMs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <ClipboardList className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500">Nenhuma tratativa pendente</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Send to Supplier Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar ao Fornecedor</DialogTitle>
            <DialogDescription>
              GDM: {selectedGDM?.gdm_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Equipamento</p>
              <p className="font-medium">{selectedGDM?.equipment_name}</p>
              <p className="text-sm text-slate-500 mt-2">Embarcação</p>
              <p className="font-medium">{selectedGDM?.vessel_name}</p>
            </div>

            <div className="space-y-2">
              <Label>Fornecedor *</Label>
              <Select
                value={sendData.supplier_id}
                onValueChange={(value) => setSendData(prev => ({ ...prev, supplier_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Número da Nota Fiscal</Label>
              <Input
                value={sendData.invoice_number}
                onChange={(e) => setSendData(prev => ({ ...prev, invoice_number: e.target.value }))}
                placeholder="Ex: NF-12345"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={handleSendToSupplier}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Tratativa</DialogTitle>
            <DialogDescription>
              GDM: {selectedGDM?.gdm_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedGDM?.service_notes && (
              <div className="p-3 bg-slate-50 rounded-lg max-h-32 overflow-y-auto">
                <p className="text-sm text-slate-500 mb-1">Histórico de tratativas:</p>
                <pre className="text-xs whitespace-pre-wrap">{selectedGDM.service_notes}</pre>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nova tratativa</Label>
              <Textarea
                value={serviceNotes}
                onChange={(e) => setServiceNotes(e.target.value)}
                placeholder="Descreva a tratativa realizada..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={handleAddNotes}
              disabled={updateMutation.isPending || !serviceNotes}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}