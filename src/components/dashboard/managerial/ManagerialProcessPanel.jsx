import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatsCard from '@/components/dashboard/StatsCard';
import { ClipboardList, Wrench, CheckCircle, Gauge, Inbox } from 'lucide-react';

export default function ManagerialProcessPanel({ process }) {
  const { byStatus = [], awaitingReceipt = 0, awaitingApproval = 0, inTreatment = 0, finished = 0, avgDays = 0 } =
    process || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard title="Aguardando Recebimento" value={awaitingReceipt} icon={Inbox} color="amber" />
        <StatsCard title="Aguardando Aprovação" value={awaitingApproval} icon={ClipboardList} color="sky" />
        <StatsCard title="Em Tratativa" value={inTreatment} icon={Wrench} color="purple" />
        <StatsCard title="Finalizados" value={finished} icon={CheckCircle} color="green" />
        <StatsCard
          title="Tempo Médio de Conclusão"
          value={`${avgDays.toFixed(1)} dias`}
          icon={Gauge}
          color="indigo"
        />
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Quantidade de Itens por Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {byStatus.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">Nenhum item no filtro atual.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {byStatus.map((s) => (
                <span
                  key={s.key}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
                >
                  {s.label}
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-800">
                    {s.value}
                  </span>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}