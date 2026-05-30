// ── Tabs ────────────────────────────────────────────────────────────────────
// Note 2026-05-29 (équipe D — KILL extensions/marketplace) :
//   * Le tab 'advanced' du master cockpit a été retiré.
//   * Email Studio (opérationnel) part dans son propre flow (équipe B).
//   * Extensions + Marketplace : archi UI + entité + hooks intégralement
//     supprimés (plus de /AdminAdvanced, plus de catalogue, plus d'install par
//     club). La migration DB est gérée par équipe A.
export const TABS = {
  overview:           { fr: "Vue d'ensemble",     en: 'Overview',                de: 'Übersicht' },
  competitions:       { fr: 'Compétitions',      en: 'Competitions',            de: 'Wettbewerbe' },
  clubs:              { fr: 'Clubs',              en: 'Clubs',                   de: 'Clubs' },
  roles:              { fr: 'Rôles globaux',      en: 'Global roles',            de: 'Globale Rollen' },
  competition_admins: { fr: 'Admins compétition', en: 'Competition admins',      de: 'Wettbewerbs-Administratoren' },
};

// Ordre : roles → competition_admins. jury_apps + finale RETIRÉS (2026-05-29) :
// candidatures jury scopées (edition_id, club_id) gérées par club_admin ;
// Finale est un attribut d'edition, gérée dans CompetitionEditView > tab Finale.
// 'advanced' RETIRÉ (2026-05-29 équipe D — kill extensions/marketplace).
// 'clubs' RETIRÉ (refonte hiérarchie) : un club n'est plus une entité racine
// au même niveau qu'une compétition. L'annuaire des clubs est désormais rendu
// comme section read-only dans OverviewPanel ; pour gérer un club spécifique,
// passer par Compétition ▸ Clubs participants ▸ {club} (breadcrumb).
export const TAB_IDS = [
  'overview',
  'competitions',
  'roles',
  'competition_admins',
];
