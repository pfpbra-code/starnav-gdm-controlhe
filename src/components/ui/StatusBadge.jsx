import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  pending_coordinator: { label: "Aguardando Coordenador", color: "bg-amber-100 text-amber-800 border-amber-200" },
  pending_services: { label: "Aguardando Serviços", color: "bg-blue-100 text-blue-800 border-blue-200" },
  sent_to_supplier: { label: "Enviado ao Fornecedor", color: "bg-purple-100 text-purple-800 border-purple-200" },
  awaiting_quote: { label: "Aguardando Cotação", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  quote_analysis: { label: "Em Análise", color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  approved: { label: "Aprovado", color: "bg-green-100 text-green-800 border-green-200" },
  rejected: { label: "Reprovado", color: "bg-red-100 text-red-800 border-red-200" },
  completed: { label: "Concluído", color: "bg-slate-100 text-slate-800 border-slate-200" },
  active: { label: "Ativo", color: "bg-green-100 text-green-800 border-green-200" },
  inactive: { label: "Inativo", color: "bg-gray-100 text-gray-800 border-gray-200" },
  suspended: { label: "Suspenso", color: "bg-orange-100 text-orange-800 border-orange-200" },
  maintenance: { label: "Em Manutenção", color: "bg-orange-100 text-orange-800 border-orange-200" },
};

const treatmentConfig = {
  repair: { label: "Reparo", color: "bg-blue-100 text-blue-800" },
  discard: { label: "Descarte", color: "bg-red-100 text-red-800" },
  stock_return: { label: "Retorno ao Estoque", color: "bg-green-100 text-green-800" },
};

export function StatusBadge({ status, type = "status" }) {
  const config = type === "treatment" ? treatmentConfig[status] : statusConfig[status];
  
  if (!config) return <Badge variant="outline">{status}</Badge>;
  
  return (
    <Badge className={cn("border", config.color)}>
      {config.label}
    </Badge>
  );
}

export default StatusBadge;