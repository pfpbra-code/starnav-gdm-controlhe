import React from 'react';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { SIGNATURE_MISSING_MESSAGE } from '@/lib/signatures';

/**
 * Etapa de assinatura eletrônica embutida nos diálogos de ação: exibe a
 * assinatura do usuário e exige a declaração de responsabilidade. Sem
 * assinatura cadastrada, exibe a mensagem de obrigatoriedade e o atalho
 * para o Meu Perfil (a ação fica bloqueada).
 */
export default function SignatureConfirmStep({ signatureUrl, checked, onChange }) {
  if (!signatureUrl) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-800">
          <p className="font-medium">{SIGNATURE_MISSING_MESSAGE}</p>
          <Link to="/MyProfile" className="underline font-semibold">
            Ir para Meu Perfil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
        Assinatura Eletrônica
      </p>
      <div className="inline-flex rounded-md bg-white border border-slate-200 px-3 py-1.5">
        <img
          src={signatureUrl}
          alt="Assinatura eletrônica do usuário"
          className="h-11 max-w-[240px] object-contain object-left"
        />
      </div>
      <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
        <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} className="mt-0.5" />
        <span>
          Confirmo que sou o responsável por esta ação e autorizo o registro com a
          minha assinatura eletrônica, com data, hora e dados de auditoria.
        </span>
      </label>
    </div>
  );
}