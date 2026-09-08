import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import {
  FileText,
  Ship,
  Package,
  Calendar,
  Hash,
  Upload,
  X,
  Loader2,
  CheckCircle,
  Camera
} from 'lucide-react';
import { toast } from 'sonner';
import { buildHistoryEntry, nextGdmNumberForVessel } from '@/lib/gdmWorkflow';
import EquipmentAutocomplete from '@/components/gdm/EquipmentAutocomplete';
import { ITEM_DESTINATION_OPTIONS, ITEM_DESTINATION_LABELS } from '@/lib/gdmItems';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';

export default function CreateGDM() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    vessel_id: '',
    disembark_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    photos: []
  });

  // Itens da GDM: cada equipamento tem quantidade, série, OS e destino próprios.
  const [items, setItems] = useState([]);
  const [itemDraft, setItemDraft] = useState({
    equipment_id: '',
    equipment_name: '',
    equipment_code: '',
    quantity: 1,
    serial_number: '',
    os_number: '',
    destination: 'repair',
  });
  const [applyDestinationToAll, setApplyDestinationToAll] = useState(false);

  const addItem = () => {
    if (!itemDraft.equipment_id || !itemDraft.equipment_name) {
      toast.error('Selecione o equipamento do item');
      return;
    }
    const qty = Number(itemDraft.quantity) || 1;
    if (qty <= 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }
    setItems((prev) => {
      const next = [...prev, { ...itemDraft, quantity: qty, key: Date.now() + Math.random() }];
      return applyDestinationToAll
        ? next.map((it) => ({ ...it, destination: itemDraft.destination }))
        : next;
    });
    setItemDraft((prev) => ({
      equipment_id: '',
      equipment_name: '',
      equipment_code: '',
      quantity: 1,
      serial_number: '',
      os_number: '',
      destination: prev.destination,
    }));
  };

  const removeItem = (key) => setItems((prev) => prev.filter((i) => i.key !== key));

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: vessels = [] } = useQuery({
    queryKey: ['vessels'],
    queryFn: () => base44.entities.Vessel.filter({ status: 'active' }),
  });

  // Filter vessels based on user role
  const availableVessels = React.useMemo(() => {
    const vesselId = user?.vessel_id ?? user?.data?.vessel_id;
    const assigned = user?.assigned_vessels ?? user?.data?.assigned_vessels;
    if (user?.role === 'vessel_user' && vesselId) {
      return vessels.filter(v => v.id === vesselId);
    }
    if (user?.role === 'coordinator' && assigned) {
      return vessels.filter(v => assigned.includes(v.id));
    }
    return vessels;
  }, [vessels, user]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const vessel = vessels.find(v => v.id === data.vessel_id);
      const first = items[0];

      // Numeração sequencial por embarcação, reiniciando a cada ano (GDM-NNN/YYYY).
      const year = new Date().getFullYear();
      const existingForVessel = await base44.entities.GDM.filter({ vessel_id: data.vessel_id });
      const gdmNumber = nextGdmNumberForVessel(existingForVessel, year);

      const gdmData = {
        ...data,
        gdm_number: gdmNumber,
        vessel_name: vessel?.name || '',
        vessel_code: vessel?.code || '',
        // Compatibilidade com telas e relatórios que ainda leem o equipamento principal.
        equipment_id: first?.equipment_id || '',
        equipment_name: items.length > 1
          ? `${first?.equipment_name} (+${items.length - 1} item(ns))`
          : (first?.equipment_name || ''),
        serial_number: first?.serial_number || '',
        treatment: first?.destination === 'certification' ? 'repair' : (first?.destination || 'repair'),
        status: 'pending_coordinator',
        history: [buildHistoryEntry({
          action: 'created',
          user,
          details: `GDM criada pela embarcação ${vessel?.name} com ${items.length} item(ns)`,
          previousStatus: null,
          newStatus: 'pending_coordinator',
          stepName: 'Emissão da GDM (Embarcação)',
          observation: data.description || '',
        })]
      };

      const created = await base44.entities.GDM.create(gdmData);

      await base44.entities.GDMItem.bulkCreate(
        items.map((it, index) => ({
          gdm_id: created.id,
          vessel_id: created.vessel_id,
          vessel_name: created.vessel_name,
          item_number: index + 1,
          equipment_id: it.equipment_id,
          equipment_code: it.equipment_code || null,
          equipment_name: it.equipment_name,
          serial_number: it.serial_number || null,
          quantity: Number(it.quantity) || 1,
          os_number: it.os_number || null,
          destination: it.destination,
          status: 'pending_coordinator',
        }))
      );

      return created;
    },
    onSuccess: async (createdGdm) => {
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
      toast.success('GDM criada com sucesso!');

      // Notify the coordinator assigned to the vessel
      try {
        const vessel = vessels.find((v) => v.id === createdGdm.vessel_id);
        if (vessel?.coordinator_id) {
          const users = await base44.entities.User.list();
          const coordinator = users.find((u) => u.id === vessel.coordinator_id);
          if (coordinator?.email) {
            await base44.integrations.Core.SendEmail({
              to: coordinator.email,
              subject: `Nova GDM criada — ${createdGdm.gdm_number}`,
              body: `Uma nova Guia de Desembarque de Material foi criada e aguarda sua aprovação.\n\nGDM: ${createdGdm.gdm_number}\nEquipamento: ${createdGdm.equipment_name || 'Não informado'}\nEmbarcação: ${createdGdm.vessel_name || 'Não informada'}\n\nAcesse a plataforma para revisar e aprovar a GDM.`,
            });
          }
        }
      } catch (emailError) {
        console.error('Falha ao notificar coordenador por e-mail:', emailError);
      }

      navigate(createPageUrl('GDMList'));
    },
    onError: (error) => {
      toast.error('Erro ao criar GDM');
      console.error(error);
    }
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const result = await base44.integrations.Core.UploadFile({ file });
        return result.file_url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...uploadedUrls]
      }));
      toast.success(`${files.length} foto(s) enviada(s)`);
    } catch (error) {
      toast.error('Erro ao enviar fotos');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.vessel_id) {
      toast.error('Selecione a embarcação');
      return;
    }
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item à GDM');
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <CardTitle>Nova Guia de Desembarque</CardTitle>
              <CardDescription>Preencha os dados do material a ser desembarcado</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Vessel Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Ship className="h-4 w-4 text-slate-500" />
                Embarcação *
              </Label>
              <Select
                value={formData.vessel_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vessel_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a embarcação" />
                </SelectTrigger>
                <SelectContent>
                  {availableVessels.map((vessel) => (
                    <SelectItem key={vessel.id} value={vessel.id}>
                      {vessel.name} ({vessel.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data de desembarque */}
            <div className="space-y-2 md:max-w-xs">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                Data de Desembarque *
              </Label>
              <Input
                type="date"
                value={formData.disembark_date}
                onChange={(e) => setFormData(prev => ({ ...prev, disembark_date: e.target.value }))}
              />
            </div>

            {/* Itens da GDM */}
            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Itens desembarcados *</Label>
                <span className="text-sm text-slate-500">{items.length} item(ns)</span>
              </div>

              <EquipmentAutocomplete
                value={itemDraft.equipment_id}
                onChange={(id, equip) =>
                  setItemDraft(prev => ({
                    ...prev,
                    equipment_id: id,
                    equipment_name: equip?.name || '',
                    equipment_code: equip?.code || '',
                  }))
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={itemDraft.quantity}
                    onChange={(e) => setItemDraft(prev => ({ ...prev, quantity: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-slate-500" />
                    Número de Série
                  </Label>
                  <Input
                    value={itemDraft.serial_number}
                    onChange={(e) => setItemDraft(prev => ({ ...prev, serial_number: e.target.value }))}
                    placeholder="Ex: SN-12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label>OS</Label>
                  <Input
                    value={itemDraft.os_number}
                    onChange={(e) => setItemDraft(prev => ({ ...prev, os_number: e.target.value }))}
                    placeholder="Ex: OS-2026-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Destino *</Label>
                  <Select
                    value={itemDraft.destination}
                    onValueChange={(value) => setItemDraft(prev => ({ ...prev, destination: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_DESTINATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={applyDestinationToAll}
                    onChange={(e) => {
                      setApplyDestinationToAll(e.target.checked);
                      if (e.target.checked) {
                        setItems(prev => prev.map(it => ({ ...it, destination: itemDraft.destination })));
                      }
                    }}
                  />
                  Aplicar o mesmo destino a todos os itens
                </label>
                <Button type="button" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar item
                </Button>
              </div>

              {items.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Equipamento</TableHead>
                        <TableHead>Qtd.</TableHead>
                        <TableHead>Série</TableHead>
                        <TableHead>OS</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it, index) => (
                        <TableRow key={it.key}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <span className="font-medium">{it.equipment_name}</span>
                            {it.equipment_code && (
                              <span className="text-slate-400"> ({it.equipment_code})</span>
                            )}
                          </TableCell>
                          <TableCell>{it.quantity}</TableCell>
                          <TableCell>{it.serial_number || '—'}</TableCell>
                          <TableCell>{it.os_number || '—'}</TableCell>
                          <TableCell>{ITEM_DESTINATION_LABELS[it.destination]}</TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => removeItem(it.key)}
                              className="text-red-500 hover:text-red-700"
                              aria-label="Remover item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição / Motivo</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o problema ou motivo do desembarque..."
                rows={4}
              />
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-slate-500" />
                Fotos
              </Label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6">
                {formData.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {formData.photos.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-center">
                  <input
                    type="file"
                    id="photos"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="photos"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                    {uploading ? 'Enviando...' : 'Adicionar fotos'}
                  </label>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(createPageUrl('GDMList'))}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 bg-sky-600 hover:bg-sky-700"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Criar GDM
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}