import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Upload, MoveUpRight, Square, Circle, Undo2, Trash2, Check } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { Button } from './ui.jsx';

const COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#38BDF8', '#FFFFFF'];
const TOOLS = [
  { id: 'arrow', icon: MoveUpRight },
  { id: 'box', icon: Square },
  { id: 'circle', icon: Circle },
];

/**
 * Photo capture + annotation. Loads an image (camera or gallery), lets the
 * user overlay arrow/box/circle shapes on a canvas, then flattens the photo
 * + annotations into a single JPEG data URL via onSave.
 */
export default function PhotoAnnotator({ initialImage, onSave, onCancel }) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const cameraInput = useRef(null);
  const galleryInput = useRef(null);
  const [src, setSrc] = useState(initialImage || null);
  const [tool, setTool] = useState('arrow');
  const [color, setColor] = useState('#EF4444');
  const [shapes, setShapes] = useState([]);
  const draft = useRef(null);
  const [, force] = useState(0);

  const loadFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setSrc(reader.result); setShapes([]); };
    reader.readAsDataURL(file);
  };

  // Draw everything whenever image/shapes change
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete || !img.naturalWidth) return;
    const maxW = 1024;
    const scale = Math.min(1, maxW / img.naturalWidth);
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const all = draft.current ? [...shapes, draft.current] : shapes;
    for (const s of all) drawShape(ctx, s, canvas);
  }, [shapes]);

  useEffect(() => { redraw(); }, [redraw, src]);

  const pointer = (e) => {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return {
      x: ((p.clientX - rect.left) / rect.width) * c.width,
      y: ((p.clientY - rect.top) / rect.height) * c.height,
    };
  };
  const start = (e) => { e.preventDefault(); const { x, y } = pointer(e); draft.current = { tool, color, x1: x, y1: y, x2: x, y2: y }; };
  const move = (e) => { if (!draft.current) return; e.preventDefault(); const { x, y } = pointer(e); draft.current.x2 = x; draft.current.y2 = y; redraw(); };
  const end = () => { if (!draft.current) return; const d = draft.current; draft.current = null; if (Math.hypot(d.x2 - d.x1, d.y2 - d.y1) > 6) setShapes((s) => [...s, d]); else redraw(); };

  const flatten = () => {
    draft.current = null; redraw();
    const url = canvasRef.current.toDataURL('image/jpeg', 0.82);
    onSave(url);
  };

  if (!src) {
    return (
      <div className="space-y-3">
        <div className="flex aspect-video items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-slate-800/40">
          <Camera size={40} className="text-slate-600" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" onClick={() => cameraInput.current?.click()}><Camera size={20} />{t('hazard.takePhoto')}</Button>
          <Button size="lg" variant="secondary" onClick={() => galleryInput.current?.click()}><Upload size={20} />{t('hazard.uploadPhoto')}</Button>
        </div>
        {onCancel && <Button variant="ghost" className="w-full" onClick={onCancel}>{t('common.cancel')}</Button>}
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => loadFile(e.target.files[0])} />
        <input ref={galleryInput} type="file" accept="image/*" hidden onChange={(e) => loadFile(e.target.files[0])} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <img ref={imgRef} src={src} alt="" className="hidden" onLoad={redraw} crossOrigin="anonymous" />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
        <canvas
          ref={canvasRef}
          className="w-full touch-none select-none"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
      </div>
      <p className="text-center text-xs text-slate-500">{t('hazard.annotateHint')}</p>

      {/* tools */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {TOOLS.map(({ id, icon: Icon }) => (
            <button key={id} onClick={() => setTool(id)}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${tool === id ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'}`}
              aria-label={t(`annotate.${id}`)}>
              <Icon size={20} />
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setShapes((s) => s.slice(0, -1))} disabled={!shapes.length}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-300 disabled:opacity-40" aria-label={t('annotate.undo')}><Undo2 size={20} /></button>
          <button onClick={() => setShapes([])} disabled={!shapes.length}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-300 disabled:opacity-40" aria-label={t('annotate.clear')}><Trash2 size={20} /></button>
        </div>
      </div>

      {/* colours */}
      <div className="flex gap-2">
        {COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)}
            className={`h-9 flex-1 rounded-lg transition ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`}
            style={{ background: c }} aria-label={c} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => { setSrc(null); setShapes([]); }}>{t('hazard.retake')}</Button>
        <Button onClick={flatten}><Check size={18} />{t('annotate.save')}</Button>
      </div>
    </div>
  );
}

function drawShape(ctx, s, canvas) {
  const lw = Math.max(3, canvas.width * 0.006);
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const { x1, y1, x2, y2 } = s;
  if (s.tool === 'box') {
    ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  } else if (s.tool === 'circle') {
    ctx.beginPath();
    ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // arrow
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const head = lw * 3.2;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang - Math.PI / 6), y2 - head * Math.sin(ang - Math.PI / 6));
    ctx.lineTo(x2 - head * Math.cos(ang + Math.PI / 6), y2 - head * Math.sin(ang + Math.PI / 6));
    ctx.closePath(); ctx.fill();
  }
}
