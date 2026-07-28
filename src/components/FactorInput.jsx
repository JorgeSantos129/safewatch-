import React, { useState } from 'react';
import { Info } from 'lucide-react';

/**
 * Renders one formula factor generically based on its `kind`:
 *   slider -> range input with a large live value read-out
 *   select -> chip buttons (numeric) or descriptive option cards (MARAT)
 *   number -> free numeric entry with optional unit (e.g. $ / /yr)
 * When the factor carries `help`, a small info button toggles a guidance
 * panel explaining what the factor is and how to reach the value.
 * `value` is the raw numeric value; onChange receives a number (or '').
 */
export default function FactorInput({ factor, value, onChange }) {
  const { kind, label, help, options = [], min = 0, max = 100, step = 1, unit } = factor;
  const [showHelp, setShowHelp] = useState(false);

  const header = (right) => (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-slate-200">{label}</span>
        {help && (
          <button
            type="button"
            onClick={() => setShowHelp((s) => !s)}
            aria-label={`${label} — help`}
            aria-expanded={showHelp}
            className={`flex h-6 w-6 items-center justify-center rounded-full transition active:scale-90 ${
              showHelp ? 'bg-sky-500/20 text-sky-300' : 'text-slate-500 hover:bg-white/10 hover:text-sky-400'
            }`}
          >
            <Info size={15} />
          </button>
        )}
      </div>
      {right}
    </div>
  );

  const helpPanel = help && showHelp && (
    <div className="mb-2 whitespace-pre-line rounded-lg border border-sky-500/20 bg-sky-500/[0.07] px-3 py-2 text-xs leading-relaxed text-slate-300 animate-fadein">
      {help}
    </div>
  );

  if (kind === 'number') {
    return (
      <div>
        {header(null)}
        {helpPanel}
        <div className="relative">
          {unit === '$' && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">$</span>}
          <input
            type="number" inputMode="decimal" min={min}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            className={`w-full rounded-xl border border-white/10 bg-slate-800/60 py-3 text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 ${unit === '$' ? 'pl-7 pr-3.5' : 'px-3.5'}`}
            placeholder="0"
          />
          {unit && unit !== '$' && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">{unit}</span>}
        </div>
      </div>
    );
  }

  if (kind === 'slider') {
    const pct = ((Number(value ?? min) - min) / (max - min)) * 100;
    const isPercent = min === 0 && max === 100;
    const valueBadge = (
      <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-sm font-extrabold tabular-nums text-sky-300">
        {value ?? min}{isPercent ? '%' : ''}
      </span>
    );
    return (
      <div>
        {header(valueBadge)}
        {helpPanel}
        <input
          type="range" min={min} max={max} step={step}
          value={value ?? min}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-touch w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-slate-700 [&::-webkit-slider-thumb]:mt-[-8px] [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400 [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-sky-400"
          style={{ background: `linear-gradient(to right, #38bdf8 ${pct}%, transparent ${pct}%)` }}
        />
        <div className="mt-0.5 flex justify-between text-[10px] font-medium text-slate-500">
          <span>{min}</span><span>{max}</span>
        </div>
      </div>
    );
  }

  // select
  const selected = options.find((o) => o.value === value);
  const descriptive = options.some((o) => o.desc);
  return (
    <div>
      {header(null)}
      {helpPanel}
      <div className={`grid gap-1.5 ${options.length > 5 ? 'grid-cols-4' : 'grid-cols-' + Math.max(2, options.length)}`}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={String(o.value)} type="button" onClick={() => onChange(o.value)}
              className={`flex min-h-touch flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-center transition active:scale-95 ${
                on ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-800 text-slate-300'
              }`}
            >
              <span className="text-sm font-extrabold tabular-nums">{o.value}</span>
              {descriptive && <span className="line-clamp-2 text-[9px] font-semibold leading-tight opacity-90">{o.label}</span>}
            </button>
          );
        })}
      </div>
      {descriptive && selected?.desc && (
        <div className="mt-2 rounded-lg bg-slate-800/50 px-3 py-2 text-xs leading-relaxed text-slate-400 animate-fadein">
          <span className="font-semibold text-slate-300">{selected.label}:</span> {selected.desc}
        </div>
      )}
    </div>
  );
}
