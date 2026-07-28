import React from 'react';
import { Check, BookOpen } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { FORMULA_ORDER, getFormula } from '../lib/formulas.js';

/**
 * Master formula library selector. Lists every method grouped by category,
 * each showing Name, Formula equation and a short description of use.
 */
export default function FormulaPicker({ value, onChange }) {
  const { t } = useI18n();
  const groups = [
    { cat: 'safety', label: t('formula.catSafety') },
    { cat: 'security', label: t('formula.catSecurity') },
  ];

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.cat}>
          <h4 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{g.label}</h4>
          <div className="space-y-2">
            {FORMULA_ORDER.filter((id) => getFormula(id).category === g.cat).map((id) => {
              const f = getFormula(id);
              const on = value === id;
              return (
                <button
                  key={id} type="button" onClick={() => onChange(id)}
                  className={`w-full rounded-2xl border p-3.5 text-left transition active:scale-[.99] ${
                    on ? 'border-sky-500 bg-sky-500/10' : 'border-white/10 bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-bold text-white">
                      {t(`formula.${id}`)}
                      {f.reference && <BookOpen size={13} className="text-sky-400" />}
                    </span>
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${on ? 'border-sky-500 bg-sky-500' : 'border-slate-600'}`}>
                      {on && <Check size={13} className="text-white" />}
                    </span>
                  </div>
                  <code className="mt-1 block font-mono text-[11px] text-sky-300/90">{f.equation}</code>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{t(`formula.${id}_d`)}</p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
