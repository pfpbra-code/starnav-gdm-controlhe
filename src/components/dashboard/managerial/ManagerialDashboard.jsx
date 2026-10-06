import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  EMPTY_FILTERS,
  applyFilters,
  computeManagerialMetrics,
  equipmentMapByCode,
  filterOptions,
} from '@/lib/managerialDashboard';
import ManagerialFilters from './ManagerialFilters';
import ManagerialKpis from './ManagerialKpis';
import ManagerialEvolution from './ManagerialEvolution';
import ManagerialDestinationPanel from './ManagerialDestinationPanel';
import ManagerialVesselRanking from './ManagerialVesselRanking';
import ManagerialEquipmentRanking from './ManagerialEquipmentRanking';
import ManagerialProcessPanel from './ManagerialProcessPanel';
import ManagerialAlerts from './ManagerialAlerts';

export default function ManagerialDashboard({ items = [] }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const { data: equipment = [] } = useQuery({
    queryKey: ['managerialEquipment'],
    queryFn: () => base44.entities.Equipment.list(),
  });

  const equipmentByCode = useMemo(() => equipmentMapByCode(equipment), [equipment]);

  const options = useMemo(() => filterOptions(items, equipmentByCode), [items, equipmentByCode]);

  const filtered = useMemo(
    () => applyFilters(items, filters, equipmentByCode),
    [items, filters, equipmentByCode]
  );

  const metrics = useMemo(
    () =>
      computeManagerialMetrics(filtered, {
        equipmentByCode,
        from: filters.from,
        to: filters.to,
      }),
    [filtered, equipmentByCode, filters.from, filters.to]
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Dashboard Gerencial</h2>
        <p className="text-sm text-slate-500 mt-1">
          Análise estratégica por item — cada equipamento da GDM contabiliza 1 item.
        </p>
      </div>

      <ManagerialFilters filters={filters} setFilters={setFilters} options={options} />
      <ManagerialKpis general={metrics.general} />
      <ManagerialEvolution
        monthly={metrics.monthly}
        quarterly={metrics.quarterly}
        yearly={metrics.yearly}
        monthlyTrend={metrics.monthlyTrend}
      />
      <ManagerialDestinationPanel destinations={metrics.destinations} />
      <ManagerialVesselRanking vessels={metrics.vessels} />
      <ManagerialEquipmentRanking equipment={metrics.equipment} />
      <ManagerialProcessPanel process={metrics.process} />
      <ManagerialAlerts alerts={metrics.alerts} />
    </div>
  );
}