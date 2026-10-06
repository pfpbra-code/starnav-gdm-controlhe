import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

const EMPTY_FILTERS = {
  sn: "",
  equipment: "",
  manufacturer: "",
  model: "",
  vessel: "",
  supplier: "",
  from: "",
  to: "",
};

/** Filtros de consulta de confiabilidade: SN, equipamento, fabricante,
 * modelo, embarcação, fornecedor, período e tipo de manutenção. */
export default function ReliabilityFilters({ filters, onChange }) {
  const set = (key, value) => onChange({ ...filters, ...{ [key]: value } });
  const hasActiveFilter =
    Object.values(EMPTY_FILTERS).some((v, i) => filters[Object.keys(EMPTY_FILTERS)[i]]) ||
    filters.destination !== "all";

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Número de Série (SN)"
              value={filters.sn}
              onChange={(e) => set("sn", e.target.value)}
            />
          </div>
          <Input
            placeholder="Equipamento"
            value={filters.equipment}
            onChange={(e) => set("equipment", e.target.value)}
          />
          <Input
            placeholder="Fabricante"
            value={filters.manufacturer}
            onChange={(e) => set("manufacturer", e.target.value)}
          />
          <Input
            placeholder="Modelo"
            value={filters.model}
            onChange={(e) => set("model", e.target.value)}
          />
          <Input
            placeholder="Embarcação"
            value={filters.vessel}
            onChange={(e) => set("vessel", e.target.value)}
          />
          <Input
            placeholder="Fornecedor de reparo"
            value={filters.supplier}
            onChange={(e) => set("supplier", e.target.value)}
          />
        </div>
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="w-full md:w-56 space-y-1">
            <span className="text-xs text-slate-500">Tipo de manutenção</span>
            <Select
              value={filters.destination}
              onValueChange={(value) => set("destination", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="repair">Reparo</SelectItem>
                <SelectItem value="certification">Calibração</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-44 space-y-1">
            <span className="text-xs text-slate-500">Período — de</span>
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => set("from", e.target.value)}
            />
          </div>
          <div className="w-full md:w-44 space-y-1">
            <span className="text-xs text-slate-500">até</span>
            <Input type="date" value={filters.to} onChange={(e) => set("to", e.target.value)} />
          </div>
          {hasActiveFilter && (
            <Button
              variant="outline"
              className="md:ml-auto"
              onClick={() => onChange({ ...EMPTY_FILTERS, destination: "all" })}
            >
              <X className="h-4 w-4 mr-2" />
              Limpar filtros
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}