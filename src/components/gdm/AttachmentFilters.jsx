import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DOCUMENT_CATEGORIES } from '@/lib/itemDocuments';

/** Filtros do repositório de documentos: tipo, categoria, usuário e período. */
export default function AttachmentFilters({ filters, setFilters, typeOptions, userOptions }) {
  const update = (patch) => setFilters((prev) => ({ ...prev, ...patch }));
  const hasFilters =
    filters.type !== 'all' ||
    filters.category !== 'all' ||
    filters.user !== 'all' ||
    !!filters.from ||
    !!filters.to;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
      <Select value={filters.type} onValueChange={(v) => update({ type: v })}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Tipo de documento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {typeOptions.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.category} onValueChange={(v) => update({ category: v })}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as categorias</SelectItem>
          {DOCUMENT_CATEGORIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.user} onValueChange={(v) => update({ user: v })}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Usuário" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os usuários</SelectItem>
          {userOptions.map((u) => (
            <SelectItem key={u} value={u}>
              {u}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Input
          type="date"
          className="h-9"
          value={filters.from}
          onChange={(e) => update({ from: e.target.value })}
          aria-label="Data inicial"
        />
        <span className="text-xs text-slate-400">até</span>
        <Input
          type="date"
          className="h-9"
          value={filters.to}
          onChange={(e) => update({ to: e.target.value })}
          aria-label="Data final"
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!hasFilters}
        onClick={() =>
          setFilters({ type: 'all', category: 'all', user: 'all', from: '', to: '' })
        }
      >
        Limpar filtros
      </Button>
    </div>
  );
}