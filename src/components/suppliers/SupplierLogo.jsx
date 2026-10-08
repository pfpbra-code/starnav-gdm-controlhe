import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Foto/logomarca do fornecedor — arquivo privado exibido via URL assinada.
 * Fallback: ícone padrão quando não há foto ou enquanto carrega.
 */
export default function SupplierLogo({ uri, imgClassName, fallbackClassName }) {
  const { data: signedUrl } = useQuery({
    queryKey: ['supplierLogoUrl', uri],
    queryFn: async () =>
      (
        await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: uri,
          expires_in: 3600,
        })
      ).signed_url,
    enabled: !!uri,
    staleTime: 55 * 60 * 1000,
  });

  if (!uri) {
    return (
      <div className={cn('bg-sky-50 flex items-center justify-center shrink-0', fallbackClassName)}>
        <Building2 className="h-4 w-4 text-sky-600" />
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className={cn('bg-sky-50 flex items-center justify-center shrink-0 animate-pulse', fallbackClassName)}>
        <Building2 className="h-4 w-4 text-sky-400" />
      </div>
    );
  }

  return <img src={signedUrl} alt="Logomarca do fornecedor" className={cn('object-cover shrink-0', imgClassName)} />;
}