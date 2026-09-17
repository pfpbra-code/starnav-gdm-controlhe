import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Save, Camera, Info } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Formulário de edição das próprias informações do usuário:
 * foto, telefone e cargo. Nome e e-mail são campos da conta
 * gerenciados pelo administrador.
 */
export default function ProfileEditForm({ user }) {
  const queryClient = useQueryClient();
  const [photoUrl, setPhotoUrl] = useState(user.photo_url || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [jobTitle, setJobTitle] = useState(user.job_title || '');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPhotoUrl(user.photo_url || '');
    setPhone(user.phone || '');
    setJobTitle(user.job_title || '');
  }, [user.photo_url, user.phone, user.job_title]);

  const initials =
    user.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const dirty =
    (photoUrl || '') !== (user.photo_url || '') ||
    phone !== (user.phone || '') ||
    jobTitle !== (user.job_title || '');

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await base44.integrations.Core.UploadPublicFile({ file });
      setPhotoUrl(res.file_url);
      toast.success('Foto enviada! Clique em Salvar para confirmar.');
    } catch {
      toast.error('Não foi possível enviar a foto. Tente novamente.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      base44.auth.updateMe({
        photo_url: photoUrl || null,
        phone,
        job_title: jobTitle,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Informações atualizadas!');
    },
    onError: () => toast.error('Erro ao salvar suas informações'),
  });

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="h-5 w-5 text-sky-600" />
          Minhas Informações
        </CardTitle>
        <CardDescription>Edite sua foto e dados de contato.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {photoUrl ? <AvatarImage src={photoUrl} alt={user.full_name} /> : null}
            <AvatarFallback className="bg-sky-100 text-sky-700 text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <Label htmlFor="photo" className="sr-only">Foto de perfil</Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => document.getElementById('photo').click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {photoUrl ? 'Trocar foto' : 'Adicionar foto'}
            </Button>
            {photoUrl ? (
              <button
                type="button"
                className="block text-xs text-red-600 hover:underline"
                onClick={() => setPhotoUrl('')}
              >
                Remover foto
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jobTitle">Cargo</Label>
            <Input
              id="jobTitle"
              placeholder="Ex.: Analista de Manutenção"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
        </div>

        <p className="text-xs text-slate-400 flex items-center gap-1">
          <Info className="h-3.5 w-3.5" />
          Nome e e-mail da conta só podem ser alterados pelo administrador.
        </p>

        <Button
          className="bg-sky-600 hover:bg-sky-700"
          disabled={!dirty || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}