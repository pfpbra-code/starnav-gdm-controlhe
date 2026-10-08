import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { PHOTO_CATEGORIES, compressImage } from '@/lib/gdmPhotos';

/**
 * Campo de captura de evidências fotográficas.
 * - "Tirar Foto": abre a câmera do dispositivo (celulares e tablets);
 * - "Escolher Arquivo": seleciona uma ou mais imagens da galeria;
 * - Compressão e redimensionamento automáticos antes do upload;
 * - Miniaturas com legenda, categoria, exclusão e substituição.
 *
 * value: [{ url, caption, category, taken_at }]
 */
export default function PhotoCaptureField({
  value = [],
  onChange,
  defaultCategory = 'disembark_condition',
}) {
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const replaceIndexRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const uploadFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const compressed = await compressImage(file);
          const result = await base44.integrations.Core.UploadPublicFile({ file: compressed });
          return {
            url: result.file_url,
            caption: '',
            category: defaultCategory,
            taken_at: new Date().toISOString(),
          };
        }),
      );

      const index = replaceIndexRef.current;
      replaceIndexRef.current = null;
      if (index != null) {
        onChange([...value.slice(0, index), ...uploaded, ...value.slice(index + 1)]);
      } else {
        onChange([...value, ...uploaded]);
      }
      toast.success(
        uploaded.length === 1 ? 'Foto anexada' : `${uploaded.length} fotos anexadas`,
      );
    } catch (error) {
      toast.error('Erro ao anexar a foto');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleCameraChange = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    uploadFiles(files);
  };

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    uploadFiles(files);
  };

  const updatePhoto = (index, changes) => {
    onChange(value.map((p, i) => (i === index ? { ...p, ...changes } : p)));
  };

  return (
    <div className="space-y-3">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesChange}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="bg-sky-600 hover:bg-sky-700"
          disabled={uploading}
          onClick={() => {
            replaceIndexRef.current = null;
            cameraInputRef.current?.click();
          }}
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
          onClick={() => {
            replaceIndexRef.current = null;
            fileInputRef.current?.click();
          }}
        >
          <ImagePlus className="h-4 w-4 mr-2" />
          Escolher Arquivo
        </Button>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {value.map((photo, index) => (
            <div
              key={`${photo.url}-${index}`}
              className="rounded-lg border border-slate-200 bg-white p-2 space-y-1.5"
            >
              <div className="relative">
                <img
                  src={photo.url}
                  alt={photo.caption || 'Evidência fotográfica'}
                  className="w-full h-24 object-cover rounded-md"
                />
                <button
                  type="button"
                  aria-label="Remover foto"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
                >
                  <X className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label="Substituir foto"
                  onClick={() => {
                    replaceIndexRef.current = index;
                    fileInputRef.current?.click();
                  }}
                  className="absolute -bottom-1.5 -right-1.5 h-5 w-5 bg-sky-600 text-white rounded-full flex items-center justify-center shadow"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
              <Input
                value={photo.caption || ''}
                onChange={(e) => updatePhoto(index, { caption: e.target.value })}
                placeholder="Legenda (opcional)"
                className="h-7 text-xs"
              />
              <Select
                value={photo.category || defaultCategory}
                onValueChange={(v) => updatePhoto(index, { category: v })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHOTO_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}