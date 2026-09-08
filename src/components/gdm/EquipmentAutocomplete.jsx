import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Search, X, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Busca de material por nome ou código.
 * Se a lista `equipment` for informada, filtra localmente; caso contrário,
 * carrega os equipamentos ativos e filtra localmente (busca normalizada).
 */
export default function EquipmentAutocomplete({ equipment = null, value, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [picked, setPicked] = useState(null);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const localMode = Array.isArray(equipment);

  const { data, isFetching } = useQuery({
    queryKey: ['equipmentList'],
    queryFn: () => base44.entities.Equipment.filter({ status: 'active' }, 'name', 5000),
    enabled: !localMode && open,
  });

  const list = localMode ? equipment : data || [];

  const norm = (s) =>
    String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const results = useMemo(() => {
    if (!query.trim()) return list.slice(0, 100);
    const q = norm(query);
    return list
      .filter((e) => norm(e.name).includes(q) || norm(e.code).includes(q))
      .slice(0, 100);
  }, [list, query]);

  const selected = useMemo(() => {
    if (!value) return null;
    if (localMode) return equipment.find((e) => e.id === value) || null;
    return picked && picked.id === value ? picked : null;
  }, [localMode, equipment, value, picked]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  const pick = (equip) => {
    setPicked(equip);
    onChange(equip.id, equip);
    setQuery('');
    setOpen(false);
  };

  const clear = () => {
    setPicked(null);
    onChange('', null);
    setQuery('');
  };

  const onKey = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && results[highlight]) {
      e.preventDefault();
      pick(results[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.querySelector(`[data-idx="${highlight}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlight, open]);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Package className="h-4 w-4 text-slate-500" />
        Equipamento *
      </Label>
      <div className="relative" ref={containerRef}>
        {selected && !open ? (
          <div className="flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Check className="h-4 w-4 text-sky-600 shrink-0" />
              <span className="truncate font-medium">{selected.name}</span>
              <span className="text-slate-400 shrink-0">({selected.code})</span>
            </div>
            <button
              type="button"
              onClick={clear}
              className="text-slate-400 hover:text-slate-600 shrink-0 ml-2"
              aria-label="Limpar equipamento"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              autoFocus={open}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKey}
              placeholder="Digite para buscar o material por nome ou código..."
              className="pl-9"
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
            )}
          </div>
        )}

        {open && !selected && (
          <div
            ref={listRef}
            className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
          >
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                {isFetching ? 'Buscando...' : `Nenhum material encontrado para "${query}"`}
              </div>
            ) : (
              results.map((equip, i) => (
                <button
                  type="button"
                  key={equip.id}
                  data-idx={i}
                  onMouseDown={(e) => { e.preventDefault(); pick(equip); }}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-b border-slate-50',
                    highlight === i ? 'bg-sky-50' : 'hover:bg-slate-50'
                  )}
                >
                  <span className="font-medium truncate">{equip.name}</span>
                  <span className="text-slate-400 shrink-0">({equip.code})</span>
                </button>
              ))
            )}
            <div className="px-3 py-2 text-xs text-slate-400 border-t">
              Mostrando até 100 resultados · digite para refinar a busca
            </div>
          </div>
        )}
      </div>
    </div>
  );
}