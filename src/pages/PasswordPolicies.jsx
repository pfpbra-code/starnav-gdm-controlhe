import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Save, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PasswordPolicies() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['passwordPolicies'],
    queryFn: () => base44.entities.PasswordPolicy.list(),
  });

  const activePolicy = policies.find(p => p.is_active) || {};
  const [formData, setFormData] = useState(activePolicy);

  React.useEffect(() => {
    if (activePolicy.id) {
      setFormData(activePolicy);
    }
  }, [activePolicy.id]);

  const updateMutation = useMutation({
    mutationFn: (data) => {
      if (activePolicy.id) {
        return base44.entities.PasswordPolicy.update(activePolicy.id, data);
      } else {
        return base44.entities.PasswordPolicy.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passwordPolicies'] });
      toast.success('Política de senha atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar política')
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-slate-300 mb-4" />
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
        <h1 className="text-2xl font-bold text-slate-900">Políticas de Senha</h1>
        <p className="text-slate-500 mt-1">Configure as regras de segurança para senhas de usuários</p>
      </div>

      {/* Info Alert */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Sobre as Políticas de Senha</p>
          <p className="text-blue-700">
            As políticas serão aplicadas na próxima vez que os usuários alterarem suas senhas.
            Usuários com senhas expiradas serão solicitados a criar uma nova senha no próximo login.
          </p>
        </div>
      </div>

      {/* Policy Form */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configurações de Segurança
          </CardTitle>
          <CardDescription>
            Defina os requisitos mínimos para senhas de usuários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Password Requirements */}
          <div>
            <h3 className="font-semibold mb-4">Requisitos de Senha</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Comprimento Mínimo</Label>
                <Input
                  type="number"
                  min="4"
                  max="32"
                  value={formData.min_length || 8}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_length: parseInt(e.target.value) }))}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Exigir Letras Maiúsculas</Label>
                  <Switch
                    checked={formData.require_uppercase || false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_uppercase: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Exigir Letras Minúsculas</Label>
                  <Switch
                    checked={formData.require_lowercase || false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_lowercase: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Exigir Números</Label>
                  <Switch
                    checked={formData.require_numbers || false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_numbers: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Exigir Caracteres Especiais</Label>
                  <Switch
                    checked={formData.require_special_chars || false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_special_chars: checked }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Expiration & Security */}
          <div>
            <h3 className="font-semibold mb-4">Expiração e Segurança</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Dias para Expiração (0 = nunca)</Label>
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={formData.expiration_days || 90}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiration_days: parseInt(e.target.value) }))}
                />
                <p className="text-xs text-slate-500">
                  Usuários deverão trocar a senha após este período
                </p>
              </div>

              <div className="space-y-2">
                <Label>Histórico de Senhas</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.password_history || 3}
                  onChange={(e) => setFormData(prev => ({ ...prev, password_history: parseInt(e.target.value) }))}
                />
                <p className="text-xs text-slate-500">
                  Número de senhas antigas que não podem ser reutilizadas
                </p>
              </div>
            </div>
          </div>

          {/* Account Lockout */}
          <div>
            <h3 className="font-semibold mb-4">Bloqueio de Conta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Tentativas Máximas de Login</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.max_failed_attempts || 5}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_failed_attempts: parseInt(e.target.value) }))}
                />
                <p className="text-xs text-slate-500">
                  Tentativas falhas antes de bloquear a conta
                </p>
              </div>

              <div className="space-y-2">
                <Label>Duração do Bloqueio (minutos)</Label>
                <Input
                  type="number"
                  min="0"
                  max="1440"
                  value={formData.lockout_duration_minutes || 30}
                  onChange={(e) => setFormData(prev => ({ ...prev, lockout_duration_minutes: parseInt(e.target.value) }))}
                />
                <p className="text-xs text-slate-500">
                  Tempo que a conta permanece bloqueada
                </p>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold mb-2">Resumo da Política</h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Mínimo de {formData.min_length || 8} caracteres</li>
              {formData.require_uppercase && <li>• Pelo menos uma letra maiúscula</li>}
              {formData.require_lowercase && <li>• Pelo menos uma letra minúscula</li>}
              {formData.require_numbers && <li>• Pelo menos um número</li>}
              {formData.require_special_chars && <li>• Pelo menos um caractere especial</li>}
              <li>• Senhas expiram em {formData.expiration_days || 90} dias {formData.expiration_days === 0 && '(nunca expira)'}</li>
              <li>• Bloqueio após {formData.max_failed_attempts || 5} tentativas falhas</li>
            </ul>
          </div>

          <Button
            className="w-full bg-sky-600 hover:bg-sky-700"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Salvar Política de Senha
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}