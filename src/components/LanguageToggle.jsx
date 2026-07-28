import React from 'react';
import { Languages } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';

/** Global EN/PT switch. variant: 'pill' (header) | 'segmented' (settings). */
export default function LanguageToggle({ variant = 'pill' }) {
  const { lang, setLang, toggle } = useI18n();

  if (variant === 'segmented') {
    return (
      <div className="inline-flex rounded-xl bg-slate-800 p-1" role="group" aria-label="Language">
        {['en', 'pt'].map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`min-h-touch min-w-[72px] rounded-lg px-4 text-sm font-semibold transition ${
              lang === l ? 'bg-sky-500 text-white shadow' : 'text-slate-300'
            }`}
            aria-pressed={lang === l}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={toggle}
      className="flex min-h-touch min-w-touch items-center gap-1.5 rounded-full bg-slate-800/80 px-3 text-sm font-bold text-slate-100 ring-1 ring-white/10 active:scale-95 transition"
      aria-label={`Switch language (current: ${lang.toUpperCase()})`}
    >
      <Languages size={18} className="text-sky-400" />
      <span>{lang.toUpperCase()}</span>
    </button>
  );
}
