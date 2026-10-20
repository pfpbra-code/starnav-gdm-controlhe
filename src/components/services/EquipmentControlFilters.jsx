import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X, Download } from 'lucide-react';
import EquipmentCombobox from './EquipmentCombobox';

function selectField(value, onChange, options, placeholder) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function dateField(value, onChange, placeholder) {
  return (
    <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} title={placeholder} />
  );
}

/**
 * Filtros combináveis da aba "Dados por Equipamento": equipamento (busca pela
 * nomenclatura), GDM, embarcação, status, fornecedor, responsável de Serviços,
 * datas de desembarque e de abertura, e situação do processo.
 */
export default function EquipmentControlFilters({
  equipmentOptions,
  filters,
  onChange,
  vesselOptions,
  statusOptions,
  supplierOptions,
  responsibleOptions,
  onRefresh,
  onClear,
  onExport,
}) {
  const set = (key) => (value) => onChange(key, value);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          <EquipmentCombobox
            options={equipmentOptions}
            value={filters.equipment}
            onChange={set('equipment')}
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Código da GDM..."
              value={filters.gdm}
              onChange={(e) => onChange('gdm', e.target.value)}
              className="pl-9"
            />
          </div>
          {selectField(filters.vessel, set('vessel'), vesselOptions, 'Embarcação')}
          {selectField(filters.status, set('status'), statusOptions, 'Status atual')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-2">
          {selectField(filters.supplier, set('supplier'), supplierOptions, 'Fornecedor')}
          {selectField(filters.responsible, set('responsible'), responsibleOptions, 'Responsável de Serviços')}
          {selectField(
            filters.situation,
            set('situation'),
            [
              { value: 'all', label: 'Situação: todas' },
              { value: 'open', label: 'Aberto' },
              { value: 'in_progress', label: 'Em andamento' },
              { value: 'completed', label: 'Finalizado' },
              { value: 'cancelled', label: 'Cancelado' },
            ],
            'Situação do processo',
          )}
          <div className="grid grid-cols-2 gap-2">
            {dateField(filters.disembarkFrom, set('disembarkFrom'), 'Desembarque: de')}
            {dateField(filters.disembarkTo, set('disembarkTo'), 'Desembarque: até')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {dateField(filters.createdFrom, set('createdFrom'), 'Abertura da GDM: de')}
            {dateField(filters.createdTo, set('createdTo'), 'Abertura da GDM: até')}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <Button size="sm" onClick={onRefresh} className="gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Filtrar
          </Button>
          <Button size="sm" variant="outline" onClick={onClear} className="gap-1.5">
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </Button>
          <Button size="sm" variant="outline" onClick={onExport} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Exportar resultados
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}