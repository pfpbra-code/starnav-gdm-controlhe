import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Printer, Loader2, ExternalLink } from 'lucide-react';
import { ITEM_DESTINATION_LABELS } from '@/lib/gdmItems';

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

export function itemPublicUrl(itemId) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/ItemPublic/${itemId}`;
}

export function itemQrImageUrl(itemId, size = 320) {
  return `${QR_API}?size=${size}x${size}&margin=10&data=${encodeURIComponent(itemPublicUrl(itemId))}`;
}

export default function GDMItemQrCode({ item, gdm, variant = 'outline', size = 'sm', label = 'QR do item' }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!item?.id) return null;

  const url = itemPublicUrl(item.id);
  const img = itemQrImageUrl(item.id, 320);

  const handlePrint = () => {
    const w = window.open(img, '_blank');
    if (w && w.print) w.print();
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <QrCode className="h-4 w-4 mr-1" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>QR Code do equipamento</DialogTitle>
            <DialogDescription>
              Código único deste item. Ao escanear, abre a consulta pública (somente leitura)
              com o histórico e a documentação deste equipamento — sem necessidade de login.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center py-4 gap-4">
            <div className="relative">
              {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              )}
              <img
                src={img}
                alt={`QR Code do item ${item.item_number}`}
                width={260}
                height={260}
                onLoad={() => setLoaded(true)}
                className="rounded-lg border border-slate-200 bg-white"
              />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-900">{item.equipment_name}</p>
              <p className="text-sm text-slate-500">
                {item.equipment_code || '—'} • Série {item.serial_number || '—'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                GDM {gdm?.gdm_number || ''} • Item {String(item.item_number).padStart(2, '0')}
              </p>
            </div>
            <div className="w-full p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">Link associado</p>
              <p className="text-xs text-sky-700 break-all">{url}</p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <Button variant="outline" size="sm" asChild>
              <a href={img} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                Baixar imagem
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir etiqueta
            </Button>
            <Button className="bg-sky-600 hover:bg-sky-700" size="sm" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir consulta
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}