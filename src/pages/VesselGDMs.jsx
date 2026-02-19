import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search,
  Plus,
  Eye,
  FileText,
  Package
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import GDMCard from '@/components/gdm/GDMCard';

export default function VesselGDMs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: gdms = [], isLoading } = useQuery({
    queryKey: ['vesselGDMs', user?.vessel_id],
    queryFn: () => base44.entities.GDM.filter({ vessel_id: user?.vessel_id }),
    enabled: !!user?.vessel_id,
  });

  const filteredGDMs = gdms.filter(gdm => {
    const matchesSearch = gdm.gdm_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gdm.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || gdm.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minhas GDMs</h1>
          <p className="text-slate-500 mt-1">{filteredGDMs.length} guias de desembarque</p>
        </div>
        <Link to={createPageUrl('CreateGDM')}>
          <Button className="bg-sky-600 hover:bg-sky-700">
            <Plus className="h-4 w-4 mr-2" />
            Nova GDM
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por número ou equipamento..."
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
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending_coordinator">Aguardando Coordenador</SelectItem>
                <SelectItem value="pending_services">Aguardando Serviços</SelectItem>
                <SelectItem value="sent_to_supplier">Enviado ao Fornecedor</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Reprovado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
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
              <TableHead>Nº GDM</TableHead>
              <TableHead>Equipamento</TableHead>
              <TableHead>Data Desembarque</TableHead>
              <TableHead>Tratativa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGDMs.map((gdm) => (
              <TableRow key={gdm.id} className="hover:bg-slate-50">
                <TableCell className="font-medium">{gdm.gdm_number}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-slate-400" />
                    {gdm.equipment_name || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  {gdm.disembark_date
                    ? format(new Date(gdm.disembark_date), "dd/MM/yyyy", { locale: ptBR })
                    : '-'}
                </TableCell>
                <TableCell>
                  <StatusBadge status={gdm.treatment} type="treatment" />
                </TableCell>
                <TableCell>
                  <StatusBadge status={gdm.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Link to={createPageUrl(`GDMDetail?id=${gdm.id}`)}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {filteredGDMs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <FileText className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500">Nenhuma GDM encontrada</p>
                  <Link to={createPageUrl('CreateGDM')}>
                    <Button className="mt-4 bg-sky-600 hover:bg-sky-700" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar GDM
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}