import { scoreHazard, TIER_ORDER } from './formulas.js';

/** Score one hazard's stored inputs under the job's active formula. */
export function hazardScore(hazard, formulaId) {
  return scoreHazard(formulaId || hazard.formulaId, hazard.inputs || {});
}

/** Reduce a hazard list into per-tier counts + the worst tier present. */
export function summarizeHazards(hazards = [], formulaId) {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  let worst = null;
  for (const h of hazards) {
    const s = hazardScore(h, formulaId);
    if (!s) continue;
    counts[s.tier] += 1;
    if (worst == null || TIER_ORDER[s.tier] < TIER_ORDER[worst]) worst = s.tier;
  }
  return { counts, worst, total: hazards.length, highPlus: counts.high + counts.critical };
}

export function formatDate(ts, lang = 'en') {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}
