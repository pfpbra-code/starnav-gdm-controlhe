import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Save, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const notificationTypes = [
  { id: 'gdm_pending', label: 'GDMs Pendentes de Aprovação', description: 'Quando uma nova GDM aguarda sua aprovação' },
  { id: 'gdm_approved', label: 'GDMs Aprovadas', description: 'Quando uma GDM é aprovada' },
  { id: 'gdm_rejected', label: 'GDMs Rejeitadas', description: 'Quando uma GDM é rejeitada' },
  { id: 'supplier_sent', label: 'Materiais Enviados ao Fornecedor', description: 'Quando um material é enviado ao fornecedor' },
  { id: 'quote_received', label: 'Cotações Recebidas', description: 'Quando um fornecedor envia uma cotação' },
  { id: 'quote_analysis', label: 'Análise de Cotações', description: 'Quando uma cotação aguarda análise' },
  { id: 'password_expiring', label: 'Senha Expirando', description: 'Alertar quando sua senha estiver próxima de expirar' },
  { id: 'system_alerts', label: 'Alertas do Sistema', description: 'Notificações importantes do sistema' },
];

export default function NotificationPreferences() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['notificationPreferences', user?.id],
    queryFn: () => base44.entities.NotificationPreferences.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const existingPreference = preferences[0];
  const [formData, setFormData] = useState({
    gdm_pending: true,
    gdm_approved: true,
    gdm_rejected: true,
    supplier_sent: true,
    quote_received: true,
    quote_analysis: true,
    password_expiring: true,
    system_alerts: true,
    email_notifications: false,
    digest_frequency: 'realtime',
  });

  useEffect(() => {
    if (existingPreference) {
      setFormData({
        gdm_pending: existingPreference.gdm_pending ?? true,
        gdm_approved: existingPreference.gdm_approved ?? true,
        gdm_rejected: existingPreference.gdm_rejected ?? true,
        supplier_sent: existingPreference.supplier_sent ?? true,
        quote_received: existingPreference.quote_received ?? true,
        quote_analysis: existingPreference.quote_analysis ?? true,
        password_expiring: existingPreference.password_expiring ?? true,
        system_alerts: existingPreference.system_alerts ?? true,
        email_notifications: existingPreference.email_notifications ?? false,
        digest_frequency: existingPreference.digest_frequency || 'realtime',
      });
    }
  }, [existingPreference?.id]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, user_id: user.id };
      if (existingPreference) {
        return base44.entities.NotificationPreferences.update(existingPreference.id, payload);
      } else {
        return base44.entities.NotificationPreferences.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Preferências salvas!');
    },
    onError: () => toast.error('Erro ao salvar preferências')
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Preferências de Notificação</h1>
        <p className="text-slate-500 mt-1">Configure como e quando você deseja receber notificações</p>
      </div>

      {/* Info Alert */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Personalize suas notificações</p>
          <p className="text-blue-700">
            Escolha os tipos de eventos que deseja acompanhar. Você receberá alertas em tempo real na plataforma.
          </p>
        </div>
      </div>

      {/* Notification Types */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Tipos de Notificação
          </CardTitle>
          <CardDescription>
            Selecione os eventos que deseja ser notificado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {notificationTypes.map((type) => (
            <div key={type.id} className="flex items-start justify-between gap-4 pb-4 border-b last:border-0">
              <div className="flex-1">
                <Label className="text-base">{type.label}</Label>
                <p className="text-sm text-slate-500 mt-1">{type.description}</p>
              </div>
              <Switch
                checked={formData[type.id]}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, [type.id]: checked }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Delivery Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Configurações de Entrega</CardTitle>
          <CardDescription>
            Configure como você deseja receber as notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label className="text-base">Notificações por Email</Label>
              <p className="text-sm text-slate-500 mt-1">
                Receber cópia das notificações por email
              </p>
            </div>
            <Switch
              checked={formData.email_notifications}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, email_notifications: checked }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Frequência de Resumo</Label>
            <Select
              value={formData.digest_frequency}
              onValueChange={(value) => setFormData(prev => ({ ...prev, digest_frequency: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Tempo Real</SelectItem>
                <SelectItem value="daily">Resumo Diário</SelectItem>
                <SelectItem value="weekly">Resumo Semanal</SelectItem>
                <SelectItem value="never">Nunca</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Como você prefere receber as notificações por email
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-0 shadow-sm bg-slate-50">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3">Resumo das Preferências</h3>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Notificações ativas:</strong>{' '}
              {Object.entries(formData).filter(([key, value]) => 
                notificationTypes.some(t => t.id === key) && value
              ).length} de {notificationTypes.length}
            </p>
            <p>
              <strong>Email:</strong> {formData.email_notifications ? 'Ativado' : 'Desativado'}
            </p>
            <p>
              <strong>Frequência:</strong>{' '}
              {{
                realtime: 'Tempo Real',
                daily: 'Diário',
                weekly: 'Semanal',
                never: 'Nunca'
              }[formData.digest_frequency]}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        className="w-full bg-sky-600 hover:bg-sky-700"
        onClick={handleSave}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        <Save className="h-4 w-4 mr-2" />
        Salvar Preferências
      </Button>
    </div>
  );
}