// ── Competitions tab ────────────────────────────────────────────────────────
export const COMP = {
  sectionTitle:  { fr: 'Compétitions',     en: 'Competitions',  de: 'Wettbewerbe' },
  newCompetition: { fr: 'Nouvelle compétition', en: 'New competition', de: 'Neuer Wettbewerb' },
  noCompetitions: {
    fr: 'Aucune compétition pour l’instant. Créez-en une pour démarrer.',
    en: 'No competitions yet. Create one to get started.',
    de: 'Noch keine Wettbewerbe vorhanden. Erstellen Sie einen, um zu beginnen.',
  },
  // Fields
  idLabel:       { fr: 'Identifiant',      en: 'Identifier',    de: 'Kennung' },
  idHint:        {
    fr: 'Kebab-case, ex. « 2028 » ou « 2028-pilote ». Immuable.',
    en: 'Kebab-case, e.g. “2028” or “2028-pilot”. Immutable.',
    de: 'Kebab-Case, z. B. „2028" oder „2028-pilot". Nach der Erstellung unveränderlich.',
  },
  nameLabel:     { fr: 'Nom',              en: 'Name',          de: 'Name' },
  yearLabel:     { fr: 'Année',            en: 'Year',          de: 'Jahr' },
  modelLabel:    { fr: 'Modèle',           en: 'Model',         de: 'Modell' },
  modelMono:     { fr: 'Monoclub',         en: 'Monoclub',      de: 'Monoclub' },
  modelMulti:    { fr: 'Multiclub',        en: 'Multiclub',     de: 'Multiclub' },
  monoclubHint:  {
    fr: 'Un seul club participant (cas Paris historique).',
    en: 'A single participating club (Paris legacy case).',
    de: 'Nur ein teilnehmender Club (historisches Modell Paris).',
  },
  multiclubHint: {
    fr: 'Plusieurs clubs participants + Grande Finale.',
    en: 'Multiple participating clubs plus a Grand Finale.',
    de: 'Mehrere teilnehmende Clubs sowie ein Grand Finale.',
  },
  invalidId: {
    fr: 'L’identifiant doit être en kebab-case (a-z, 0-9, tiret), commencer par une lettre, max 50 caractères.',
    en: 'Identifier must be kebab-case (a-z, 0-9, hyphen), start with a letter, max 50 chars.',
    de: 'Die Kennung muss im Kebab-Case-Format sein (a-z, 0-9, Bindestrich), mit einem Buchstaben beginnen und maximal 50 Zeichen umfassen.',
  },
  // Card meta
  status:        { fr: 'Statut',           en: 'Status',        de: 'Status' },
  model:         { fr: 'Modèle',           en: 'Model',         de: 'Modell' },
  clubsAttached: { fr: 'club(s) attaché(s)', en: 'club(s) attached', de: 'zugeordnete(r) Club(s)' },
  applications:  { fr: 'candidature(s)',   en: 'application(s)', de: 'Bewerbung(en)' },
  sessions:      { fr: 'session(s)',       en: 'session(s)',    de: 'Session(s)' },
  openEditor:    { fr: 'Ouvrir l’éditeur', en: 'Open editor',   de: 'Editor öffnen' },
  // Editor
  editorTitle:   { fr: 'Éditer la compétition', en: 'Edit competition', de: 'Wettbewerb bearbeiten' },
  attachedClubsSection: {
    fr: 'Clubs participants',
    en: 'Participating clubs',
    de: 'Teilnehmende Clubs',
  },
  attachedClubsHint: {
    fr: 'Visible uniquement pour les compétitions multiclub. Ajoutez ou retirez des clubs ici.',
    en: 'Only shown for multiclub competitions. Add or remove participating clubs here.',
    de: 'Nur bei Multiclub-Wettbewerben sichtbar. Hier können Sie Clubs hinzufügen oder entfernen.',
  },
  pickClubToAttach: { fr: 'Choisir un club à ajouter', en: 'Pick a club to attach', de: 'Club zum Hinzufügen auswählen' },
  attachClub:    { fr: 'Attacher',         en: 'Attach',        de: 'Zuordnen' },
  detachClub:    { fr: 'Détacher',         en: 'Detach',        de: 'Entfernen' },
  detachConfirmTitle: {
    fr: 'Détacher ce club',
    en: 'Detach this club',
    de: 'Diesen Club entfernen',
  },
  detachConfirmBody: {
    fr: 'Le club sera retiré de la compétition. Refusé si des candidatures ou sessions existent déjà. Tapez DETACH pour confirmer.',
    en: 'The club will be removed from the competition. Refused if applications or sessions already exist. Type DETACH to confirm.',
    de: 'Der Club wird aus dem Wettbewerb entfernt. Nicht möglich, sofern bereits Bewerbungen oder Sessions vorhanden sind. Tippen Sie DETACH zur Bestätigung.',
  },
  detachTypePrompt: {
    fr: 'Tapez DETACH pour confirmer',
    en: 'Type DETACH to confirm',
    de: 'Tippen Sie DETACH zur Bestätigung',
  },
  detachIntegrityBlocked: {
    fr: 'Impossible : des candidatures ou sessions existent déjà pour ce club dans cette compétition.',
    en: 'Cannot detach: applications or sessions already exist for this club in this competition.',
    de: 'Nicht möglich: Für diesen Club bestehen in diesem Wettbewerb bereits Bewerbungen oder Sessions.',
  },
  noClubsAttached: {
    fr: 'Aucun club attaché pour le moment.',
    en: 'No club attached yet.',
    de: 'Noch kein Club zugeordnet.',
  },
  allClubsAttached: {
    fr: 'Tous les clubs existants sont déjà attachés.',
    en: 'All existing clubs are already attached.',
    de: 'Sämtliche bestehenden Clubs sind bereits zugeordnet.',
  },

  // ── V2.5 — Save sticky footer + 3-step delete ─────────────────────────────
  unsavedChanges: {
    fr: 'Modifications non enregistrées',
    en: 'Unsaved changes',
    de: 'Nicht gespeicherte Änderungen',
  },
  beforeUnloadWarning: {
    fr: 'Modifications non enregistrées. Quitter quand même ?',
    en: 'You have unsaved changes. Leave anyway?',
    de: 'Es gibt nicht gespeicherte Änderungen. Trotzdem verlassen?',
  },
  competitionSaved: {
    fr: 'Compétition enregistrée',
    en: 'Competition saved',
    de: 'Wettbewerb gespeichert',
  },
  deleteCompetitionLink: {
    fr: 'Supprimer cette compétition',
    en: 'Delete this competition',
    de: 'Diesen Wettbewerb löschen',
  },
  deleteStep1Title: {
    fr: 'Supprimer définitivement cette compétition ?',
    en: 'Permanently delete this competition?',
    de: 'Diesen Wettbewerb endgültig löschen?',
  },
  deleteStep1Lede: {
    fr: 'Cette action supprimera définitivement les éléments suivants. L’historique sera perdu, aucune sauvegarde.',
    en: 'This action will permanently delete the items below. History will be lost, no backup.',
    de: 'Diese Aktion löscht die folgenden Elemente unwiderruflich. Der Verlauf geht verloren, es erfolgt keine Sicherung.',
  },
  countClubsAttached: {
    fr: 'club(s) attaché(s) — les clubs eux-mêmes restent, seule l’association est supprimée',
    en: 'attached club(s) — the clubs themselves remain, only the link is removed',
    de: 'zugeordnete(r) Club(s) — die Clubs selbst bleiben erhalten, nur die Verknüpfung wird gelöst',
  },
  countSessions: {
    fr: 'session(s)',
    en: 'session(s)',
    de: 'Session(s)',
  },
  countSessionsBreakdownDraft: {
    fr: 'en draft',
    en: 'in draft',
    de: 'als Entwurf',
  },
  countSessionsBreakdownLive: {
    fr: 'en direct',
    en: 'live',
    de: 'live',
  },
  countSessionsBreakdownPublished: {
    fr: 'publiée(s)',
    en: 'published',
    de: 'veröffentlicht',
  },
  countStartups: {
    fr: 'candidature(s) startups',
    en: 'startup application(s)',
    de: 'Startup-Bewerbung(en)',
  },
  countReviews: {
    fr: 'évaluation(s) comité',
    en: 'committee review(s)',
    de: 'Komitee-Bewertung(en)',
  },
  countScores: {
    fr: 'note(s) jury',
    en: 'jury score(s)',
    de: 'Jury-Bewertung(en)',
  },
  deleteNext: {
    fr: 'Suivant',
    en: 'Next',
    de: 'Weiter',
  },
  deleteStep2Title: {
    fr: 'Confirmation finale',
    en: 'Final confirmation',
    de: 'Endgültige Bestätigung',
  },
  // {phrase} sera remplacé par "SUPPRIMER {name}" dans le composant
  deleteStep2Prompt: {
    fr: 'Tapez exactement {phrase} pour confirmer.',
    en: 'Type exactly {phrase} to confirm.',
    de: 'Tippen Sie exakt {phrase} ein, um zu bestätigen.',
  },
  deleteFinalAction: {
    fr: 'Supprimer définitivement',
    en: 'Delete permanently',
    de: 'Endgültig löschen',
  },
  deleteTypedMismatch: {
    fr: 'La saisie ne correspond pas. Recopiez exactement la phrase ci-dessus.',
    en: 'The text does not match. Copy the exact phrase above.',
    de: 'Die Eingabe stimmt nicht überein. Bitte übernehmen Sie den oben angezeigten Wortlaut exakt.',
  },
  competitionDeleted: {
    fr: 'Compétition supprimée',
    en: 'Competition deleted',
    de: 'Wettbewerb gelöscht',
  },
  deleteForbidden: {
    fr: 'Seul un master_admin peut supprimer une compétition.',
    en: 'Only a master_admin can delete a competition.',
    de: 'Nur ein master_admin kann einen Wettbewerb löschen.',
  },

  // ── V3 — Funnel & Edit view (modal création + page édition) ───────────────
  funnelEyebrow: {
    fr: 'compétition',
    en: 'competition',
    de: 'Wettbewerb',
  },
  funnelNewTitle: {
    fr: 'Nouvelle compétition',
    en: 'New competition',
    de: 'Neuer Wettbewerb',
  },
  funnelEditTitle: {
    fr: 'Édition de compétition',
    en: 'Edit competition',
    de: 'Wettbewerb bearbeiten',
  },
  backToCompetitions: {
    fr: '← Compétitions',
    en: '← Competitions',
    de: '← Wettbewerbe',
  },
  // Tabs labels (6)
  tabIdentity: {
    fr: 'Identité',
    en: 'Identity',
    de: 'Identität',
  },
  tabCalendar: {
    fr: 'Calendrier',
    en: 'Calendar',
    de: 'Kalender',
  },
  tabClubs: {
    fr: 'Clubs',
    en: 'Clubs',
    de: 'Clubs',
  },
  tabRules: {
    fr: 'Règles',
    en: 'Rules',
    de: 'Regeln',
  },
  tabPrizes: {
    fr: 'Prix',
    en: 'Prizes',
    de: 'Preise',
  },
  tabCommunication: {
    fr: 'Communication',
    en: 'Communication',
    de: 'Kommunikation',
  },
  tabRoles: {
    fr: 'Rôles',
    en: 'Roles',
    de: 'Rollen',
  },
  tabSessions: {
    fr: 'Sessions',
    en: 'Sessions',
    de: 'Sessions',
  },
  // ── Équipe B (custom fields builder) — tab principal entre Prix et Finale ─
  tabFormulaires: {
    fr: 'Formulaires',
    en: 'Forms',
    de: 'Formulare',
  },
  // Autosave status indicator
  autosaveSaving: {
    fr: 'Enregistrement…',
    en: 'Saving…',
    de: 'Speichern…',
  },
  autosaveSaved: {
    fr: 'Enregistré',
    en: 'Saved',
    de: 'Gespeichert',
  },
  autosaveError: {
    fr: 'Erreur d’enregistrement',
    en: 'Save error',
    de: 'Speicherfehler',
  },
  autosaveJustNow: {
    fr: 'à l’instant',
    en: 'just now',
    de: 'gerade eben',
  },
  // Templates "{n}s" / "{n}min" — {n} sera remplacé par le composant
  autosaveSecondsAgo: {
    fr: 'il y a {n}s',
    en: '{n}s ago',
    de: 'vor {n}s',
  },
  autosaveMinutesAgo: {
    fr: 'il y a {n}min',
    en: '{n}min ago',
    de: 'vor {n}min',
  },
  autosaveHoursAgo: {
    fr: 'il y a {n}h',
    en: '{n}h ago',
    de: 'vor {n}h',
  },
  autosaveSavedAgo: {
    // {ago} sera remplacé par "à l'instant" / "il y a 3s" / etc.
    fr: 'Enregistré {ago}',
    en: 'Saved {ago}',
    de: 'Gespeichert {ago}',
  },
  // Funnel création — messages d'étapes verrouillées
  identityFirstHint: {
    fr: 'Renseignez l’identité avant d’accéder aux autres sections.',
    en: 'Fill in the identity before unlocking the other sections.',
    de: 'Tragen Sie die Identität ein, bevor Sie die anderen Abschnitte öffnen.',
  },
  prizesAfterCreate: {
    fr: 'Le module Prix sera disponible après la création de la compétition.',
    en: 'The Prizes module becomes available after the competition is created.',
    de: 'Das Preise-Modul ist nach der Erstellung des Wettbewerbs verfügbar.',
  },
  clubsAfterCreate: {
    fr: 'Vous pourrez attacher des clubs participants après la création.',
    en: 'You can attach participating clubs after creation.',
    de: 'Sie können teilnehmende Clubs nach der Erstellung anhängen.',
  },
  clubsMonoclubNote: {
    fr: 'Compétition monoclub — un seul club participant. Section non applicable.',
    en: 'Monoclub competition — a single participating club. Section not applicable.',
    de: 'Monoclub-Wettbewerb — nur ein teilnehmender Club. Abschnitt nicht zutreffend.',
  },
  competitionCreated: {
    fr: 'Compétition créée',
    en: 'Competition created',
    de: 'Wettbewerb erstellt',
  },
  // Footer / chrome
  closeModal: {
    fr: 'Fermer',
    en: 'Close',
    de: 'Schließen',
  },
  saveInProgressWarn: {
    fr: 'Enregistrement en cours. Fermer quand même ?',
    en: 'Save in progress. Close anyway?',
    de: 'Speichern läuft. Trotzdem schließen?',
  },
  // Identity tab specific fields
  identityIdLabel: {
    fr: 'Identifiant (kebab-case, immuable)',
    en: 'Identifier (kebab-case, immutable)',
    de: 'Kennung (Kebab-Case, unveränderlich)',
  },
  identityIdImmutableHint: {
    fr: 'L’identifiant ne peut plus être modifié après création.',
    en: 'The identifier cannot be changed after creation.',
    de: 'Die Kennung kann nach der Erstellung nicht mehr geändert werden.',
  },
  // Communication tab
  publicResultsEnabled: {
    fr: 'Palmarès public activé',
    en: 'Public results enabled',
    de: 'Öffentliche Ergebnisse aktiviert',
  },
  publicResultsHint: {
    fr: 'Quand activé, /Resultats affiche les classements publiés de cette compétition.',
    en: 'When on, /Resultats shows this competition’s published rankings.',
    de: 'Sobald aktiviert, zeigt /Resultats die veröffentlichten Ranglisten dieses Wettbewerbs an.',
  },
  publicResultsOpenDate: {
    fr: 'Date d’ouverture publique',
    en: 'Public opening date',
    de: 'Datum der öffentlichen Freischaltung',
  },
  publicResultsOpenDateHint: {
    fr: 'Réservé à une activation future — non encore connecté à /Resultats.',
    en: 'Reserved for future activation — not yet wired to /Resultats.',
    de: 'Für eine spätere Aktivierung vorgesehen — noch nicht mit /Resultats verknüpft.',
  },
  // Creation form actions
  createAndContinue: {
    fr: 'Créer et continuer',
    en: 'Create and continue',
    de: 'Erstellen und fortfahren',
  },

  // — V3 (2026-06): Président du jury —
  juryPresidentSection: {
    fr: 'Président·e du jury',
    en: 'Jury chair',
    de: 'Jury-Vorsitz',
  },
  juryPresidentLabel: {
    fr: 'Nom du président·e',
    en: 'Chair name',
    de: 'Name des Vorsitzes',
  },
  juryPresidentPlaceholder: {
    fr: 'Marie Dupont, CEO XYZ',
    en: 'Marie Dupont, CEO XYZ',
    de: 'Marie Dupont, CEO XYZ',
  },
  juryPresidentPhotoLabel: {
    fr: 'Photo (optionnelle)',
    en: 'Photo (optional)',
    de: 'Foto (optional)',
  },
  juryPresidentHint: {
    fr: 'Information affichée sur le palmarès public. Aucune implication métier.',
    en: 'Displayed on the public results page. No business logic.',
    de: 'Wird auf der öffentlichen Ergebnisseite angezeigt. Keine Geschäftslogik.',
  },
};
