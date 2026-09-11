import React from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';
import { warrantyInfo, WARRANTY_STATUS_LABELS } from '@/lib/gdmItems';

const STYLES = {
  active: 'bg-green-100 text-green-800 border-green-200',
  expired: 'bg-red-100 text-red-700 border-red-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  none: 'bg-slate-100 text-slate-600 border-slate-200',
};

const ICONS = {
  active: ShieldCheck,
  expired: ShieldAlert,
  pending: Shield,
  none: ShieldOff,
};

/** Selo da situação da garantia do item (vigente, vencida, aguardando início). */
export default function WarrantyStatusBadge({ item }) {
  const info = warrantyInfo(item);
  const Icon = ICONS[info.status];
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${STYLES[info.status]}`}
    >
      <Icon className="h-3 w-3" />
      {WARRANTY_STATUS_LABELS[info.status]}
    </span>
  );
}