import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eraser, Keyboard, PenLine, Upload, Loader2 } from 'lucide-react';

const CANVAS_W = 640;
const CANVAS_H = 240;

/**
 * Pad de assinatura eletrônica: desenho com mouse/caneta/dedo (touch),
 * upload de imagem ou conversão do nome digitado. Confirma devolvendo a
 * imagem em data URL (fundo branco, JPEG).
 */
export default function SignaturePad({ onConfirm, onCancel, saving }) {
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('draw');
  const [typedName, setTypedName] = useState('');
  const [hasInk, setHasInk] = useState(false);
  const drawing = useRef(false);
  const lastPoint = useRef(null);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    setHasInk(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  }, []);

  const switchMode = (next) => {
    clearCanvas();
    setMode(next);
  };

  const pointFromEvent = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * CANVAS_W) / rect.width,
      y: ((e.clientY - rect.top) * CANVAS_H) / rect.height,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    drawing.current = true;
    lastPoint.current = pointFromEvent(e);
    setHasInk(true);
  };

  const moveDrawing = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    const point = pointFromEvent(e);
    if (ctx && lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    lastPoint.current = point;
  };

  const stopDrawing = () => {
    drawing.current = false;
    lastPoint.current = null;
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        clearCanvas();
        const scale = Math.min(
          (CANVAS_W * 0.9) / img.width,
          (CANVAS_H * 0.8) / img.height,
          2.5
        );
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (CANVAS_W - w) / 2, (CANVAS_H - h) / 2, w, h);
        setHasInk(true);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const typedToDataUrl = () => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = 96;
    ctx.font = `italic ${size}px "Segoe Script", "Brush Script MT", cursive`;
    while (ctx.measureText(typedName).width > CANVAS_W - 60 && size > 28) {
      size -= 6;
      ctx.font = `italic ${size}px "Segoe Script", "Brush Script MT", cursive`;
    }
    ctx.fillText(typedName, CANVAS_W / 2, CANVAS_H / 2);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const canConfirm =
    mode === 'type' ? typedName.trim().length >= 2 : mode === 'upload' ? hasInk : hasInk;

  const confirm = () => {
    const dataUrl = mode === 'type' ? typedToDataUrl() : canvasRef.current.toDataURL('image/jpeg', 0.9);
    onConfirm(dataUrl);
  };

  const modeButton = (value, icon, label) => (
    <button
      type="button"
      onClick={() => switchMode(value)}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
        mode === value
          ? 'border-sky-500 bg-sky-50 text-sky-700'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {modeButton('draw', <PenLine className="h-3.5 w-3.5" />, 'Desenhar')}
        {modeButton('upload', <Upload className="h-3.5 w-3.5" />, 'Enviar imagem')}
        {modeButton('type', <Keyboard className="h-3.5 w-3.5" />, 'Digitar nome')}
      </div>

      {mode === 'type' ? (
        <div className="space-y-2">
          <Input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Digite seu nome completo para gerar a assinatura"
          />
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white overflow-hidden">
            {typedName.trim() ? (
              <span
                className="truncate px-4 text-4xl italic text-slate-900"
                style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive' }}
              >
                {typedName}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Pré-visualização da assinatura</span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            className="w-full h-40 rounded-lg border border-slate-300 bg-white touch-none cursor-crosshair"
            onPointerDown={startDrawing}
            onPointerMove={moveDrawing}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={clearCanvas}>
              <Eraser className="h-3.5 w-3.5" />
              Limpar
            </Button>
            {mode === 'upload' && (
              <label>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  Escolher imagem
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                />
              </label>
            )}
          </div>
          {mode === 'draw' && (
            <p className="text-xs text-slate-500">
              Desenhe com o mouse ou com o dedo na tela (celular/tablet).
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
        <Button type="button" disabled={!canConfirm || saving} onClick={confirm}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Salvando...' : 'Salvar assinatura'}
        </Button>
      </div>
    </div>
  );
}