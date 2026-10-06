import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship } from 'lucide-react';

const ComplianceBar = ({ value }) => {
  const pct = value != null ? Math.round(value) : null;
  const color = pct == null ? 'bg-slate-300' : pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct ?? 0}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-10 text-right">
        {pct != null ? `${pct}%` : '—'}
      </span>
    </div>
  );
};

/** Visão consolidada por embarcação: monitorados, vencidos, a vencer e conformidade. */
export default function VesselCompliancePanel({ vessels }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700">
          Controle por embarcação
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {vessels.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">
            Nenhum equipamento monitorado com os filtros atuais.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-2 font-medium">Embarcação</th>
                  <th className="px-4 py-2 font-medium text-center">Monitorados</th>
                  <th className="px-4 py-2 font-medium text-center">Certificados</th>
                  <th className="px-4 py-2 font-medium text-center">Vencidos</th>
                  <th className="px-4 py-2 font-medium text-center">A vencer (30d)</th>
                  <th className="px-4 py-2 font-medium w-48">Conformidade</th>
                </tr>
              </thead>
              <tbody>
                {vessels.map((v) => (
                  <tr key={v.vessel} className="border-b border-slate-50">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2 font-medium text-slate-800">
                        <Ship className="h-4 w-4 text-sky-600" />
                        {v.vessel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">{v.monitored}</td>
                    <td className="px-4 py-2.5 text-center text-green-700 font-medium">
                      {v.certified}
                    </td>
                    <td className="px-4 py-2.5 text-center text-red-700 font-medium">
                      {v.expired}
                    </td>
                    <td className="px-4 py-2.5 text-center text-amber-700 font-medium">
                      {v.expiring}
                    </td>
                    <td className="px-4 py-2.5">
                      <ComplianceBar value={v.compliance} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}