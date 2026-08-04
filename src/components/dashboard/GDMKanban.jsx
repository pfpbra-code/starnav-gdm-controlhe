import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Ship, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const columns = [
  { key: 'pending_coordinator', label: 'Aguardando Coordenador', color: 'amber' },
  { key: 'pending_services', label: 'Aguardando Serviços', color: 'blue' },
  { key: 'sent_to_supplier', label: 'Enviado ao Fornecedor', color: 'purple' },
  { key: 'awaiting_quote', label: 'Aguardando Cotação', color: 'cyan' },
  { key: 'quote_analysis', label: 'Análise de Cotação', color: 'indigo' },
  { key: 'approved', label: 'Aprovado', color: 'green' },
  { key: 'completed', label: 'Concluído', color: 'emerald' },
  { key: 'rejected', label: 'Rejeitado', color: 'red' },
];

const headerColorClasses = {
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  green: 'bg-green-100 text-green-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
};

export default function GDMKanban({ gdms }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => {
        const columnGdms = gdms.filter((g) => g.status === col.key);
        return (
          <div key={col.key} className="flex-shrink-0 w-72">
            <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${headerColorClasses[col.color]}`}>
              <span className="text-sm font-semibold">{col.label}</span>
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
                columnGdms.map((gdm) => (
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
                          <StatusBadge treatment={gdm.treatment} />
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
                        {gdm.supplier_name && (
                          <p className="text-xs text-slate-600 truncate pt-1 border-t">
                            → {gdm.supplier_name}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}