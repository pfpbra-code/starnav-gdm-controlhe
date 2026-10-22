import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Ship, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const VESSEL_TYPE_LABELS = {
  PSV: 'PSV', AHTS: 'AHTS', RSV: 'RSV', OSRV: 'OSRV', FSV: 'FSV', Outro: 'Outro',
};

const SECTOR_SHORT = {
  services: 'Serviços',
  almoxarifado: 'Almoxarifado',
  maintenance: 'Manutenção',
  planejamento: 'Planejamento',
  operations: 'Operações',
};

/**
 * Embarcações vinculadas ao usuário, sempre derivadas do cadastro atual da
 * embarcação (Vessel): acesso atribuído (assigned_vessels), coordenação e
 * responsabilidade por setor. Como a leitura é feita ao vivo, renomeações,
 * mudanças de tipo/status ou desvinculações feitas no cadastro da embarcação
 * refletem automaticamente aqui.
 */
export default function UserLinkedVessels({ user }) {
  const { data: vessels = [], isLoading } = useQuery({
    queryKey: ['vessels'],
    queryFn: () => base44.entities.Vessel.list(),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const assigned = user?.assigned_vessels || user?.data?.assigned_vessels || [];
  const email = user?.email?.toLowerCase();

  const linked = (vessels || [])
    .map((v) => {
      const roles = [];
      if (assigned.includes(v.id)) roles.push('Acesso');
      if (v.coordinator_id && v.coordinator_id === user?.id) roles.push('Coordenador');
      const sectors = Object.entries(v.sector_responsibles || {})
        .filter(([, emails]) =>
          (emails || []).some((e) => String(e).toLowerCase() === email))
        .map(([sector]) => SECTOR_SHORT[sector] || sector);
      if (sectors.length > 0) roles.push(`Responsável: ${sectors.join(', ')}`);
      return { vessel: v, roles };
    })
    .filter(({ roles }) => roles.length > 0);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Embarcações vinculadas</p>
      {linked.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">
          <Ship className="h-4 w-4 text-slate-300" />
          Nenhuma embarcação vinculada a este usuário
        </div>
      ) : (
        <div className="space-y-2">
          {linked.map(({ vessel, roles }) => (
            <div
              key={vessel.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{vessel.name}</p>
                <p className="text-xs text-slate-500">
                  {vessel.code}
                  {vessel.type ? ` • ${VESSEL_TYPE_LABELS[vessel.type] || vessel.type}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {vessel.status === 'inactive' && (
                  <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
                    Inativa
                  </Badge>
                )}
                {vessel.status === 'maintenance' && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                    Em manutenção
                  </Badge>
                )}
                {roles.map((role) => (
                  <Badge
                    key={role}
                    variant="outline"
                    className="bg-sky-50 text-sky-700 border-sky-200 text-[10px]"
                  >
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400">
        Vínculos exibidos conforme o cadastro atual de cada embarcação.
      </p>
    </div>
  );
}