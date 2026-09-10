import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserCog, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

const NONE = '__none__';

const SECTORS = [
  { key: 'maintenance', label: 'Manutenção' },
  { key: 'operations', label: 'Operações' },
  { key: 'services', label: 'Serviços' },
  { key: 'almoxarifado', label: 'Almoxarifado' },
  { key: 'planejamento', label: 'Planejamento' },
  { key: 'coordinator', label: 'Coordenação' },
];

/**
 * Configuração do usuário responsável por cada setor do sistema.
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
    responsibles.forEach((r) => {
      map[r.sector] = r.responsible_email || NONE;
    });
    SECTORS.forEach((s) => {
      if (!(s.key in map)) map[s.key] = NONE;
    });
    setSelected(map);
  }, [responsibles]);

  const saveMutation = useMutation({
    mutationFn: async ({ sector, email }) => {
      const user = email ? users.find((u) => u.email === email) : null;
      const existing = responsibles.find((r) => r.sector === sector);
      const payload = {
        sector,
        responsible_email: email || null,
        responsible_name: user?.full_name || null,
      };
      if (existing) return base44.entities.SectorResponsible.update(existing.id, payload);
      return base44.entities.SectorResponsible.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectorResponsibles'] });
      toast.success('Responsável do setor atualizado!');
    },
    onError: () => toast.error('Erro ao salvar o responsável do setor'),
  });

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserCog className="h-5 w-5 text-sky-600" />
          Responsáveis por Setor
        </CardTitle>
        <CardDescription>
          Define o usuário responsável por cada setor do sistema (Manutenção, Operações,
          Serviços, Almoxarifado, Planejamento e Coordenação).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTORS.map((sector) => {
          const currentEmail = selected[sector.key];
          const savedEmail =
            responsibles.find((r) => r.sector === sector.key)?.responsible_email || null;
          const pendingChange =
            (currentEmail === NONE ? null : currentEmail) !== savedEmail;
          return (
            <div
              key={sector.key}
              className="rounded-lg border border-slate-200 p-3 space-y-2"
            >
              <p className="text-sm font-semibold text-slate-700">{sector.label}</p>
              <Select
                value={currentEmail || NONE}
                onValueChange={(value) =>
                  setSelected((prev) => ({ ...prev, [sector.key]: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem responsável definido</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.email}>
                      {u.full_name || u.email} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 truncate">
                  {savedEmail ? `Atual: ${savedEmail}` : 'Nenhum responsável definido'}
                </span>
                <Button
                  size="sm"
                  className="bg-sky-600 hover:bg-sky-700"
                  disabled={!pendingChange || saveMutation.isPending}
                  onClick={() =>
                    saveMutation.mutate({
                      sector: sector.key,
                      email: currentEmail === NONE ? null : currentEmail,
                    })
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