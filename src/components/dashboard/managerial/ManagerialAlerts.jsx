import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Repeat, Ship, TrendingUp, Lightbulb } from 'lucide-react';

const ICONS = {
  spike: AlertTriangle,
  repeat: Repeat,
  vessel: Ship,
  trend: TrendingUp,
};

const SEVERITY_STYLES = {
  high: 'border-red-200 bg-red-50',
  medium: 'border-amber-200 bg-amber-50',
  info: 'border-sky-200 bg-sky-50',
};

const SEVERITY_ICONS = {
  high: 'text-red-600',
  medium: 'text-amber-600',
  info: 'text-sky-600',
};

export default function ManagerialAlerts({ alerts = [] }) {
  if (alerts.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-sky-600" />
            Alertas e Inteligência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 py-6 text-center">
            Nenhum alerta no filtro atual — desembarques dentro do padrão histórico.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-sky-600" />
          Alertas e Inteligência
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((a, i) => {
          const Icon = ICONS[a.icon] || AlertTriangle;
          return (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-lg border p-3 ${SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.info}`}
            >
              <Icon className={`h-5 w-5 mt-0.5 ${SEVERITY_ICONS[a.severity] || SEVERITY_ICONS.info}`} />
              <div>
                <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                <p className="text-sm text-slate-600 mt-0.5">{a.message}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}