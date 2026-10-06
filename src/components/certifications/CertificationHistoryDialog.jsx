import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileBadge, FileImage } from 'lucide-react';
import { CERT_STATUS, daysUntil } from '@/lib/certifications';

const fmtDate = (d) => (d ? format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) : '—');

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 text-right">{value}</span>
    </div>
  );
}

/** Consulta por equipamento: histórico completo de certificações do SN. */
export default function CertificationHistoryDialog({ record, onClose }) {
  if (!record) return null;

  const statusCfg =
    CERT_STATUS[record.status] || { label: record.status, color: 'bg-slate-100 text-slate-700' };
  const left = record.daysLeft;

  return (
    <Dialog open={!!record} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de certificações — {record.equipmentName}</DialogTitle>
          <DialogDescription>
            SN {record.sn} · {record.equipmentCode || '—'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 p-3 space-y-2">
            <Row
              label="Status atual"
              value={
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusCfg.color}`}>
                  {statusCfg.label}
                </span>
              }
            />
            <Row label="Quantidade de certificações realizadas" value={record.certificationsCount} />
            <Row label="Última certificação" value={fmtDate(record.lastCertDate)} />
            <Row
              label="Próximo vencimento"
              value={
                left != null
                  ? `${fmtDate(record.nextExpiry)} (${left < 0 ? `vencido há ${Math.abs(left)} dia(s)` : left === 0 ? 'vence hoje' : `${left} dia(s)`})`
                  : '—'
              }
            />
            <Row label="Embarcações" value={record.vessels.join(', ') || '—'} />
          </div>

          {record.currentCert && (
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-2">Certificado atual</p>
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm space-y-1.5">
                <Row label="Número" value={record.currentCert.certificate_number || '—'} />
                <Row label="Empresa certificadora" value={record.currentCert.certifying_company || '—'} />
                <Row label="Data do certificado" value={fmtDate(record.currentCert.certificate_date)} />
                <Row label="Vencimento" value={fmtDate(record.currentCert.expires_at)} />
                <Row label="Registrado por" value={record.currentCert.registered_by || '—'} />
                <div className="flex items-center gap-3 pt-1">
                  {record.currentCert.document_url && (
                    <a
                      href={record.currentCert.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-700 hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      <FileBadge className="h-3.5 w-3.5" />
                      Ver PDF
                    </a>
                  )}
                  {record.currentCert.image_url && (
                    <a
                      href={record.currentCert.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-700 hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      <FileImage className="h-3.5 w-3.5" />
                      Ver imagem
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-slate-800 mb-2">
              Histórico completo (do mais recente ao mais antigo)
            </p>
            {record.history.length === 0 ? (
              <p className="text-sm text-slate-400">
                Nenhum certificado registrado para este SN.
              </p>
            ) : (
              <ol className="space-y-2">
                {record.history.map((c, idx) => {
                  const expired = c.expires_at ? new Date(c.expires_at) < new Date() : null;
                  return (
                    <li
                      key={c.id || idx}
                      className="rounded-lg border border-slate-200 p-3 text-sm space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-800">
                          {c.certificate_number || 'Certificado sem número'}
                        </span>
                        {expired != null && (
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              expired
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {expired ? 'Vencido' : 'Vigente'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {c.certifying_company || '—'} · Emissão {fmtDate(c.certificate_date)} ·
                        Vencimento {fmtDate(c.expires_at)}
                      </p>
                      {c.observations && (
                        <p className="text-xs text-slate-500">{c.observations}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}