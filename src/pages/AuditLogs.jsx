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
import { Badge } from "@/components/ui/badge";
import { History, Search, Filter, Calendar, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";

const actionLabels = {
  created: "Criado",
  updated: "Atualizado",
  deleted: "Removido",
  coordinator_approved: "Aprovado (Coord.)",
  coordinator_rejected: "Reprovado (Coord.)",
  sent_to_supplier: "Enviado ao Fornecedor",
  quote_received: "Cotação Recebida",
  maintenance_approved: "Aprovado (Manut.)",
  maintenance_rejected: "Reprovado (Manut.)",
  discount_requested: "Desconto Solicitado",
  completed: "Concluído",
  login: "Login",
  logout: "Logout"
};

const actionColors = {
  created: "bg-blue-100 text-blue-800",
  updated: "bg-amber-100 text-amber-800",
  deleted: "bg-red-100 text-red-800",
  coordinator_approved: "bg-green-100 text-green-800",
  coordinator_rejected: "bg-red-100 text-red-800",
  sent_to_supplier: "bg-purple-100 text-purple-800",
  quote_received: "bg-cyan-100 text-cyan-800",
  maintenance_approved: "bg-green-100 text-green-800",
  maintenance_rejected: "bg-red-100 text-red-800",
  discount_requested: "bg-orange-100 text-orange-800",
  completed: "bg-slate-100 text-slate-800",
  login: "bg-sky-100 text-sky-800",
  logout: "bg-gray-100 text-gray-800"
};

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 200),
    enabled: currentUser?.role === 'admin'
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesEntity && matchesAction;
  });

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <History className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Acesso restrito a administradores</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 mb-3" />
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
        <h1 className="text-2xl font-bold text-slate-900">Logs de Auditoria</h1>
        <p className="text-slate-500 mt-1">{filteredLogs.length} registros encontrados</p>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por usuário, ID ou detalhes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="GDM">GDM</SelectItem>
                <SelectItem value="Vessel">Embarcação</SelectItem>
                <SelectItem value="Equipment">Equipamento</SelectItem>
                <SelectItem value="Supplier">Fornecedor</SelectItem>
                <SelectItem value="User">Usuário</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(actionLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
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
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id} className="hover:bg-slate-50">
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {log.created_date
                      ? format(new Date(log.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm">{log.user_email}</p>
                      {log.user_role && (
                        <p className="text-xs text-slate-500 capitalize">{log.user_role}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={actionColors[log.action] || "bg-gray-100 text-gray-800"}>
                    {actionLabels[log.action] || log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm">{log.entity_type}</p>
                      {log.entity_id && (
                        <p className="text-xs text-slate-500 font-mono">{log.entity_id.slice(0, 8)}...</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="text-sm text-slate-600 truncate" title={log.details}>
                    {log.details || '-'}
                  </p>
                </TableCell>
              </TableRow>
            ))}
            {filteredLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <History className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500">Nenhum registro encontrado</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}