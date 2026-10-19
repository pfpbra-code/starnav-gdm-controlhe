import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PenLine, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SignaturePad from './SignaturePad';
import { getSignatureUrl, saveSignatureImage } from '@/lib/signatures';

/**
 * Seção "Assinatura Eletrônica" do Meu Perfil: criação e alteração da
 * assinatura do próprio usuário, com histórico de alterações registrado
 * na conta (auditoria).
 */
export default function SignatureSection({ user }) {
  const queryClient = useQueryClient();
  const [padOpen, setPadOpen] = useState(false);

  const signatureUrl = getSignatureUrl(user);
  const updatedAt = user?.signature_updated_at || user?.data?.signature_updated_at || '';
  const history = user?.signature_history || user?.data?.signature_history || [];

  const saveMutation = useMutation({
    mutationFn: async (dataUrl) => {
      const fileUrl = await saveSignatureImage(dataUrl);
      const previousHistory = (
        user?.signature_history || user?.data?.signature_history || []
      ).slice(-9);
      const now = new Date().toISOString();
      return base44.auth.updateMe({
        signature_url: fileUrl,
        signature_updated_at: now,
        signature_history: [
          ...previousHistory,
          { updated_at: now, previous_url: signatureUrl || null },
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success(
        signatureUrl ? 'Assinatura eletrônica atualizada!' : 'Assinatura eletrônica cadastrada!'
      );
      setPadOpen(false);
    },
    onError: () => toast.error('Não foi possível salvar a assinatura'),
  });

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PenLine className="h-5 w-5 text-sky-600" />
            Assinatura Eletrônica
          </CardTitle>
          <CardDescription>
            Sua assinatura é vinculada à sua conta e registrada em cada aprovação,
            validação e confirmação que você executar na plataforma. Nenhuma ação
            crítica pode ser executada sem ela.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {signatureUrl ? (
            <>
              <div className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-3">
                <img
                  src={signatureUrl}
                  alt="Assinatura eletrônica"
                  className="h-14 max-w-[280px] object-contain object-left"
                />
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                {updatedAt
                  ? `Assinatura atualizada em ${format(new Date(updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                  : 'Assinatura cadastrada'}
                {history.length > 1 &&
                  ` · ${history.length - 1} alteração(ões) anterior(es) registrada(s) em auditoria`}
              </p>
            </>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Você ainda não cadastrou sua assinatura eletrônica. Sem ela, você não
              poderá aprovar, validar, autorizar ou confirmar etapas do fluxo da GDM.
            </div>
          )}
          <Button onClick={() => setPadOpen(true)}>
            <PenLine className="h-4 w-4" />
            {signatureUrl ? 'Alterar minha assinatura' : 'Criar minha assinatura'}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={padOpen} onOpenChange={(open) => !open && setPadOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assinatura Eletrônica</DialogTitle>
            <DialogDescription>
              Desenhe com o mouse ou com o dedo, envie uma imagem da sua assinatura
              ou digite seu nome para gerá-la. Somente você pode cadastrar ou alterar
              sua assinatura; toda alteração fica registrada em auditoria.
            </DialogDescription>
          </DialogHeader>
          <SignaturePad
            saving={saveMutation.isPending}
            onCancel={() => setPadOpen(false)}
            onConfirm={(dataUrl) => saveMutation.mutate(dataUrl)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}