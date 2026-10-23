import React from 'react';
import { fmtNfDateTime } from '@/lib/nfRequest';

/**
 * Auditoria da solicitação de NF: cada alteração manual após o preenchimento
 * automático — campo, valor anterior, novo valor, usuário e data/hora.
 */
export default function NfAuditList({ changes = [] }) {
  if (!changes.length) {
    return (
      <p className="text-sm text-slate-500">
        Nenhuma alteração manual registrada desde o preenchimento automático.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {changes.map((c, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <p className="font-medium text-slate-800">{c.field_label || c.field}</p>
          <p className="text-slate-600 mt-0.5">
            <span className="text-red-600">Anterior:</span> {String(c.previous_value ?? '') || '—'}
          </p>
          <p className="text-slate-600">
            <span className="text-green-700">Novo:</span> {String(c.new_value ?? '') || '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {c.changed_by_name || c.changed_by || '—'} · {fmtNfDateTime(c.changed_at)}
          </p>
        </div>
      ))}
    </div>
  );
}