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
//
// V2.5+ — pivot `docs_required` : chaque doc est une clé indépendante portant
// son propre behavior. Ancien format (`{behavior, docs:[…]}`) reste lu en
// transparence par evaluateEligibility pour les éditions non encore migrées.
export const DEFAULT_RULES_2026 = {
  country: { behavior: 'exclu', allowed: ['FR', 'DE'] },
  created_after: { behavior: 'exclu', date: '2020-01-01' },
  revenue_max: { behavior: 'flag', threshold: 500000 },
  raised_max: { behavior: 'flag', threshold: 800000 },
  founders_majority: { behavior: 'flag' },
  registration: { behavior: 'flag' },
  docs_required: {
    pitch_deck:   { behavior: 'exclu' },
    exec_summary: { behavior: 'exclu' },
  },
};

// Mapping doc_key -> { column on startups, label court pour le `detail` text }.
// `column` null ⇒ pas encore stocké dans startups (financials/video_pitch en V2.5+).
const DOC_FIELD_MAP = {
  pitch_deck:   { column: 'pitch_deck_path',   label: 'pitch deck' },
  exec_summary: { column: 'exec_summary_path', label: 'exec summary FR/DE' },
  financials:   { column: null,                label: 'états financiers' },
  video_pitch:  { column: null,                label: 'vidéo de pitch' },
};

// Normalise rules.docs_required vers le format V2.5+ :
//   { [doc_key]: { behavior } }
// Accepte les DEUX formats en entrée pour tolérance pendant la migration :
//   - V2.5+   : { pitch_deck: { behavior }, exec_summary: { behavior } }
//   - legacy  : { behavior: 'flag', docs: ['pitch_deck','exec_summary'] }
// Renvoie un objet vide si rien à demander ou si la règle est absente/'off'.
function normalizeDocsRequired(raw) {
  if (!raw || typeof raw !== 'object') return {};
  if (raw.behavior === 'off') return {};
  // legacy
  if (Array.isArray(raw.docs)) {
    const beh = raw.behavior === 'exclu' ? 'exclu' : 'flag';
    const out = {};
    for (const k of raw.docs) if (typeof k === 'string' && DOC_FIELD_MAP[k]) out[k] = { behavior: beh };
    return out;
  }
  // V2.5+
  const out = {};
  for (const key of Object.keys(DOC_FIELD_MAP)) {
    const entry = raw[key];
    if (entry && typeof entry === 'object' && entry.behavior && entry.behavior !== 'off') {
      out[key] = { behavior: entry.behavior === 'exclu' ? 'exclu' : 'flag' };
    }
  }
  return out;
}

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
 * Merge des règles d'éligibilité compétition → club (héritage PAR CRITÈRE).
 *
 * Chaque critère est une clé top-level autonome dans le JSON eligibility_rules
 * (cf. catalog.js / DEFAULT_RULES_2026). L'héritage se fait donc par MERGE SHALLOW :
 *   - clé absente de `overrides`   → critère hérité de la compétition
 *   - clé présente                 → le critère ENTIER est remplacé (pas de merge profond)
 *   - clé = { behavior: 'off' }    → le club DÉSACTIVE un critère hérité (assouplit)
 *
 * Équivaut exactement à l'opérateur jsonb `||` côté SQL (rsa_submit_dossier) :
 * la droite l'emporte sur la gauche, clé par clé. Garde-fou : toute entrée
 * non-objet est traitée comme {} (monoclub / pas d'override → compétition pure).
 * Ne mute aucun argument.
 *
 * @param {object} competition - editions.eligibility_rules (SSOT compétition)
 * @param {object} [overrides] - edition_clubs.eligibility_rules (override SPARSE du club)
 * @returns {object} règles effectives à passer à evaluateEligibility
 */
export function mergeEligibilityRules(competition, overrides) {
  const comp = competition && typeof competition === 'object' && !Array.isArray(competition)
    ? competition : {};
  const ov = overrides && typeof overrides === 'object' && !Array.isArray(overrides)
    ? overrides : {};
  return { ...comp, ...ov };
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
  // V2.5+ — docs_required : chaque doc a son propre behavior. On collecte les
  // docs manquants et on regroupe vers UN check (rule='docs_required') dont le
  // behavior reflète la SÉVÉRITÉ maximale ('exclu' > 'flag') : ainsi la chip et
  // le verdict global gardent leur sémantique « pire échec », et le `detail`
  // liste les pièces manquantes (taggées du behavior individuel).
  const docsCfg = normalizeDocsRequired(rules.docs_required);
  if (Object.keys(docsCfg).length > 0) {
    const missingExclu = [];
    const missingFlag = [];
    for (const [docKey, cfg] of Object.entries(docsCfg)) {
      const field = DOC_FIELD_MAP[docKey]?.column;
      const label = DOC_FIELD_MAP[docKey]?.label || docKey;
      // Si le champ n'est pas encore stocké (financials/video_pitch), on ne peut
      // pas détecter de manque côté front ⇒ on n'émet pas de failure (la RPC
      // serveur n'évalue pas non plus ces clés). Forward-compat : quand on
      // wirera le champ, on aura juste à l'ajouter dans DOC_FIELD_MAP.
      if (!field) continue;
      const present = !!startup[field];
      if (!present) {
        if (cfg.behavior === 'exclu') missingExclu.push(label);
        else missingFlag.push(label);
      }
    }
    const totalMissing = missingExclu.length + missingFlag.length;
    if (totalMissing > 0) {
      const worst = missingExclu.length > 0 ? 'exclu' : 'flag';
      const parts = [];
      if (missingExclu.length > 0) parts.push(`requis : ${missingExclu.join(', ')}`);
      if (missingFlag.length > 0) parts.push(`recommandé : ${missingFlag.join(', ')}`);
      push('docs_required', false, worst, parts.join(' · '));
    }
  }

  const failed = checks.filter((c) => !c.ok);
  const verdict = failed.some((c) => c.behavior === 'exclu')
    ? VERDICT.EXCLUDED
    : failed.some((c) => c.behavior === 'flag')
      ? VERDICT.FLAGGED
      : VERDICT.ELIGIBLE;

  return { verdict, checks, failed };
}
