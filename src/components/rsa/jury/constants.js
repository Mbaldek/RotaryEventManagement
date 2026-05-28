// Espace Jury — constantes partagées (mappings statut session / countdown formatter).
//
// La SSOT pour les critères de scoring vit dans @/lib/rsa/constants (CRITERIA / weightedScore /
// criteriaFilledCount / SCORE_FIELDS / MAX_WEIGHTED). Ne pas redupliquer ici.

// ── Lifecycle session (session_config.status — legacy, REUSED) ──────────────
export const SESSION_STATUS = {
  DRAFT: 'draft',
  LIVE: 'live',
  LOCKED: 'locked',
  PUBLISHED: 'published',
};

export const SESSION_STATUS_ORDER = ['draft', 'live', 'locked', 'published'];

// True si le scoring grid est ouvert en écriture (drafts + submits autorisés côté RLS).
export function isSessionLive(status) {
  return status === SESSION_STATUS.LIVE;
}

// True si la session est verrouillée/publiée -> UI read-only sur le scoring.
export function isSessionLockedOrPublished(status) {
  return status === SESSION_STATUS.LOCKED || status === SESSION_STATUS.PUBLISHED;
}

// True si la session est publiée -> on affiche le palmarès.
export function isSessionPublished(status) {
  return status === SESSION_STATUS.PUBLISHED;
}

// ── Countdown formatter : J-X / today / yesterday ───────────────────────────
// Renvoie { kind: 'today'|'tomorrow'|'yesterday'|'in'|'past', days } pour que le
// composant rende le bon dict i18n (UI.countdownToday / In(n) / Past(n) / …).
export function computeCountdown(isoDate, now = new Date()) {
  if (!isoDate) return null;
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return null;
  // Compare aux jours civils (et non à l'horodatage instantané) pour éviter "J-0"
  // qui basculerait en "Hier" à 00:01.
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const n = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = t.getTime() - n.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return { kind: 'today', days: 0 };
  if (days === 1) return { kind: 'tomorrow', days: 1 };
  if (days === -1) return { kind: 'yesterday', days: 1 };
  if (days > 0) return { kind: 'in', days };
  return { kind: 'past', days: -days };
}

// ── Format date courte trilingue ────────────────────────────────────────────
export function formatShortDate(iso, lang = 'fr') {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const locale = lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-GB';
    return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return '';
  }
}

// Sort helper : sessions par session_date ASC puis position ASC.
export function compareSessions(a, b) {
  const da = a?.session_date ? Date.parse(a.session_date) : 0;
  const db = b?.session_date ? Date.parse(b.session_date) : 0;
  if (da !== db) return da - db;
  return (a?.position ?? 0) - (b?.position ?? 0);
}
