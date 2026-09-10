import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Eye, History as HistoryIcon } from 'lucide-react';
import {
  ITEM_DESTINATION_LABELS,
  ITEM_DESTINATION_COLORS,
  ITEM_STATUS_LABELS,
  ITEM_STATUS_COLORS,
  availableItemActions,
  itemResponsible,
} from '@/lib/gdmItems';
import ItemActionDialog from './ItemActionDialog';
import ItemHistoryTimeline from './ItemHistoryTimeline';

/**
 * Card de item dos painéis setoriais (Manutenção / Operações).
 * Exibe as ações da etapa atual diretamente no card — mesma fonte de
 * verdade da GDM completa (availableItemActions + gdmItemAction).
 */
export default function SectorItemCard({ item, gdm, hasPermission, user }) {
  const [pending, setPending] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const actions = availableItemActions(item, hasPermission, user);
  const needsMe = actions.some((a) => !a.destructive);

  return (
    <div
      className={`rounded-lg border p-4 flex flex-col ${
        needsMe ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium truncate">
            {String(item.item_number).padStart(2, '0')} · {item.equipment_name}
          </p>
          <p className="text-xs text-slate-500">
            Serial: {item.serial_number || '—'} · Qtd: {item.quantity || 1}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${
            ITEM_DESTINATION_COLORS[item.destination] || ''
          }`}
        >
          {ITEM_DESTINATION_LABELS[item.destination] || item.destination}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            ITEM_STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-700'
          }`}
        >
          {ITEM_STATUS_LABELS[item.status] || item.status}
        </span>
        <span className="text-xs text-slate-500 truncate">
          {item.supplier_name || itemResponsible(item)}
        </span>
      </div>

      {/* Ações diretas da etapa atual */}
      {actions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button
              key={a.action}
              size="sm"
              variant={a.destructive ? 'outline' : 'default'}
              className={a.destructive ? 'text-red-600 border-red-200 bg-white' : ''}
              onClick={() => setPending({ item, ...a })}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}

      {/* Rodapé: histórico + consulta detalhada */}
      <div className="mt-3 pt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-sky-600"
        >
          <HistoryIcon className="h-3 w-3" />
          {showHistory ? 'Ocultar histórico' : 'Histórico'}
        </button>
        <Link
          to={createPageUrl(`GDMDetail?id=${gdm.id}`)}
          className="flex items-center gap-1 text-xs text-sky-600 hover:underline"
        >
          <Eye className="h-3 w-3" />
          Ver GDM completa
        </Link>
      </div>

      {showHistory && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <ItemHistoryTimeline itemId={item.id} />
        </div>
      )}

      <ItemActionDialog pending={pending} onClose={() => setPending(null)} />
    </div>
  );
}