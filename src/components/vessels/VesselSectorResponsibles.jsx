import React from 'react';
import { Label } from '@/components/ui/label';
import SectorResponsiblePicker from '@/components/settings/SectorResponsiblePicker';
import { VESSEL_SECTORS } from '@/lib/vesselSectors';

/**
 * Seleção múltipla de usuários responsáveis por setor para uma embarcação.
 * value: objeto { setor: [emails] }; onChange(setor, emails).
 */
export default function VesselSectorResponsibles({ users, value = {}, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Responsáveis por Setor</Label>
        <p className="text-xs text-slate-500 mt-1">
          Os usuários vinculados recebem as notificações das GDMs desta embarcação.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {VESSEL_SECTORS.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <Label className="text-sm font-medium">{label}</Label>
            <SectorResponsiblePicker
              users={users.filter(
                (u) =>
                  (u.role || 'user') === 'user' &&
                  (Array.isArray(u.sectors) ? u.sectors : u.data?.sectors || []).includes(key)
              )}
              selected={value[key] || []}
              onChange={(emails) => onChange(key, emails)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}