import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ship, Calendar, Package, Eye, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function GDMCard({ gdm, showActions = true }) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">GDM</p>
            <h3 className="text-lg font-bold text-slate-900">{gdm.gdm_number}</h3>
          </div>
          <StatusBadge status={gdm.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Ship className="h-4 w-4 text-slate-400" />
            <span>{gdm.vessel_name || 'Embarcação não definida'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Package className="h-4 w-4 text-slate-400" />
            <span>{gdm.equipment_name || 'Equipamento não definido'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>
              {gdm.disembark_date 
                ? format(new Date(gdm.disembark_date), "dd/MM/yyyy", { locale: ptBR })
                : 'Data não definida'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={gdm.treatment} type="treatment" />
        </div>

        {showActions && (
          <div className="pt-2 border-t">
            <Link to={createPageUrl(`GDMDetail?id=${gdm.id}`)}>
              <Button 
                variant="ghost" 
                className="w-full justify-between group-hover:bg-sky-50 group-hover:text-sky-700"
              >
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Ver detalhes
                </span>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}