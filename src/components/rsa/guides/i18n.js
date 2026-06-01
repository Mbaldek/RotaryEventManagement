// Chaînes UI du « chrome » des guides (labels, titres de drawer par espace).
// Le CONTENU des guides vient de la base ; ici uniquement l'habillage.
// Dicos { fr, en, de } résolus via useLang().t(...).

export const GUIDE_UI = {
  trigger: { fr: 'Guide', en: 'Guide', de: 'Anleitung' },
  triggerAria: { fr: 'Ouvrir le guide', en: 'Open guide', de: 'Anleitung öffnen' },
  newBadgeAria: { fr: 'Nouveau contenu', en: 'New content', de: 'Neuer Inhalt' },
  close: { fr: 'Fermer', en: 'Close', de: 'Schließen' },
  loading: { fr: 'Chargement…', en: 'Loading…', de: 'Laden…' },
  loadError: { fr: 'Impossible de charger le guide.', en: 'Could not load the guide.', de: 'Anleitung konnte nicht geladen werden.' },
  empty: { fr: 'Aucun guide pour le moment.', en: 'No guide yet.', de: 'Noch keine Anleitung.' },
  updatedAt: { fr: 'Mis à jour le', en: 'Updated on', de: 'Aktualisiert am' },
};

// Titre du drawer par espace.
export const GUIDE_SPACE_TITLE = {
  admin: { fr: 'Guide — Administration', en: 'Guide — Administration', de: 'Anleitung — Verwaltung' },
  selection: { fr: 'Guide — Sélection', en: 'Guide — Selection', de: 'Anleitung — Auswahl' },
  jury: { fr: 'Guide — Jury', en: 'Guide — Jury', de: 'Anleitung — Jury' },
  dossier: { fr: 'Guide — Mon dossier', en: 'Guide — My application', de: 'Anleitung — Meine Bewerbung' },
  concours: { fr: 'Guide — Le concours', en: 'Guide — The competition', de: 'Anleitung — Der Wettbewerb' },
};

export const GUIDE_SPACES = ['admin', 'selection', 'jury', 'dossier', 'concours'];

// Libellé lisible d'un espace (picker admin).
export const GUIDE_SPACE_LABEL = {
  admin: { fr: 'Administration', en: 'Administration', de: 'Verwaltung' },
  selection: { fr: 'Sélection', en: 'Selection', de: 'Auswahl' },
  jury: { fr: 'Jury', en: 'Jury', de: 'Jury' },
  dossier: { fr: 'Mon dossier', en: 'My application', de: 'Meine Bewerbung' },
  concours: { fr: 'Le concours', en: 'The competition', de: 'Der Wettbewerb' },
};
