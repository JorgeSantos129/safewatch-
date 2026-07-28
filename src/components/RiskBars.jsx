import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getFormula, TIER_COLORS } from '../lib/formulas.js';
import { hazardScore } from '../lib/summary.js';

/**
 * Ranked score bars for multiplicative methods (Fine-Kinney, RPN, TVC).
 * One bar per hazard, coloured by tier, on the formula's own scale.
 */
export default function RiskBars({ formulaId, hazards = [] }) {
  const f = getFormula(formulaId);
  const data = hazards
    .map((h) => { const s = hazardScore(h, formulaId); return s ? { name: h.title || '—', score: Number(s.raw.toFixed(f.scoreScale.decimals)), color: s.color } : null; })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  if (!data.length) return null;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} />
          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
