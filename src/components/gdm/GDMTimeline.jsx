import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import {
  FileText,
  CheckCircle,
  XCircle,
  Send,
  DollarSign,
  Wrench,
  Clock,
  AlertCircle
} from 'lucide-react';

const actionIcons = {
  created: FileText,
  coordinator_approved: CheckCircle,
  coordinator_rejected: XCircle,
  sent_to_supplier: Send,
  quote_received: DollarSign,
  maintenance_approved: CheckCircle,
  maintenance_rejected: XCircle,
  discount_requested: AlertCircle,
  completed: CheckCircle,
  default: Clock
};

const actionColors = {
  created: "bg-blue-100 text-blue-600",
  coordinator_approved: "bg-green-100 text-green-600",
  coordinator_rejected: "bg-red-100 text-red-600",
  sent_to_supplier: "bg-purple-100 text-purple-600",
  quote_received: "bg-amber-100 text-amber-600",
  maintenance_approved: "bg-green-100 text-green-600",
  maintenance_rejected: "bg-red-100 text-red-600",
  discount_requested: "bg-orange-100 text-orange-600",
  completed: "bg-slate-100 text-slate-600",
  default: "bg-gray-100 text-gray-600"
};

export default function GDMTimeline({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum histórico disponível</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {history.map((event, idx) => {
          const Icon = actionIcons[event.action] || actionIcons.default;
          const colorClass = actionColors[event.action] || actionColors.default;
          const isLast = idx === history.length - 1;

          return (
            <li key={idx}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className="text-sm text-slate-900">{event.details}</p>
                      <p className="mt-0.5 text-xs text-slate-500">por {event.user}</p>
                    </div>
                    <div className="whitespace-nowrap text-right text-xs text-slate-500">
                      {event.timestamp && format(new Date(event.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}