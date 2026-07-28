import React from 'react';
import { useI18n } from '../i18n/index.jsx';
import { getFormula, TIER_COLORS } from '../lib/formulas.js';
import { NP_BANDS, NS_OPTIONS, heatmapCellLevel } from '../lib/riskModel.js';

/**
 * Adaptive risk heatmap.
 *  - MARAT: 5x5 Severity(NS) × Probability-band(NP) grid (deck's master matrix).
 *  - Any other 2-factor method (std_matrix, residual): a grid over its two
 *    axis factors, each cell coloured by the resulting tier.
 * Logged hazards are plotted as counts in their cell.
 */
export default function RiskMatrix({ formulaId, hazards = [], onCellClick }) {
  const { t } = useI18n();
  const f = getFormula(formulaId);
  if (f.axes?.special === 'marat') return <MaratMatrix t={t} hazards={hazards} onCellClick={onCellClick} />;
  if (f.viz !== 'matrix2d') return null;

  const { x, y, xMax = 5, yMax = 5 } = f.axes;
  const rows = Array.from({ length: yMax }, (_, i) => yMax - i); // high at top
  const cols = Array.from({ length: xMax }, (_, i) => i + 1);

  const buckets = {};
  for (const h of hazards) {
    const xi = h.inputs?.[x]; const yi = h.inputs?.[y];
    if (xi == null || yi == null) continue;
    (buckets[`${yi}|${xi}`] ||= []).push(h);
  }

  return (
    <div className="animate-fadein">
      <div className="flex gap-2">
        <AxisY label={t(`factor.${y}`)} />
        <div className="flex-1">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${xMax}, 1fr)` }}>
            {rows.map((ry) =>
              cols.map((cx) => {
                const tier = f.classify(f.compute({ [x]: cx, [y]: ry }));
                const items = buckets[`${ry}|${cx}`] || [];
                return (
                  <button
                    key={`${ry}-${cx}`}
                    onClick={() => items.length && onCellClick?.(items)}
                    className="relative flex aspect-square items-center justify-center rounded-md text-[10px] font-bold transition active:scale-95"
                    style={{ background: TIER_COLORS[tier], opacity: items.length ? 1 : 0.26 }}
                    title={`${t(`factor.${y}`)} ${ry} × ${t(`factor.${x}`)} ${cx}`}
                  >
                    <span className="text-black/45 tabular-nums">{cx * ry}</span>
                    {items.length > 0 && (
                      <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black/70 px-1 text-[10px] font-extrabold text-white">{items.length}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-1 flex justify-between px-0.5 text-[10px] font-medium text-slate-500">
            <span>{t('factor.low')}</span>
            <span className="font-bold uppercase tracking-wider">{t(`factor.${x}`)}</span>
            <span>{t('factor.high')}</span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{t('matrix.legend')}</p>
    </div>
  );
}

function MaratMatrix({ t, hazards, onCellClick }) {
  const rows = [...NS_OPTIONS].reverse();
  const cols = NP_BANDS;
  const buckets = {};
  for (const h of hazards) {
    const nd = h.inputs?.nd, ne = h.inputs?.ne, ns = h.inputs?.ns;
    if (nd == null || ne == null || ns == null) continue;
    const np = nd * ne;
    const band = cols.find((b) => np <= b.max) || cols[cols.length - 1];
    (buckets[`${ns}|${band.id}`] ||= []).push(h);
  }
  return (
    <div className="animate-fadein">
      <div className="flex gap-2">
        <AxisY label={t('matrix.severity')} />
        <div className="flex-1">
          <div className="grid grid-cols-5 gap-1">
            {rows.map((ns) =>
              cols.map((band) => {
                const level = heatmapCellLevel(band, ns.value);
                const items = buckets[`${ns.value}|${band.id}`] || [];
                return (
                  <button key={`${ns.value}-${band.id}`} onClick={() => items.length && onCellClick?.(items)}
                    className="relative flex aspect-square items-center justify-center rounded-md text-[10px] font-bold transition active:scale-95"
                    style={{ background: level.color, opacity: items.length ? 1 : 0.26 }}
                    title={`${t(`risk.${ns.id}`)} × ${t(`risk.${band.id}`)}`}>
                    <span className="text-black/55">{level.roman}</span>
                    {items.length > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black/70 px-1 text-[10px] font-extrabold text-white">{items.length}</span>}
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-1 grid grid-cols-5 gap-1">
            {cols.map((band) => <span key={band.id} className="truncate text-center text-[9px] font-medium text-slate-500">{t(`risk.${band.id}`)}</span>)}
          </div>
          <div className="mt-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('matrix.probability')}</div>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{t('matrix.legend')}</p>
    </div>
  );
}

function AxisY({ label }) {
  return (
    <div className="flex items-center">
      <span className="rotate-180 text-[10px] font-bold uppercase tracking-wider text-slate-500 [writing-mode:vertical-rl]">{label}</span>
    </div>
  );
}
