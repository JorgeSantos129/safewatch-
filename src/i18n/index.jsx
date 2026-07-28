import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import en from './en.js';
import pt from './pt.js';

const DICTS = { en, pt };
const STORAGE_KEY = 'safewatch.lang';

const I18nContext = createContext(null);

function resolve(dict, path) {
  return path.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), dict);
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'pt') return saved;
    const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en';
    return nav.startsWith('pt') ? 'pt' : 'en';
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      let str = resolve(DICTS[lang], key);
      if (str === undefined) str = resolve(DICTS.en, key);
      if (str === undefined) return key;
      if (vars && typeof str === 'string') {
        str = str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
      }
      return str;
    },
    [lang]
  );

  const toggle = useCallback(() => setLang((l) => (l === 'en' ? 'pt' : 'en')), []);

  return (
    <I18nContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
