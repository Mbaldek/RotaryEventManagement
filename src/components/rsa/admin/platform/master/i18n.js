// i18n trilingue (FR/EN/DE) du Master Cockpit V2 (RSA multi-club).
//
// Forme { fr, en, de } compatible useLang().t(dict). Aucune string utilisateur n'est
// hardcodée dans les composants : tout passe par ce dictionnaire.
//
// Les copies EN/DE sont rédigées pour un usage institutionnel (master_admin parle
// à des Rotary clubs internationaux). Les notes "TODO refine DE copy" marquent les
// libellés qui devront être validés par un relecteur DE natif.

// ── Tabs ────────────────────────────────────────────────────────────────────
export const TABS = {
  competitions: { fr: 'Compétitions',     en: 'Competitions',    de: 'Wettbewerbe' },
  clubs:        { fr: 'Clubs',             en: 'Clubs',           de: 'Clubs' },
  roles:        { fr: 'Rôles globaux',     en: 'Global roles',    de: 'Globale Rollen' },
  jury_apps:    { fr: 'Candidatures jury', en: 'Jury applications', de: 'Jury-Bewerbungen' },
  finale:       { fr: 'Finale fédérée',    en: 'Federated finale', de: 'Föderierte Finale' },
  comms:        { fr: 'Communications',    en: 'Communications',  de: 'Kommunikation' },
  extensions:   { fr: 'Extensions',        en: 'Extensions',      de: 'Erweiterungen' },
};

export const TAB_IDS = ['competitions', 'clubs', 'roles', 'jury_apps', 'finale', 'comms', 'extensions'];

// ── Page header ─────────────────────────────────────────────────────────────
export const UI = {
  eyebrow:    { fr: 'Master Cockpit',     en: 'Master Cockpit',  de: 'Master-Cockpit' },
  pageTitle:  { fr: 'Pilotage plateforme', en: 'Platform pilot',  de: 'Plattform-Steuerung' },
  pageSubtitle: {
    fr: 'Compétitions, clubs participants, rôles globaux et grande finale fédérée — vue plateforme.',
    en: 'Competitions, participating clubs, global roles and the federated grand finale — platform view.',
    de: 'Wettbewerbe, teilnehmende Clubs, globale Rollen und föderierte Grand Finale — Plattformsicht.', // TODO refine DE copy
  },
  // Generic actions
  save:       { fr: 'Enregistrer',         en: 'Save',           de: 'Speichern' },
  saving:     { fr: 'Enregistrement…',     en: 'Saving…',        de: 'Speichern…' },
  saved:      { fr: 'Enregistré',          en: 'Saved',          de: 'Gespeichert' },
  cancel:     { fr: 'Annuler',             en: 'Cancel',         de: 'Abbrechen' },
  create:     { fr: 'Créer',               en: 'Create',         de: 'Erstellen' },
  add:        { fr: 'Ajouter',             en: 'Add',            de: 'Hinzufügen' },
  remove:     { fr: 'Retirer',             en: 'Remove',         de: 'Entfernen' },
  delete:     { fr: 'Supprimer',           en: 'Delete',         de: 'Löschen' },
  edit:       { fr: 'Éditer',              en: 'Edit',           de: 'Bearbeiten' },
  open:       { fr: 'Ouvrir',              en: 'Open',           de: 'Öffnen' },
  close:      { fr: 'Fermer',              en: 'Close',          de: 'Schließen' },
  back:       { fr: '← Retour',            en: '← Back',         de: '← Zurück' },
  loading:    { fr: 'Chargement…',         en: 'Loading…',       de: 'Lädt…' },
  empty:      { fr: 'Aucun élément.',      en: 'Nothing here yet.', de: 'Noch nichts vorhanden.' },
  email:      { fr: 'Email',               en: 'Email',          de: 'E-Mail' },
  loadError: {
    fr: 'Impossible de charger les données. Réessayez plus tard.',
    en: 'Could not load the data. Please try again later.',
    de: 'Daten konnten nicht geladen werden. Bitte später erneut versuchen.', // TODO refine DE copy
  },
};

// ── Status strip (header counters) ──────────────────────────────────────────
export const STRIP = {
  activeCompetition: { fr: 'Compétition active',    en: 'Active competition', de: 'Aktiver Wettbewerb' },
  noActiveCompetition: {
    fr: 'Aucune compétition active — créez ou ouvrez-en une dans l’onglet Compétitions.',
    en: 'No active competition — create or open one in the Competitions tab.',
    de: 'Kein aktiver Wettbewerb — erstellen oder eröffnen Sie einen im Tab Wettbewerbe.', // TODO refine DE copy
  },
  clubsCount:     { fr: 'club(s)',         en: 'club(s)',        de: 'Club(s)' },
  startupsCount:  { fr: 'candidature(s)',  en: 'application(s)', de: 'Bewerbung(en)' },
  sessionsCount:  { fr: 'session(s)',      en: 'session(s)',     de: 'Session(s)' },
  liveSuffix:     { fr: 'en direct',       en: 'live',           de: 'live' },
  publishedSuffix:{ fr: 'publiée(s)',      en: 'published',      de: 'veröffentlicht' },
  totalCompetitions: { fr: 'compétitions au total', en: 'total competitions', de: 'Wettbewerbe insgesamt' },
};

// ── Competitions tab ────────────────────────────────────────────────────────
export const COMP = {
  sectionTitle:  { fr: 'Compétitions',     en: 'Competitions',  de: 'Wettbewerbe' },
  newCompetition: { fr: 'Nouvelle compétition', en: 'New competition', de: 'Neuer Wettbewerb' },
  noCompetitions: {
    fr: 'Aucune compétition pour l’instant. Créez-en une pour démarrer.',
    en: 'No competitions yet. Create one to get started.',
    de: 'Noch keine Wettbewerbe. Erstellen Sie einen, um zu starten.', // TODO refine DE copy
  },
  // Fields
  idLabel:       { fr: 'Identifiant',      en: 'Identifier',    de: 'Kennung' },
  idHint:        {
    fr: 'Kebab-case, ex. « 2028 » ou « 2028-pilote ». Immuable.',
    en: 'Kebab-case, e.g. “2028” or “2028-pilot”. Immutable.',
    de: 'Kebab-case, z. B. „2028“ oder „2028-pilot“. Unveränderlich.', // TODO refine DE copy
  },
  nameLabel:     { fr: 'Nom',              en: 'Name',          de: 'Name' },
  yearLabel:     { fr: 'Année',            en: 'Year',          de: 'Jahr' },
  modelLabel:    { fr: 'Modèle',           en: 'Model',         de: 'Modell' },
  modelMono:     { fr: 'Monoclub',         en: 'Monoclub',      de: 'Monoclub' },
  modelMulti:    { fr: 'Multiclub',        en: 'Multiclub',     de: 'Multiclub' },
  monoclubHint:  {
    fr: 'Un seul club participant (cas Paris historique).',
    en: 'A single participating club (Paris legacy case).',
    de: 'Nur ein teilnehmender Club (Paris-Altfall).', // TODO refine DE copy
  },
  multiclubHint: {
    fr: 'Plusieurs clubs participants + Grande Finale fédérée.',
    en: 'Multiple participating clubs plus a federated grand finale.',
    de: 'Mehrere teilnehmende Clubs sowie ein föderiertes Grand Finale.', // TODO refine DE copy
  },
  invalidId: {
    fr: 'L’identifiant doit être en kebab-case (a-z, 0-9, tiret), commencer par une lettre, max 50 caractères.',
    en: 'Identifier must be kebab-case (a-z, 0-9, hyphen), start with a letter, max 50 chars.',
    de: 'Die Kennung muss kebab-case sein (a-z, 0-9, Bindestrich), mit einem Buchstaben beginnen, max. 50 Zeichen.', // TODO refine DE copy
  },
  // Card meta
  status:        { fr: 'Statut',           en: 'Status',        de: 'Status' },
  model:         { fr: 'Modèle',           en: 'Model',         de: 'Modell' },
  clubsAttached: { fr: 'club(s) attaché(s)', en: 'club(s) attached', de: 'angehängte Club(s)' },
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
    de: 'Nur für Multiclub-Wettbewerbe sichtbar. Clubs hier hinzufügen oder entfernen.', // TODO refine DE copy
  },
  pickClubToAttach: { fr: 'Choisir un club à ajouter', en: 'Pick a club to attach', de: 'Club zum Hinzufügen wählen' },
  attachClub:    { fr: 'Attacher',         en: 'Attach',        de: 'Anhängen' },
  detachClub:    { fr: 'Détacher',         en: 'Detach',        de: 'Entfernen' },
  detachConfirmTitle: {
    fr: 'Détacher ce club',
    en: 'Detach this club',
    de: 'Diesen Club entfernen',
  },
  detachConfirmBody: {
    fr: 'Le club sera retiré de la compétition. Refusé si des candidatures ou sessions existent déjà. Tapez DETACH pour confirmer.',
    en: 'The club will be removed from the competition. Refused if applications or sessions already exist. Type DETACH to confirm.',
    de: 'Der Club wird aus dem Wettbewerb entfernt. Abgelehnt, wenn bereits Bewerbungen oder Sessions existieren. Geben Sie DETACH zur Bestätigung ein.', // TODO refine DE copy
  },
  detachTypePrompt: {
    fr: 'Tapez DETACH pour confirmer',
    en: 'Type DETACH to confirm',
    de: 'Geben Sie DETACH zur Bestätigung ein',
  },
  detachIntegrityBlocked: {
    fr: 'Impossible : des candidatures ou sessions existent déjà pour ce club dans cette compétition.',
    en: 'Cannot detach: applications or sessions already exist for this club in this competition.',
    de: 'Nicht möglich: Für diesen Club in diesem Wettbewerb existieren bereits Bewerbungen oder Sessions.', // TODO refine DE copy
  },
  noClubsAttached: {
    fr: 'Aucun club attaché pour le moment.',
    en: 'No club attached yet.',
    de: 'Noch kein Club angehängt.',
  },
  allClubsAttached: {
    fr: 'Tous les clubs existants sont déjà attachés.',
    en: 'All existing clubs are already attached.',
    de: 'Alle vorhandenen Clubs sind bereits angehängt.', // TODO refine DE copy
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
    de: 'Nicht gespeicherte Änderungen. Trotzdem verlassen?', // TODO refine DE copy
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
    de: 'Diese Aktion löscht endgültig die folgenden Elemente. Der Verlauf geht verloren, keine Sicherung.', // TODO refine DE copy
  },
  countClubsAttached: {
    fr: 'club(s) attaché(s) — les clubs eux-mêmes restent, seule l’association est supprimée',
    en: 'attached club(s) — the clubs themselves remain, only the link is removed',
    de: 'angehängte Club(s) — die Clubs selbst bleiben, nur die Verbindung wird entfernt', // TODO refine DE copy
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
    de: 'Geben Sie genau {phrase} ein, um zu bestätigen.',
  },
  deleteFinalAction: {
    fr: 'Supprimer définitivement',
    en: 'Delete permanently',
    de: 'Endgültig löschen',
  },
  deleteTypedMismatch: {
    fr: 'La saisie ne correspond pas. Recopiez exactement la phrase ci-dessus.',
    en: 'The text does not match. Copy the exact phrase above.',
    de: 'Die Eingabe stimmt nicht überein. Kopieren Sie genau den Satz oben.', // TODO refine DE copy
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
    de: 'Wenn aktiviert, zeigt /Resultats die veröffentlichten Rankings dieses Wettbewerbs an.',
  },
  publicResultsOpenDate: {
    fr: 'Date d’ouverture publique',
    en: 'Public opening date',
    de: 'Datum der öffentlichen Veröffentlichung',
  },
  publicResultsOpenDateHint: {
    fr: 'Réservé à une activation future — non encore connecté à /Resultats.',
    en: 'Reserved for future activation — not yet wired to /Resultats.',
    de: 'Für zukünftige Aktivierung reserviert — noch nicht mit /Resultats verbunden.',
  },
  // Creation form actions
  createAndContinue: {
    fr: 'Créer et continuer',
    en: 'Create and continue',
    de: 'Erstellen und fortfahren',
  },
};

// ── Clubs tab ───────────────────────────────────────────────────────────────
export const CLUBS = {
  sectionTitle:  { fr: 'Clubs',            en: 'Clubs',         de: 'Clubs' },
  newClub:       { fr: 'Nouveau club',     en: 'New club',      de: 'Neuer Club' },
  noClubs: {
    fr: 'Aucun club pour l’instant. Créez le premier club Rotary participant.',
    en: 'No clubs yet. Create the first participating Rotary club.',
    de: 'Noch keine Clubs. Erstellen Sie den ersten teilnehmenden Rotary-Club.', // TODO refine DE copy
  },
  // ── Fields V2 (legacy, gardés pour backward-compat / affichage liste) ────
  idLabel:       { fr: 'Identifiant',      en: 'Identifier',    de: 'Kennung' },
  idHint:        {
    fr: 'Kebab-case, ex. « paris », « berlin », « lyon-1 ». Immuable.',
    en: 'Kebab-case, e.g. “paris”, “berlin”, “lyon-1”. Immutable.',
    de: 'Kebab-case, z. B. „paris“, „berlin“, „lyon-1“. Unveränderlich.', // TODO refine DE copy
  },
  nameLabel:     { fr: 'Nom du club',      en: 'Club name',     de: 'Clubname' },
  regionLabel:   { fr: 'Région',           en: 'Region',        de: 'Region' },
  contactNameLabel: { fr: 'Contact (nom)', en: 'Contact (name)', de: 'Kontakt (Name)' },
  contactEmailLabel:{ fr: 'Contact (email)', en: 'Contact (email)', de: 'Kontakt (E-Mail)' },
  invalidId:     COMP.invalidId,

  // ── V2.5 — Form refonte (sections, labels, placeholders, errors) ────────
  // Sections du form (hairline gold + uppercase tracking-wide)
  sectionClubInfo: {
    fr: 'Informations du club',
    en: 'Club information',
    de: 'Club-Informationen',
  },
  sectionContact: {
    fr: 'Représentant (contact opérationnel)',
    en: 'Representative (operational contact)',
    de: 'Vertreter (operativer Kontakt)', // TODO refine DE copy
  },
  sectionPresident: {
    fr: 'Président du club',
    en: 'Club president',
    de: 'Clubpräsident',
  },
  sectionAddress: {
    fr: 'Coordonnées institutionnelles',
    en: 'Institutional contact details',
    de: 'Institutionelle Kontaktdaten', // TODO refine DE copy
  },
  // Champs (labels + placeholders + helpers)
  countryLabel:    { fr: 'Pays',           en: 'Country',       de: 'Land' },
  languageLabel:   {
    fr: 'Langue principale',
    en: 'Primary language',
    de: 'Hauptsprache', // TODO refine DE copy
  },
  pickCountry:     { fr: 'Sélectionnez un pays', en: 'Pick a country', de: 'Land auswählen' },
  pickLanguage:    { fr: 'Sélectionnez une langue', en: 'Pick a language', de: 'Sprache auswählen' },
  firstNameLabel:  { fr: 'Prénom',         en: 'First name',    de: 'Vorname' },
  lastNameLabel:   { fr: 'Nom',            en: 'Last name',     de: 'Nachname' },
  emailLabel:      { fr: 'Email',          en: 'Email',         de: 'E-Mail' },
  phoneLabel:      { fr: 'Téléphone',      en: 'Phone',         de: 'Telefon' },
  clubEmailLabel:  { fr: 'Email du club',  en: 'Club email',    de: 'Club-E-Mail' },
  clubPhoneLabel:  { fr: 'Téléphone du club', en: 'Club phone', de: 'Club-Telefon' },
  clubAddressLabel:{ fr: 'Adresse postale', en: 'Postal address', de: 'Postanschrift' },
  clubNamePlaceholder: {
    fr: 'Rotary Club de Berlin',
    en: 'Rotary Club of Berlin',
    de: 'Rotary Club Berlin',
  },
  clubAddressPlaceholder: {
    fr: '12 rue de l’exemple\n75009 Paris\nFrance',
    en: '12 Example Street\n10115 Berlin\nGermany',
    de: 'Beispielstraße 12\n10115 Berlin\nDeutschland',
  },
  generatedIdLabel: {
    fr: 'ID',
    en: 'ID',
    de: 'ID',
  },
  generatedIdHint: {
    fr: 'Identifiant technique généré automatiquement à partir du nom. Immuable après création.',
    en: 'Technical identifier generated automatically from the name. Immutable after creation.',
    de: 'Technische Kennung, automatisch aus dem Namen generiert. Nach Erstellung unveränderlich.', // TODO refine DE copy
  },
  // Errors de validation client
  errNameTooShort: {
    fr: 'Le nom du club doit contenir au moins 2 caractères.',
    en: 'Club name must be at least 2 characters long.',
    de: 'Der Clubname muss mindestens 2 Zeichen lang sein.',
  },
  errCountryRequired: {
    fr: 'Sélectionnez un pays.',
    en: 'Pick a country.',
    de: 'Bitte ein Land auswählen.',
  },
  errLanguageRequired: {
    fr: 'Sélectionnez une langue principale.',
    en: 'Pick a primary language.',
    de: 'Bitte eine Hauptsprache auswählen.',
  },
  errContactFirstName: {
    fr: 'Prénom du représentant requis.',
    en: 'Representative first name is required.',
    de: 'Vorname des Vertreters ist erforderlich.', // TODO refine DE copy
  },
  errContactLastName: {
    fr: 'Nom du représentant requis.',
    en: 'Representative last name is required.',
    de: 'Nachname des Vertreters ist erforderlich.', // TODO refine DE copy
  },
  errContactEmail: {
    fr: 'Email du représentant requis (format valide).',
    en: 'Representative email is required (valid format).',
    de: 'E-Mail des Vertreters ist erforderlich (gültiges Format).', // TODO refine DE copy
  },
  errEmailFormat: {
    fr: 'Format d’email invalide.',
    en: 'Invalid email format.',
    de: 'Ungültiges E-Mail-Format.',
  },
  // Edit mode
  editClubAction: {
    fr: 'Éditer',
    en: 'Edit',
    de: 'Bearbeiten',
  },
  cancelEdit: {
    fr: 'Annuler',
    en: 'Cancel',
    de: 'Abbrechen',
  },
  saveEdit: {
    fr: 'Enregistrer',
    en: 'Save',
    de: 'Speichern',
  },
  notProvided: {
    fr: 'Non renseigné',
    en: 'Not provided',
    de: 'Nicht angegeben',
  },
  clubInfoSectionTitle: {
    fr: 'Informations du club',
    en: 'Club information',
    de: 'Club-Informationen',
  },
  // Card meta
  region:        { fr: 'Région',           en: 'Region',        de: 'Region' },
  contact:       { fr: 'Contact',          en: 'Contact',       de: 'Kontakt' },
  membersCount:  { fr: 'membre(s)',        en: 'member(s)',     de: 'Mitglied(er)' },
  editionsCount: { fr: 'compétition(s)',   en: 'competition(s)', de: 'Wettbewerb(e)' },
  openClub:      { fr: 'Ouvrir',           en: 'Open',          de: 'Öffnen' },
  // Editor
  editorTitle:   { fr: 'Éditer le club',   en: 'Edit club',     de: 'Club bearbeiten' },

  // ── V2.5+ Funnel modal (création) + ClubEditView (édition) ────────────────
  funnelEyebrowCreate: {
    fr: 'Nouveau club',
    en: 'New club',
    de: 'Neuer Club',
  },
  funnelTitleCreate: {
    fr: 'Créer un club',
    en: 'Create a club',
    de: 'Club erstellen',
  },
  editViewEyebrow: {
    fr: 'Édition du club',
    en: 'Edit club',
    de: 'Club bearbeiten',
  },
  // {name} sera remplacé côté composant.
  editViewTitle: {
    fr: 'Édition du club · {name}',
    en: 'Editing club · {name}',
    de: 'Club bearbeiten · {name}',
  },
  backToClubs: {
    fr: '← Clubs',
    en: '← Clubs',
    de: '← Clubs',
  },
  tabInfo: {
    fr: 'Informations',
    en: 'Information',
    de: 'Informationen',
  },
  tabContact: {
    fr: 'Représentant',
    en: 'Representative',
    de: 'Vertreter',
  },
  tabPresident: {
    fr: 'Président',
    en: 'President',
    de: 'Präsident',
  },
  tabAddress: {
    fr: 'Coordonnées',
    en: 'Contact details',
    de: 'Kontaktdaten',
  },
  tabMembers: {
    fr: 'Membres',
    en: 'Members',
    de: 'Mitglieder',
  },
  // Status indicator (partagé avec CompetitionFunnel quand identique)
  statusSaving: {
    fr: 'Enregistrement…',
    en: 'Saving…',
    de: 'Speichern…',
  },
  statusSaved: {
    fr: 'Enregistré',
    en: 'Saved',
    de: 'Gespeichert',
  },
  statusError: {
    fr: 'Erreur d’enregistrement',
    en: 'Save error',
    de: 'Speicherfehler',
  },
  funnelCreateIntro: {
    fr: 'Renseignez les informations essentielles du club. Les autres onglets deviendront éditables une fois le club créé — chaque modification est ensuite enregistrée automatiquement.',
    en: 'Fill in the essential information about the club. The other tabs become editable once the club is created — every change is then autosaved.',
    de: 'Geben Sie die wesentlichen Informationen des Clubs ein. Die anderen Tabs werden nach der Erstellung bearbeitbar — jede Änderung wird dann automatisch gespeichert.', // TODO refine DE copy
  },
  funnelCreateButton: {
    fr: 'Créer le club',
    en: 'Create club',
    de: 'Club erstellen',
  },
  funnelTabLockedHint: {
    fr: 'Disponible après la création du club.',
    en: 'Available after the club is created.',
    de: 'Nach der Erstellung des Clubs verfügbar.', // TODO refine DE copy
  },
  clubCreatedToast: {
    fr: 'Club créé',
    en: 'Club created',
    de: 'Club erstellt',
  },
  inviteAction: {
    fr: 'Inviter',
    en: 'Invite',
    de: 'Einladen',
  },

  membersSection:{ fr: 'Membres du club',  en: 'Club members',  de: 'Clubmitglieder' },
  membersHint: {
    fr: 'club_admin gouverne le club ; comité instruit les dossiers ; jury note les sessions.',
    en: 'club_admin governs the club; committee reviews dossiers; jury scores sessions.',
    de: 'club_admin leitet den Club; Komitee prüft Dossiers; Jury bewertet Sessions.', // TODO refine DE copy
  },
  assignRole:    { fr: 'Assigner un rôle', en: 'Assign a role', de: 'Rolle zuweisen' },
  roleLabel:     { fr: 'Rôle',             en: 'Role',          de: 'Rolle' },
  roleClubAdmin: { fr: 'club_admin',       en: 'club_admin',    de: 'club_admin' },
  roleComite:    { fr: 'comité',           en: 'committee',     de: 'Komitee' },
  roleJury:      { fr: 'jury',             en: 'jury',          de: 'Jury' },
  emailPlaceholder: { fr: 'utilisateur@exemple.org', en: 'user@example.org', de: 'benutzer@beispiel.org' },
  userNotFound: {
    fr: 'L’utilisateur n’existe pas encore. Demandez-lui de se connecter via /Login (magic-link) puis réessayez.',
    en: 'User does not exist yet. Ask them to sign in once via /Login (magic-link) and try again.',
    de: 'Benutzer existiert noch nicht. Bitten Sie ihn, sich einmal über /Login (Magic-Link) anzumelden, und versuchen Sie es erneut.', // TODO refine DE copy
  },
  lastClubAdmin: {
    fr: 'Impossible : ce serait le dernier club_admin du club. Provisionnez un autre club_admin avant de retirer ce rôle.',
    en: 'Cannot proceed: this would remove the last club_admin. Provision another club_admin first.',
    de: 'Nicht möglich: Dies wäre der letzte club_admin. Bestellen Sie zuerst einen weiteren club_admin.', // TODO refine DE copy
  },
  noMembers: {
    fr: 'Aucun membre provisionné pour ce club.',
    en: 'No member provisioned for this club yet.',
    de: 'Für diesen Club ist noch kein Mitglied bereitgestellt.', // TODO refine DE copy
  },
  revokeConfirm: {
    fr: 'Retirer ce rôle ?',
    en: 'Remove this role?',
    de: 'Diese Rolle entfernen?',
  },
  memberColEmail: { fr: 'Membre',          en: 'Member',        de: 'Mitglied' },
  memberColRole:  { fr: 'Rôle',            en: 'Role',          de: 'Rolle' },
  memberColGranted: { fr: 'Provisionné le', en: 'Granted on',   de: 'Bereitgestellt am' },
  memberColActions: { fr: 'Actions',       en: 'Actions',       de: 'Aktionen' },
};

// ── Global roles tab ────────────────────────────────────────────────────────
export const ROLES = {
  sectionTitle:  { fr: 'Rôles globaux',    en: 'Global roles',  de: 'Globale Rollen' },
  disclaimer: {
    fr: 'Ces rôles sont GLOBAUX (master_admin, admin legacy). Pour les rôles club_admin / comité / jury d’un club, allez dans Clubs → [club] → Membres.',
    en: 'These roles are GLOBAL (master_admin, legacy admin). For club_admin / committee / jury roles in a specific club, go to Clubs → [club] → Members.',
    de: 'Diese Rollen sind GLOBAL (master_admin, Alt-Admin). Für club_admin / Komitee / Jury eines Clubs, gehen Sie zu Clubs → [Club] → Mitglieder.', // TODO refine DE copy
  },
};

// ── Federated Finale tab ────────────────────────────────────────────────────
export const FINALE = {
  sectionTitle:  { fr: 'Grande Finale fédérée', en: 'Federated grand finale', de: 'Föderiertes Grand Finale' },
  needMulticlub: {
    fr: 'La finale fédérée n’existe que pour les compétitions multiclub. Sélectionnez ou créez-en une.',
    en: 'The federated finale only applies to multiclub competitions. Select or create one.',
    de: 'Das föderierte Finale gilt nur für Multiclub-Wettbewerbe. Wählen oder erstellen Sie einen.', // TODO refine DE copy
  },
  championsPerClub: { fr: 'Championnes & champions par club', en: 'Club champions', de: 'Club-Champions' },
  noChampions: {
    fr: 'Aucune championne ni champion qualifié pour l’instant. Les clubs doivent verrouiller et publier leurs sessions.',
    en: 'No qualified champions yet. Clubs must lock and publish their qualifying sessions first.',
    de: 'Noch keine qualifizierten Champions. Die Clubs müssen zuerst ihre Qualifikationssessions sperren und veröffentlichen.', // TODO refine DE copy
  },
  promoteToFinale: { fr: 'Promouvoir en finale', en: 'Promote to finale', de: 'Ins Finale befördern' },
  promoteTodo: {
    fr: 'Disponible en M4b — la promotion automatique vers la finale arrive avec le module 4b.',
    en: 'Coming in M4b — automatic finale promotion ships with module 4b.',
    de: 'Kommt in M4b — die automatische Finalbeförderung erscheint mit Modul 4b.', // TODO refine DE copy
  },
  finaleSection: { fr: 'Configuration de la finale', en: 'Finale configuration', de: 'Finale-Konfiguration' },
  finaleExists: {
    fr: 'Une session « finale fédérée » existe pour cette compétition.',
    en: 'A federated finale session exists for this competition.',
    de: 'Für diesen Wettbewerb existiert bereits eine föderierte Finale-Session.', // TODO refine DE copy
  },
  finaleMissing: {
    fr: 'Aucune session « finale fédérée » pour l’instant. Créez-en une pour orchestrer la finale.',
    en: 'No federated finale session yet. Create one to orchestrate the finale.',
    de: 'Noch keine föderierte Finale-Session. Erstellen Sie eine, um das Finale zu orchestrieren.', // TODO refine DE copy
  },
  createFinale:   { fr: 'Créer la Grande Finale', en: 'Create the grand finale', de: 'Grand Finale erstellen' },
  finaleSessionName: { fr: 'Nom de la session', en: 'Session name', de: 'Session-Name' },
  finaleDate:     { fr: 'Date',                en: 'Date',          de: 'Datum' },
  finaleIdHint:   {
    fr: 'Identifiant unique de la session, ex. « finale_2027 ».',
    en: 'Unique session identifier, e.g. “finale_2027”.',
    de: 'Eindeutige Session-Kennung, z. B. „finale_2027“.', // TODO refine DE copy
  },
  finaleLink:     { fr: 'Gérer dans l’admin session (legacy)', en: 'Manage in legacy session admin', de: 'In Legacy-Session-Admin verwalten' },
  championClubCol:{ fr: 'Club',                en: 'Club',          de: 'Club' },
  championStartupCol: { fr: 'Startup',         en: 'Startup',       de: 'Startup' },
  championSessionCol: { fr: 'Session qualificative', en: 'Qualifying session', de: 'Qualifikations-Session' },
  championActionsCol: { fr: 'Actions',         en: 'Actions',       de: 'Aktionen' },

  // ── V3 Vague 2 (A) — Pool finale fédérée (platform_finale_membership) ──────
  poolSectionTitle: {
    fr: 'Pool de la Grande Finale',
    en: 'Federated finale pool',
    de: 'Pool des föderierten Finales',
  },
  poolSectionHint: {
    fr: 'Startups promues automatiquement à la Grande Finale après conclusion d’une session qualificative. Seul le master_admin peut retirer une startup du pool.',
    en: 'Startups automatically promoted to the federated finale once a qualifying session was concluded. Only master_admin can remove a startup from the pool.',
    de: 'Startups, die nach Abschluss einer Qualifikationssession automatisch ins Grand Finale befördert wurden. Nur master_admin kann eine Startup aus dem Pool entfernen.',
  },
  poolEmpty: {
    fr: 'Le pool est vide. Concluez une session qualifiée pour y promouvoir les vainqueurs.',
    en: 'The pool is empty. Conclude a qualifying session to promote the winners here.',
    de: 'Der Pool ist leer. Schließen Sie eine Qualifikationssession ab, um die Gewinner hier zu befördern.',
  },
  poolColStartup:    { fr: 'Startup',                en: 'Startup',           de: 'Startup' },
  poolColClub:       { fr: 'Club d’origine',        en: 'Origin club',       de: 'Herkunftsclub' },
  poolColSource:     { fr: 'Session source',         en: 'Source session',    de: 'Quell-Session' },
  poolColPromotedAt: { fr: 'Promu le',               en: 'Promoted on',       de: 'Befördert am' },
  poolColActions:    { fr: 'Actions',                en: 'Actions',           de: 'Aktionen' },
  poolRemoveAction:  { fr: 'Retirer',                en: 'Remove',            de: 'Entfernen' },
  poolRemoveConfirmTitle: {
    fr: 'Retirer cette startup du pool finale ?',
    en: 'Remove this startup from the finale pool?',
    de: 'Diese Startup aus dem Finale-Pool entfernen?',
  },
  poolRemoveConfirmBody: {
    fr: 'La startup sortira du pool de la Grande Finale et sera rétrogradée au statut « évalué ». Action tracée dans l’audit log.',
    en: 'The startup will leave the finale pool and be downgraded to “scored” status. Tracked in the audit log.',
    de: 'Die Startup wird aus dem Finale-Pool entfernt und auf „bewertet“ zurückgestuft. Wird im Audit-Log erfasst.',
  },
  poolRemoveTypedWord: {
    fr: 'RETIRER',
    en: 'REMOVE',
    de: 'ENTFERNEN',
  },
  poolUnknownStartup: { fr: 'Startup inconnue',     en: 'Unknown startup',   de: 'Unbekannte Startup' },
  poolUnknownClub:    { fr: '—',                     en: '—',                 de: '—' },
};

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
