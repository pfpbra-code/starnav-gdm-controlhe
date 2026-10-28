import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip } from 'lucide-react';
import { hasPermission } from '@/lib/permissions';
import ItemAttachmentsDialog from './ItemAttachmentsDialog';

/** Botão de acesso ao repositório de documentos do item (somente autorizados). */
export default function ItemAttachmentsButton({
  item,
  gdm,
  user,
  variant = 'outline',
  size = 'sm',
  className,
}) {
  const [open, setOpen] = useState(false);
  if (!item || !hasPermission(user, 'view_item_attachments')) return null;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Paperclip className="h-4 w-4 mr-1" />
        Anexos
      </Button>
      <ItemAttachmentsDialog
        item={item}
        gdm={gdm}
        user={user}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}