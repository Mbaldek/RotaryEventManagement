// src/lib/platform/competitionShell.js
// Helpers PURS de la nav-flux compétition (état URL, phase par défaut, filtre
// hub par rôle). Aucune dépendance React/i18n — testables en node:test, à
// l'identique de computePrimaryNav.js. Les labels restent des dicos {fr,en,de}
// résolus par t() côté composant.

export const PHASES = [
  { id: 'prep',     label: { fr: 'Préparation',  en: 'Preparation', de: 'Vorbereitung' } },
  { id: 'orga',     label: { fr: 'Organisation', en: 'Organisation', de: 'Organisation' } },
  { id: 'pilotage', label: { fr: 'Pilotage',     en: 'Pilotage',     de: 'Steuerung' } },
];

export const PHASE_IDS = PHASES.map((p) => p.id);

// open -> pilotage (compétition en cours = on la pilote) ; sinon prep (setup).
export function deriveDefaultPhase(edition) {
  if (edition && edition.status === 'open') return 'pilotage';
  return 'prep';
}

// params : URLSearchParams (ou objet avec .get). edition : pour dériver la phase
// par défaut quand ?phase= est absent/invalide.
export function parseShellState(params, edition) {
  const get = typeof params?.get === 'function'
    ? (k) => params.get(k)
    : (k) => (params && params[k] != null ? params[k] : null);

  const competitionId = get('competition') || null;
  let phase = get('phase');
  if (!PHASE_IDS.includes(phase)) phase = deriveDefaultPhase(edition);
  const screen = get('screen') || null;
  const clubId = get('club') || 'all';
  return { competitionId, phase, screen, clubId };
}

// La lentille club n'apparaît qu'en multiclub avec au moins 2 clubs attachés.
export function isClubLensVisible(edition, clubsCount) {
  return !!edition && edition.model === 'multiclub' && (clubsCount || 0) >= 2;
}

// Filtre la liste du hub selon le rôle. master_admin voit tout ; sinon on
// expose les éditions où l'user est competition_admin OU a un club (les ids
// d'éditions sont précalculés côté hook).
export function filterHubCompetitions({
  competitions,
  isMasterAdmin,
  competitionAdminEditions,
  adminClubEditionIds,
} = {}) {
  const all = Array.isArray(competitions) ? competitions : [];
  if (isMasterAdmin) return all;
  const allowed = new Set([
    ...(Array.isArray(competitionAdminEditions) ? competitionAdminEditions : []),
    ...(Array.isArray(adminClubEditionIds) ? adminClubEditionIds : []),
  ]);
  return all.filter((c) => c && allowed.has(c.id));
}
