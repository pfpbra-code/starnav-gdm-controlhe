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

export default function CreateGDM() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    vessel_id: '',
    equipment_id: '',
    serial_number: '',
    disembark_date: format(new Date(), 'yyyy-MM-dd'),
    treatment: '',
    description: '',
    photos: []
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: vessels = [] } = useQuery({
    queryKey: ['vessels'],
    queryFn: () => base44.entities.Vessel.filter({ status: 'active' }),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.filter({ status: 'active' }),
  });

  // Filter vessels based on user role
  const availableVessels = React.useMemo(() => {
    if (user?.role === 'vessel_user' && user?.vessel_id) {
      return vessels.filter(v => v.id === user.vessel_id);
    }
    if (user?.role === 'coordinator' && user?.assigned_vessels) {
      return vessels.filter(v => user.assigned_vessels.includes(v.id));
    }
    return vessels;
  }, [vessels, user]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const vessel = vessels.find(v => v.id === data.vessel_id);
      const equip = equipment.find(e => e.id === data.equipment_id);
      
      // Generate GDM number
      const gdmNumber = `GDM-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      const gdmData = {
        ...data,
        gdm_number: gdmNumber,
        vessel_name: vessel?.name || '',
        equipment_name: equip?.name || '',
        status: 'pending_coordinator',
        history: [{
          action: 'created',
          user: user?.email,
          timestamp: new Date().toISOString(),
          details: `GDM criada pela embarcação ${vessel?.name}`
        }]
      };

      return await base44.entities.GDM.create(gdmData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gdms'] });
      toast.success('GDM criada com sucesso!');
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
    
    if (!formData.vessel_id || !formData.equipment_id || !formData.treatment) {
      toast.error('Preencha todos os campos obrigatórios');
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

            {/* Equipment Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-500" />
                Equipamento *
              </Label>
              <Select
                value={formData.equipment_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, equipment_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o equipamento" />
                </SelectTrigger>
                <SelectContent>
                  {equipment.map((equip) => (
                    <SelectItem key={equip.id} value={equip.id}>
                      {equip.name} ({equip.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Serial Number & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-slate-500" />
                  Número de Série
                </Label>
                <Input
                  value={formData.serial_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                  placeholder="Ex: SN-12345"
                />
              </div>
              <div className="space-y-2">
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
            </div>

            {/* Treatment */}
            <div className="space-y-2">
              <Label>Tratativa *</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'repair', label: 'Reparo', color: 'blue' },
                  { value: 'discard', label: 'Descarte', color: 'red' },
                  { value: 'stock_return', label: 'Retorno ao Estoque', color: 'green' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, treatment: option.value }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.treatment === option.value
                        ? option.color === 'blue'
                          ? 'border-blue-500 bg-blue-50'
                          : option.color === 'red'
                          ? 'border-red-500 bg-red-50'
                          : 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
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