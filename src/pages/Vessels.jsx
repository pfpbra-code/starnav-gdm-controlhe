import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Ship, Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";

export default function Vessels() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingVessel, setEditingVessel] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: '',
    coordinator_id: '',
    responsible_user_id: '',
    status: 'active',
    login_password: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: vessels = [], isLoading } = useQuery({
    queryKey: ['vessels'],
    queryFn: () => base44.entities.Vessel.list('-created_date'),
  });

  const { data: coordinators = [] } = useQuery({
    queryKey: ['coordinators'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'coordinator');
    },
  });

  const { data: vesselUsers = [] } = useQuery({
    queryKey: ['vesselUsers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'vessel_user');
    },
    enabled: user?.role === 'admin',
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vessel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessels'] });
      toast.success('Embarcação criada com sucesso!');
      handleCloseDialog();
    },
    onError: () => toast.error('Erro ao criar embarcação')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vessel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessels'] });
      toast.success('Embarcação atualizada!');
      handleCloseDialog();
    },
    onError: () => toast.error('Erro ao atualizar embarcação')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vessel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessels'] });
      toast.success('Embarcação removida!');
    },
    onError: () => toast.error('Erro ao remover embarcação')
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setPhotoFile(null);
    setEditingVessel(null);
    setFormData({
      name: '',
      code: '',
      type: '',
      coordinator_id: '',
      status: 'active',
      login_password: ''
    });
  };

  const handleEdit = (vessel) => {
    setEditingVessel(vessel);
    setFormData({
      name: vessel.name || '',
      code: vessel.code || '',
      type: vessel.type || '',
      coordinator_id: vessel.coordinator_id || '',
      responsible_user_id: vessel.responsible_user_id || '',
      status: vessel.status || 'active',
      login_password: vessel.login_password || ''
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...formData };
    const existingId = editingVessel?.id;
    const responsibleId = formData.responsible_user_id;
    const coordinatorId = formData.coordinator_id;
    if (photoFile) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: photoFile });
        data.photo_url = file_url;
      } catch {
        toast.error('Erro ao enviar a foto da embarcação');
        return;
      }
    }
    const responsible = vesselUsers.find((u) => u.id === responsibleId);
    data.responsible_email = responsible?.email || '';
    delete data.responsible_user_id;

    try {
      const saved = editingVessel
        ? await updateMutation.mutateAsync({ id: editingVessel.id, data })
        : await createMutation.mutateAsync(data);
      const vesselId = saved?.id || existingId;
      if (isAdmin && vesselId) {
        // Vincula o usuário responsável e o coordenador: a GDM da embarcação é
        // encaminhada automaticamente ao coordenador com acesso garantido.
        try {
          if (responsibleId) {
            await base44.entities.User.update(responsibleId, { vessel_id: vesselId });
          }
          if (coordinatorId) {
            const coord = coordinators.find((c) => c.id === coordinatorId);
            const assigned = (coord?.assigned_vessels ?? coord?.data?.assigned_vessels) || [];
            if (coord && !assigned.includes(vesselId)) {
              await base44.entities.User.update(coord.id, {
                assigned_vessels: [...assigned, vesselId],
              });
            }
          }
          queryClient.invalidateQueries({ queryKey: ['users'] });
          queryClient.invalidateQueries({ queryKey: ['coordinators'] });
          queryClient.invalidateQueries({ queryKey: ['vesselUsers'] });
        } catch {
          toast.error('Embarcação salva, mas houve erro ao vincular os usuários responsáveis');
        }
      }
    } catch {
      // Erros já são exibidos pelas mutations
    }
  };

  const filteredVessels = vessels.filter(vessel =>
    vessel.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vessel.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = user?.role === 'admin';

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
          <h1 className="text-2xl font-bold text-slate-900">Embarcações</h1>
          <p className="text-slate-500 mt-1">{filteredVessels.length} embarcações cadastradas</p>
        </div>
        {isAdmin && (
          <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Embarcação
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Coordenador</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVessels.map((vessel) => {
              const coordinator = coordinators.find(c => c.id === vessel.coordinator_id);
              return (
                <TableRow key={vessel.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-14 rounded-lg bg-sky-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {vessel.photo_url ? (
                          <img
                            src={vessel.photo_url}
                            alt={vessel.name}
                            className="h-10 w-14 object-cover"
                          />
                        ) : (
                          <Ship className="h-4 w-4 text-sky-600" />
                        )}
                      </div>
                      <span className="font-medium">{vessel.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{vessel.code}</TableCell>
                  <TableCell>{vessel.type || '-'}</TableCell>
                  <TableCell>{coordinator?.full_name || '-'}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{vessel.responsible_email || '-'}</TableCell>
                  <TableCell>
                    <StatusBadge status={vessel.status} />
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(vessel)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(vessel.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {filteredVessels.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="h-32 text-center">
                  <Ship className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500">Nenhuma embarcação encontrada</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVessel ? 'Editar Embarcação' : 'Nova Embarcação'}</DialogTitle>
            <DialogDescription>
              {editingVessel ? 'Atualize os dados da embarcação' : 'Preencha os dados da nova embarcação'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome da embarcação"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Ex: PSV-001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PSV">PSV</SelectItem>
                      <SelectItem value="AHTS">AHTS</SelectItem>
                      <SelectItem value="RSV">RSV</SelectItem>
                      <SelectItem value="OSRV">OSRV</SelectItem>
                      <SelectItem value="FSV">FSV</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Coordenador Responsável</Label>
                <Select
                  value={formData.coordinator_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, coordinator_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o coordenador" />
                  </SelectTrigger>
                  <SelectContent>
                    {coordinators.map((coord) => (
                      <SelectItem key={coord.id} value={coord.id}>
                        {coord.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Usuário Responsável (Embarcação)</Label>
                {isAdmin ? (
                  <Select
                    value={formData.responsible_user_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, responsible_user_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o usuário da embarcação" />
                    </SelectTrigger>
                    <SelectContent>
                      {vesselUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name || u.email} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={editingVessel?.responsible_email || ''}
                    disabled
                    placeholder="Sem responsável vinculado"
                  />
                )}
                <p className="text-xs text-slate-500">
                  E-mail de acesso do responsável. O login/senha da embarcação é definido no
                  campo "Senha de Acesso" e o vínculo concede acesso individual à embarcação.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Foto da Embarcação</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                />
                {editingVessel?.photo_url && (
                  <img
                    src={editingVessel.photo_url}
                    alt={editingVessel.name}
                    className="mt-2 h-28 w-full object-cover rounded-lg border border-slate-200"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Senha de Acesso</Label>
                <Input
                  type="password"
                  value={formData.login_password}
                  onChange={(e) => setFormData(prev => ({ ...prev, login_password: e.target.value }))}
                  placeholder="Senha para login da embarcação"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="maintenance">Em Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-sky-600 hover:bg-sky-700"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingVessel ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}