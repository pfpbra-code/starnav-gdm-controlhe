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
import { displayNameOf } from '@/lib/displayName';

/**
 * Formulário de edição das próprias informações do usuário:
 * nome de exibição, foto, telefone e cargo. O e-mail permanece
 * um campo da conta gerenciado pelo administrador.
 */
export default function ProfileEditForm({ user }) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [photoUrl, setPhotoUrl] = useState(user.photo_url || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [jobTitle, setJobTitle] = useState(user.job_title || '');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setDisplayName(user.display_name || '');
    setPhotoUrl(user.photo_url || '');
    setPhone(user.phone || '');
    setJobTitle(user.job_title || '');
  }, [user.display_name, user.photo_url, user.phone, user.job_title]);

  const initials =
    displayNameOf(user)?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const dirty =
    displayName.trim() !== (user.display_name || '') ||
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
        display_name: displayName.trim() || null,
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
        <CardDescription>Edite seu nome de exibição, foto e dados de contato.</CardDescription>
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
            <Label htmlFor="displayName">Nome de exibição</Label>
            <Input
              id="displayName"
              placeholder={user.full_name || 'Seu nome'}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={120}
            />
            <p className="text-xs text-slate-400">
              Nome exibido na plataforma. Vazio usa o nome da conta.
            </p>
          </div>
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
          O e-mail da conta só pode ser alterado pelo administrador.
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