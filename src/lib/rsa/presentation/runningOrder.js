// Helpers purs du running order de session. Aucun accès réseau/DB — testables
// en node --test. Cf. docs/blueprints/session-presentation-generator.md §2.1.

// Durée d'un slot de passage (pitch 10-12 min + Q&A 8-10 min). Format RSA figé.
export const PITCH_SLOT_MINUTES = 20;

// Horaire estimé d'une startup : start_time + (order-1) * slot. Retourne 'HH:MM'
// ou null si start_time manquant/invalide. order est 1-based.
export function estimatedPitchTime(startTime, order, slotMinutes = PITCH_SLOT_MINUTES) {
  if (!startTime || typeof startTime !== 'string') return null;
  const m = startTime.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  if (typeof order !== 'number' || !Number.isFinite(order)) return null;
  const base = Number(m[1]) * 60 + Number(m[2]);
  const total = base + (Math.max(1, order) - 1) * slotMinutes;
  const hh = Math.floor((total % (24 * 60)) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// Ordinal localisé pour l'affichage du rang de passage dans les emails.
export function ordinal(n, lang = 'fr') {
  if (lang === 'fr') return n === 1 ? '1er' : `${n}e`;
  if (lang === 'de') return `${n}.`;
  // en
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Slug ascii pour le nom de fichier du deck exporté.
export function slugify(str) {
  return String(str || 'session')
    .normalize('NFD').replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'session';
}