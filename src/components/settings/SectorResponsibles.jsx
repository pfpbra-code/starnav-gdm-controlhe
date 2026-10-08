import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserCog, Check } from 'lucide-react';
import { toast } from 'sonner';
import SectorResponsiblePicker from '@/components/settings/SectorResponsiblePicker';
import { SECTORS } from '@/lib/permissions';

const sameEmails = (a, b) => [...a].sort().join('|') === [...b].sort().join('|');

const userSectorsOf = (u) => (Array.isArray(u.sectors) ? u.sectors : u.data?.sectors || []);

/**
 * Responsáveis por Setor — área do ADM em Configurações.
 * Víncula usuários aos setores da empresa (fonte única das permissões
 * básicas: cada usuário pode pertencer a um ou mais setores).
 */
export default function SectorResponsibles() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState({});

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Candidatos: usuários internos (Administrador já tem acesso total).
  const candidates = users.filter((u) => (u.role || 'user') === 'user');

  useEffect(() => {
    const map = {};
    SECTORS.forEach((s) => {
      map[s.key] = candidates
        .filter((u) => userSectorsOf(u).includes(s.key))
        .map((u) => u.email);
    });
    setSelected(map);
  }, [users]);

  const saveMutation = useMutation({
    mutationFn: async ({ sector, emails }) => {
      const updates = [];
      for (const u of candidates) {
        const current = userSectorsOf(u);
        const has = current.includes(sector);
        const want = emails.includes(u.email);
        if (has === want) continue;
        const sectors = want
          ? [...new Set([...current, sector])]
          : current.filter((s) => s !== sector);
        updates.push(base44.entities.User.update(u.id, { sectors }));
      }
      await Promise.all(updates);
    },
    onSuccess: (_data, { emails }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
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
          Vincule usuários aos setores da empresa (Manutenção, Operações,
          Almoxarifado, Planejamento e Serviços). Cada usuário pode pertencer a
          um ou mais setores — o vínculo concede automaticamente apenas os
          acessos básicos do setor; acessos adicionais dependem de autorização
          individual do ADM.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTORS.map((sector) => {
          const currentEmails = selected[sector.key] || [];
          const savedEmails = candidates
            .filter((u) => userSectorsOf(u).includes(sector.key))
            .map((u) => u.email);
          const pendingChange = !sameEmails(currentEmails, savedEmails);
          return (
            <div
              key={sector.key}
              className="rounded-lg border border-slate-200 p-3 space-y-2"
            >
              <p className="text-sm font-semibold text-slate-700">{sector.label}</p>
              <SectorResponsiblePicker
                users={candidates}
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