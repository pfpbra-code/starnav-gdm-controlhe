import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { compressImage } from '@/lib/gdmPhotos';

/**
 * Campo de foto única (valor = URL): "Tirar Foto" abre a câmera do
 * dispositivo (celulares e tablets) e "Escolher da galeria" seleciona uma
 * imagem salva. Comprime antes do upload e mostra miniatura com remoção.
 */
export default function PhotoUrlField({ label, value, onChange, required = true }) {
  const cameraRef = useRef(null);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const res = await base44.integrations.Core.UploadPublicFile({ file: compressed });
      onChange(res.file_url);
      toast.success('Foto anexada');
    } catch (error) {
      toast.error('Erro ao anexar a foto');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleInput = (e) => {
    upload(e.target.files?.[0]);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInput}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInput}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="bg-sky-600 hover:bg-sky-700"
          disabled={uploading}
          onClick={() => cameraRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Camera className="h-4 w-4 mr-2" />
          )}
          Tirar Foto
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4 mr-2" />
          Escolher da galeria
        </Button>
        {value && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            onClick={() => onChange('')}
          >
            <X className="h-4 w-4 mr-1" />
            Remover
          </Button>
        )}
      </div>
      {value && (
        <img
          src={value}
          alt={label}
          className="h-24 w-auto rounded-md border border-slate-200 object-cover"
        />
      )}
    </div>
  );
}