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
export const REQUIRED_FIELDS = [
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
  { field: 'pitch_deck_path', step: 'documents' },
  { field: 'exec_summary_path', step: 'documents' },
];

// Un champ requis est-il rempli ?
export function isFilled(startup, field) {
  const v = startup?.[field];
  if (field === 'sectors') return Array.isArray(v) && v.length > 0;
  if (field === 'founders_majority') return v === true || v === false;
  return !isBlank(v);
}

// Liste des champs requis manquants (pour la soumission).
export function requiredMissing(startup) {
  return REQUIRED_FIELDS.filter((r) => !isFilled(startup, r.field));
}

// Première étape contenant un champ requis manquant (pour sauter dessus au submit).
export function firstStepWithMissing(startup) {
  const missing = requiredMissing(startup);
  return missing.length ? missing[0].step : null;
}

// Un champ requis manque-t-il dans une étape donnée ? (pour le point « incomplet »)
export function stepHasMissingRequired(startup, stepId) {
  return REQUIRED_FIELDS.some((r) => r.step === stepId && !isFilled(startup, r.field));
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
      return isBlank(value) ? 'errRequired' : null;
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
