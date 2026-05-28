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
  finale:       { fr: 'Finale fédérée',    en: 'Federated finale', de: 'Föderierte Finale' },
};

export const TAB_IDS = ['competitions', 'clubs', 'roles', 'finale'];

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
  // Fields
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
  // Card meta
  region:        { fr: 'Région',           en: 'Region',        de: 'Region' },
  contact:       { fr: 'Contact',          en: 'Contact',       de: 'Kontakt' },
  membersCount:  { fr: 'membre(s)',        en: 'member(s)',     de: 'Mitglied(er)' },
  editionsCount: { fr: 'compétition(s)',   en: 'competition(s)', de: 'Wettbewerb(e)' },
  openClub:      { fr: 'Ouvrir',           en: 'Open',          de: 'Öffnen' },
  // Editor
  editorTitle:   { fr: 'Éditer le club',   en: 'Edit club',     de: 'Club bearbeiten' },
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
};

// ── Sentinels (mirror SQL CHECK) ────────────────────────────────────────────
export const COMPETITION_MODELS = ['monoclub', 'multiclub'];
export const CLUB_ROLES = ['club_admin', 'comite', 'jury'];

// Kebab-case validator (mirror du regex SQL '^[a-z][a-z0-9-]{0,49}$')
export const KEBAB_REGEX = /^[a-z][a-z0-9-]{0,49}$/;
