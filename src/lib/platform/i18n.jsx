// i18n de la plateforme RSA — contexte de langue partagé FR/EN/DE.
//
// Remplace le boilerplate `const T = {fr,en,de}` + state `lang` + localStorage
// dupliqué dans chaque page RSA (RsaScore, RsaFinaleRsvp, RsaJuryView,
// RsaPrintSheets, StartupUpload). Cf. docs/design/elysee-audit.md §8 + blueprint §9.
//
// Usage :
//   import { LanguageProvider, useLang, LANGS } from '@/lib/platform/i18n';
//
//   // au sommet de l'app :
//   <LanguageProvider>...</LanguageProvider>
//
//   // dans un composant :
//   const { lang, setLang, t } = useLang();
//   const T = { fr: { hi: 'Bonjour' }, en: { hi: 'Hello' }, de: { hi: 'Hallo' } };
//   <h1>{t(T).hi}</h1>          // dictionnaire { fr, en, de } -> branche active
//   <p>{t({ fr: 'Salut', en: 'Hi', de: 'Hi' })}</p>  // dico de chaînes -> chaîne
//
// Choix de conception :
//   - une seule clé localStorage `rsa_lang` (au lieu de `rsa_*_lang` par page) ;
//   - défaut 'fr', amorçé depuis navigator.language au tout premier rendu ;
//   - <html lang> mis à jour pour l'accessibilité (lecteurs d'écran) ;
//   - `t(dict)` accepte soit un dico { fr, en, de } et renvoie la branche active,
//     avec repli fr puis en puis première valeur disponible.

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

export const LANGS = ['fr', 'en', 'de'];
export const DEFAULT_LANG = 'fr';
const STORAGE_KEY = 'rsa_lang';

const LanguageContext = createContext(null);

function isLang(v) {
  return LANGS.includes(v);
}

// Langue initiale : localStorage > navigator.language > défaut 'fr'.
function readInitialLang() {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    /* localStorage indisponible (mode privé strict) — on continue */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language ? navigator.language : '')
    .slice(0, 2)
    .toLowerCase();
  if (isLang(nav)) return nav;
  return DEFAULT_LANG;
}

// Résout une valeur i18n vers la langue active, avec replis fr -> en -> 1re dispo.
function resolve(dict, lang) {
  if (dict == null) return dict;
  // Une simple chaîne / un nombre : rien à résoudre.
  if (typeof dict !== 'object') return dict;
  // Un dictionnaire { fr, en, de } (au moins une de ces clés).
  const hasLangKeys = LANGS.some((l) => l in dict);
  if (!hasLangKeys) return dict; // objet quelconque — on renvoie tel quel
  if (dict[lang] != null) return dict[lang];
  if (dict.fr != null) return dict.fr;
  if (dict.en != null) return dict.en;
  for (const l of LANGS) if (dict[l] != null) return dict[l];
  return undefined;
}

export function LanguageProvider({ children, defaultLang }) {
  const [lang, setLangState] = useState(() => (isLang(defaultLang) ? defaultLang : readInitialLang()));

  const setLang = useCallback((next) => {
    if (!isLang(next)) return;
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* localStorage indisponible — le choix reste en mémoire pour la session */
    }
  }, []);

  // Tient <html lang> à jour pour l'accessibilité.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang);
    }
  }, [lang]);

  // t(dict) : prend un { fr, en, de } et renvoie la branche active.
  const t = useCallback((dict) => resolve(dict, lang), [lang]);

  const value = useMemo(() => ({ lang, setLang, t, langs: LANGS }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLang must be used within a <LanguageProvider>');
  }
  return ctx;
}

// Résolveur autonome (hors React) — utile dans des helpers/tests.
export function pickLang(dict, lang = DEFAULT_LANG) {
  return resolve(dict, isLang(lang) ? lang : DEFAULT_LANG);
}
