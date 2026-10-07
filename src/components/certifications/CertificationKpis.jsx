import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BadgeCheck, ShieldX, ShieldAlert, RefreshCw, Award, Percent } from 'lucide-react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { CERTIFICATION_TOOLTIPS } from '@/lib/kpiTooltips';

const kpiCards = [
  { key: 'monitored', label: 'Equipamentos Monitorados', icon: Award, tone: 'text-sky-600 bg-sky-50' },
  { key: 'certified', label: 'Certificados', icon: BadgeCheck, tone: 'text-green-600 bg-green-50' },
  { key: 'expired', label: 'Vencidos', icon: ShieldX, tone: 'text-red-600 bg-red-50' },
  { key: 'expiring', label: 'A Vencer (30 dias)', icon: ShieldAlert, tone: 'text-amber-600 bg-amber-50' },
  { key: 'inProcess', label: 'Em Certificação', icon: RefreshCw, tone: 'text-blue-600 bg-blue-50' },
];

/** KPIs do Dashboard de Certificações. */
export default function CertificationKpis({ kpis }) {
  const compliance =
    kpis?.compliance != null ? `${Math.round(kpis.compliance)}%` : '—';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpiCards.map(({ key, label, icon: Icon, tone }) => (
        <Card key={key} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{kpis?.[key] ?? 0}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              {label}
              <InfoTooltip content={CERTIFICATION_TOOLTIPS[key]} />
            </p>
          </CardContent>
        </Card>
      ))}
      <Card className="border-0 shadow-sm bg-slate-900">
        <CardContent className="p-4">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-slate-700 text-slate-100">
            <Percent className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{compliance}</p>
          <p className="text-xs text-slate-300 flex items-center gap-1">
            Conformidade da frota (certificações dentro da validade)
            <InfoTooltip content={CERTIFICATION_TOOLTIPS.compliance} />
          </p>
        </CardContent>
      </Card>
    </div>
  );
}