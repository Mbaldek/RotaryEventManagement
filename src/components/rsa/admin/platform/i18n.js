// Dictionnaires trilingues FR/EN/DE du cockpit admin (Module 4a).
//
// Forme { fr, en, de } compatible useLang().t(dict). Co-localisé avec les composants
// admin/platform/* (même patron que candidature/i18n.js, selection/i18n.js, jury/i18n.js).
// Les labels de règles d'éligibilité (RULE_LABELS) restent SSOT dans candidature/i18n.js —
// on les importe et ré-exporte si besoin par les vues admin.

export const TABS = {
  setup:   { fr: 'Configuration', en: 'Setup',     de: 'Konfiguration' },
  live:    { fr: 'En direct',     en: 'Live',      de: 'Live' },
  results: { fr: 'Résultats',     en: 'Results',   de: 'Ergebnisse' },
};

export const UI = {
  eyebrow:    { fr: 'Cockpit',                en: 'Cockpit',                de: 'Cockpit' },
  pageTitle:  { fr: 'Administration RSA',     en: 'RSA Administration',     de: 'RSA-Verwaltung' },
  pageSubtitle: {
    fr: 'Configuration des éditions, suivi en direct des sessions et publication des palmarès.',
    en: 'Edition setup, real-time session monitoring and results publication.',
    de: 'Konfiguration der Ausgaben, Echtzeit-Sitzungsüberwachung und Ergebnisveröffentlichung.',
  },
  noAccess: {
    fr: 'Cette section est réservée à l’administration.',
    en: 'This area is restricted to administrators.',
    de: 'Dieser Bereich ist der Administration vorbehalten.',
  },
  loadError: {
    fr: 'Impossible de charger les données. Réessayez plus tard.',
    en: 'Could not load the data. Please try again later.',
    de: 'Daten konnten nicht geladen werden. Bitte später erneut versuchen.',
  },
  retry:        { fr: 'Réessayer',            en: 'Retry',                  de: 'Erneut versuchen' },
  save:         { fr: 'Enregistrer',          en: 'Save',                   de: 'Speichern' },
  saving:       { fr: 'Enregistrement…',      en: 'Saving…',                de: 'Speichern…' },
  saved:        { fr: 'Enregistré',           en: 'Saved',                  de: 'Gespeichert' },
  cancel:       { fr: 'Annuler',              en: 'Cancel',                 de: 'Abbrechen' },
  confirm:      { fr: 'Confirmer',            en: 'Confirm',                de: 'Bestätigen' },
  create:       { fr: 'Créer',                en: 'Create',                 de: 'Erstellen' },
  add:          { fr: 'Ajouter',              en: 'Add',                    de: 'Hinzufügen' },
  remove:       { fr: 'Retirer',              en: 'Remove',                 de: 'Entfernen' },
  delete:       { fr: 'Supprimer',            en: 'Delete',                 de: 'Löschen' },
  reset:        { fr: 'Réinitialiser',        en: 'Reset',                  de: 'Zurücksetzen' },
  loading:      { fr: 'Chargement…',          en: 'Loading…',               de: 'Lädt…' },
  empty:        { fr: 'Aucun élément.',       en: 'Nothing here yet.',      de: 'Noch keine Einträge.' },
  email:        { fr: 'Email',                en: 'Email',                  de: 'E-Mail' },
  roles:        { fr: 'Rôles',                en: 'Roles',                  de: 'Rollen' },
  edition:      { fr: 'Édition',              en: 'Edition',                de: 'Ausgabe' },
  session:      { fr: 'Session',              en: 'Session',                de: 'Session' },
  // V2 multi-club scope selector (Admin.jsx)
  viewLabel:    { fr: 'Vue',                  en: 'View',                   de: 'Ansicht' },
  scopeMaster:  {
    fr: 'Master Cockpit (plateforme)',
    en: 'Master Cockpit (platform)',
    de: 'Master Cockpit (Plattform)',
  },
  scopeClub: {
    fr: (c) => `Club Cockpit · ${c}`,
    en: (c) => `Club Cockpit · ${c}`,
    de: (c) => `Club-Cockpit · ${c}`,
  },
  scopeLegacy:  {
    fr: 'Cockpit Admin (V1)',
    en: 'Admin Cockpit (V1)',
    de: 'Admin-Cockpit (V1)',
  },
};

// ── Module status strip (M1/M2/M3 one-liners) ────────────────────────────────
export const STRIP = {
  m1Label:      { fr: 'Candidatures', en: 'Applications', de: 'Bewerbungen' },
  m2Label:      { fr: 'Sélection',    en: 'Selection',    de: 'Auswahl' },
  m3Label:      { fr: 'Jury',         en: 'Jury',         de: 'Jury' },
  m4Label:      { fr: 'Édition',      en: 'Edition',      de: 'Ausgabe' },
  submittedSuffix:  { fr: 'soumis',   en: 'submitted',    de: 'eingereicht' },
  toReviewSuffix:   { fr: 'à examiner', en: 'to review',  de: 'zu prüfen' },
  liveSuffix:       { fr: 'en direct',  en: 'live',       de: 'live' },
  publishedSuffix:  { fr: 'publié(es)', en: 'published',  de: 'veröffentlicht' },
  noEdition: {
    fr: 'Aucune édition active. Créez-en une dans Configuration.',
    en: 'No active edition. Create one in Setup.',
    de: 'Keine aktive Ausgabe. Erstellen Sie eine in der Konfiguration.',
  },
};

// ── SETUP ────────────────────────────────────────────────────────────────────
export const SETUP = {
  sectionEditions:  { fr: 'Éditions',     en: 'Editions',     de: 'Ausgaben' },
  sectionSessions:  { fr: 'Sessions',     en: 'Sessions',     de: 'Sessions' },
  sectionRoles:     { fr: 'Rôles & accès', en: 'Roles & access', de: 'Rollen & Zugang' },

  editEdition:      { fr: 'Modifier cette édition', en: 'Edit this edition', de: 'Diese Ausgabe bearbeiten' },
  editionName:      { fr: 'Nom',                    en: 'Name',              de: 'Name' },
  editionYear:      { fr: 'Année',                  en: 'Year',              de: 'Jahr' },
  editionStatus:    { fr: 'Statut',                 en: 'Status',            de: 'Status' },
  appOpen:          { fr: 'Ouverture candidatures', en: 'Applications open', de: 'Bewerbungsstart' },
  appClose:         { fr: 'Clôture candidatures',   en: 'Applications close', de: 'Bewerbungsende' },
  selectionDate:    { fr: 'Date de sélection',      en: 'Selection date',    de: 'Auswahldatum' },
  finaleDate:       { fr: 'Date de finale',         en: 'Finale date',       de: 'Finale-Datum' },
  awardsDate:       { fr: 'Date des prix',          en: 'Awards date',       de: 'Preisverleihung' },
  prizeMain:        { fr: 'Prix principal (€)',     en: 'Main prize (€)',    de: 'Hauptpreis (€)' },
  prizeSpecial:     { fr: 'Prix spécial (€)',       en: 'Special prize (€)', de: 'Sonderpreis (€)' },
  finalistsPerSession: { fr: 'Finalistes par session', en: 'Finalists per session', de: 'Finalisten pro Session' },
  publicResultsEnabled: {
    fr: 'Palmarès public activé',
    en: 'Public palmares enabled',
    de: 'Öffentliches Palmarès aktiviert',
  },
  publicResultsHint: {
    fr: 'Quand activé, /Resultats affiche les classements publiés de cette édition.',
    en: 'When on, /Resultats shows this edition’s published rankings.',
    de: 'Sobald aktiviert, zeigt /Resultats die veröffentlichten Ranglisten dieser Ausgabe.',
  },
  descriptionMd:    { fr: 'Description (markdown)', en: 'Description (markdown)', de: 'Beschreibung (Markdown)' },
  eligibilityRules: { fr: 'Règles d’éligibilité (JSON)', en: 'Eligibility rules (JSON)', de: 'Teilnahmeregeln (JSON)' },
  eligibilityHint:  {
    fr: 'JSON éditable — clés autorisées : country, created_after, revenue_max, raised_max, founders_majority, registration, docs_required (V2.5+ : un objet par doc avec son behavior individuel).',
    en: 'Editable JSON — allowed keys: country, created_after, revenue_max, raised_max, founders_majority, registration, docs_required (V2.5+: one object per doc with its own behavior).',
    de: 'Bearbeitbares JSON — zulässige Schlüssel: country, created_after, revenue_max, raised_max, founders_majority, registration, docs_required (ab V2.5: je Dokument ein Objekt mit eigenem Verhalten).',
  },
  invalidJson:      { fr: 'JSON invalide.', en: 'Invalid JSON.', de: 'Ungültiges JSON.' },

  // Sessions panel
  createSession:    { fr: 'Créer une session',     en: 'Create a session',  de: 'Session erstellen' },
  newSessionId:     { fr: 'Identifiant (ex. dev_s1_foodtech)', en: 'Identifier (e.g. dev_s1_foodtech)', de: 'Kennung (z. B. dev_s1_foodtech)' },
  newSessionName:   { fr: 'Nom de la session',     en: 'Session name',      de: 'Session-Name' },
  newSessionTheme:  { fr: 'Thématique',            en: 'Theme',             de: 'Thema' },
  newSessionKind:   { fr: 'Type',                  en: 'Kind',              de: 'Art' },
  kindQualifying:   { fr: 'Qualificative',         en: 'Qualifying',        de: 'Qualifikation' },
  kindFinale:       { fr: 'Finale',                en: 'Finale',            de: 'Finale' },
  newSessionDate:   { fr: 'Date',                  en: 'Date',              de: 'Datum' },
  newSessionPos:    { fr: 'Position',              en: 'Position',          de: 'Position' },
  newSessionTeams:  { fr: 'Lien Teams',            en: 'Teams link',        de: 'Teams-Link' },
  newSessionTeamsHint: {
    fr: 'URL Microsoft Teams partagée aux jurés et candidats avant la session.',
    en: 'Microsoft Teams URL shared with jurors and candidates before the session.',
    de: 'Microsoft-Teams-URL, die vor der Session an Juroren und Kandidaten geteilt wird.',
  },
  newSessionNotes:  { fr: 'Notes internes',        en: 'Internal notes',    de: 'Interne Notizen' },
  newSessionClub:   { fr: 'Club',                  en: 'Club',              de: 'Club' },
  newSessionClubHint: {
    fr: 'Identifiant du club (laisser vide pour une finale fédérée).',
    en: 'Club identifier (leave empty for a federated finale).',
    de: 'Club-Kennung (für ein föderiertes Finale leer lassen).',
  },
  teamsLinkOpen:    { fr: 'Ouvrir le lien Teams →', en: 'Open Teams link →', de: 'Teams-Link öffnen →' },
  resetSession:     { fr: 'Réinitialiser',         en: 'Reset',             de: 'Zurücksetzen' },
  resetSessionTitle:{ fr: 'Réinitialiser la session', en: 'Reset session', de: 'Session zurücksetzen' },
  resetSessionBody: {
    fr: 'Supprime cette session (et sa configuration). Requiert : statut « draft », aucun juré assigné, aucune startup affectée. Tapez "RESET" pour confirmer.',
    en: 'Deletes this session (and its config). Requires: status “draft”, no juror assigned, no startup attached. Type "RESET" to confirm.',
    de: 'Löscht diese Session (und ihre Konfiguration). Voraussetzungen: Status „draft“, keine Juroren zugewiesen, keine Startups zugeordnet. Tippen Sie "RESET" zur Bestätigung.',
  },
  resetTypePrompt: {
    fr: 'Tapez RESET pour confirmer',
    en: 'Type RESET to confirm',
    de: 'Tippen Sie RESET zur Bestätigung',
  },
  noSessions:       { fr: 'Aucune session dans cette édition.', en: 'No sessions in this edition.', de: 'Keine Sessions in dieser Ausgabe.' },

  // Roles panel
  assignRole:       { fr: 'Provisionner un rôle', en: 'Provision a role', de: 'Rolle zuweisen' },
  emailPlaceholder: { fr: 'utilisateur@exemple.org', en: 'user@example.org', de: 'benutzer@beispiel.org' },
  rolesPlaceholder: { fr: 'Sélectionnez les rôles…', en: 'Select roles…', de: 'Rollen auswählen…' },
  rolesHint: {
    fr: 'Un utilisateur peut cumuler plusieurs rôles. Une liste vide révoque tous les accès.',
    en: 'A user can hold multiple roles. An empty list revokes all access.',
    de: 'Ein Nutzer kann mehrere Rollen kumulieren. Eine leere Liste entzieht sämtliche Zugriffe.',
  },
  noRoles:          { fr: 'Aucun rôle provisionné.', en: 'No roles provisioned yet.', de: 'Noch keine Rollen zugewiesen.' },
  lastAdmin: {
    fr: 'Impossible : vous êtes le dernier administrateur. Provisionnez un autre admin avant de retirer le rôle.',
    en: 'Cannot proceed: you are the last administrator. Provision another admin before removing the role.',
    de: 'Nicht möglich: Sie sind der/die letzte Administrator·in. Weisen Sie zunächst einer weiteren Person die Admin-Rolle zu, bevor Sie Ihre eigene entziehen.',
  },
  grantedBy:        { fr: 'Provisionné par', en: 'Granted by', de: 'Zugewiesen von' },
  grantedAt:        { fr: 'Le',              en: 'On',         de: 'Am' },
};

// ── LIVE ──────────────────────────────────────────────────────────────────────
export const LIVE = {
  startupCol:       { fr: 'Startup',    en: 'Startup',    de: 'Startup' },
  avgCol:           { fr: 'Moy.',       en: 'Avg',        de: 'Ø' },
  countCol:         { fr: 'n',          en: 'n',          de: 'n' },
  openScoring:      { fr: 'Ouvrir le scoring', en: 'Open scoring', de: 'Bewertung öffnen' },
  reopenDraft:      { fr: 'Repasser en brouillon', en: 'Revert to draft', de: 'In den Entwurfsstatus zurücksetzen' },
  lockSession:      { fr: 'Verrouiller la session', en: 'Lock session', de: 'Session sperren' },
  publishResults:   { fr: 'Publier les résultats', en: 'Publish results', de: 'Ergebnisse veröffentlichen' },
  pickSession:      { fr: 'Sélectionnez une session', en: 'Pick a session', de: 'Wählen Sie eine Session' },
  noStartups:       { fr: 'Aucune startup affectée à cette session.', en: 'No startups attached to this session.', de: 'Dieser Session ist noch kein Startup zugeordnet.' },
  noJurors:         { fr: 'Aucun juré assigné. Provisionnez d’abord depuis l’espace Jury.', en: 'No juror assigned. Provision from the Jury area first.', de: 'Noch kein Juror zugewiesen. Weisen Sie zunächst über den Jury-Bereich Juroren zu.' },
  partialsHint:     { fr: '— : pas de brouillon · n/6 : brouillon partiel · N.NN : note finale', en: '— : no draft · n/6 : partial draft · N.NN : final score', de: '— : kein Entwurf · n/6 : Teil-Entwurf · N.NN : Endnote' },
  stats:            { fr: 'Synthèse', en: 'Summary', de: 'Zusammenfassung' },
  statStartups:     { fr: 'Startups', en: 'Startups', de: 'Startups' },
  statJurors:       { fr: 'Jurés',    en: 'Jurors',   de: 'Juroren' },
  statScored:       { fr: 'Notes',    en: 'Scored',   de: 'Bewertet' },
  startedSuffix:    { fr: 'commencées', en: 'started', de: 'begonnen' },
  scoringSuffix:    { fr: 'qui notent', en: 'scoring',  de: 'bewerten' },
  // Confirms
  confirmLiveTitle: { fr: 'Ouvrir le scoring',  en: 'Open scoring',   de: 'Bewertung öffnen' },
  confirmLiveBody: {
    fr: 'Les jurés vont pouvoir saisir leurs notes. Assurez-vous que le lien a été envoyé.',
    en: 'Jurors will be able to enter their scores. Make sure the link has been sent.',
    de: 'Die Juroren können nun ihre Bewertungen eingeben. Stellen Sie sicher, dass der Link bereits versendet wurde.',
  },
  confirmDraftTitle: { fr: 'Repasser en brouillon', en: 'Revert to draft', de: 'In den Entwurfsstatus zurücksetzen' },
  confirmDraftBody: {
    fr: 'La session redevient inactive pour les jurés. Cette action n’est possible que si aucun score final n’a été soumis.',
    en: 'The session becomes inactive for jurors. Only possible while no final score has been submitted.',
    de: 'Die Session wird für die Juroren wieder inaktiv. Nur möglich, solange noch keine finale Bewertung eingereicht wurde.',
  },
  confirmLockTitle: { fr: 'Verrouiller la session', en: 'Lock session', de: 'Session sperren' },
  confirmLockBody: {
    fr: 'Les jurés ne pourront plus modifier leurs notes. Les dossiers en cours passent au statut « évalué ».',
    en: 'Jurors will no longer be able to edit their scores. Pending dossiers move to status “scored”.',
    de: 'Die Juroren können ihre Bewertungen nicht mehr ändern. Laufende Bewerbungen wechseln in den Status „bewertet“.',
  },

  // ── V3 Vague 2 (A.1) — "Conclure la session" : un seul acte = publish + promote
  concludeAction: {
    fr: 'Conclure la session et officialiser les résultats et promouvoir le vainqueur en finale',
    en: 'Conclude the session, officialize results and promote the winner to the finale',
    de: 'Sitzung abschließen, Ergebnisse offiziell machen und den/die Gewinner·in ins Finale weiterleiten',
  },
  concludeActionShort: {
    fr: 'Conclure la session',
    en: 'Conclude the session',
    de: 'Sitzung abschließen',
  },
  concludeConfirmTitle: {
    fr: 'Conclure la session et promouvoir en finale',
    en: 'Conclude the session and promote to the finale',
    de: 'Sitzung abschließen und ins Finale weiterleiten',
  },
  concludeConfirmBody: {
    fr: 'Cette action est définitive : les notes seront figées, le classement officialisé, et le top-N projeté à la fois en statut « finaliste » sur les dossiers ET dans le pool de la Grande Finale fédérée. Tapez CONCLURE pour confirmer.',
    en: 'This action is final: scores will be frozen, the ranking officialized, and the top-N projected both as “finalist” on dossiers AND into the federated grand finale pool. Type CONCLUDE to confirm.',
    de: 'Diese Aktion ist endgültig: Die Bewertungen werden eingefroren, die Rangliste wird offiziell, und die Top-N erhalten den Status „Finalist“ auf den Dossiers UND werden in den Pool des föderierten Grand Finale aufgenommen. Geben Sie CONCLURE zur Bestätigung ein.',
  },
  concludeTypedWord: {
    fr: 'CONCLURE',
    en: 'CONCLUDE',
    de: 'CONCLURE',
  },
  concludeRecap: {
    fr: 'Effet immédiat : statut session → publié · top-N → finaliste · pool finale enrichi · audit log.',
    en: 'Immediate effect: session status → published · top-N → finalist · finale pool enriched · audit log.',
    de: 'Sofortige Wirkung: Sitzungsstatus → veröffentlicht · Top-N → Finalist · Finale-Pool erweitert · Audit-Log.',
  },
};

// ── RESULTS ───────────────────────────────────────────────────────────────────
export const RESULTS = {
  sectionPerSession: { fr: 'Palmarès par session', en: 'Per-session palmares', de: 'Palmarès je Session' },
  sectionCross:      { fr: 'Vue d’ensemble',       en: 'Cross-session view',   de: 'Sessionsübergreifende Sicht' },
  needLock: {
    fr: 'Les résultats ne sont disponibles qu’après le verrouillage de la session.',
    en: 'Results are only available after the session is locked.',
    de: 'Ergebnisse sind erst nach dem Sperren der Session verfügbar.',
  },
  needPublishToCsv: {
    fr: 'L’export CSV reprend le classement courant (cliquez après le verrouillage).',
    en: 'CSV export uses the current ranking (click after locking).',
    de: 'Der CSV-Export übernimmt die aktuelle Rangliste (nach dem Sperren auslösen).',
  },
  rankCol:           { fr: 'Rang',     en: 'Rank',     de: 'Rang' },
  startupCol:        { fr: 'Startup',  en: 'Startup',  de: 'Startup' },
  avgCol:            { fr: 'Moy. pondérée', en: 'Weighted avg', de: 'Gewichteter Ø' },
  jurorsCol:         { fr: 'Jurés',    en: 'Jurors',   de: 'Juroren' },
  publishConfirmTitle: { fr: 'Publier les résultats', en: 'Publish results', de: 'Ergebnisse veröffentlichen' },
  publishTypePrompt:   { fr: 'Tapez PUBLIER pour confirmer', en: 'Type PUBLISH to confirm', de: 'Tippen Sie VEROEFFENTLICHEN zur Bestätigung' },
  publishConfirmBody: {
    fr: 'Les notes seront figées et les finalistes (top-N) projetés sur les dossiers. Action définitive.',
    en: 'Scores will be frozen and the top-N finalists projected onto the dossiers. Final action.',
    de: 'Die Bewertungen werden eingefroren und die Finalisten (Top-N) auf die Dossiers übertragen. Endgültige Aktion.',
  },
  publish:           { fr: 'Publier',           en: 'Publish',           de: 'Veröffentlichen' },
  csv:               { fr: 'Télécharger CSV',   en: 'Download CSV',      de: 'CSV herunterladen' },
  publishedAt:       { fr: 'Publié le',         en: 'Published on',      de: 'Veröffentlicht am' },
  noRanking:         { fr: 'Aucun classement disponible.', en: 'No ranking available.', de: 'Keine Rangliste verfügbar.' },
  noPublishedYet:    { fr: 'Aucune session publiée pour cette édition.', en: 'No published sessions for this edition.', de: 'Keine veröffentlichten Sessions in dieser Ausgabe.' },
};

// ── Forbidden screen i18n re-export of UI.noAccess for shorthand ─────────────
export const FORBIDDEN = {
  title: { fr: 'Accès refusé', en: 'Access denied', de: 'Zugriff verweigert' },
  body:  UI.noAccess,
};

// Sentinel : the list of valid roles for assignment UIs.
export const ROLE_OPTIONS = ['startup', 'jury', 'comite', 'admin'];

// Sentinel : valid edition status values mirrored from the M4a SQL CHECK constraint.
export const EDITION_STATUSES = ['draft', 'open', 'selection', 'sessions', 'finale', 'closed'];

// Sentinel : valid session kinds (mirror of sessions.kind).
export const SESSION_KINDS = ['qualifying', 'finale'];
