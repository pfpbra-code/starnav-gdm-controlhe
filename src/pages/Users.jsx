import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Users as UsersIcon, Plus, Search, Edit, Trash2, Loader2, UserPlus, Mail, History, Shield, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import UserActivityLog from '@/components/users/UserActivityLog';
import UserPermissions from '@/components/users/UserPermissions';

const roleLabels = {
  admin: "Administrador",
  coordinator: "Coordenador",
  services: "Serviços",
  maintenance: "Manutenção",
  operations: "Operações",
  vessel_user: "Embarcação",
  user: "Usuário"
};

const roleColors = {
  admin: "bg-red-100 text-red-800",
  coordinator: "bg-blue-100 text-blue-800",
  services: "bg-green-100 text-green-800",
  maintenance: "bg-amber-100 text-amber-800",
  operations: "bg-orange-100 text-orange-800",
  vessel_user: "bg-sky-100 text-sky-800",
  user: "bg-gray-100 text-gray-800"
};

export default function Users() {
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inviteData, setInviteData] = useState({ email: '', role: 'user' });
  const [editFormData, setEditFormData] = useState({
    role: '',
    department: '',
    status: 'active',
    assigned_vessels: []
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: currentUser?.role === 'admin'
  });

  const { data: vessels = [] } = useQuery({
    queryKey: ['vessels'],
    queryFn: () => base44.entities.Vessel.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário atualizado!');
      handleCloseEditDialog();
    },
    onError: () => toast.error('Erro ao atualizar usuário')
  });

  const [inviting, setInviting] = useState(false);
  const handleInvite = async () => {
    if (!inviteData.email) {
      toast.error('Informe o email');
      return;
    }

    setInviting(true);
    try {
      await base44.users.inviteUser(inviteData.email, inviteData.role);
      toast.success('Convite enviado com sucesso!');
      setShowInviteDialog(false);
      setInviteData({ email: '', role: 'user' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      toast.error('Erro ao enviar convite');
    } finally {
      setInviting(false);
    }
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setEditingUser(null);
    setEditFormData({
      role: '',
      department: '',
      status: 'active',
      assigned_vessels: []
    });
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditFormData({
      role: user.role || 'user',
      department: user.department || '',
      status: user.status || 'active',
      assigned_vessels: user.assigned_vessels || [],
      vessel_id: user.vessel_id || ''
    });
    setShowEditDialog(true);
  };

  const handleUpdateUser = (e) => {
    e.preventDefault();
    updateMutation.mutate({ id: editingUser.id, data: editFormData });
  };

  const handleSavePermissions = (permissions) => {
    updateMutation.mutate({
      id: editingUser.id,
      data: { permissions }
    });
    setShowPermissionsDialog(false);
  };

  const handleSuspendUser = (user) => {
    updateMutation.mutate({
      id: user.id,
      data: { status: 'suspended' }
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (user.status || 'active') === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <UsersIcon className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Acesso restrito a administradores</p>
        </CardContent>
      </Card>
    );
  }

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
          <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
          <p className="text-slate-500 mt-1">{filteredUsers.length} usuários cadastrados</p>
        </div>
        <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Convidar Usuário
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Perfis</SelectItem>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Usuário</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Permissões</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => {
              const initials = user.full_name
                ?.split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || 'U';

              return (
                <TableRow key={user.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-slate-100 text-slate-600">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role] || roleColors.user}>
                      {roleLabels[user.role] || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.department ? (
                      <span className="capitalize">{user.department}</span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.status || 'active'} />
                  </TableCell>
                  <TableCell>
                    {user.permissions?.length > 0 ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        +{user.permissions.length}
                      </Badge>
                    ) : (
                      <span className="text-slate-400 text-sm">Padrão</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setEditingUser(user);
                          setShowActivityDialog(true);
                        }}
                        title="Histórico"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setEditingUser(user);
                          setShowPermissionsDialog(true);
                        }}
                        title="Permissões"
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEdit(user)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {(user.status === 'active' || !user.status) && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSuspendUser(user)}
                          className="text-orange-600 hover:text-orange-700"
                          title="Suspender"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <UsersIcon className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500">Nenhum usuário encontrado</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Usuário</DialogTitle>
            <DialogDescription>
              Envie um convite por email para adicionar um novo usuário ao sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil Inicial</Label>
              <Select
                value={inviteData.role}
                onValueChange={(value) => setInviteData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="coordinator">Coordenador</SelectItem>
                  <SelectItem value="services">Serviços</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="operations">Operações</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={handleInvite}
              disabled={inviting}
            >
              {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Mail className="h-4 w-4 mr-2" />
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as permissões e dados do usuário.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser}>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Usuário</p>
                <p className="font-medium">{editingUser?.full_name || editingUser?.email}</p>
                <p className="text-sm text-slate-500">{editingUser?.email}</p>
              </div>

              <div className="space-y-2">
                <Label>Perfil *</Label>
                <Select
                  value={editFormData.role}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select
                  value={editFormData.department}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="services">Serviços</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                    <SelectItem value="coordination">Coordenação</SelectItem>
                    <SelectItem value="admin">Administração</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editFormData.role === 'coordinator' && (
                <div className="space-y-2">
                  <Label>Embarcações Atribuídas</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {vessels.map((vessel) => (
                      <label key={vessel.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editFormData.assigned_vessels?.includes(vessel.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditFormData(prev => ({
                                ...prev,
                                assigned_vessels: [...(prev.assigned_vessels || []), vessel.id]
                              }));
                            } else {
                              setEditFormData(prev => ({
                                ...prev,
                                assigned_vessels: prev.assigned_vessels?.filter(id => id !== vessel.id) || []
                              }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{vessel.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {editFormData.role === 'vessel_user' && (
                <div className="space-y-2">
                  <Label>Embarcação</Label>
                  <Select
                    value={editFormData.vessel_id}
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, vessel_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a embarcação" />
                    </SelectTrigger>
                    <SelectContent>
                      {vessels.map((vessel) => (
                        <SelectItem key={vessel.id} value={vessel.id}>
                          {vessel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-sky-600 hover:bg-sky-700"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Atualizar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activity Log Dialog */}
      <UserActivityLog
        user={editingUser}
        open={showActivityDialog}
        onOpenChange={setShowActivityDialog}
      />

      {/* Permissions Dialog */}
      <UserPermissions
        user={editingUser}
        open={showPermissionsDialog}
        onOpenChange={setShowPermissionsDialog}
        onSave={handleSavePermissions}
        isSaving={updateMutation.isPending}
      />
    </div>
  );
}