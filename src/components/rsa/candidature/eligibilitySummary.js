// eligibilitySummary — résumé indicatif des critères d'éligibilité d'une édition.
//
// Extrait jusqu'à 3 critères clés des règles fusionnées (priorité created_after,
// revenue_max, raised_max ; puis pays en repli si on a la place). On reste
// indicatif : c'est le funnel qui matérialise les règles complètes.
//
// Partagé entre OpenCompetitions (liste découverte) et Candidater (badge de la
// candidature ciblée) pour éviter la duplication.

import { formatDate, formatEur } from '@/components/rsa/candidature/validation';

export const ELIGIBILITY_COPY = {
  criteriaTitle: { fr: 'Critères principaux', en: 'Key criteria', de: 'Hauptkriterien' },
  deadline: { fr: 'Clôture le', en: 'Closes on', de: 'Anmeldeschluss' },
  noDeadline: { fr: 'Sans date de clôture', en: 'No closing date', de: 'Kein Stichtag' },
  ruleCreated: {
    fr: (d) => `Créée après le ${d}`,
    en: (d) => `Founded after ${d}`,
    de: (d) => `Gegründet nach dem ${d}`,
  },
  ruleRevenue: {
    fr: (v) => `Chiffre d'affaires < ${v}`,
    en: (v) => `Revenue under ${v}`,
    de: (v) => `Umsatz unter ${v}`,
  },
  ruleRaised: {
    fr: (v) => `Levée totale < ${v}`,
    en: (v) => `Funds raised under ${v}`,
    de: (v) => `Eingeworbenes Kapital unter ${v}`,
  },
  ruleCountry: {
    fr: (l) => `Pays : ${l}`,
    en: (l) => `Country: ${l}`,
    de: (l) => `Land: ${l}`,
  },
};

export function summarizeRules(rules, t, lang) {
  if (!rules || typeof rules !== 'object') return [];
  const out = [];
  const created = rules.created_after;
  if (created && created.behavior !== 'off' && created.date) {
    out.push(t(ELIGIBILITY_COPY.ruleCreated)(formatDate(created.date, lang)));
  }
  const revenue = rules.revenue_max;
  if (revenue && revenue.behavior !== 'off' && revenue.threshold != null) {
    out.push(t(ELIGIBILITY_COPY.ruleRevenue)(formatEur(revenue.threshold, lang)));
  }
  const raised = rules.raised_max;
  if (raised && raised.behavior !== 'off' && raised.threshold != null) {
    out.push(t(ELIGIBILITY_COPY.ruleRaised)(formatEur(raised.threshold, lang)));
  }
  if (out.length < 3) {
    const country = rules.country;
    if (country && country.behavior !== 'off' && Array.isArray(country.allowed) && country.allowed.length) {
      out.push(t(ELIGIBILITY_COPY.ruleCountry)(country.allowed.join(' · ')));
    }
  }
  return out.slice(0, 3);
}
