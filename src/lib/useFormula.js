import { useMemo } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { getFormula, TIER_COLORS, formatScore, FACTOR_HELP_IDS } from './formulas.js';

/**
 * Decorates a formula descriptor with translated labels so any screen can
 * render its inputs and results generically. Mirrors useRisk() but works for
 * ALL methods in the dynamic library, not just MARAT.
 */
export function useFormula(formulaId) {
  const { t } = useI18n();

  return useMemo(() => {
    const f = getFormula(formulaId);

    const factors = f.factors.map((fac) => {
      // Factor label: prefer factor.* key, fall back to risk.* (MARAT nd/ne/ns).
      let label = t(`factor.${fac.id}`);
      if (label === `factor.${fac.id}`) label = t(`risk.${fac.id}`);

      const options = (fac.options || []).map((o) => ({
        value: o.value,
        label: o.labelId ? t(`risk.${o.labelId}`) : o.label,
        desc: o.labelId ? t(`risk.${o.labelId}_d`) : undefined,
      }));

      const helpId = FACTOR_HELP_IDS[f.id]?.[fac.id];
      const help = helpId ? t(`factorHelp.${helpId}`) : undefined;

      return { ...fac, label, help, options };
    });

    const name = t(`formula.${f.id}`);
    const desc = t(`formula.${f.id}_d`);

    const evaluate = (inputs) => {
      const filled = f.factors.every((fac) => inputs?.[fac.id] != null && inputs[fac.id] !== '');
      if (!filled) return null;
      const raw = f.compute(inputs);
      const tier = f.classify(raw);
      return {
        raw,
        tier,
        color: TIER_COLORS[tier],
        tierLabel: t(`risk.tiers.${tier}`),
        display: formatScore(f, raw),
      };
    };

    return {
      formula: f,
      id: f.id,
      name,
      desc,
      equation: f.equation,
      category: f.category,
      simplified: !!f.simplified,
      reference: !!f.reference,
      factors,
      scoreScale: f.scoreScale,
      viz: f.viz,
      axes: f.axes,
      isCurrency: !!f.isCurrency,
      unit: f.unit,
      evaluate,
      fmt: (raw) => formatScore(f, raw),
    };
  }, [formulaId, t]);
}
