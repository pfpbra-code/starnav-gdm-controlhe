import React from 'react';
import { Badge } from '@/components/ui/badge';
import { displayNameOf } from '@/lib/displayName';
import { VESSEL_SECTORS } from '@/lib/vesselSectors';

/**
 * Funções e vinculados de uma embarcação, derivados do cadastro atual:
 * Coordenador + responsáveis por setor (Serviços, Almoxarifado, ...).
 * Quando o usuário vinculado existe no sistema, exibe o nome de exibição;
 * caso contrário, mostra o e-mail cadastrado como responsável.
 */
export default function VesselLinkedPeople({ vessel, users = [] }) {
  const byId = (id) => users.find((u) => u.id === id);
  const byEmail = (email) =>
    users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());

  const entries = [];

  const coordinator = byId(vessel.coordinator_id);
  if (coordinator) {
    entries.push({
      key: 'coordenador',
      label: 'Coordenador',
      names: [displayNameOf(coordinator) || coordinator.email],
    });
  }

  VESSEL_SECTORS.forEach(({ key, label }) => {
    const emails = vessel.sector_responsibles?.[key] || [];
    if (emails.length === 0) return;
    entries.push({
      key,
      label,
      names: emails.map((email) => {
        const u = byEmail(email);
        return u ? displayNameOf(u) || u.email : email;
      }),
    });
  });

  if (entries.length === 0) {
    return <span className="text-slate-400">-</span>;
  }

  return (
    <div className="space-y-1">
      {entries.map(({ key, label, names }) => (
        <div key={key} className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] shrink-0"
          >
            {label}
          </Badge>
          <span className="text-sm text-slate-700">{names.join(', ')}</span>
        </div>
      ))}
    </div>
  );
}