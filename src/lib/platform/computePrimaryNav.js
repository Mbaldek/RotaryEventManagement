// Nav primaire de la plateforme RSA — fonction PURE (testable hors React).
//
// Pourquoi pure ? Idem que postLoginRoute.js : un seul endroit qui décide quels
// items la TopNav affiche, déterministe, auditable, sans dépendance React/i18n
// (les labels sont fournis sous forme de dico { fr, en, de } — la résolution
// dans la langue active reste côté composant via t()).
//
// Règle de priorité (cohérente avec computeLandingRoute) :
//   1. Admin (master_admin / admin legacy / competition_admin / club_admin)
//      → un SEUL item /Admin (le scope est résolu par AdminShell ; on n'affiche
//      pas d'item "candidat" parallèle pour ne pas brouiller la lecture).
//   2. Comité / Jury (rôles ops sans admin) → Sélection et/ou Jury, ordre stable.
//   3. Fallback candidat (aucun rôle ops/admin) → Mon dossier + Concours.
//
// Notes :
//   * Les labels sont des dicos { fr, en, de } pour rester compatibles avec
//     useLang().t() côté TopNav. Pas de chaîne hard-codée ici.
//   * Tableau toujours non-null (vide possible en théorie, mais le fallback
//     rattrape : un user sans rôle voit toujours au moins 2 items).
//   * On NE retourne PAS d'item "Concours" pour les rôles ops/admin : leur
//     entry-point dédié (Sélection/Jury/Admin) couvre déjà leur besoin.

const LABELS = {
  admin: { fr: 'Administration', en: 'Administration', de: 'Verwaltung' },
  selection: { fr: 'Sélection', en: 'Selection', de: 'Auswahl' },
  jury: { fr: 'Jury', en: 'Jury', de: 'Jury' },
  myDossier: { fr: 'Mon dossier', en: 'My application', de: 'Mein Dossier' },
  concours: { fr: 'Concours', en: 'Awards', de: 'Wettbewerb' },
};

export function computePrimaryNav({
  roles,
  clubMemberships,
  competitionAdminEditions,
} = {}) {
  const safeRoles = Array.isArray(roles) ? roles : [];
  const safeCM = Array.isArray(clubMemberships) ? clubMemberships : [];
  const safeCA = Array.isArray(competitionAdminEditions) ? competitionAdminEditions : [];

  // 1. Admin (toute forme) : Administration + accès DIRECT aux modules
  //    opérationnels (Sélection = dossiers candidats, Jury). Avant, l'admin
  //    n'avait qu'un item « Administration » : les dossiers vivaient sur
  //    /Selection et /Jury qu'AUCUN lien de nav ne surfaçait → il fallait
  //    connaître l'URL. On expose désormais les 3 points d'entrée en permanence,
  //    peu importe la profondeur où l'on se trouve dans le cockpit.
  const isAdmin =
    safeRoles.includes('master_admin') ||
    safeRoles.includes('admin') ||
    safeCA.length > 0 ||
    safeCM.some((m) => m && m.role === 'club_admin');
  if (isAdmin) {
    return [
      { to: '/Admin', label: LABELS.admin },
      { to: '/Selection', label: LABELS.selection },
      { to: '/Jury', label: LABELS.jury },
    ];
  }

  // 2. Comité et/ou Jury (ops sans admin). On garde l'ordre stable
  //    Sélection > Jury — Sélection venant chronologiquement avant le Jury
  //    dans le funnel RSA (revue dossiers, puis notation).
  const hasComite = safeRoles.includes('comite') || safeCM.some((m) => m && m.role === 'comite');
  const hasJury = safeRoles.includes('jury') || safeCM.some((m) => m && m.role === 'jury');
  if (hasComite || hasJury) {
    return [
      hasComite && { to: '/Selection', label: LABELS.selection },
      hasJury && { to: '/Jury', label: LABELS.jury },
    ].filter(Boolean);
  }

  // 3. Fallback candidat — Mon dossier (espace personnel) + Concours (catalogue
  //    des éditions ouvertes pour postuler à d'autres clubs).
  return [
    { to: '/MonDossier', label: LABELS.myDossier },
    { to: '/Concours', label: LABELS.concours },
  ];
}

// Réexposé pour permettre aux composants consommateurs d'importer le même
// dictionnaire de labels si besoin (tests, drawer mobile, snapshots).
export const NAV_LABELS = LABELS;
