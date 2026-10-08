import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, RotateCcw, Ship, Boxes, Building2, Package, Wrench, Gauge } from 'lucide-react';
import { EMPTY_FILTERS } from '@/lib/managerialDashboard';
import { DESTINATION_LABELS } from '@/lib/gdmOverview';

const ALL = 'all';

function FilterSelect({ label, icon: Icon, value, options, onChange, placeholder }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500 flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          {options.map((opt) =>
            typeof opt === 'string' ? (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ) : (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function ManagerialFilters({ filters, setFilters, options }) {
  const set = (field) => (v) => setFilters((f) => ({ ...f, [field]: v }));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Filter className="h-4 w-4 text-sky-600" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">De</Label>
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => set('from')(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Até</Label>
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => set('to')(e.target.value)}
            />
          </div>
          <FilterSelect label="Embarcação" icon={Ship} value={filters.vessel} options={options.vessels} onChange={set('vessel')} />
          <FilterSelect label="Destino" icon={Wrench} value={filters.destination} options={Object.entries(DESTINATION_LABELS).map(([value, label]) => ({ value, label }))} onChange={set('destination')} />
          <FilterSelect label="Fabricante" icon={Building2} value={filters.manufacturer} options={options.manufacturers} onChange={set('manufacturer')} />
          <FilterSelect label="Fornecedor" icon={Package} value={filters.supplier} options={options.suppliers} onChange={set('supplier')} />
          <FilterSelect label="Equipamento" icon={Boxes} value={filters.equipment} options={options.equipment} onChange={set('equipment')} />
          <div className="flex flex-wrap gap-2">
            <FilterSelect label="Status" icon={Gauge} value={filters.status} options={options.statuses} onChange={set('status')} />
            <Button
              variant="outline"
              size="sm"
              className="mt-6"
              onClick={() => setFilters(EMPTY_FILTERS)}
              title="Limpar filtros"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}