import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCog, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import SectorResponsiblePicker from '@/components/settings/SectorResponsiblePicker';

const SECTORS = [
  { key: 'maintenance', label: 'Manutenção' },
  { key: 'operations', label: 'Operações' },
  { key: 'services', label: 'Serviços' },
  { key: 'almoxarifado', label: 'Almoxarifado' },
  { key: 'planejamento', label: 'Planejamento' },
  { key: 'coordinator', label: 'Coordenação' },
];

const sameEmails = (a, b) =>
  [...a].sort().join('|') === [...b].sort().join('|');

/**
 * Configuração dos usuários responsáveis por cada setor do sistema (múltiplos por setor).
 * Exclusiva do ADM (a página de Configurações já é restrita a administradores).
 */
export default function SectorResponsibles() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState({});

  const { data: responsibles = [] } = useQuery({
    queryKey: ['sectorResponsibles'],
    queryFn: () => base44.entities.SectorResponsible.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  useEffect(() => {
    const map = {};
    SECTORS.forEach((s) => {
      map[s.key] = responsibles
        .filter((r) => r.sector === s.key && r.responsible_email)
        .map((r) => r.responsible_email);
    });
    setSelected(map);
  }, [responsibles]);

  const saveMutation = useMutation({
    mutationFn: async ({ sector, emails }) => {
      const existing = responsibles.filter((r) => r.sector === sector);
      const removed = existing.filter(
        (r) => !emails.includes(r.responsible_email)
      );
      const addEmails = emails.filter(
        (e) => !existing.some((r) => r.responsible_email === e)
      );
      await Promise.all([
        ...removed.map((r) => base44.entities.SectorResponsible.delete(r.id)),
        ...addEmails.map((email) => {
          const user = users.find((u) => u.email === email);
          return base44.entities.SectorResponsible.create({
            sector,
            responsible_email: email,
            responsible_name: user?.full_name || null,
          });
        }),
      ]);
    },
    onSuccess: (_data, { emails }) => {
      queryClient.invalidateQueries({ queryKey: ['sectorResponsibles'] });
      toast.success(
        emails.length
          ? 'Responsáveis do setor atualizados!'
          : 'Responsáveis do setor removidos!'
      );
    },
    onError: () => toast.error('Erro ao salvar os responsáveis do setor'),
  });

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserCog className="h-5 w-5 text-sky-600" />
          Responsáveis por Setor
        </CardTitle>
        <CardDescription>
          Define os usuários responsáveis por cada setor do sistema (Manutenção,
          Operações, Serviços, Almoxarifado, Planejamento e Coordenação). É
          possível cadastrar mais de um responsável por setor.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTORS.map((sector) => {
          const currentEmails = selected[sector.key] || [];
          const savedEmails = responsibles
            .filter((r) => r.sector === sector.key && r.responsible_email)
            .map((r) => r.responsible_email);
          const pendingChange = !sameEmails(currentEmails, savedEmails);
          return (
            <div
              key={sector.key}
              className="rounded-lg border border-slate-200 p-3 space-y-2"
            >
              <p className="text-sm font-semibold text-slate-700">{sector.label}</p>
              <SectorResponsiblePicker
                users={users}
                selected={currentEmails}
                onChange={(emails) =>
                  setSelected((prev) => ({ ...prev, [sector.key]: emails }))
                }
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 truncate">
                  {savedEmails.length
                    ? `Atual: ${savedEmails.join(', ')}`
                    : 'Nenhum responsável definido'}
                </span>
                <Button
                  size="sm"
                  className="bg-sky-600 hover:bg-sky-700"
                  disabled={!pendingChange || saveMutation.isPending}
                  onClick={() =>
                    saveMutation.mutate({ sector: sector.key, emails: currentEmails })
                  }
                >
                  {saveMutation.isPending && pendingChange ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}