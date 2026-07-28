import React from 'react';
import { TIER_COLORS } from '../lib/riskModel.js';

const hexToRgba = (hex, a) => {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** Colour-coded risk chip. size: 'sm' | 'md' | 'lg'. */
export default function RiskBadge({ tier, label, roman, score, size = 'md', showScore = false }) {
  const color = TIER_COLORS[tier] || '#64748b';
  const pad = size === 'lg' ? 'px-3.5 py-2 text-sm' : size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold leading-none ${pad}`}
      style={{ background: hexToRgba(color, 0.16), color, border: `1px solid ${hexToRgba(color, 0.45)}` }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {roman && <span className="font-bold opacity-90">{roman}</span>}
      <span className="truncate">{label}</span>
      {showScore && score != null && <span className="opacity-80 tabular-nums">· {score}</span>}
    </span>
  );
}
