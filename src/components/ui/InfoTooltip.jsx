import React, { useState } from "react";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Tooltip informativo para cards e indicadores.
 *
 * `content` aceita:
 *  - string: descrição simples e objetiva.
 *  - objeto: { conceito, formula?, objetivo?, origem?, periodicidade? }
 *
 * Desktop: exibido ao passar o mouse sobre o ícone de ajuda.
 * Mobile: exibido ao tocar/clicar no ícone (toque novamente para fechar).
 */
export default function InfoTooltip({ content, side = "top", align = "center", className }) {
  const [open, setOpen] = useState(false);
  if (!content) return null;

  const sections =
    typeof content === "string" ? { conceito: content } : content;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Mais informações sobre este indicador"
            className={cn(
              "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-sky-100 hover:text-sky-600 focus:outline-none",
              className
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen((o) => !o);
            }}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          sideOffset={4}
          className="max-w-xs border border-slate-200 bg-white px-3 py-2.5 text-left text-xs leading-relaxed text-slate-600 shadow-lg"
        >
          <div className="space-y-1.5">
            {sections.conceito && (
              <p className="font-semibold text-slate-900">{sections.conceito}</p>
            )}
            {sections.formula && (
              <p className="rounded bg-slate-100 px-1.5 py-1 font-mono text-[11px] text-slate-800">
                {sections.formula}
              </p>
            )}
            {sections.objetivo && <p>{sections.objetivo}</p>}
            {sections.origem && (
              <p>
                <span className="font-semibold text-slate-700">Origem dos dados:</span>{" "}
                {sections.origem}
              </p>
            )}
            {sections.periodicidade && (
              <p>
                <span className="font-semibold text-slate-700">Atualização:</span>{" "}
                {sections.periodicidade}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}