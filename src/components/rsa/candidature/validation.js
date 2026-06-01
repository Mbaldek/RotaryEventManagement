// Validation & helpers du tunnel de candidature (Module 1).
//
// La validation est DIFFÉRÉE à la soumission : aucun de ces helpers ne bloque la
// frappe ni le passage d'étape. `requiredMissing(startup)` renvoie la liste des
// champs requis manquants (utilisée par StepReview/Submit), et `validateField`
// produit des messages inline. Les règles miroir du blueprint §2.1.

import { QUALIFYING_SESSIONS } from '@/lib/rsa/constants';

// ── Formes des champs ────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9 ().-]{6,20}$/;

export function isBlank(v) {
  return v == null || (typeof v === 'string' && v.trim() === '');
}

// Normalise une URL : ajoute https:// si le schéma manque. Renvoie '' si vide.
export function normalizeUrl(value) {
  const v = (value || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export function isValidUrl(value) {
  const v = normalizeUrl(value);
  if (!v) return true; // vide = valide (optionnel)
  try {
    return Boolean(new URL(v));
  } catch {
    return false;
  }
}

export function isValidEmail(value) {
  if (isBlank(value)) return false;
  return EMAIL_RE.test(String(value).trim());
}

export function isValidPhone(value) {
  if (isBlank(value)) return true; // optionnel
  return PHONE_RE.test(String(value).trim());
}

export function isFutureDate(value) {
  if (isBlank(value)) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d.getTime() > today.getTime();
}

// ── Parsing montant € (R-M5) ─────────────────────────────────────────────────
// Tolérant aux variations locales : espaces (y compris insécables U+00A0 et fines
// U+202F), séparateurs de milliers `.`/`,`/espaces, symbole `€`, suffixe `EUR`.
// Heuristique séparateur décimal : on regarde le DERNIER `.` ou `,` ; s'il est suivi
// d'au plus 2 chiffres ET pas plus loin que la fin (pas un milliers), on le traite
// comme décimal — sinon tout `.`/`,` est milliers (cas "1.000.000" / "1,000,000").
//
// Renvoie un number fini, ou null si entrée vide / non parsable. JAMAIS NaN.
export function parseEurInput(input) {
  if (input == null) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  let s = String(input).trim();
  if (s === '') return null;
  // Retire le symbole € et le suffixe EUR (case-insensitive), ainsi que tout espace
  // (normal U+0020, insécable U+00A0, fine U+202F).
  s = s.replace(/[€]/g, '').replace(/EUR/gi, '');
  s = s.replace(/[\s  ]/g, '');
  // Signe optionnel en tête.
  const sign = s.startsWith('-') ? -1 : 1;
  if (s.startsWith('-') || s.startsWith('+')) s = s.slice(1);
  if (!/^[\d.,]+$/.test(s)) return null;

  // Détection du séparateur décimal : dernier `.` ou `,` suivi d'1 ou 2 chiffres ET
  // dernier groupe (pas suivi d'un autre séparateur).
  let normalized;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  const lastSep = Math.max(lastDot, lastComma);
  if (lastSep === -1) {
    normalized = s;
  } else {
    const decimalPart = s.slice(lastSep + 1);
    if (/^\d{1,2}$/.test(decimalPart)) {
      // dernier séparateur = décimal
      const intPart = s.slice(0, lastSep).replace(/[.,]/g, '');
      normalized = `${intPart}.${decimalPart}`;
    } else {
      // tous les séparateurs sont des milliers
      normalized = s.replace(/[.,]/g, '');
    }
  }
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return sign * n;
}

// ── Secteurs : clusters thématiques (hors finale) + "Autre" ──────────────────
export const SECTOR_OPTIONS = [
  ...QUALIFYING_SESSIONS.map((s) => ({
    value: s.id,
    label: { fr: s.label, en: s.labelEn || s.label, de: s.labelDe || s.label },
  })),
  { value: 'autre', label: { fr: 'Autre', en: 'Other', de: 'Andere' } },
];

// ── Champs requis pour la soumission (blueprint §2.1) ────────────────────────
// Chaque entrée : { field, step }. traction est requise (recommandation §12.4
// confirmée par le règlement Art.4 ; on autorise une explication « pré-revenu »).
//
// V2.5+ — pivot docs_required : les CHAMPS DOC (pitch_deck_path, exec_summary_path)
// ne sont PLUS hardcodés ici. Leur caractère bloquant dépend désormais de la
// configuration `eligibility_rules.docs_required` de l'édition (chaque doc avec
// behavior='exclu' devient un champ requis ; behavior='flag' = recommandé non
// bloquant ; clé absente = pas demandé). On expose `requiredDocsFromRules(rules)`
// pour calculer dynamiquement la liste des champs DOC requis.
export const REQUIRED_FIELDS_STATIC = [
  { field: 'name', step: 'contact' },
  { field: 'contact_person', step: 'contact' },
  { field: 'email', step: 'contact' },
  { field: 'country', step: 'company' },
  { field: 'creation_date', step: 'company' },
  { field: 'registration_number', step: 'company' },
  { field: 'founders_majority', step: 'company' },
  { field: 'value_proposition', step: 'project' },
  { field: 'business_model', step: 'project' },
  { field: 'roadmap', step: 'project' },
  { field: 'team', step: 'project' },
  { field: 'traction', step: 'project' },
  { field: 'sectors', step: 'project' },
  // Affiliation club obligatoire (blueprint §5) — bloque la soumission tant
  // qu'aucun club organisateur n'est choisi. Champ texte (clubs.id = text).
  { field: 'club_id', step: 'club' },
];

// Mapping doc_key (catalogue) -> nom de colonne `startups`. null = pas wired.
const DOC_KEY_TO_FIELD = {
  pitch_deck:   'pitch_deck_path',
  exec_summary: 'exec_summary_path',
  financials:   null,
  video_pitch:  null,
};

// Renvoie la liste { field, step, docKey } des docs RÉELLEMENT bloquants
// d'après les règles d'édition (V2.5+ format ou legacy).
// Un doc compte comme bloquant SSI behavior='exclu'. On filtre les docs non
// wired (financials/video_pitch en V2.5+) — ils ne peuvent pas être requis tant
// qu'il n'y a pas de colonne pour les stocker.
export function requiredDocsFromRules(rules) {
  const raw = rules?.docs_required;
  if (!raw || typeof raw !== 'object') return [];
  // legacy { behavior, docs:[…] }
  if (Array.isArray(raw.docs)) {
    const beh = raw.behavior;
    if (beh !== 'exclu') return [];
    return raw.docs
      .map((k) => DOC_KEY_TO_FIELD[k] ? { field: DOC_KEY_TO_FIELD[k], step: 'documents', docKey: k } : null)
      .filter(Boolean);
  }
  // V2.5+
  const out = [];
  for (const [key, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.behavior !== 'exclu') continue;
    const field = DOC_KEY_TO_FIELD[key];
    if (!field) continue;
    out.push({ field, step: 'documents', docKey: key });
  }
  return out;
}

// Compat : helper qui combine champs statiques + champs DOC requis dynamiquement
// dérivés des règles. Pour le code legacy qui n'a pas de `rules`, on retombe sur
// le comportement historique (pitch_deck + exec_summary requis bloquants).
const LEGACY_REQUIRED_DOC_FIELDS = [
  { field: 'pitch_deck_path', step: 'documents' },
  { field: 'exec_summary_path', step: 'documents' },
];

export function requiredFields(rules) {
  if (rules === undefined) {
    return [...REQUIRED_FIELDS_STATIC, ...LEGACY_REQUIRED_DOC_FIELDS];
  }
  const docFields = requiredDocsFromRules(rules).map(({ field, step }) => ({ field, step }));
  return [...REQUIRED_FIELDS_STATIC, ...docFields];
}

// Compat legacy : REQUIRED_FIELDS = pré-V2.5 (pitch_deck + exec_summary bloquants).
export const REQUIRED_FIELDS = [...REQUIRED_FIELDS_STATIC, ...LEGACY_REQUIRED_DOC_FIELDS];

// Un champ requis est-il rempli ?
export function isFilled(startup, field) {
  const v = startup?.[field];
  if (field === 'sectors') return Array.isArray(v) && v.length > 0;
  if (field === 'founders_majority') return v === true || v === false;
  return !isBlank(v);
}

// Liste des champs requis manquants (pour la soumission). Si `rules` est fourni,
// la liste des docs requis vient des règles ; sinon on retombe sur le défaut.
export function requiredMissing(startup, rules) {
  return requiredFields(rules).filter((r) => !isFilled(startup, r.field));
}

// Première étape contenant un champ requis manquant (pour sauter dessus au submit).
export function firstStepWithMissing(startup, rules) {
  const missing = requiredMissing(startup, rules);
  return missing.length ? missing[0].step : null;
}

// Un champ requis manque-t-il dans une étape donnée ? (pour le point « incomplet »)
export function stepHasMissingRequired(startup, stepId, rules) {
  return requiredFields(rules).some((r) => r.step === stepId && !isFilled(startup, r.field));
}

// ── Validation inline par champ (renvoie une clé d'erreur UI ou null) ────────
// La clé pointe vers UI.errXxx du dictionnaire i18n.
export function validateField(field, value, _startup) {
  switch (field) {
    case 'name':
    case 'contact_person':
      return isBlank(value) ? 'errRequired' : null;
    case 'email':
      if (isBlank(value)) return 'errRequired';
      return isValidEmail(value) ? null : 'errEmail';
    case 'phone':
      return isValidPhone(value) ? null : 'errPhone';
    case 'website':
    case 'video_pitch_url':
      return isValidUrl(value) ? null : 'errUrl';
    case 'country':
      return isBlank(value) ? 'errRequired' : null;
    case 'creation_date':
      if (isBlank(value)) return 'errRequired';
      return isFutureDate(value) ? 'errDateFuture' : null;
    case 'registration_number':
      return isBlank(value) ? 'errRequired' : null;
    case 'value_proposition':
    case 'business_model':
    case 'roadmap':
    case 'team':
    case 'traction':
      return isBlank(value) ? 'errRequired' : null;
    case 'sectors':
      return Array.isArray(value) && value.length > 0 ? null : 'errSectors';
    case 'club_id':
      // Affiliation club obligatoire (blueprint §5). Clé d'erreur dédiée.
      return isBlank(value) ? 'errClubRequired' : null;
    case 'last_revenue':
    case 'amount_raised': {
      if (isBlank(value)) return null; // optionnel
      // Si la valeur est déjà un nombre, on accepte les positifs ; sinon on tente
      // un parsing tolérant aux séparateurs (R-M5) avant de juger.
      const num = typeof value === 'number' ? value : parseEurInput(value);
      if (num == null) return 'errNumber';
      return num >= 0 ? null : 'errNumber';
    }
    case 'pitch_deck_path':
    case 'exec_summary_path':
      // V2.5+ : ces champs ne sont bloquants QUE si les règles de l'édition les
      // marquent en behavior='exclu'. Sans le contexte des règles ici (validateField
      // signature historique), on reste en mode optionnel : la coupure dure se fait
      // au niveau du Submit via requiredMissing(rules) qui voit la config réelle.
      return null;
    case 'incubator_id':
    case 'incubator_other':
      return null; // sourcing : toujours optionnel
    default:
      return null;
  }
}

// ── Éligibilité : règles de l'édition avec repli sur DEFAULT_RULES_2026 ───────
// editions.eligibility_rules peut être {} → on laisse evaluateEligibility utiliser
// son défaut. Sinon on passe l'objet de règles.
export function rulesFromEdition(edition) {
  const r = edition?.eligibility_rules;
  if (r && typeof r === 'object' && Object.keys(r).length > 0) return r;
  return undefined; // evaluateEligibility appliquera DEFAULT_RULES_2026
}

// Le pays est-il « Autre » (ni FR ni DE) tout en étant renseigné ?
export function isOtherCountry(country) {
  return !isBlank(country) && country !== 'FR' && country !== 'DE';
}

// ── Placeholder de n° d'immatriculation, country-aware (R-L1) ────────────────
// Le twin JS (lib/rsa/eligibility.js#isPlaceholderRegistration) strippe les non-chiffres,
// ce qui CASSE pour l'Allemagne : "HRB 12345" devient "12345" et est traité comme un
// numéro générique. On expose ici une variante pour les écrans Module 1 (validation
// inline, preview d'éligibilité) qui accepte les formats allemands réels :
//   - HRB / HRA / GnR / PR / VR + au moins 3 chiffres (Handelsregister & assoc.)
//   - W-IdNr (Wirtschafts-Identifikationsnummer) : 12 chiffres ou format DE...
// Renvoie true si la valeur ressemble à un placeholder (vide, que des 0, "123123..."
// pour FR ; valeur trop courte / 0-only pour DE).
export function isPlaceholderRegistration(value, country) {
  if (isBlank(value)) return true;
  const raw = String(value).trim();
  const digitsOnly = raw.replace(/\D/g, '');
  if (country === 'DE') {
    // Format HRB/HRA/GnR/PR/VR + nombre — accepte largement.
    if (/^(HRB|HRA|GnR|PR|VR)\s?\d{3,}/i.test(raw)) {
      // Refus si le bloc numérique n'est que des zéros (placeholder évident).
      return /^0+$/.test(digitsOnly);
    }
    // W-IdNr : DE suivi de 9 chiffres, ou 11/12 chiffres.
    if (/^DE\s?\d{9,}$/i.test(raw)) return false;
    if (/^\d{8,12}$/.test(digitsOnly)) {
      return /^0+$/.test(digitsOnly);
    }
    // Sinon on retombe sur la règle générique.
  }
  // Règle générique (FR par défaut) — twin de eligibility.js#isPlaceholderRegistration.
  if (digitsOnly.length === 0) return true;
  if (/^0+$/.test(digitsOnly)) return true;
  if (/^(?:123){2,}$/.test(digitsOnly)) return true;
  return false;
}

// Formate une date ISO en libellé localisé court.
export function formatDate(iso, lang = 'fr') {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const locale = lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-GB';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

// Formate un montant € (entier, séparateurs de milliers localisés).
export function formatEur(value, lang = 'fr') {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  const locale = lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-GB';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
