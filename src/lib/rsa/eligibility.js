// Éligibilité d'un dossier startup — Règlement Général Officiel RSA Paris–Berlin 2026.
//
// Art. 2 : startups créées après le 1er janvier 2020, CA annuel < 500 000 €,
// ayant levé < 800 000 €, basées en France ou en Allemagne.
// « Ces critères sont indicatifs et non strictement exclusifs. »
// => chaque règle a un comportement configurable par édition : 'exclu' | 'flag' | 'off'.
//
// Décisions produit (validées) :
//   - âge société + pays  -> 'exclu' (rejet auto)
//   - CA / levée / fondateurs majoritaires / immatriculation / docs -> 'flag' (le comité tranche)
// Les seuils vivent dans editions.eligibility_rules (configurable, voir migration).

export const VERDICT = {
  ELIGIBLE: 'eligible', // aucun échec
  FLAGGED: 'flagged', // échec(s) seulement sur des règles 'flag' -> investigation comité
  EXCLUDED: 'excluded', // au moins un échec sur une règle 'exclu'
};

// Config par défaut (édition 2026). En prod elle vient de edition.eligibility_rules.
export const DEFAULT_RULES_2026 = {
  country: { behavior: 'exclu', allowed: ['FR', 'DE'] },
  created_after: { behavior: 'exclu', date: '2020-01-01' },
  revenue_max: { behavior: 'flag', threshold: 500000 },
  raised_max: { behavior: 'flag', threshold: 800000 },
  founders_majority: { behavior: 'flag' },
  registration: { behavior: 'flag' },
  docs_required: { behavior: 'flag', docs: ['pitch_deck', 'exec_summary'] },
};

// Numéros d'immatriculation factices repérés dans l'Airtable 2026 ("123 123 123", "000000000").
function isPlaceholderRegistration(value) {
  if (!value) return true;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 0) return true;
  if (/^0+$/.test(digits)) return true; // que des zéros
  if (/^(?:123){2,}$/.test(digits)) return true; // 123123123…
  return false;
}

function isActive(rule) {
  return rule && rule.behavior !== 'off';
}

/**
 * Évalue un dossier contre les règles d'une édition.
 * @param {object} startup - ligne `startups` (country, creation_date, last_revenue,
 *   amount_raised, founders_majority, registration_number, pitch_deck_path, exec_summary_path…)
 * @param {object} [rules] - editions.eligibility_rules (défaut : règlement 2026)
 * @returns {{verdict: string, checks: Array, failed: Array}}
 */
export function evaluateEligibility(startup, rules = DEFAULT_RULES_2026) {
  const checks = [];
  const push = (rule, ok, behavior, detail) => checks.push({ rule, ok, behavior, detail });

  if (isActive(rules.country)) {
    const ok = rules.country.allowed.includes(startup.country);
    push('country', ok, rules.country.behavior, `${startup.country ?? '—'} ∈ ${rules.country.allowed.join('/')}`);
  }
  if (isActive(rules.created_after)) {
    const ok = !!startup.creation_date && new Date(startup.creation_date) >= new Date(rules.created_after.date);
    push('created_after', ok, rules.created_after.behavior, `créée le ${startup.creation_date ?? '—'} (seuil ${rules.created_after.date})`);
  }
  if (isActive(rules.revenue_max)) {
    const ok = startup.last_revenue == null || Number(startup.last_revenue) < rules.revenue_max.threshold;
    push('revenue_max', ok, rules.revenue_max.behavior, `CA ${startup.last_revenue ?? 0} € (seuil ${rules.revenue_max.threshold} €)`);
  }
  if (isActive(rules.raised_max)) {
    const ok = startup.amount_raised == null || Number(startup.amount_raised) < rules.raised_max.threshold;
    push('raised_max', ok, rules.raised_max.behavior, `levée ${startup.amount_raised ?? 0} (seuil ${rules.raised_max.threshold})`);
  }
  if (isActive(rules.founders_majority)) {
    const ok = startup.founders_majority === true;
    push('founders_majority', ok, rules.founders_majority.behavior, `fondateurs majoritaires : ${startup.founders_majority === true ? 'oui' : 'non / non renseigné'}`);
  }
  if (isActive(rules.registration)) {
    const ok = !isPlaceholderRegistration(startup.registration_number);
    push('registration', ok, rules.registration.behavior, `n° : ${startup.registration_number ?? '—'}`);
  }
  if (isActive(rules.docs_required)) {
    const missing = [];
    if (rules.docs_required.docs.includes('pitch_deck') && !startup.pitch_deck_path) missing.push('pitch deck');
    if (rules.docs_required.docs.includes('exec_summary') && !startup.exec_summary_path) missing.push('exec summary FR/DE');
    push('docs_required', missing.length === 0, rules.docs_required.behavior, missing.length ? `manque : ${missing.join(', ')}` : 'complet');
  }

  const failed = checks.filter((c) => !c.ok);
  const verdict = failed.some((c) => c.behavior === 'exclu')
    ? VERDICT.EXCLUDED
    : failed.some((c) => c.behavior === 'flag')
      ? VERDICT.FLAGGED
      : VERDICT.ELIGIBLE;

  return { verdict, checks, failed };
}
