/**
 * Dynamic Risk Engine — master formula library.
 *
 * Every risk methodology the app supports is described declaratively here so
 * the UI (forms, charts, reports) can render generically from one contract:
 *
 *   factors[]   -> which inputs to collect and how to render them
 *   compute()   -> raw score from those inputs
 *   classify()  -> map a raw score onto the shared 4-tier design system
 *   viz         -> how Job Detail should visualise the score
 *
 * Tier ids ('low' | 'medium' | 'high' | 'critical') are shared across every
 * formula so RiskBadge / colour tokens stay consistent regardless of method.
 */

import { ND_OPTIONS, NE_OPTIONS, NS_OPTIONS, classifyNR, classifyNP } from './riskModel.js';

export const TIER_COLORS = {
  low: '#22C55E',
  medium: '#EAB308',
  high: '#F97316',
  critical: '#EF4444',
};
export const TIER_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

/* Helper: build a numeric-value <select> option set. */
const sel = (id, values) => ({
  id,
  kind: 'select',
  options: values.map((v) => ({ value: v, label: String(v) })),
});
const slider = (id, min, max, step = 1) => ({ id, kind: 'slider', min, max, step });
const number = (id, min = 0, unit) => ({ id, kind: 'number', min, unit });

/* Helper: threshold classifier. bands = [[maxInclusive, tier], ...] ascending, last is fallback. */
const thresholds = (bands, fallback) => (score) => {
  for (const [max, tier] of bands) if (score <= max) return tier;
  return fallback;
};

export const FORMULAS = {
  /* ---------- A. Workplace & Industrial Safety ---------- */
  std_matrix: {
    id: 'std_matrix',
    category: 'safety',
    equation: 'Risk = Severity (1–5) × Probability (1–5)',
    factors: [slider('severity', 1, 5), slider('probability', 1, 5)],
    scoreScale: { min: 1, max: 25, decimals: 0 },
    viz: 'matrix2d',
    axes: { x: 'probability', y: 'severity', xMax: 5, yMax: 5 },
    compute: (v) => (v.severity || 0) * (v.probability || 0),
    classify: thresholds([[4, 'low'], [9, 'medium'], [15, 'high']], 'critical'),
  },

  fine_kinney: {
    id: 'fine_kinney',
    category: 'safety',
    equation: 'Risk = Probability × Exposure × Consequence',
    factors: [
      sel('probability', [0.1, 0.2, 0.5, 1, 3, 6, 10]),
      sel('exposure', [0.5, 1, 2, 3, 6, 10]),
      sel('consequence', [1, 3, 7, 15, 40, 100]),
    ],
    scoreScale: { min: 0, max: 10000, decimals: 0 },
    viz: 'bars',
    compute: (v) => (v.probability || 0) * (v.exposure || 0) * (v.consequence || 0),
    classify: thresholds([[20, 'low'], [70, 'medium'], [200, 'high']], 'critical'),
  },

  rpn_fmea: {
    id: 'rpn_fmea',
    category: 'safety',
    equation: 'RPN = Severity (1–10) × Occurrence (1–10) × Detection (1–10)',
    factors: [slider('severity', 1, 10), slider('occurrence', 1, 10), slider('detection', 1, 10)],
    scoreScale: { min: 1, max: 1000, decimals: 0 },
    viz: 'bars',
    compute: (v) => (v.severity || 0) * (v.occurrence || 0) * (v.detection || 0),
    classify: thresholds([[50, 'low'], [100, 'medium'], [200, 'high']], 'critical'),
  },

  residual: {
    id: 'residual',
    category: 'safety',
    equation: 'Residual = (Severity × Probability) × (1 − Control %)',
    factors: [
      slider('severity', 1, 5),
      slider('probability', 1, 5),
      slider('control', 0, 100, 5),
    ],
    scoreScale: { min: 0, max: 25, decimals: 1 },
    viz: 'matrix2d',
    axes: { x: 'probability', y: 'severity', xMax: 5, yMax: 5 },
    compute: (v) => (v.severity || 0) * (v.probability || 0) * (1 - (v.control || 0) / 100),
    classify: thresholds([[4, 'low'], [9, 'medium'], [15, 'high']], 'critical'),
  },

  ale: {
    id: 'ale',
    category: 'safety',
    equation: 'ALE = (Asset Value × Exposure Factor) × ARO',
    factors: [
      number('assetValue', 0, '$'),
      slider('exposureFactor', 0, 100, 5),
      number('aro', 0, '/yr'),
    ],
    scoreScale: { min: 0, max: 1000000, decimals: 0 },
    unit: '$',
    isCurrency: true,
    viz: 'gauge',
    compute: (v) => (v.assetValue || 0) * ((v.exposureFactor || 0) / 100) * (v.aro || 0),
    classify: thresholds([[1000, 'low'], [10000, 'medium'], [100000, 'high']], 'critical'),
  },

  /* ---------- B. Security & Vulnerability ---------- */
  tvc: {
    id: 'tvc',
    category: 'security',
    equation: 'Risk = Threat × Vulnerability × Consequence',
    factors: [slider('threat', 1, 5), slider('vulnerability', 1, 5), slider('consequence', 1, 5)],
    scoreScale: { min: 1, max: 125, decimals: 0 },
    viz: 'bars',
    compute: (v) => (v.threat || 0) * (v.vulnerability || 0) * (v.consequence || 0),
    classify: thresholds([[10, 'low'], [30, 'medium'], [60, 'high']], 'critical'),
  },

  dread: {
    id: 'dread',
    category: 'security',
    equation: 'Score = (D + R + E + A + D) / 5',
    factors: [
      slider('damage', 0, 10),
      slider('reproducibility', 0, 10),
      slider('exploitability', 0, 10),
      slider('affectedUsers', 0, 10),
      slider('discoverability', 0, 10),
    ],
    scoreScale: { min: 0, max: 10, decimals: 1 },
    viz: 'gauge',
    compute: (v) =>
      ((v.damage || 0) + (v.reproducibility || 0) + (v.exploitability || 0) +
        (v.affectedUsers || 0) + (v.discoverability || 0)) / 5,
    classify: thresholds([[3, 'low'], [6, 'medium'], [8, 'high']], 'critical'),
  },

  cvss4: {
    id: 'cvss4',
    category: 'security',
    equation: 'Base ≈ f(Exploitability, Impact)  ·  0.0–10.0',
    simplified: true,
    factors: [slider('exploitability', 0, 10, 0.1), slider('impact', 0, 10, 0.1)],
    scoreScale: { min: 0, max: 10, decimals: 1 },
    viz: 'gauge',
    // Pragmatic approximation of a CVSS base score (impact-weighted). Labelled
    // "simplified" in the UI — not a full first.org vector computation.
    compute: (v) => Math.round(Math.min(10, (v.exploitability || 0) * 0.4 + (v.impact || 0) * 0.6) * 10) / 10,
    classify: thresholds([[3.9, 'low'], [6.9, 'medium'], [8.9, 'high']], 'critical'),
  },

  epss: {
    id: 'epss',
    category: 'security',
    equation: 'EPSS = P(exploited within 30 days)  ·  0–100%',
    factors: [slider('probability', 0, 100, 1)],
    scoreScale: { min: 0, max: 100, decimals: 0 },
    unit: '%',
    viz: 'gauge',
    compute: (v) => v.probability || 0,
    classify: thresholds([[9, 'low'], [39, 'medium'], [69, 'high']], 'critical'),
  },

  /* ---------- Reference method (grounded in the uploaded PDF) ---------- */
  marat: {
    id: 'marat',
    category: 'safety',
    equation: 'NR = (ND × NE) × NS',
    reference: true,
    factors: [
      { id: 'nd', kind: 'select', options: ND_OPTIONS.map((o) => ({ value: o.value, labelId: o.id })) },
      { id: 'ne', kind: 'select', options: NE_OPTIONS.map((o) => ({ value: o.value, labelId: o.id })) },
      { id: 'ns', kind: 'select', options: NS_OPTIONS.map((o) => ({ value: o.value, labelId: o.id })) },
    ],
    scoreScale: { min: 10, max: 10850, decimals: 0 },
    viz: 'matrix2d',
    axes: { x: 'np', y: 'ns', special: 'marat' },
    compute: (v) => (v.nd || 0) * (v.ne || 0) * (v.ns || 0),
    classify: (score) => classifyNR(score).tier,
    classifyNP,
  },
};

export const JOB_TYPES = [
  { id: 'general_workplace', formula: 'std_matrix' },
  { id: 'industrial_construction', formula: 'fine_kinney' },
  { id: 'engineering_failure', formula: 'rpn_fmea' },
  { id: 'physical_security', formula: 'tvc' },
  { id: 'appsec_threat', formula: 'dread' },
  { id: 'it_network', formula: 'cvss4' },
  { id: 'asset_insurance', formula: 'ale' },
];

export const FORMULA_ORDER = [
  'std_matrix', 'fine_kinney', 'rpn_fmea', 'residual', 'ale',
  'tvc', 'dread', 'cvss4', 'epss', 'marat',
];

export const DEFAULT_FORMULA = 'std_matrix';

/**
 * Maps each formula's factors to a help topic id (resolved to translated
 * guidance in i18n under factorHelp.*). Scoped per-formula because a shared
 * factor id (e.g. "severity") can use a different scale in another method.
 */
export const FACTOR_HELP_IDS = {
  std_matrix: { severity: 'sev5', probability: 'prob5' },
  fine_kinney: { probability: 'fkProb', exposure: 'fkExp', consequence: 'fkCons' },
  rpn_fmea: { severity: 'rpnSev', occurrence: 'rpnOcc', detection: 'rpnDet' },
  residual: { severity: 'sev5', probability: 'prob5', control: 'control' },
  ale: { assetValue: 'assetValue', exposureFactor: 'aleEf', aro: 'aro' },
  tvc: { threat: 'tvcThreat', vulnerability: 'tvcVuln', consequence: 'tvcCons' },
  dread: { damage: 'dreadD', reproducibility: 'dreadR', exploitability: 'dreadE', affectedUsers: 'dreadA', discoverability: 'dreadDisc' },
  cvss4: { exploitability: 'cvssExpl', impact: 'cvssImpact' },
  epss: { probability: 'epssProb' },
  marat: { nd: 'maratNd', ne: 'maratNe', ns: 'maratNs' },
};

export function getFormula(id) {
  return FORMULAS[id] || FORMULAS[DEFAULT_FORMULA];
}
export function formulaForJobType(typeId) {
  return JOB_TYPES.find((j) => j.id === typeId)?.formula || DEFAULT_FORMULA;
}

/** Compute score + tier for a hazard's stored inputs under a given formula. */
export function scoreHazard(formulaId, inputs) {
  const f = getFormula(formulaId);
  const filled = f.factors.every((fac) => inputs?.[fac.id] != null && inputs[fac.id] !== '');
  if (!filled) return null;
  const raw = f.compute(inputs);
  const tier = f.classify(raw);
  return { raw, tier, formulaId, color: TIER_COLORS[tier] };
}

export function formatScore(formula, raw) {
  if (raw == null || Number.isNaN(raw)) return '—';
  const d = formula.scoreScale?.decimals ?? 0;
  if (formula.isCurrency) {
    return '$' + Math.round(raw).toLocaleString('en-US');
  }
  const n = Number(raw).toFixed(d);
  return formula.unit === '%' ? `${n}%` : n;
}
