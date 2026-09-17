import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { ROLE_LABELS } from '@/lib/permissions';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import { Ship, Bell, Mail, Briefcase, Phone } from 'lucide-react';

/**
 * Meu Perfil: identidade do usuário, edição das próprias
 * informações (foto, telefone, cargo) e vínculos.
 */
export default function MyProfile() {
  const { user, isLoading } = usePermissions();

  const { data: vessels = [] } = useQuery({
    queryKey: ['vessels'],
    queryFn: () => base44.entities.Vessel.list(),
    enabled: !!user,
  });

  if (isLoading || !user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const vesselId = user.vessel_id || user.data?.vessel_id;
  const assignedVessels = user.assigned_vessels || user.data?.assigned_vessels || [];
  const linkedVessels = vessels.filter(
    (v) => v.id === vesselId || assignedVessels.includes(v.id)
  );

  const initials =
    user.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const photoUrl = user.photo_url || user.data?.photo_url || '';
  const phone = user.phone || user.data?.phone || '';
  const jobTitle = user.job_title || user.data?.job_title || '';

  return (
    <div className="space-y-6">
      {/* Identidade */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="relative h-28 bg-gradient-to-r from-sky-800 via-sky-600 to-sky-400">
          <div className="absolute -top-12 right-20 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute top-8 right-44 h-14 w-14 rounded-full bg-white/10" />
        </div>
        <CardContent className="p-6 -mt-14">
          <div className="flex flex-col lg:flex-row lg:items-end gap-5">
            <Avatar className="h-28 w-28 border-4 border-white shadow-lg">
              {photoUrl ? <AvatarImage src={photoUrl} alt={user.full_name} /> : null}
              <AvatarFallback className="bg-sky-100 text-sky-700 text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {user.full_name || 'Usuário'}
              </h1>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-sky-100 text-sky-800 border-sky-200">
                  {ROLE_LABELS[user.role] || user.role}
                </Badge>
                <Badge
                  className={
                    (user.status || 'active') === 'active'
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : 'bg-red-100 text-red-800 border-red-200'
                  }
                >
                  {(user.status || 'active') === 'active' ? 'Ativo' : user.status}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col items-start lg:items-end gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                  <Mail className="h-3.5 w-3.5 text-sky-600" /> {user.email}
                </span>
                {jobTitle ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                    <Briefcase className="h-3.5 w-3.5 text-sky-600" /> {jobTitle}
                  </span>
                ) : null}
                {phone ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                    <Phone className="h-3.5 w-3.5 text-sky-600" /> {phone}
                  </span>
                ) : null}
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="bg-white hover:bg-slate-50"
              >
                <Link to={createPageUrl('NotificationPreferences')}>
                  <Bell className="h-4 w-4" />
                  Preferências de Notificação
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edição + vínculos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <ProfileEditForm user={user} />

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Ship className="h-5 w-5 text-sky-600" />
              Embarcações Vinculadas
            </CardTitle>
            <CardDescription>Embarcações sob seu acompanhamento.</CardDescription>
          </CardHeader>
          <CardContent>
            {linkedVessels.length > 0 ? (
              <ul className="space-y-2">
                {linkedVessels.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <span className="font-medium">{v.name}</span>
                    <span className="text-sm text-slate-500">Cód. {v.code}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">
                Nenhuma embarcação vinculada ao seu usuário.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}