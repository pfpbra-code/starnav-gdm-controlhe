import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Ship, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { computeGeneralStatus } from '@/lib/gdmOverview';

/**
 * Kanban da Dashboard: colunas derivadas do status geral calculado a partir
 * dos itens de cada GDM (o campo `status` do cabeçalho é legado).
 */
const columns = [
  { key: 'pending', label: 'Pendente', color: 'amber' },
  { key: 'awaiting_approval', label: 'Aguardando Aprovação', color: 'blue' },
  { key: 'in_progress', label: 'Em Andamento', color: 'indigo' },
  { key: 'completed', label: 'Finalizada', color: 'green' },
];

const headerColorClasses = {
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  green: 'bg-green-100 text-green-700',
};

export default function GDMKanban({ gdms }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((col) => {
        const columnGdms = gdms.filter((g) => {
          const general = computeGeneralStatus(g.items || []);
          return general.key === col.key;
        });
        return (
          <div key={col.key} className="flex-shrink-0 w-64">
            <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${headerColorClasses[col.color]}`}>
              <span className="text-xs font-semibold">{col.label}</span>
              <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full">
                {columnGdms.length}
              </span>
            </div>

            <div className="bg-slate-100 rounded-b-lg p-2 min-h-[200px] space-y-2">
              {columnGdms.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-6 w-6 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">Nenhuma GDM</p>
                </div>
              ) : (
                columnGdms.map((gdm) => {
                  const general = computeGeneralStatus(gdm.items || []);
                  const suppliers = Array.from(
                    new Set((gdm.items || []).map((i) => i.supplier_name).filter(Boolean)),
                  );
                  return (
                    <Link
                      key={gdm.id}
                      to={`${createPageUrl('GDMDetail')}?id=${gdm.id}`}
                    >
                      <Card className="hover:shadow-md transition-shadow cursor-pointer border-0 bg-white">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-semibold text-sky-700">
                              {gdm.gdm_number}
                            </span>
                            <StatusBadge status={gdm.treatment} type="treatment" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 line-clamp-1">
                              {gdm.equipment_name || 'Equipamento não informado'}
                            </p>
                            {gdm.serial_number && (
                              <p className="text-xs text-slate-500">S/N: {gdm.serial_number}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Ship className="h-3 w-3" />
                            {gdm.vessel_name || '-'}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar className="h-3 w-3" />
                            {gdm.disembark_date
                              ? format(new Date(gdm.disembark_date), 'dd/MM/yyyy', { locale: ptBR })
                              : 'Sem data'}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 pt-1 border-t">
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", general.className)}>
                              {general.label}
                            </span>
                            {general.hasCancelled && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                Reprovados
                              </span>
                            )}
                          </div>
                          {suppliers.length > 0 && (
                            <p className="text-xs text-slate-600 truncate">
                              → {suppliers.join(', ')}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}