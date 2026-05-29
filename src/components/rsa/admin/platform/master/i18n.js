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
  overview:           { fr: "Vue d'ensemble",     en: 'Overview',                de: 'Übersicht' },
  competitions:       { fr: 'Compétitions',      en: 'Competitions',            de: 'Wettbewerbe' },
  clubs:              { fr: 'Clubs',              en: 'Clubs',                   de: 'Clubs' },
  roles:              { fr: 'Rôles globaux',      en: 'Global roles',            de: 'Globale Rollen' },
  competition_admins: { fr: 'Admins compétition', en: 'Competition admins',      de: 'Wettbewerbs-Administratoren' },
  finale:             { fr: 'Finale',             en: 'Finale',                  de: 'Finale' },
  advanced:           { fr: 'Outils avancés',     en: 'Advanced tools',          de: 'Erweiterte Tools' },
};

// Ordre : roles → competition_admins. jury_apps RETIRÉ (2026-05-29) — les candidatures
// jury sont scopées (edition_id, club_id), reviewed par club_admin dans son cockpit.
export const TAB_IDS = [
  'overview',
  'competitions',
  'clubs',
  'roles',
  'competition_admins',
  'finale',
  'advanced',
];

// ── Competition admins tab (master_admin only) ─────────────────────────────
export const COMP_ADMINS = {
  sectionTitle: {
    fr: 'Admins compétition',
    en: 'Competition admins',
    de: 'Wettbewerbs-Administratoren',
  },
  intro: {
    fr: 'Un admin compétition pilote une édition entière (toutes les sessions, tous les clubs participants) sans avoir les pouvoirs plateforme du master. Sélectionnez une compétition pour voir ses admins.',
    en: 'A competition admin runs a whole edition (every session, every participating club) without holding platform-wide master powers. Pick a competition to see its admins.',
    de: 'Ein Wettbewerbs-Administrator führt eine ganze Ausgabe (alle Sessions, alle teilnehmenden Clubs), ohne die plattformweiten Master-Rechte zu besitzen. Wählen Sie einen Wettbewerb, um dessen Administratoren zu sehen.',
  },
  pickCompetition: {
    fr: 'Compétition',
    en: 'Competition',
    de: 'Wettbewerb',
  },
  pickCompetitionPlaceholder: {
    fr: 'Choisissez une compétition',
    en: 'Pick a competition',
    de: 'Wählen Sie einen Wettbewerb',
  },
  noCompetitions: {
    fr: 'Aucune compétition pour l’instant. Créez-en une avant d’attribuer des admins.',
    en: 'No competitions yet. Create one before granting admin rights.',
    de: 'Noch keine Wettbewerbe. Erstellen Sie zuerst einen, bevor Sie Admin-Rechte vergeben.',
  },
  inviteButton: {
    fr: 'Inviter admin compétition',
    en: 'Invite competition admin',
    de: 'Wettbewerbs-Administrator·in einladen',
  },
  empty: {
    fr: 'Aucun admin pour cette compétition.',
    en: 'No admin yet for this competition.',
    de: 'Noch kein Administrator für diesen Wettbewerb.',
  },
  emptyHint: {
    fr: 'Cliquez sur « Inviter admin compétition » pour déléguer la gestion d’une édition à un membre Rotary.',
    en: 'Click “Invite competition admin” to delegate an edition to a Rotary member.',
    de: 'Klicken Sie auf „Wettbewerbs-Administrator·in einladen", um die Verwaltung einer Ausgabe an ein Rotary-Mitglied zu delegieren.',
  },
  loading: {
    fr: 'Chargement des admins…',
    en: 'Loading admins…',
    de: 'Administratoren werden geladen…',
  },
  loadError: {
    fr: 'Impossible de charger les admins. Réessayez.',
    en: 'Could not load admins. Please retry.',
    de: 'Administratoren konnten nicht geladen werden. Bitte erneut versuchen.',
  },
  colEmail:     { fr: 'Email',           en: 'Email',           de: 'E-Mail' },
  colName:      { fr: 'Nom',             en: 'Name',            de: 'Name' },
  colGrantedAt: { fr: 'Promu le',        en: 'Granted on',      de: 'Zugewiesen am' },
  colActions:   { fr: 'Actions',         en: 'Actions',         de: 'Aktionen' },
  revokeAction: { fr: 'Révoquer',        en: 'Revoke',          de: 'Entziehen' },

  // Invite modal
  modalEyebrow: {
    fr: 'Nouvel admin compétition',
    en: 'New competition admin',
    de: 'Neuer Wettbewerbs-Administrator',
  },
  modalTitle: {
    fr: 'Inviter un admin compétition',
    en: 'Invite a competition admin',
    de: 'Wettbewerbs-Administrator·in einladen',
  },
  modalSubtitle: {
    fr: 'L’invité recevra un magic-link et un message expliquant son rôle.',
    en: 'The invitee will receive a magic-link with an explanation of their role.',
    de: 'Die eingeladene Person erhält einen Magic-Link mit einer Erläuterung der Rolle.',
  },
  emailLabel: { fr: 'Email', en: 'Email', de: 'E-Mail' },
  emailPlaceholder: {
    fr: 'utilisateur@rotary-club.org',
    en: 'user@rotary-club.org',
    de: 'benutzer@rotary-club.org',
  },
  emailHelper: {
    fr: 'L’adresse à laquelle envoyer le magic-link. Doit appartenir à un membre Rotary identifiable.',
    en: 'Email address to receive the magic-link. Must belong to an identifiable Rotary member.',
    de: 'E-Mail-Adresse für den Magic-Link. Muss einer identifizierbaren Rotary-Person gehören.',
  },
  inviteSubmit: { fr: 'Envoyer l’invitation', en: 'Send invitation', de: 'Einladung senden' },
  inviting:     { fr: 'Envoi…',                en: 'Sending…',         de: 'Wird gesendet…' },
  inviteSuccess: {
    fr: 'Invitation envoyée.',
    en: 'Invitation sent.',
    de: 'Einladung versendet.',
  },
  inviteError: {
    fr: 'Échec de l’envoi : ',
    en: 'Could not send invitation: ',
    de: 'Senden fehlgeschlagen: ',
  },
  errInvalidEmail: {
    fr: 'Adresse email invalide.',
    en: 'Invalid email address.',
    de: 'Ungültige E-Mail-Adresse.',
  },

  // Revoke (typed-confirm)
  revokeTitle: {
    fr: 'Révoquer cet admin compétition',
    en: 'Revoke this competition admin',
    de: 'Diese Wettbewerbs-Administrator·in entziehen',
  },
  revokeBody: {
    fr: 'Cette action retire immédiatement l’accès à la compétition. Tapez REVOQUER {email} pour confirmer.',
    en: 'This immediately revokes access to the competition. Type REVOKE {email} to confirm.',
    de: 'Damit wird der Zugriff auf den Wettbewerb sofort entzogen. Tippen Sie REVOKE {email} ein, um zu bestätigen.',
  },
  revokeTypedWordFr: { fr: 'REVOQUER', en: 'REVOQUER', de: 'REVOQUER' },
  revokeTypedWordEn: { fr: 'REVOKE',   en: 'REVOKE',   de: 'REVOKE' },
  revokeTypedWordDe: { fr: 'REVOKE',   en: 'REVOKE',   de: 'REVOKE' },
  revokeTypedPrompt: {
    fr: 'Recopiez la phrase ci-dessus',
    en: 'Copy the phrase above',
    de: 'Übernehmen Sie den oben angezeigten Wortlaut',
  },
  revokeConfirmCta: {
    fr: 'Révoquer définitivement',
    en: 'Revoke permanently',
    de: 'Endgültig entziehen',
  },
  revokeCancel: { fr: 'Annuler', en: 'Cancel', de: 'Abbrechen' },
  revokeMismatch: {
    fr: 'La phrase ne correspond pas.',
    en: 'The phrase does not match.',
    de: 'Der Wortlaut stimmt nicht überein.',
  },
  revokeSuccess: {
    fr: 'Admin compétition révoqué.',
    en: 'Competition admin revoked.',
    de: 'Wettbewerbs-Administrator·in entzogen.',
  },
  revokeError: {
    fr: 'Échec de la révocation.',
    en: 'Could not revoke.',
    de: 'Entziehen fehlgeschlagen.',
  },
};

// ── Page header ─────────────────────────────────────────────────────────────
export const UI = {
  eyebrow:    { fr: 'Administration Master', en: 'Master Admin',    de: 'Master-Admin' },
  pageTitle:  { fr: 'Pilotage plateforme', en: 'Platform pilot',  de: 'Plattform-Steuerung' },
  pageSubtitle: {
    fr: 'Compétitions, clubs participants, rôles globaux et Grande Finale — vue plateforme.',
    en: 'Competitions, participating clubs, global roles and the Grand Finale — platform view.',
    de: 'Wettbewerbe, teilnehmende Clubs, globale Rollen und Grand Finale — Plattform-Übersicht.',
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
  empty:      { fr: 'Aucun élément.',      en: 'Nothing here yet.', de: 'Noch keine Einträge.' },
  email:      { fr: 'Email',               en: 'Email',          de: 'E-Mail' },
  loadError: {
    fr: 'Impossible de charger les données. Réessayez plus tard.',
    en: 'Could not load the data. Please try again later.',
    de: 'Die Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.',
  },
};

// ── Status strip (header counters) ──────────────────────────────────────────
export const STRIP = {
  activeCompetition: { fr: 'Compétition active',    en: 'Active competition', de: 'Aktiver Wettbewerb' },
  noActiveCompetition: {
    fr: 'Aucune compétition active — créez ou ouvrez-en une dans l’onglet Compétitions.',
    en: 'No active competition — create or open one in the Competitions tab.',
    de: 'Kein aktiver Wettbewerb — bitte einen im Tab „Wettbewerbe" erstellen oder eröffnen.',
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
};

// ── Pilotage tab (B-pilotage-tab) ───────────────────────────────────────────
// Checklist visuelle "next steps" rendue par défaut après création d'une
// compétition pour guider le master_admin (clubs à attacher, admins à inviter,
// sessions à configurer, finale à activer, URLs publiques à diffuser).
export const PILOTAGE = {
  tabLabel: {
    fr: 'Pilotage',
    en: 'Pilot',
    de: 'Steuerung',
  },
  eyebrow: {
    fr: 'Mise en route',
    en: 'Onboarding',
    de: 'Inbetriebnahme',
  },
  checklistTitle: {
    fr: 'Étapes de configuration',
    en: 'Setup checklist',
    de: 'Konfigurationsschritte',
  },
  checklistIntro: {
    fr: 'Suivez ces étapes dans l’ordre pour amener la compétition jusqu’à la diffusion publique.',
    en: 'Follow these steps in order to bring the competition from draft to public launch.',
    de: 'Folgen Sie diesen Schritten in dieser Reihenfolge, um den Wettbewerb bis zur öffentlichen Bekanntgabe zu führen.',
  },
  completionLabel: {
    fr: 'Avancement',
    en: 'Progress',
    de: 'Fortschritt',
  },
  // {percent} sera remplacé côté composant.
  completionTemplate: {
    fr: '{percent} % configuré',
    en: '{percent} % configured',
    de: '{percent} % konfiguriert',
  },
  statusDone: {
    fr: 'Terminé',
    en: 'Done',
    de: 'Erledigt',
  },
  statusPending: {
    fr: 'À faire',
    en: 'To do',
    de: 'Offen',
  },
  statusOptional: {
    fr: 'Optionnel',
    en: 'Optional',
    de: 'Optional',
  },

  // Step 1 — Compétition créée
  step1Title: {
    fr: 'Compétition créée',
    en: 'Competition created',
    de: 'Wettbewerb erstellt',
  },
  step1Subtitle: {
    fr: 'Identité, calendrier et règles enregistrés.',
    en: 'Identity, calendar and rules saved.',
    de: 'Identität, Kalender und Regeln gespeichert.',
  },
  // {percent} = % de champs identité/calendrier/règles remplis.
  step1Fill: {
    fr: 'Identité, calendrier, règles configurés à {percent} %.',
    en: 'Identity, calendar, rules configured at {percent} %.',
    de: 'Identität, Kalender, Regeln zu {percent} % konfiguriert.',
  },
  step1CtaEditIdentity: {
    fr: 'Compléter l’identité',
    en: 'Complete identity',
    de: 'Identität ergänzen',
  },

  // Step 2 — Clubs participants attachés
  step2Title: {
    fr: 'Clubs participants attachés',
    en: 'Participating clubs attached',
    de: 'Teilnehmende Clubs zugeordnet',
  },
  // {count} = clubs attachés, {recommended} = min recommandé selon model.
  step2Count: {
    fr: '{count}/{recommended} clubs attachés',
    en: '{count}/{recommended} clubs attached',
    de: '{count}/{recommended} Clubs zugeordnet',
  },
  step2EmptyMulti: {
    fr: 'Aucun club attaché. Pour une compétition multiclub, attache au moins 2 clubs.',
    en: 'No club attached yet. For a multiclub competition, attach at least 2 clubs.',
    de: 'Noch kein Club zugeordnet. Für einen Multiclub-Wettbewerb mindestens 2 Clubs zuordnen.',
  },
  step2EmptyMono: {
    fr: 'Aucun club attaché. Une compétition monoclub doit avoir exactement 1 club.',
    en: 'No club attached yet. A monoclub competition needs exactly 1 club.',
    de: 'Noch kein Club zugeordnet. Ein Monoclub-Wettbewerb benötigt genau 1 Club.',
  },
  step2CtaAttach: {
    fr: 'Attacher un club',
    en: 'Attach a club',
    de: 'Club zuordnen',
  },

  // Step 3 — Club admins assignés
  step3Title: {
    fr: 'Club admins assignés',
    en: 'Club admins assigned',
    de: 'Club-Administratoren zugewiesen',
  },
  // {with} = clubs avec >=1 admin, {total} = clubs attachés
  step3Count: {
    fr: '{with}/{total} clubs ont un admin',
    en: '{with}/{total} clubs have an admin',
    de: '{with}/{total} Clubs haben eine·n Administrator·in',
  },
  step3MissingHeading: {
    fr: 'Clubs sans admin :',
    en: 'Clubs without an admin:',
    de: 'Clubs ohne Administrator·in:',
  },
  step3CtaInvite: {
    fr: 'Inviter club admins',
    en: 'Invite club admins',
    de: 'Club-Administrator·innen einladen',
  },
  step3NoClubsYet: {
    fr: 'Attache d’abord des clubs avant d’assigner des admins.',
    en: 'Attach clubs first before assigning admins.',
    de: 'Bitte zuerst Clubs zuordnen, bevor Administrator·innen zugewiesen werden.',
  },

  // Step 4 — Sessions configurées
  step4Title: {
    fr: 'Sessions configurées',
    en: 'Sessions configured',
    de: 'Sessions konfiguriert',
  },
  // {with} = clubs avec >=1 session, {total} = clubs attachés
  step4Count: {
    fr: '{with}/{total} clubs ont une session',
    en: '{with}/{total} clubs have a session',
    de: '{with}/{total} Clubs haben eine Session',
  },
  step4NeedsAdmin: {
    fr: 'Les sessions seront configurées par les club_admins une fois assignés.',
    en: 'Sessions will be configured by club admins once assigned.',
    de: 'Sessions werden von den Club-Administrator·innen konfiguriert, sobald diese benannt sind.',
  },
  // {clubName} sera remplacé côté composant.
  step4CtaCockpit: {
    fr: 'Ouvrir le cockpit de {clubName}',
    en: 'Open the {clubName} cockpit',
    de: 'Cockpit von {clubName} öffnen',
  },
  step4MissingHeading: {
    fr: 'Clubs sans session :',
    en: 'Clubs without a session:',
    de: 'Clubs ohne Session:',
  },

  // Step 5 — Finale configurée
  step5Title: {
    fr: 'Finale configurée',
    en: 'Finale configured',
    de: 'Finale konfiguriert',
  },
  step5Disabled: {
    fr: 'Finale non activée — cette compétition n’a pas de Grande Finale.',
    en: 'Finale not enabled — this competition has no Grand Finale.',
    de: 'Finale nicht aktiviert — dieser Wettbewerb hat kein Grand Finale.',
  },
  step5CtaEnable: {
    fr: 'Activer la Finale',
    en: 'Enable the Finale',
    de: 'Finale aktivieren',
  },
  step5CtaConfigure: {
    fr: 'Configurer la Finale',
    en: 'Configure the Finale',
    de: 'Finale konfigurieren',
  },
  step5MissingDate: {
    fr: 'Date non définie',
    en: 'Date not set',
    de: 'Datum nicht festgelegt',
  },
  step5MissingLocation: {
    fr: 'Lieu non défini',
    en: 'Location not set',
    de: 'Ort nicht festgelegt',
  },

  // Step 6 — URLs publiques
  step6Title: {
    fr: 'URLs publiques à diffuser',
    en: 'Public URLs to share',
    de: 'Öffentliche URLs zum Teilen',
  },
  step6Intro: {
    fr: 'Trois liens à diffuser pour ouvrir la compétition au public et au jury.',
    en: 'Three links to share to open the competition to candidates and jury.',
    de: 'Drei Links zur Verbreitung, um Bewerbungen und Jury anzusprechen.',
  },
  step6LinkApply: {
    fr: 'Candidater (startups)',
    en: 'Apply (startups)',
    de: 'Bewerben (Startups)',
  },
  step6LinkJury: {
    fr: 'Rejoindre le jury',
    en: 'Join the jury',
    de: 'Der Jury beitreten',
  },
  step6LinkPublic: {
    fr: 'Page publique',
    en: 'Public page',
    de: 'Öffentliche Seite',
  },
  step6Copy: {
    fr: 'Copier',
    en: 'Copy',
    de: 'Kopieren',
  },
  step6Copied: {
    fr: 'Copié',
    en: 'Copied',
    de: 'Kopiert',
  },
  step6CopyError: {
    fr: 'Échec de copie',
    en: 'Copy failed',
    de: 'Kopieren fehlgeschlagen',
  },
};

// ── Clubs tab ───────────────────────────────────────────────────────────────
export const CLUBS = {
  sectionTitle:  { fr: 'Clubs',            en: 'Clubs',         de: 'Clubs' },
  newClub:       { fr: 'Nouveau club',     en: 'New club',      de: 'Neuer Club' },
  noClubs: {
    fr: 'Aucun club pour l’instant. Créez le premier club Rotary participant.',
    en: 'No clubs yet. Create the first participating Rotary club.',
    de: 'Noch keine Clubs vorhanden. Legen Sie den ersten teilnehmenden Rotary-Club an.',
  },
  // ── Fields V2 (legacy, gardés pour backward-compat / affichage liste) ────
  idLabel:       { fr: 'Identifiant',      en: 'Identifier',    de: 'Kennung' },
  idHint:        {
    fr: 'Kebab-case, ex. « paris », « berlin », « lyon-1 ». Immuable.',
    en: 'Kebab-case, e.g. “paris”, “berlin”, “lyon-1”. Immutable.',
    de: 'Kebab-Case, z. B. „paris", „berlin", „lyon-1". Nach der Erstellung unveränderlich.',
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
    de: 'Ansprechperson (operative Kontaktstelle)',
  },
  sectionPresident: {
    fr: 'Président du club',
    en: 'Club president',
    de: 'Clubpräsident',
  },
  sectionAddress: {
    fr: 'Coordonnées institutionnelles',
    en: 'Institutional contact details',
    de: 'Institutionelle Kontaktdaten',
  },
  // Champs (labels + placeholders + helpers)
  countryLabel:    { fr: 'Pays',           en: 'Country',       de: 'Land' },
  languageLabel:   {
    fr: 'Langue principale',
    en: 'Primary language',
    de: 'Hauptsprache',
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
    de: 'Technische Kennung, automatisch aus dem Namen abgeleitet. Nach der Erstellung unveränderlich.',
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
    de: 'Vorname der Ansprechperson ist erforderlich.',
  },
  errContactLastName: {
    fr: 'Nom du représentant requis.',
    en: 'Representative last name is required.',
    de: 'Nachname der Ansprechperson ist erforderlich.',
  },
  errContactEmail: {
    fr: 'Email du représentant requis (format valide).',
    en: 'Representative email is required (valid format).',
    de: 'E-Mail der Ansprechperson ist erforderlich (gültiges Format).',
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
    de: 'Erfassen Sie zunächst die Eckdaten des Clubs. Die übrigen Tabs werden nach der Erstellung freigeschaltet — jede Änderung wird anschließend automatisch gespeichert.',
  },
  funnelCreateButton: {
    fr: 'Créer le club',
    en: 'Create club',
    de: 'Club erstellen',
  },
  funnelTabLockedHint: {
    fr: 'Disponible après la création du club.',
    en: 'Available after the club is created.',
    de: 'Erst nach Erstellung des Clubs verfügbar.',
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
    de: 'Der club_admin leitet den Club, das Komitee prüft die Dossiers und die Jury bewertet die Sessions.',
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
    de: 'Dieser Nutzer ist noch nicht angelegt. Bitten Sie ihn, sich einmal über /Login (Magic-Link) anzumelden, und versuchen Sie es anschließend erneut.',
  },
  lastClubAdmin: {
    fr: 'Impossible : ce serait le dernier club_admin du club. Provisionnez un autre club_admin avant de retirer ce rôle.',
    en: 'Cannot proceed: this would remove the last club_admin. Provision another club_admin first.',
    de: 'Nicht möglich: Dies ist der/die letzte club_admin des Clubs. Weisen Sie zunächst einer weiteren Person die Rolle club_admin zu, bevor Sie diese entziehen.',
  },
  noMembers: {
    fr: 'Aucun membre provisionné pour ce club.',
    en: 'No member provisioned for this club yet.',
    de: 'Für diesen Club ist noch kein Mitglied zugewiesen.',
  },
  revokeConfirm: {
    fr: 'Retirer ce rôle ?',
    en: 'Remove this role?',
    de: 'Diese Rolle entfernen?',
  },
  memberColEmail: { fr: 'Membre',          en: 'Member',        de: 'Mitglied' },
  memberColRole:  { fr: 'Rôle',            en: 'Role',          de: 'Rolle' },
  memberColGranted: { fr: 'Provisionné le', en: 'Granted on',   de: 'Zugewiesen am' },
  memberColActions: { fr: 'Actions',       en: 'Actions',       de: 'Aktionen' },
};

// ── Cross-cockpit deep-links + Club row actions (équipe C) ──────────────────
// Strings pour les boutons inline "Cockpit / Inviter admin / Stats" placés sur
// chaque row de la liste des clubs attachés à une compétition, plus la modale
// d'invitation club_admin et le popover de stats compact.
export const CLUB_ROW_ACTIONS = {
  // Row buttons ---------------------------------------------------------------
  openCockpit: {
    fr: 'Cockpit',
    en: 'Cockpit',
    de: 'Cockpit',
  },
  openCockpitTitle: {
    fr: 'Ouvrir le cockpit de ce club',
    en: 'Open this club’s cockpit',
    de: 'Cockpit dieses Clubs öffnen',
  },
  inviteAdmin: {
    fr: 'Inviter admin',
    en: 'Invite admin',
    de: 'Admin einladen',
  },
  inviteAdminTitle: {
    fr: 'Inviter un club_admin pour ce club',
    en: 'Invite a club_admin for this club',
    de: 'club_admin für diesen Club einladen',
  },
  viewStats: {
    fr: 'Stats',
    en: 'Stats',
    de: 'Stats',
  },
  viewStatsTitle: {
    fr: 'Aperçu des compteurs (candidatures, sessions, finalistes)',
    en: 'Counter overview (applications, sessions, finalists)',
    de: 'Übersicht der Zähler (Bewerbungen, Sessions, Finalisten)',
  },
  // Stat popover --------------------------------------------------------------
  statPopoverTitle: {
    fr: 'Aperçu du club',
    en: 'Club at a glance',
    de: 'Club im Überblick',
  },
  statApplications: {
    fr: 'Candidatures',
    en: 'Applications',
    de: 'Bewerbungen',
  },
  statSessions: {
    fr: 'Sessions',
    en: 'Sessions',
    de: 'Sessions',
  },
  statFinalists: {
    fr: 'Finalistes',
    en: 'Finalists',
    de: 'Finalisten',
  },
  statLoading: {
    fr: 'Chargement…',
    en: 'Loading…',
    de: 'Lädt…',
  },
  statError: {
    fr: 'Compteurs indisponibles.',
    en: 'Counters unavailable.',
    de: 'Zähler nicht verfügbar.',
  },
  // Invite club admin modal --------------------------------------------------
  inviteModalEyebrow: {
    fr: 'Nouvel admin de club',
    en: 'New club admin',
    de: 'Neuer Club-Administrator',
  },
  inviteModalTitle: {
    fr: 'Inviter un admin de club',
    en: 'Invite a club admin',
    de: 'Club-Administrator·in einladen',
  },
  inviteModalSubtitle: {
    fr: 'L’invité recevra un magic-link et le rôle club_admin pour ce club.',
    en: 'The invitee will receive a magic-link and the club_admin role for this club.',
    de: 'Die eingeladene Person erhält einen Magic-Link und die Rolle club_admin für diesen Club.',
  },
  inviteEmailLabel: {
    fr: 'Email',
    en: 'Email',
    de: 'E-Mail',
  },
  inviteEmailPlaceholder: {
    fr: 'utilisateur@rotary-club.org',
    en: 'user@rotary-club.org',
    de: 'benutzer@rotary-club.org',
  },
  inviteEmailHelper: {
    fr: 'Adresse à laquelle envoyer le magic-link. Doit appartenir à un membre Rotary du club.',
    en: 'Email address to receive the magic-link. Must belong to a Rotary member of this club.',
    de: 'E-Mail-Adresse für den Magic-Link. Muss einer Rotary-Person dieses Clubs gehören.',
  },
  inviteMessageLabel: {
    fr: 'Message personnel (optionnel)',
    en: 'Custom message (optional)',
    de: 'Persönliche Nachricht (optional)',
  },
  inviteMessagePlaceholder: {
    fr: 'Mot personnalisé inclus dans l’email d’invitation…',
    en: 'A note included in the invitation email…',
    de: 'Persönliche Notiz, die der Einladungs-E-Mail beigefügt wird…',
  },
  inviteSubmit: {
    fr: 'Envoyer l’invitation',
    en: 'Send invitation',
    de: 'Einladung senden',
  },
  inviteSending: {
    fr: 'Envoi…',
    en: 'Sending…',
    de: 'Wird gesendet…',
  },
  inviteSuccess: {
    fr: 'Invitation envoyée.',
    en: 'Invitation sent.',
    de: 'Einladung versendet.',
  },
  inviteErrPrefix: {
    fr: 'Échec de l’envoi : ',
    en: 'Could not send invitation: ',
    de: 'Senden fehlgeschlagen: ',
  },
  inviteInvalidEmail: {
    fr: 'Adresse email invalide.',
    en: 'Invalid email address.',
    de: 'Ungültige E-Mail-Adresse.',
  },
  inviteCancel: {
    fr: 'Annuler',
    en: 'Cancel',
    de: 'Abbrechen',
  },
};

// ── Global roles tab ────────────────────────────────────────────────────────
export const ROLES = {
  sectionTitle:  { fr: 'Rôles globaux',    en: 'Global roles',  de: 'Globale Rollen' },
  disclaimer: {
    fr: 'Ces rôles sont GLOBAUX (master_admin, admin legacy). Pour les rôles club_admin / comité / jury d’un club, allez dans Clubs → [club] → Membres.',
    en: 'These roles are GLOBAL (master_admin, legacy admin). For club_admin / committee / jury roles in a specific club, go to Clubs → [club] → Members.',
    de: 'Diese Rollen sind GLOBAL gültig (master_admin, Legacy-Admin). Für die clubspezifischen Rollen club_admin, Komitee und Jury wechseln Sie zu Clubs → [Club] → Mitglieder.',
  },
};

// ── Finale tab ──────────────────────────────────────────────────────────────
export const FINALE = {
  sectionTitle:  { fr: 'Grande Finale', en: 'Grand Finale', de: 'Grand Finale' },
  needMulticlub: {
    fr: 'La finale n’existe que pour les compétitions multiclub. Sélectionnez ou créez-en une.',
    en: 'The finale only applies to multiclub competitions. Select or create one.',
    de: 'Das Finale ist nur für Multiclub-Wettbewerbe vorgesehen. Bitte wählen oder erstellen Sie einen solchen.',
  },
  championsPerClub: { fr: 'Championnes & champions par club', en: 'Club champions', de: 'Club-Champions' },
  noChampions: {
    fr: 'Aucune championne ni champion qualifié pour l’instant. Les clubs doivent verrouiller et publier leurs sessions.',
    en: 'No qualified champions yet. Clubs must lock and publish their qualifying sessions first.',
    de: 'Noch keine qualifizierten Champions. Die Clubs müssen zunächst ihre Qualifikations-Sessions sperren und veröffentlichen.',
  },
  promoteToFinale: { fr: 'Promouvoir en finale', en: 'Promote to finale', de: 'Ins Finale weiterleiten' },
  promoteTodo: {
    fr: 'Disponible en M4b — la promotion automatique vers la finale arrive avec le module 4b.',
    en: 'Coming in M4b — automatic finale promotion ships with module 4b.',
    de: 'Verfügbar ab M4b — die automatische Weiterleitung ins Finale wird mit Modul 4b ausgeliefert.',
  },
  finaleSection: { fr: 'Configuration de la finale', en: 'Finale configuration', de: 'Finale-Konfiguration' },
  finaleExists: {
    fr: 'Une session « finale » existe pour cette compétition.',
    en: 'A finale session exists for this competition.',
    de: 'Für diesen Wettbewerb besteht bereits eine Session „Finale".',
  },
  finaleMissing: {
    fr: 'Aucune session « finale » pour l’instant. Créez-en une pour orchestrer la finale.',
    en: 'No finale session yet. Create one to orchestrate the finale.',
    de: 'Noch keine Session „Finale" angelegt. Erstellen Sie eine, um das Finale zu organisieren.',
  },
  createFinale:   { fr: 'Créer la Grande Finale', en: 'Create the grand finale', de: 'Grand Finale erstellen' },
  finaleSessionName: { fr: 'Nom de la session', en: 'Session name', de: 'Session-Name' },
  finaleDate:     { fr: 'Date',                en: 'Date',          de: 'Datum' },
  finaleIdHint:   {
    fr: 'Identifiant unique de la session, ex. « finale_2027 ».',
    en: 'Unique session identifier, e.g. “finale_2027”.',
    de: 'Eindeutige Session-Kennung, z. B. „finale_2027".',
  },
  finaleLink:     { fr: 'Gérer dans l’admin session (legacy)', en: 'Manage in legacy session admin', de: 'In der Legacy-Session-Verwaltung bearbeiten' },
  championClubCol:{ fr: 'Club',                en: 'Club',          de: 'Club' },
  championStartupCol: { fr: 'Startup',         en: 'Startup',       de: 'Startup' },
  championSessionCol: { fr: 'Session qualificative', en: 'Qualifying session', de: 'Qualifikations-Session' },
  championActionsCol: { fr: 'Actions',         en: 'Actions',       de: 'Aktionen' },

  // ── V3 Vague 2 (A) — Pool finale (platform_finale_membership) ─────────────
  poolSectionTitle: {
    fr: 'Pool de la Grande Finale',
    en: 'Finale pool',
    de: 'Pool des Finales',
  },
  poolSectionHint: {
    fr: 'Startups promues automatiquement à la Grande Finale après conclusion d’une session qualificative. Seul le master_admin peut retirer une startup du pool.',
    en: 'Startups automatically promoted to the finale once a qualifying session was concluded. Only master_admin can remove a startup from the pool.',
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

// ── Overview tab (master cockpit landing) ───────────────────────────────────
export const OVERVIEW = {
  eyebrow:       { fr: 'Administration', en: 'Administration', de: 'Verwaltung' },
  titleLead:     { fr: "Vue d'ensemble",  en: 'Overview',        de: 'Übersicht' },
  titleItalic:   { fr: '',                en: '',                de: '' },
  // Hairline opener placed above the Live dashboard (top block after the hero).
  liveDashboardEyebrow: {
    fr: 'En direct',
    en: 'Live',
    de: 'Live',
  },
  liveDashboardTitle: {
    fr: 'Tableau de bord',
    en: 'Live dashboard',
    de: 'Live-Dashboard',
  },
  // Empty-state shown when the activity feed has no row (data === [] after fetch).
  feedEmptyShort: {
    fr: 'Aucune activité encore.',
    en: 'No activity yet.',
    de: 'Noch keine Aktivität.',
  },
  pulseNoActive: {
    fr: 'Aucune compétition active. Le pouls de la plateforme reprendra dès qu’une édition sera ouverte.',
    en: 'No active competition yet. The platform pulse will resume as soon as an edition opens.',
    de: 'Noch kein aktiver Wettbewerb. Der Plattform-Puls setzt wieder ein, sobald eine Ausgabe eröffnet wird.',
  },
  // Pulse template — {name} et {applied}/{sessions}/{clubs} sont remplacés côté composant.
  pulseTemplate: {
    fr: '{name} est en cours — {applied} candidature(s), {sessions} session(s) sur {clubs} club(s) participant(s).',
    en: '{name} is live — {applied} application(s), {sessions} session(s) across {clubs} participating club(s).',
    de: '{name} läuft — {applied} Bewerbung(en), {sessions} Session(s) über {clubs} teilnehmende Club(s).',
  },

  // Activity feed
  feedEyebrow:   { fr: 'Administration',    en: 'Administration',   de: 'Verwaltung' },
  feedTitle:     { fr: 'Fil d’activité',    en: 'Activity feed',    de: 'Aktivitäts-Feed' },
  feedHint: {
    fr: 'Dix dernières actions auditées sur la plateforme — suppression de compétitions, promotion de finalistes, déclenchements de sessions.',
    en: 'Last ten audited actions across the platform — competition deletions, finalist promotions, session triggers.',
    de: 'Die zehn letzten geprüften Plattform-Aktionen — Wettbewerbslöschungen, Finalisten-Beförderungen, Session-Auslöser.',
  },
  feedEmpty: {
    fr: 'Aucune action auditée pour l’instant. Les évènements critiques apparaîtront ici en temps réel.',
    en: 'No audited action yet. Critical events will surface here in real time.',
    de: 'Noch keine geprüften Aktionen. Kritische Ereignisse erscheinen hier in Echtzeit.',
  },
  feedTime: {
    fr: 'à l’instant',  en: 'just now',         de: 'gerade eben',
  },
  feedMinutesAgo: { fr: 'il y a {n} min', en: '{n} min ago', de: 'vor {n} Min.' },
  feedHoursAgo:   { fr: 'il y a {n} h',   en: '{n} h ago',   de: 'vor {n} Std.' },
  feedDaysAgo:    { fr: 'il y a {n} j',   en: '{n} d ago',   de: 'vor {n} Tagen' },

  // Action labels (admin_audit_log.action)
  actionCompetitionDeleted: {
    fr: 'Compétition supprimée',
    en: 'Competition deleted',
    de: 'Wettbewerb gelöscht',
  },
  actionFinalistPromoted: {
    fr: 'Finaliste promu en Grande Finale',
    en: 'Finalist promoted to Grand Finale',
    de: 'Finalist ins Grand Finale befördert',
  },
  actionFinalistRemoved: {
    fr: 'Finaliste retiré du pool',
    en: 'Finalist removed from pool',
    de: 'Finalist aus dem Pool entfernt',
  },
  actionSessionPublished: {
    fr: 'Session publiée',
    en: 'Session published',
    de: 'Session veröffentlicht',
  },
  actionSessionConcluded: {
    fr: 'Session conclue',
    en: 'Session concluded',
    de: 'Session abgeschlossen',
  },
  actionClubRoleAssigned: {
    fr: 'Rôle club assigné',
    en: 'Club role assigned',
    de: 'Club-Rolle zugewiesen',
  },
  actionClubRoleRevoked: {
    fr: 'Rôle club retiré',
    en: 'Club role revoked',
    de: 'Club-Rolle entzogen',
  },
  actionClubCreated: {
    fr: 'Club créé',
    en: 'Club created',
    de: 'Club erstellt',
  },
  actionGeneric: {
    fr: 'Action',
    en: 'Action',
    de: 'Aktion',
  },

  // KPI rail — bande hairline éditoriale
  kpiRailEyebrow: {
    fr: 'Pouls plateforme',
    en: 'Platform pulse',
    de: 'Plattform-Puls',
  },
  kpiCompetitions: { fr: 'compétition(s)',  en: 'competition(s)',  de: 'Wettbewerb(e)' },
  kpiClubs:        { fr: 'club(s)',          en: 'club(s)',         de: 'Club(s)' },
  kpiApplications: { fr: 'candidature(s)',   en: 'application(s)',  de: 'Bewerbung(en)' },
  kpiSessions:     { fr: 'session(s)',       en: 'session(s)',      de: 'Session(s)' },
  kpiLiveSessions: { fr: 'en direct',        en: 'live',            de: 'live' },

  // Quick actions (raccourcis création)
  quickActionsEyebrow: {
    fr: 'Lancer un cycle',
    en: 'Kick off a cycle',
    de: 'Zyklus starten',
  },
  quickCreateCompetition: {
    fr: 'Nouvelle compétition',
    en: 'New competition',
    de: 'Neuer Wettbewerb',
  },
  quickCreateCompetitionHint: {
    fr: 'Ouvre le funnel — identité, calendrier, clubs participants.',
    en: 'Opens the funnel — identity, calendar, participating clubs.',
    de: 'Öffnet den Funnel — Identität, Kalender, teilnehmende Clubs.',
  },
  quickCreateClub: {
    fr: 'Nouveau club Rotary',
    en: 'New Rotary club',
    de: 'Neuer Rotary-Club',
  },
  quickCreateClubHint: {
    fr: 'Funnel club — informations, représentant, président.',
    en: 'Club funnel — information, representative, president.',
    de: 'Club-Funnel — Informationen, Vertreter, Präsident.',
  },
  quickInviteMember: {
    fr: 'Inviter un administrateur',
    en: 'Invite an administrator',
    de: 'Administrator·in einladen',
  },
  quickInviteMemberHint: {
    fr: 'Provisionne un rôle global (master_admin / admin legacy).',
    en: 'Provision a global role (master_admin / legacy admin).',
    de: 'Globale Rolle bereitstellen (master_admin / Legacy-Admin).',
  },

  // Chart sections
  chartsEyebrow: {
    fr: 'Tableau de bord',
    en: 'Live dashboard',
    de: 'Live-Dashboard',
  },
  chartsHint: {
    fr: 'Lecture temps réel — funnel agrégé de la compétition active et activité comparée des clubs.',
    en: 'Real-time read — aggregated funnel of the active competition and comparative club activity.',
    de: 'Echtzeit-Lesung — aggregierter Funnel des aktiven Wettbewerbs und vergleichende Club-Aktivität.',
  },
  chartFunnelTitle: {
    fr: 'Funnel candidatures',
    en: 'Application funnel',
    de: 'Bewerbungs-Funnel',
  },
  chartClubsTitle: {
    fr: 'Activité par club',
    en: 'Activity by club',
    de: 'Aktivität nach Club',
  },
  chartJuryTitle: {
    fr: 'Activité jury',
    en: 'Jury activity',
    de: 'Jury-Aktivität',
  },
  chartsNoActive: {
    fr: 'Les tableaux apparaîtront dès qu’une compétition aura une édition active.',
    en: 'Charts will appear as soon as one competition has an active edition.',
    de: 'Diagramme erscheinen, sobald ein Wettbewerb eine aktive Ausgabe hat.',
  },
};

// ── Advanced tools tab ──────────────────────────────────────────────────────
export const ADVANCED = {
  eyebrow:      { fr: 'Outils avancés',     en: 'Advanced tools',   de: 'Erweiterte Tools' },
  titleLead:    { fr: 'Outils',             en: 'Tools',            de: 'Werkzeuge' },
  titleItalic:  { fr: 'avancés',            en: 'advanced',         de: 'erweitert' },
  intro: {
    fr: 'Réglages d’infrastructure et leviers cross-clubs réservés au master_admin. Chaque module est autonome — entrez quand vous en avez besoin.',
    en: 'Infrastructure controls and cross-club levers reserved for the master_admin. Each module is self-contained — enter when needed.',
    de: 'Infrastruktur-Steuerung und cross-club Hebel, dem master_admin vorbehalten. Jedes Modul ist eigenständig — bei Bedarf öffnen.',
  },
  // 3 sub-cards
  extensionsTitle: {
    fr: 'Extensions actives',
    en: 'Active extensions',
    de: 'Aktive Erweiterungen',
  },
  extensionsLede: {
    fr: 'Cockpit tabs, webhooks et templates email rendus au niveau plateforme. Toute extension scope=master est listée ici.',
    en: 'Cockpit tabs, webhooks and email templates rendered at the platform level. Every scope=master extension is listed here.',
    de: 'Cockpit-Tabs, Webhooks und E-Mail-Vorlagen auf Plattformebene. Sämtliche scope=master-Erweiterungen werden hier aufgeführt.',
  },
  marketplaceTitle: {
    fr: 'Marketplace',
    en: 'Marketplace',
    de: 'Marketplace',
  },
  marketplaceLede: {
    fr: 'Catalogue complet des modules publiés. À installer en mode cross-clubs depuis la route /Marketplace.',
    en: 'Full catalogue of published modules. Install cross-club from the /Marketplace route.',
    de: 'Vollständiger Katalog veröffentlichter Module. Cross-Club-Installation über /Marketplace.',
  },
  marketplaceCta: {
    fr: 'Ouvrir le catalogue',
    en: 'Open catalogue',
    de: 'Katalog öffnen',
  },
  emailStudioTitle: {
    fr: 'Studio email global',
    en: 'Global email studio',
    de: 'Globales E-Mail-Studio',
  },
  emailStudioLede: {
    fr: 'Diffusion master cross-clubs — communiqués Rotary France ou rappels plateforme. Audience résolue par édition active.',
    en: 'Cross-club master broadcast — Rotary France notices or platform reminders. Audience resolved on the active edition.',
    de: 'Cross-Club-Master-Versand — Rotary-France-Mitteilungen oder Plattform-Hinweise. Zielgruppe der aktiven Ausgabe.',
  },
};

// ── Diffusion section (URLs publiques à partager) ──────────────────────────
// Affichée en bas du Pilotage tab (step 6) ou en tab dédié "Diffusion".
// Le master_admin diffuse 3 URLs : candidat startup, juré self-apply, vue publique.
export const DIFFUSION = {
  sectionTitle: {
    fr: 'URLs à diffuser',
    en: 'URLs to share',
    de: 'Zu verteilende URLs',
  },
  sectionEyebrow: {
    fr: 'Diffusion',
    en: 'Broadcast',
    de: 'Verteilung',
  },
  sectionLede: {
    fr: 'Trois URLs publiques à diffuser pour ouvrir le cycle : candidatures startups, candidatures jurés et vue publique des résultats.',
    en: 'Three public URLs to share to open the cycle: startup applications, jury self-apply and the public results view.',
    de: 'Drei öffentliche URLs zur Eröffnung des Zyklus: Startup-Bewerbungen, Jury-Selbstbewerbung und die öffentliche Ergebnisansicht.',
  },
  // Card a) Candidat startup
  candidatTitle: {
    fr: 'Candidater (startup)',
    en: 'Apply (startup)',
    de: 'Bewerben (Startup)',
  },
  candidatDesc: {
    fr: 'Lien à diffuser aux startups éligibles. Ouvre le funnel de candidature pré-renseigné sur cette édition.',
    en: 'Link to share with eligible startups. Opens the application funnel prefilled for this edition.',
    de: 'Link, der an förderfähige Startups verteilt wird. Öffnet den Bewerbungs-Funnel, vorausgefüllt für diese Ausgabe.',
  },
  // Card b) Juré self-apply
  juryTitle: {
    fr: 'Devenir juré',
    en: 'Become a juror',
    de: 'Juror·in werden',
  },
  juryDesc: {
    fr: 'Lien à diffuser aux entrepreneurs et experts Rotary souhaitant rejoindre le jury de cette édition.',
    en: 'Link for entrepreneurs and Rotary experts who wish to join the jury for this edition.',
    de: 'Link für Unternehmer·innen und Rotary-Expert·innen, die der Jury dieser Ausgabe beitreten möchten.',
  },
  // Card c) Vue publique
  publicTitle: {
    fr: 'Vue publique du concours',
    en: 'Public competition view',
    de: 'Öffentliche Wettbewerbsansicht',
  },
  publicDesc: {
    fr: 'Lien à diffuser largement (presse, communication Rotary). Affiche le palmarès une fois les résultats publiés.',
    en: 'Link for broad distribution (press, Rotary communication). Shows the rankings once results are published.',
    de: 'Link zur breiten Verteilung (Presse, Rotary-Kommunikation). Zeigt die Rangliste, sobald die Ergebnisse veröffentlicht sind.',
  },
  // Actions
  urlLabel: {
    fr: 'URL publique',
    en: 'Public URL',
    de: 'Öffentliche URL',
  },
  copyButton: {
    fr: 'Copier',
    en: 'Copy',
    de: 'Kopieren',
  },
  copySuccess: {
    fr: 'Lien copié dans le presse-papier',
    en: 'Link copied to clipboard',
    de: 'Link in die Zwischenablage kopiert',
  },
  copyError: {
    fr: 'Copie impossible',
    en: 'Could not copy',
    de: 'Kopieren nicht möglich',
  },
  qrButton: {
    fr: 'QR Code',
    en: 'QR code',
    de: 'QR-Code',
  },
  qrModalTitle: {
    fr: 'QR Code à scanner',
    en: 'QR code to scan',
    de: 'QR-Code zum Scannen',
  },
  qrModalHint: {
    fr: 'Scannez ce QR ou utilisez le lien ci-dessous pour partager.',
    en: 'Scan this QR or use the link below to share.',
    de: 'Scannen Sie diesen QR-Code oder verwenden Sie den Link unten zum Teilen.',
  },
  openTab: {
    fr: 'Ouvrir dans un nouvel onglet',
    en: 'Open in new tab',
    de: 'In neuem Tab öffnen',
  },
  closeModal: {
    fr: 'Fermer',
    en: 'Close',
    de: 'Schließen',
  },
  // Compteur clics — placeholder V3.1, pas encore branché
  clicksLabel: {
    fr: 'clic(s)',
    en: 'click(s)',
    de: 'Klick(s)',
  },
  // a11y aria labels
  ariaCardRegion: {
    fr: 'URL publique à diffuser',
    en: 'Public URL to share',
    de: 'Öffentliche URL zum Teilen',
  },
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
