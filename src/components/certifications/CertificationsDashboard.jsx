import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { Search } from 'lucide-react';
import CertificationKpis from './CertificationKpis';
import CertificationCharts from './CertificationCharts';
import VesselCompliancePanel from './VesselCompliancePanel';
import CertifiedEquipmentTable from './CertifiedEquipmentTable';
import RegisterCertificateDialog from './RegisterCertificateDialog';
import CertificationHistoryDialog from './CertificationHistoryDialog';
import {
  buildCertEquipmentRecords,
  certKpis,
  certsByMonth,
  certsByVessel,
  certsByEquipmentType,
  expiredByPeriod,
  vesselCompliance,
} from '@/lib/certifications';

const STATUS_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'expired', label: 'Vencidos' },
  { key: 'expiring', label: 'A vencer (30 dias)' },
  { key: 'awaiting_certificate', label: 'Aguardando certificado' },
  { key: 'awaiting_validity', label: 'Aguardando validade' },
  { key: 'in_process', label: 'Em certificação' },
  { key: 'valid', label: 'Certificados' },
];

/**
 * Gestão de Certificações (setor de Operações): controle de validade dos
 * equipamentos de calibração/certificação, com KPIs, gráficos, visão por
 * embarcação, histórico por SN e registro de certificados por item.
 */
export default function CertificationsDashboard() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [registerItem, setRegisterItem] = useState(null);
  const [historyRecord, setHistoryRecord] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['gdmItems'],
    queryFn: () => base44.entities.GDMItem.list('-created_date', 1000),
  });
  const { data: certifications = [] } = useQuery({
    queryKey: ['certifications'],
    queryFn: () => base44.entities.Certification.list('-created_date', 1000),
  });
  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list('-created_date'),
  });

  // Atualização em tempo real: movimentações de itens e certificados.
  useEffect(() => {
    const unsubItems = base44.entities.GDMItem.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['gdmItems'] });
    });
    const unsubCerts = base44.entities.Certification.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['certifications'] });
    });
    return () => {
      unsubItems();
      unsubCerts();
    };
  }, [queryClient]);

  const records = useMemo(() => {
    const certItems = items.filter((i) => i.destination === 'certification');
    return buildCertEquipmentRecords(certItems, certifications, equipment);
  }, [items, certifications, equipment]);

  const filtered = useMemo(() => {
    let result = records;
    if (statusFilter !== 'all') result = result.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.equipmentName?.toLowerCase().includes(term) ||
          r.sn?.toLowerCase().includes(term) ||
          r.equipmentCode?.toLowerCase().includes(term) ||
          r.vesselName?.toLowerCase().includes(term) ||
          r.currentCert?.certificate_number?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [records, statusFilter, search]);

  const kpis = useMemo(() => certKpis(filtered), [filtered]);
  const vessels = useMemo(() => vesselCompliance(filtered), [filtered]);
  const charts = useMemo(
    () => ({
      byMonth: certsByMonth(certifications),
      byVessel: certsByVessel(certifications),
      byType: certsByEquipmentType(filtered),
      expiredByMonth: expiredByPeriod(certifications),
    }),
    [certifications, filtered]
  );

  const canRegister = hasPermission('approve_operations_quote');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Gestão de Certificações</h2>
        <p className="text-sm text-slate-500">
          Controle de validade das certificações e calibrações: certificados por item,
          vencimentos, alertas automáticos, histórico por SN e conformidade da frota.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por equipamento, SN, embarcação ou número do certificado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === f.key
                    ? 'bg-sky-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <CertificationKpis kpis={kpis} />
      <CertificationCharts {...charts} />
      <VesselCompliancePanel vessels={vessels} />

      <CertifiedEquipmentTable
        records={filtered}
        canRegister={canRegister}
        onRegister={setRegisterItem}
        onHistory={setHistoryRecord}
      />

      <RegisterCertificateDialog item={registerItem} onClose={() => setRegisterItem(null)} />
      <CertificationHistoryDialog record={historyRecord} onClose={() => setHistoryRecord(null)} />
    </div>
  );
}