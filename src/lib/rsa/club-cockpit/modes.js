// Logique pure du Club Cockpit : axe de mode (Préparation/Pilotage) et
// regroupement des onglets par mode. Aucune dépendance React/Supabase — testable
// en isolation (vitest, node env). Les LABELS restent dans components/club/i18n.js
// (CLUB_TABS), keyés par les ids définis ici.

export const CLUB_MODES = { PREP: 'prep', PILOTAGE: 'pilotage' };

// Onglets de configuration (mode Préparation).
export const PREP_TABS = ['setup', 'team', 'rules', 'prizes', 'jury_applications'];

// Onglets de suivi/pilotage (mode Pilotage). 'pilotage' = landing dashboard.
export const PILOTAGE_TABS = ['pilotage', 'live', 'results', 'analytics', 'comms'];

export function isClubMode(m) {
  return m === CLUB_MODES.PREP || m === CLUB_MODES.PILOTAGE;
}

// urlMode (?mode=) prime s'il est valide ; sinon défaut intelligent : une édition
// 'open' (compétition live) atterrit en Pilotage, sinon en Préparation.
export function resolveClubMode(urlMode, edition) {
  if (isClubMode(urlMode)) return urlMode;
  return edition?.status === 'open' ? CLUB_MODES.PILOTAGE : CLUB_MODES.PREP;
}

// Fallback sur PREP_TABS pour toute valeur non-PILOTAGE (y compris null/undefined).
// Les appelants passent toujours un mode produit par resolveClubMode().
export function tabsForMode(mode) {
  return mode === CLUB_MODES.PILOTAGE ? PILOTAGE_TABS : PREP_TABS;
}

export function modeForTab(tabId) {
  if (PILOTAGE_TABS.includes(tabId)) return CLUB_MODES.PILOTAGE;
  if (PREP_TABS.includes(tabId)) return CLUB_MODES.PREP;
  return null;
}

export function firstTabOf(mode) {
  return tabsForMode(mode)[0];
}

// Garde l'onglet courant s'il appartient au mode cible, sinon retombe sur le 1er
// onglet du mode (utilisé quand on bascule de mode).
export function reconcileTab(tabId, mode) {
  return modeForTab(tabId) === mode ? tabId : firstTabOf(mode);
}
