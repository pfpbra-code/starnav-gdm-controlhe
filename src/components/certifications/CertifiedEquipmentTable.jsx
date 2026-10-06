import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileBadge, History, FileCheck2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CERT_STATUS } from '@/lib/certifications';

const fmtDate = (d) => (d ? format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) : '—');

const daysLeftLabel = (days) => {
  if (days == null) return '—';
  if (days < 0) return `Vencido há ${Math.abs(days)} dia(s)`;
  if (days === 0) return 'Vence hoje';
  return `${days} dia(s)`;
};

/** Tabela de equipamentos monitorados com o status da certificação atual. */
export default function CertifiedEquipmentTable({ records, canRegister, onRegister, onHistory }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        {records.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Nenhum equipamento de calibração/certificação com os filtros atuais. Itens de GDM
            com destino Calibração e Número de Série preenchido aparecem aqui
            automaticamente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-2.5 font-medium">Equipamento</th>
                  <th className="px-4 py-2.5 font-medium">SN</th>
                  <th className="px-4 py-2.5 font-medium">Embarcação</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Certificado atual</th>
                  <th className="px-4 py-2.5 font-medium">Vencimento</th>
                  <th className="px-4 py-2.5 font-medium">Prazo</th>
                  <th className="px-4 py-2.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const awaiting =
                    r.status === 'awaiting_certificate' || r.status === 'awaiting_validity';
                  const statusCfg = CERT_STATUS[r.status] || { label: r.status, color: 'bg-slate-100 text-slate-700' };
                  return (
                    <tr key={r.sn} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-800">{r.equipmentName}</p>
                        <p className="text-xs text-slate-400">
                          {[r.equipmentCode, r.manufacturer, r.model].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{r.sn}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.vesselName || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {r.currentCert ? (
                          <>
                            <p className="font-medium">{r.currentCert.certificate_number || '—'}</p>
                            <p className="text-xs text-slate-400">
                              {fmtDate(r.currentCert.certificate_date)} ·{' '}
                              {r.currentCert.certifying_company || '—'}
                            </p>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{fmtDate(r.nextExpiry)}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-xs font-medium ${
                            r.daysLeft != null && r.daysLeft < 0
                              ? 'text-red-600'
                              : r.daysLeft != null && r.daysLeft <= 30
                                ? 'text-amber-600'
                                : 'text-slate-600'
                          }`}
                        >
                          {daysLeftLabel(r.daysLeft)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {awaiting && canRegister && r.openItem && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 text-sky-700 border-sky-200 hover:bg-sky-50"
                              onClick={() => onRegister(r.openItem)}
                            >
                              <FileCheck2 className="h-3.5 w-3.5" />
                              Registrar certificado
                            </Button>
                          )}
                          {r.currentCert?.document_url && (
                            <a
                              href={r.currentCert.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-sky-600 hover:underline inline-flex items-center gap-1"
                            >
                              <FileBadge className="h-3.5 w-3.5" />
                              PDF
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1 text-slate-600"
                            onClick={() => onHistory(r)}
                          >
                            <History className="h-3.5 w-3.5" />
                            Histórico
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}