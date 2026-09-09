import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { canAccessModule } from '@/lib/permissions';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ShieldX } from 'lucide-react';

/**
 * Protege rotas por permissão — aplicada no frontend, além do menu.
 * O backend/RLS continua sendo a barreira definitiva.
 */
export default function RequirePermission({ module, children }) {
  const { user, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  if (!canAccessModule(user, module)) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-16 text-center">
          <ShieldX className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">Acesso Negado</h2>
          <p className="text-slate-500 mt-1">
            Você não possui permissão para acessar este módulo.
            Solicite acesso ao administrador.
          </p>
        </CardContent>
      </Card>
    );
  }

  return children;
}