import React, { useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none';
  const sizes = { md: 'min-h-touch px-4 text-sm', lg: 'min-h-[52px] px-5 text-base', icon: 'h-touch w-touch' };
  const variants = {
    primary: 'bg-sky-500 text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400',
    secondary: 'bg-slate-800 text-slate-100 ring-1 ring-white/10 hover:bg-slate-700',
    ghost: 'text-slate-300 hover:bg-white/5',
    danger: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/25',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, hint, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-slate-200">{label}</span>
        {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

const inputCls = 'w-full rounded-xl border border-white/10 bg-slate-800/60 px-3.5 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 transition';

export function Input(props) { return <input className={inputCls} {...props} />; }
export function Textarea(props) { return <textarea className={`${inputCls} min-h-[88px] resize-y`} {...props} />; }

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-2xl border border-white/5 bg-slate-900/60 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center animate-fadein">
      {Icon && <Icon size={40} className="text-slate-600" />}
      <div>
        <p className="font-semibold text-slate-300">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Fab({ onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 z-20 flex min-h-[56px] items-center gap-2 rounded-full bg-sky-500 px-5 font-bold text-white shadow-xl shadow-sky-500/30 active:scale-95 transition"
    >
      {Icon && <Icon size={22} />}
      {label && <span>{label}</span>}
    </button>
  );
}

/** Bottom sheet modal — mobile-first, slides up, tap-scrim to close. */
export function Sheet({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadein" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-slate-900 ring-1 ring-white/10 animate-sheetup sm:rounded-3xl pb-safe">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-white/5" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-white/5 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function PageTitle({ back, title, right }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {back}
      <h1 className="flex-1 text-xl font-extrabold tracking-tight text-white">{title}</h1>
      {right}
    </div>
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <div className="relative">
      <select
        className={`w-full appearance-none rounded-xl border border-white/10 bg-slate-800/60 px-3.5 py-3 pr-10 text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 transition ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  );
}
