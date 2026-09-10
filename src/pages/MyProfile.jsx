import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { ROLE_LABELS, PERMISSION_CATEGORIES } from '@/lib/permissions';
import {
  UserCircle,
  Ship,
  ShieldCheck,
  Bell,
  Settings2,
} from 'lucide-react';

/**
 * Meu Perfil: dados do usuário, perfil, permissões (somente leitura),
 * embarcações e fornecedor vinculados. O usuário comum não altera
 * suas próprias permissões — apenas o ADM concede/revoga.
 */
export default function MyProfile() {
  const { user, isLoading, permissions } = usePermissions();

  const { data: vessels = [] } = useQuery({
    queryKey: ['vessels'],
    queryFn: () => base44.entities.Vessel.list(),
    enabled: !!user,
  });

  if (isLoading || !user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const vesselId = user.vessel_id || user.data?.vessel_id;
  const assignedVessels = user.assigned_vessels || user.data?.assigned_vessels || [];

  const linkedVessels = vessels.filter(
    (v) => v.id === vesselId || assignedVessels.includes(v.id),
  );

  const initials =
    user.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  const permissionGroups = Object.entries(PERMISSION_CATEGORIES)
    .map(([category, perms]) => ({
      category,
      granted: perms.filter((p) => permissions.includes(p.id)),
    }))
    .filter((g) => g.granted.length > 0);

  return (
    <div className="space-y-6">
      {/* Identidade */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-sky-100 text-sky-700 text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {user.full_name || 'Usuário'}
              </h1>
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
            <p className="text-slate-500 mt-1">{user.email}</p>
            <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
              <UserCircle className="h-4 w-4" />
              {user.department
                ? `Departamento: ${user.department}`
                : ROLE_LABELS[user.role] || 'Usuário'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link to={createPageUrl('NotificationPreferences')}>
              <Badge className="bg-slate-100 text-slate-700 border-slate-200 cursor-pointer hover:bg-slate-200">
                <Bell className="h-3 w-3 mr-1" />
                Preferências de Notificação
              </Badge>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Vinculos */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Ship className="h-5 w-5 text-sky-600" />
              Embarcações Vinculadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {linkedVessels.length > 0 ? (
              <ul className="space-y-2">
                {linkedVessels.map((v) => (
                  <li key={v.id} className="flex items-center justify-between">
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

      {/* Permissões (somente leitura) */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Minhas Permissões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <Settings2 className="h-4 w-4" />
            Somente o administrador pode conceder ou revogar permissões.
          </p>
          {permissionGroups.map(({ category, granted }) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {granted.map((p) => (
                  <Badge
                    key={p.id}
                    variant="outline"
                    className="bg-slate-50 text-slate-700"
                  >
                    {p.label}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}