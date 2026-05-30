// ── Sentinels (mirror SQL CHECK) ────────────────────────────────────────────
export const COMPETITION_MODELS = ['monoclub', 'multiclub'];
export const CLUB_ROLES = ['club_admin', 'comite', 'jury'];

// Kebab-case validator (mirror du regex SQL '^[a-z][a-z0-9-]{0,49}$')
export const KEBAB_REGEX = /^[a-z][a-z0-9-]{0,49}$/;

// ── V2.5 — Country & language catalogs ──────────────────────────────────────
// Liste resserrée des pays Rotary Europe + IT/ES/PT/UK pour la création de club.
// Labels FR/EN/DE. Code = ISO 3166-1 alpha-2.
export const COUNTRY_OPTIONS = [
  { code: 'FR', fr: 'France',         en: 'France',         de: 'Frankreich' },
  { code: 'DE', fr: 'Allemagne',      en: 'Germany',        de: 'Deutschland' },
  { code: 'BE', fr: 'Belgique',       en: 'Belgium',        de: 'Belgien' },
  { code: 'CH', fr: 'Suisse',         en: 'Switzerland',    de: 'Schweiz' },
  { code: 'LU', fr: 'Luxembourg',     en: 'Luxembourg',     de: 'Luxemburg' },
  { code: 'IT', fr: 'Italie',         en: 'Italy',          de: 'Italien' },
  { code: 'ES', fr: 'Espagne',        en: 'Spain',          de: 'Spanien' },
  { code: 'PT', fr: 'Portugal',       en: 'Portugal',       de: 'Portugal' },
  { code: 'NL', fr: 'Pays-Bas',       en: 'Netherlands',    de: 'Niederlande' },
  { code: 'GB', fr: 'Royaume-Uni',    en: 'United Kingdom', de: 'Vereinigtes Königreich' },
  { code: 'AT', fr: 'Autriche',       en: 'Austria',        de: 'Österreich' },
  { code: 'IE', fr: 'Irlande',        en: 'Ireland',        de: 'Irland' },
];

// Langues principales supportées par la plateforme (mirror SQL CHECK).
export const LANGUAGE_OPTIONS = [
  { code: 'fr', fr: 'Français',       en: 'French',         de: 'Französisch' },
  { code: 'en', fr: 'Anglais',        en: 'English',        de: 'Englisch' },
  { code: 'de', fr: 'Allemand',       en: 'German',         de: 'Deutsch' },
  { code: 'it', fr: 'Italien',        en: 'Italian',        de: 'Italienisch' },
  { code: 'es', fr: 'Espagnol',       en: 'Spanish',        de: 'Spanisch' },
  { code: 'nl', fr: 'Néerlandais',    en: 'Dutch',          de: 'Niederländisch' },
  { code: 'pt', fr: 'Portugais',      en: 'Portuguese',     de: 'Portugiesisch' },
];

// Email format minimal (validation client uniquement, le SQL ne vérifie pas).
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Slugify côté client — mirror exact de la génération SQL côté rsa_create_club.
// Utilisé UNIQUEMENT pour la preview live « ↳ ID : … » sous le nom (l'ID réel
// est généré côté serveur, source de vérité).
export function slugifyClubName(name) {
  if (!name) return '';
  let slug = String(name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  slug = slug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug.slice(0, 50).replace(/-+$/g, '');
}
