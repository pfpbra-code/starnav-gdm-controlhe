import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  pending_coordinator: { label: "GDM Emitida", color: "bg-amber-100 text-amber-800 border-amber-200" },
  pending_services: { label: "Aguardando Serviços/Compras", color: "bg-blue-100 text-blue-800 border-blue-200" },
  sent_to_supplier: { label: "Enviado ao Fornecedor", color: "bg-purple-100 text-purple-800 border-purple-200" },
  awaiting_quote: { label: "Aguardando Cotação", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  quote_attached: { label: "Cotação Anexada", color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  quote_analysis: { label: "Em Aprovação da Manutenção", color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  new_quote_requested: { label: "Nova Cotação Solicitada", color: "bg-orange-100 text-orange-800 border-orange-200" },
  approved: { label: "Cotação Aprovada", color: "bg-green-100 text-green-800 border-green-200" },
  pwt_issued: { label: "PWT Emitido", color: "bg-teal-100 text-teal-800 border-teal-200" },
  oc_issued: { label: "OC Emitida", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  ot_issued: { label: "OT Emitida", color: "bg-lime-100 text-lime-800 border-lime-200" },
  completed: { label: "Processo Finalizado", color: "bg-slate-100 text-slate-800 border-slate-200" },
  rejected: { label: "Reprovada", color: "bg-red-100 text-red-800 border-red-200" },
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