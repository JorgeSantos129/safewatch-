/**
 * MARAT — Método de Avaliação de Riscos por Análise de Tarefas
 * (Portuguese simplified quantitative method, NTP-330 lineage).
 *
 * Values are transcribed verbatim from the reference deck
 * "Higiene e Segurança no Trabalho" (Univ. Lusófona). This is a CUSTOM
 * 5-level variant — do not substitute standard NTP-330 numbers.
 *
 *   NP (Probability) = ND (Deficiency) × NE (Exposure)
 *   NR (Risk)        = NP × NS (Severity)
 *
 * Display strings live in i18n under the `risk.*` namespace; this module
 * is the numeric single-source-of-truth and is intentionally pure.
 */

// ND — Nível de Deficiência (slide p18)
export const ND_OPTIONS = [
  { id: 'nd_acceptable', value: 1 },
  { id: 'nd_insufficient', value: 2 },
  { id: 'nd_deficient', value: 6 },
  { id: 'nd_very_deficient', value: 10 },
  { id: 'nd_total', value: 14 },
];

// NE — Nível de Exposição (slide p17)
export const NE_OPTIONS = [
  { id: 'ne_sporadic', value: 1 },
  { id: 'ne_infrequent', value: 2 },
  { id: 'ne_occasional', value: 3 },
  { id: 'ne_frequent', value: 4 },
  { id: 'ne_continuous', value: 5 },
];

// NS — Nível de Severidade (slide p21)
export const NS_OPTIONS = [
  { id: 'ns_insignificant', value: 10 },
  { id: 'ns_slight', value: 25 },
  { id: 'ns_moderate', value: 60 },
  { id: 'ns_serious', value: 90 },
  { id: 'ns_fatal', value: 155 },
];

// NP — Nível de Probabilidade bands = ND × NE (slide p19)
export const NP_BANDS = [
  { id: 'np_very_low', min: 1, max: 3, rep: 3 },
  { id: 'np_low', min: 4, max: 6, rep: 6 },
  { id: 'np_medium', min: 8, max: 20, rep: 20 },
  { id: 'np_high', min: 24, max: 30, rep: 30 },
  { id: 'np_very_high', min: 40, max: 70, rep: 70 },
];

/**
 * NR — Nível de Risco intervention levels (slide p23).
 * Classified by lower-bound thresholds so the discrete gaps between the
 * deck's published ranges (e.g. 300→360) are covered continuously.
 * `tier` maps each MARAT level onto the app's 4-colour design system.
 */
export const NR_LEVELS = [
  { id: 'level_i', roman: 'I', min: 3600, max: 10850, tier: 'critical', color: '#EF4444' },
  { id: 'level_ii', roman: 'II', min: 1240, max: 3599, tier: 'high', color: '#F97316' },
  { id: 'level_iii', roman: 'III', min: 360, max: 1239, tier: 'medium', color: '#EAB308' },
  { id: 'level_iv', roman: 'IV', min: 0, max: 359, tier: 'low', color: '#22C55E' },
];

export const TIER_COLORS = {
  low: '#22C55E',
  medium: '#EAB308',
  high: '#F97316',
  critical: '#EF4444',
};

const byValue = (options, value) => options.find((o) => o.value === value) || null;

export function classifyNP(np) {
  if (np <= 3) return NP_BANDS[0];
  if (np <= 6) return NP_BANDS[1];
  if (np <= 20) return NP_BANDS[2];
  if (np <= 30) return NP_BANDS[3];
  return NP_BANDS[4];
}

export function classifyNR(nr) {
  return NR_LEVELS.find((l) => nr >= l.min) || NR_LEVELS[NR_LEVELS.length - 1];
}

/**
 * Compute the full MARAT chain from raw ND/NE/NS numeric inputs.
 * Returns every intermediate value so the UI can show the working.
 */
export function computeRisk({ nd, ne, ns }) {
  const hasAll = [nd, ne, ns].every((v) => typeof v === 'number' && !Number.isNaN(v));
  if (!hasAll) return null;
  const np = nd * ne;
  const nr = np * ns;
  const npBand = classifyNP(np);
  const level = classifyNR(nr);
  return {
    nd,
    ne,
    ns,
    np,
    nr,
    npBandId: npBand.id,
    levelId: level.id,
    roman: level.roman,
    tier: level.tier,
    color: level.color,
    ndOption: byValue(ND_OPTIONS, nd),
    neOption: byValue(NE_OPTIONS, ne),
    nsOption: byValue(NS_OPTIONS, ns),
  };
}

// Heatmap cell colour uses the band's worst-case (max) NP, matching the
// right sub-column of the deck's master matrix (slide p22).
export function heatmapCellLevel(npBand, nsValue) {
  return classifyNR(npBand.rep * nsValue);
}
