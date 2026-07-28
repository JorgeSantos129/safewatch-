import React from 'react';
import { getFormula, TIER_COLORS, formatScore } from '../lib/formulas.js';

/**
 * Semicircular gauge for single-score methods (ALE, DREAD, CVSS, EPSS).
 * Renders the four tier zones as coloured arc segments with a needle at the
 * current value. Works on any scale via the formula's scoreScale.
 */
export default function RiskGauge({ formulaId, value, size = 180 }) {
  const f = getFormula(formulaId);
  const { min, max } = f.scoreScale;
  const v = value == null ? min : Math.max(min, Math.min(max, value));

  // derive tier boundaries by scanning the scale
  const zones = tierZones(f, min, max);
  const cx = size / 2, cy = size / 2, r = size / 2 - 12;
  const toAngle = (val) => Math.PI * (1 - (val - min) / (max - min)); // pi..0 (left→right)
  const point = (val, rr = r) => {
    const a = toAngle(val);
    return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)];
  };
  const arc = (a, b, rr = r) => {
    const [x1, y1] = point(a, rr); const [x2, y2] = point(b, rr);
    const large = 0; const sweep = 1;
    return `M ${x1} ${y1} A ${rr} ${rr} 0 ${large} ${sweep} ${x2} ${y2}`;
  };

  const tier = f.classify(v);
  const [nx, ny] = point(v, r - 2);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 22} viewBox={`0 0 ${size} ${size / 2 + 22}`}>
        {zones.map((z, i) => (
          <path key={i} d={arc(z.from, z.to)} fill="none" stroke={TIER_COLORS[z.tier]} strokeWidth="12" strokeLinecap="butt" opacity={z.tier === tier ? 1 : 0.32} />
        ))}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill="#e2e8f0" />
      </svg>
      <div className="-mt-2 text-center">
        <div className="text-2xl font-black tabular-nums" style={{ color: TIER_COLORS[tier] }}>{formatScore(f, value)}</div>
        <div className="text-[10px] font-medium text-slate-500">{min}{f.unit === '%' ? '%' : ''} – {f.isCurrency ? '$' + max.toLocaleString('en-US') : max}{f.unit === '%' ? '%' : ''}</div>
      </div>
    </div>
  );
}

// Sample the classifier across the scale to find contiguous tier zones.
function tierZones(f, min, max) {
  const steps = 60;
  const zones = [];
  let prev = null;
  for (let i = 0; i <= steps; i++) {
    const val = min + ((max - min) * i) / steps;
    const tier = f.classify(val);
    if (!prev || prev.tier !== tier) {
      if (prev) prev.to = val;
      prev = { tier, from: val, to: max };
      zones.push(prev);
    }
  }
  if (zones.length) zones[zones.length - 1].to = max;
  return zones;
}
