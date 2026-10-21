import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * IDs das embarcações em que o usuário é responsável por setor (vínculo feito
 * pelo ADM em Configurações > Embarcações > Responsáveis por Setor).
 *
 * Os responsáveis vinculados assumem a etapa de confirmação/reprogramação do
 * desembarque dos itens da embarcação (sem login próprio da embarcação).
 */
export function useResponsibleVesselIds(user) {
  const { data: vessels = [] } = useQuery({
    queryKey: ['vessels'],
    queryFn: () => base44.entities.Vessel.list(),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const email = user?.email;
    if (!email) return new Set();
    return new Set(
      (vessels || [])
        .filter((v) =>
          Object.values(v.sector_responsibles || {})
            .flat()
            .includes(email),
        )
        .map((v) => v.id),
    );
  }, [vessels, user?.email]);
}

export default useResponsibleVesselIds;