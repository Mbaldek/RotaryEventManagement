// autoLock — règle d'auto-verrouillage des inscriptions session (funnel juré).
//
// FAIT VÉRIFIÉ (base live) : une session est verrouillée (inscription fermée)
// quand aujourd'hui >= session_date - lock_days jours.
//   lock_days = (kind === 'finale' ? edition.finale_lock_days : edition.jury_lock_days)
// Défauts : jury_lock_days = 3, finale_lock_days = 10.
// Si session_date est null → jamais verrouillée.
//
// La règle est miroir côté serveur (rsa_apply_jury rejette une session lockée) ;
// ici on grise + 🔒 la carte côté client pour une UX claire (défense en profondeur).

const DEFAULT_JURY_LOCK_DAYS = 3;
const DEFAULT_FINALE_LOCK_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

// Retourne le nombre de jours de lock applicable à une session selon son kind.
export function lockDaysFor(session, edition) {
  const isFinale = session?.kind === 'finale';
  if (isFinale) {
    const v = edition?.finale_lock_days;
    return Number.isFinite(v) ? v : DEFAULT_FINALE_LOCK_DAYS;
  }
  const v = edition?.jury_lock_days;
  return Number.isFinite(v) ? v : DEFAULT_JURY_LOCK_DAYS;
}

// true quand l'inscription à la session est fermée (auto-lock atteint).
// session_date absent → jamais verrouillée (return false).
export function isSessionLocked(session, edition, now = Date.now()) {
  const raw = session?.session_date;
  if (!raw) return false;
  // session_date est une DATE (YYYY-MM-DD). On la lit en local minuit ; le seuil
  // exact (minuit vs 18h) n'a pas d'incidence à l'échelle "lock_days jours avant".
  const sessionTime = new Date(raw).getTime();
  if (!Number.isFinite(sessionTime)) return false;
  const lockDays = lockDaysFor(session, edition);
  const lockAt = sessionTime - lockDays * DAY_MS;
  return now >= lockAt;
}
