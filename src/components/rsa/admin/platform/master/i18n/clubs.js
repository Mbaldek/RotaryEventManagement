import { COMP } from './competitions';

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
