import React from 'react';
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
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, XCircle, Clock, Smartphone } from 'lucide-react';

export default function UserActivityLog({ user, open, onOpenChange }) {
  const loginHistory = user?.login_history || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Atividades</DialogTitle>
          <DialogDescription>
            Usuário: {user?.full_name || user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Total de Logins</p>
              <p className="text-2xl font-bold">{loginHistory.length}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">Bem-sucedidos</p>
              <p className="text-2xl font-bold text-green-900">
                {loginHistory.filter(l => l.success).length}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">Falhas</p>
              <p className="text-2xl font-bold text-red-900">
                {loginHistory.filter(l => !l.success).length}
              </p>
            </div>
          </div>

          {/* Login History Table */}
          <div>
            <h3 className="font-semibold mb-3">Histórico de Login</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Dispositivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginHistory.slice(0, 20).map((login, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {login.timestamp
                            ? format(new Date(login.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
                            : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {login.success ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sucesso
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Falha
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {login.ip_address || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Smartphone className="h-4 w-4 text-slate-400" />
                          <span className="truncate max-w-[200px]" title={login.user_agent}>
                            {login.user_agent || 'Desconhecido'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {loginHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                        Nenhum login registrado ainda
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Last Login Info */}
          {user?.last_login && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">Último Login</p>
              <p className="text-blue-900">
                {format(new Date(user.last_login), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}