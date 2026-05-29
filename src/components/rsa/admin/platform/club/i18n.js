// Dictionnaires trilingues FR/EN/DE du Club Cockpit (V2 multi-club, étape 6).
//
// Forme { fr, en, de } compatible useLang().t(dict) (cf. @/lib/platform/i18n).
// Co-localisés avec les composants club/* — pattern identique à platform/i18n.js
// (qui reste la SSOT pour Setup/Live/Results legacy). On NE duplique PAS les
// labels génériques (UI.save/cancel/loading…) : on les importe quand nécessaire.

export const CLUB_TABS = {
  setup:              { fr: 'Configuration',     en: 'Setup',          de: 'Konfiguration' },
  live:               { fr: 'En direct',         en: 'Live',           de: 'Live' },
  results:            { fr: 'Résultats',         en: 'Results',        de: 'Ergebnisse' },
  team:               { fr: 'Équipe',            en: 'Team',           de: 'Team' },
  jury_applications:  { fr: 'Candidatures jury', en: 'Jury applications', de: 'Jury-Bewerbungen' },
  rules:              { fr: "Règles d'éligibilité", en: 'Eligibility rules', de: 'Eignungsregeln' },
  prizes:             { fr: 'Prix',              en: 'Prizes',         de: 'Preise' },
  comms:              { fr: 'Communications',    en: 'Communications', de: 'Kommunikation' },
  analytics:          { fr: 'Analytics',          en: 'Analytics',      de: 'Analytics' },
};

export const CLUB_UI = {
  eyebrow:      { fr: 'Cockpit Club',          en: 'Club Cockpit',         de: 'Club-Cockpit' },
  titlePrefix:  { fr: 'Cockpit Club',          en: 'Club Cockpit',         de: 'Club-Cockpit' },
  subtitle: {
    fr: 'Organisez les sessions, votre équipe et les règles d’éligibilité de votre club.',
    en: 'Manage your club’s sessions, team and eligibility rules.',
    de: 'Verwalten Sie die Sessions, das Team und die Eignungsregeln Ihres Clubs.',
  },
  loadingClub:  { fr: 'Chargement du club…',   en: 'Loading club…',         de: 'Club wird geladen…' },
  clubNotFound: { fr: 'Club introuvable.',     en: 'Club not found.',       de: 'Club nicht gefunden.' },
  contact:      { fr: 'Contact',               en: 'Contact',               de: 'Kontakt' },
  region:       { fr: 'Région',                en: 'Region',                de: 'Region' },
  edition:      { fr: 'Compétition',           en: 'Competition',           de: 'Wettbewerb' },
  pickEdition:  { fr: 'Choisissez une compétition', en: 'Pick a competition', de: 'Wählen Sie einen Wettbewerb' },
  session:      { fr: 'Session',               en: 'Session',               de: 'Session' },

  // Module status strip (per-club)
  stripSessions:   { fr: 'sessions',           en: 'sessions',              de: 'Sessions' },
  stripDraft:      { fr: 'en brouillon',       en: 'draft',                 de: 'Entwurf' },
  stripLive:       { fr: 'en direct',          en: 'live',                  de: 'live' },
  stripPublished:  { fr: 'publiées',           en: 'published',             de: 'veröffentlicht' },
  stripCandidates: { fr: 'candidatures',       en: 'applications',          de: 'Bewerbungen' },
  stripJurors:     { fr: 'jurés assignés',     en: 'assigned jurors',       de: 'zugewiesene Juroren' },
  stripCommittee:  { fr: 'comité',             en: 'committee',             de: 'Komitee' },
  stripNoEdition: {
    fr: 'Aucune compétition active. Le master admin doit en activer une et attacher votre club.',
    en: 'No active competition. The master admin must activate one and attach your club.',
    de: 'Kein aktiver Wettbewerb. Der Master-Admin muss einen aktivieren und Ihren Club zuordnen.',
  },
};

export const CLUB_SETUP = {
  intro: {
    fr: 'Préparez vos sessions de bout en bout : date, lien Teams, jurés, comité.',
    en: 'Prepare every session end-to-end: date, Teams link, jurors, committee.',
    de: 'Bereiten Sie jede Session vor: Datum, Teams-Link, Juroren, Komitee.',
  },
  fluidityHint: {
    fr: 'Astuce : créez la session avec son lien Teams, puis basculez sur Équipe pour assigner vos jurés.',
    en: 'Tip: create the session with its Teams link, then jump to Team to assign jurors.',
    de: 'Tipp: Erstellen Sie die Session mit Teams-Link und wechseln Sie dann zu Team, um Juroren zuzuweisen.',
  },
};

export const CLUB_TEAM = {
  sectionTitle:    { fr: 'Membres du club',         en: 'Club members',         de: 'Club-Mitglieder' },
  assignTitle:     { fr: 'Ajouter un membre',       en: 'Add a member',         de: 'Mitglied hinzufügen' },
  email:           { fr: 'Email',                   en: 'Email',                de: 'E-Mail' },
  role:            { fr: 'Rôle',                    en: 'Role',                 de: 'Rolle' },
  emailPlaceholder:{ fr: 'membre@exemple.org',      en: 'member@example.org',   de: 'mitglied@beispiel.org' },
  roleClubAdmin:   { fr: 'Administrateur du club',  en: 'Club admin',           de: 'Club-Administrator' },
  roleComite:      { fr: 'Membre du comité',        en: 'Committee member',     de: 'Komitee-Mitglied' },
  roleJury:        { fr: 'Juré',                    en: 'Juror',                de: 'Juror' },
  add:             { fr: 'Ajouter',                 en: 'Add',                  de: 'Hinzufügen' },
  remove:          { fr: 'Retirer',                 en: 'Remove',               de: 'Entfernen' },
  noMembers:       { fr: 'Aucun membre dans ce club pour le moment.', en: 'No members in this club yet.', de: 'Noch keine Mitglieder in diesem Club.' },
  loginNote: {
    fr: 'Pour qu’un membre apparaisse, il doit d’abord s’être connecté au moins une fois sur /Login (lien magique). Tant qu’il ne s’est pas connecté, l’assignation reste en attente côté DB et la ligne apparaîtra dès sa première connexion.',
    en: 'A member only appears after signing in at least once via /Login (magic link). Until they sign in, the assignment is pending server-side and the row will surface on their first login.',
    de: 'Ein Mitglied erscheint erst nach mindestens einer Anmeldung über /Login (Magic-Link). Bis dahin bleibt die Zuweisung serverseitig ausstehend und erscheint mit der ersten Anmeldung.',
  },
  confirmRemoveTitle: { fr: 'Retirer ce membre',    en: 'Remove this member',   de: 'Mitglied entfernen' },
  confirmRemoveBody: {
    fr: 'Cette action retire l’accès au rôle sélectionné. Tapez "RETIRER" pour confirmer.',
    en: 'This revokes access for the selected role. Type "REMOVE" to confirm.',
    de: 'Damit wird der Zugriff für die ausgewählte Rolle entzogen. Geben Sie "REMOVE" zur Bestätigung ein.',
  },
  confirmRemoveTyped: { fr: 'RETIRER',              en: 'REMOVE',               de: 'REMOVE' },
};

export const CLUB_RULES = {
  intro: {
    fr: 'Ces règles d’éligibilité s’appliquent UNIQUEMENT aux candidatures de votre club. Elles supplantent les règles globales définies par le master admin pour la compétition.',
    en: 'These eligibility rules apply ONLY to applications submitted to your club. They override the global rules set by the master admin for this competition.',
    de: 'Diese Eignungsregeln gelten NUR für Bewerbungen Ihres Clubs. Sie überlagern die globalen Regeln des Master-Admins für diesen Wettbewerb.',
  },
  notAttached: {
    fr: 'Votre club n’est pas encore rattaché à cette compétition. Demandez au master admin de l’attacher dans le Master Cockpit.',
    en: 'Your club is not attached to this competition yet. Ask the master admin to attach it from the Master Cockpit.',
    de: 'Ihr Club ist noch nicht mit diesem Wettbewerb verknüpft. Bitten Sie den Master-Admin, ihn im Master Cockpit zu verknüpfen.',
  },
  invalidJson:  { fr: 'JSON invalide.',             en: 'Invalid JSON.',        de: 'Ungültiges JSON.' },
  saved:        { fr: 'Règles enregistrées.',       en: 'Rules saved.',         de: 'Regeln gespeichert.' },
};

// Roles disponibles dans la TeamTab (parallèle à ROLE_OPTIONS du legacy).
export const CLUB_ROLE_OPTIONS = ['club_admin', 'comite', 'jury'];

// Note 2026-05-29 — équipe D "kill extensions" : retrait des onglets 'extensions'
// et 'marketplace' (archi droppée intégralement, plus de tab catalogue/install).
export const TAB_IDS = ['setup', 'live', 'results', 'team', 'jury_applications', 'rules', 'prizes', 'analytics', 'comms'];

// ── Other clubs section (Club Cockpit / Setup tab) ───────────────────────────
// Bloc lecture seule pour qu'un club_admin sache qui sont les autres clubs
// participants à la même compétition multiclub.
export const CLUB_OTHERS = {
  sectionEyebrow: {
    fr: 'Compétition',
    en: 'Competition',
    de: 'Wettbewerb',
  },
  sectionTitle: {
    fr: 'Autres clubs de cette compétition',
    en: 'Other clubs in this competition',
    de: 'Andere Clubs in diesem Wettbewerb',
  },
  sectionHint: {
    fr: 'Lecture seule — les autres clubs participants à la même édition, leurs contacts et leur progression.',
    en: 'Read only — the other participating clubs for this edition, their contacts and their progress.',
    de: 'Nur lesend — die anderen teilnehmenden Clubs dieser Ausgabe, ihre Kontakte und ihr Fortschritt.',
  },
  loading: {
    fr: 'Chargement des autres clubs…',
    en: 'Loading other clubs…',
    de: 'Andere Clubs werden geladen…',
  },
  loadError: {
    fr: 'Impossible de charger les autres clubs.',
    en: 'Could not load other clubs.',
    de: 'Andere Clubs konnten nicht geladen werden.',
  },
  empty: {
    fr: 'Vous êtes pour l’instant le seul club participant à cette compétition.',
    en: 'You are the only participating club in this competition so far.',
    de: 'Sie sind bisher der einzige teilnehmende Club in diesem Wettbewerb.',
  },
  metaApplications: { fr: 'candidatures', en: 'applications', de: 'Bewerbungen' },
  metaSessions:     { fr: 'sessions',     en: 'sessions',     de: 'Sessions' },
  metaFinalists:    { fr: 'finalistes',   en: 'finalists',    de: 'Finalisten' },
  contactNoName:    { fr: 'Contact club', en: 'Club contact', de: 'Club-Kontakt' },
  noContact:        { fr: 'Pas de contact public', en: 'No public contact', de: 'Kein öffentlicher Kontakt' },
};
