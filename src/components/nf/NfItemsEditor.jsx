import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { fmtNfMoney } from '@/lib/nfRequest';

/**
 * Itens (equipamentos) da solicitação de NF: preenchidos automaticamente com o
 * item da GDM e totalmente editáveis — adicionar, corrigir ou remover linhas.
 */
export default function NfItemsEditor({ items, onChange }) {
  const update = (idx, key, value) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const add = () =>
    onChange([
      ...items,
      {
        code: '',
        name: '',
        serial_number: '',
        quantity: 1,
        unit: 'UN',
        unit_value: 0,
        description: '',
      },
    ]);

  return (
    <div className="space-y-2">
      {items.map((it, idx) => (
        <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              placeholder="Código"
              value={it.code || ''}
              onChange={(e) => update(idx, 'code', e.target.value)}
            />
            <Input
              className="md:col-span-2"
              placeholder="Equipamento"
              value={it.name || ''}
              onChange={(e) => update(idx, 'name', e.target.value)}
            />
            <Input
              placeholder="Número de Série (SN)"
              value={it.serial_number || ''}
              onChange={(e) => update(idx, 'serial_number', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
            <Input
              type="number"
              min="1"
              className="md:col-span-2"
              placeholder="Qtd"
              value={it.quantity ?? 1}
              onChange={(e) => update(idx, 'quantity', Number(e.target.value) || 0)}
            />
            <Input
              className="md:col-span-2"
              placeholder="Unidade"
              value={it.unit || ''}
              onChange={(e) => update(idx, 'unit', e.target.value)}
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              className="md:col-span-2"
              placeholder="Valor unit. (R$)"
              value={it.unit_value ?? ''}
              onChange={(e) => update(idx, 'unit_value', Number(e.target.value) || 0)}
            />
            <Input
              className="md:col-span-3"
              placeholder="Descrição"
              value={it.description || ''}
              onChange={(e) => update(idx, 'description', e.target.value)}
            />
            <div className="md:col-span-2 text-sm font-semibold text-slate-700 md:text-right">
              {fmtNfMoney((Number(it.quantity) || 0) * (Number(it.unit_value) || 0))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-red-600 md:col-span-1"
              onClick={() => remove(idx)}
              title="Remover item"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" />
        Adicionar item
      </Button>
    </div>
  );
}