// i18n trilingue (FR/EN/DE) du module Prix V2.5.
//
// Forme { fr, en, de } compatible useLang().t(dict) (cf. @/lib/platform/i18n).
// Style imité de @/components/rsa/admin/platform/master/i18n.js (registre
// institutionnel, jamais d'emoji, copie courte et précise). Les composants
// de @/components/rsa/prizes/* ne contiennent AUCUNE chaîne hardcodée.

// ── UI commune (libellés transverses) ───────────────────────────────────────
export const PRIZES_UI = {
  // Section
  sectionTitleCompetition: {
    fr: 'Prix de la compétition',
    en: 'Competition prizes',
    de: 'Wettbewerbspreise',
  },
  sectionTitleClub: {
    fr: 'Prix du club',
    en: 'Club prizes',
    de: 'Club-Preise',
  },
  sectionHintCompetition: {
    fr: 'Les prix au niveau compétition (grand prix, finale fédérée). Gérés par le master admin.',
    en: 'Competition-level prizes (grand prize, federated finale). Managed by the master admin.',
    de: 'Preise auf Wettbewerbsebene (Hauptpreis, föderiertes Finale). Vom Master-Admin verwaltet.',
  },
  sectionHintClub: {
    fr: 'Définissez les prix spéciaux offerts par votre club, vos partenaires ou votre comité.',
    en: 'Define the special prizes offered by your club, your partners or your committee.',
    de: 'Definieren Sie die Sonderpreise Ihres Clubs, Ihrer Partner oder Ihres Komitees.',
  },
  newPrize:    { fr: 'Nouveau prix',         en: 'New prize',          de: 'Neuer Preis' },
  edit:        { fr: 'Éditer',               en: 'Edit',               de: 'Bearbeiten' },
  remove:      { fr: 'Supprimer',            en: 'Delete',             de: 'Löschen' },
  award:       { fr: 'Décerner',             en: 'Award',              de: 'Verleihen' },
  cancel:      { fr: 'Annuler',              en: 'Cancel',             de: 'Abbrechen' },
  save:        { fr: 'Enregistrer',          en: 'Save',               de: 'Speichern' },
  saving:      { fr: 'Enregistrement…',      en: 'Saving…',            de: 'Speichern…' },
  create:      { fr: 'Créer',                en: 'Create',             de: 'Erstellen' },
  creating:    { fr: 'Création…',            en: 'Creating…',          de: 'Erstellen…' },
  close:       { fr: 'Fermer',               en: 'Close',              de: 'Schließen' },
  loading:     { fr: 'Chargement…',          en: 'Loading…',           de: 'Lädt…' },
  empty: {
    fr: 'Aucun prix défini pour l’instant. Créez le premier pour démarrer le palmarès.',
    en: 'No prize defined yet. Create the first one to start the awards roll.',
    de: 'Noch kein Preis definiert. Erstellen Sie den ersten, um die Preisverleihung zu starten.',
  },
  awardedTo:   { fr: 'Décerné à',            en: 'Awarded to',         de: 'Verliehen an' },
  toAward:     { fr: 'À décerner',           en: 'To be awarded',      de: 'Zu verleihen' },
  noSessionScope: {
    fr: 'Toutes sessions',
    en: 'All sessions',
    de: 'Alle Sessions',
  },
};

// ── Form (création / édition) ───────────────────────────────────────────────
export const PRIZE_FORM = {
  // Titres
  createTitle:   { fr: 'Créer un prix',      en: 'Create a prize',     de: 'Preis erstellen' },
  editTitle:     { fr: 'Éditer le prix',     en: 'Edit the prize',     de: 'Preis bearbeiten' },

  // Champs
  nameLabel:     { fr: 'Nom du prix',        en: 'Prize name',         de: 'Preisname' },
  namePlaceholder: {
    fr: 'Prix Spécial Foodtech, Coup de Cœur Jury Berlin…',
    en: 'Foodtech Special Prize, Berlin Jury Pick…',
    de: 'Sonderpreis Foodtech, Jury-Pick Berlin…',
  },
  amountLabel:   { fr: 'Montant',            en: 'Amount',             de: 'Betrag' },
  amountPlaceholder: { fr: '5000',           en: '5000',               de: '5000' },
  currencyLabel: { fr: 'Devise',             en: 'Currency',           de: 'Währung' },
  kindLabel:     { fr: 'Type de prix',       en: 'Prize kind',         de: 'Preisart' },
  kindGeneral:   { fr: 'Grand prix',         en: 'Grand prize',        de: 'Hauptpreis' },
  kindSpecial:   { fr: 'Prix spécial',       en: 'Special prize',      de: 'Sonderpreis' },
  kindHintCompetition: {
    fr: 'Grand prix = remis lors de la grande finale. Prix spécial = remis lors d’une session ou hors finale.',
    en: 'Grand prize = awarded at the federated finale. Special prize = awarded at a session or outside the finale.',
    de: 'Hauptpreis = wird beim föderierten Finale verliehen. Sonderpreis = bei einer Session oder außerhalb des Finales.',
  },
  kindHintClub: {
    fr: 'Un club ne peut définir que des prix spéciaux. Le grand prix reste du ressort de la compétition.',
    en: 'A club can only define special prizes. The grand prize remains a competition-level matter.',
    de: 'Ein Club kann nur Sonderpreise definieren. Der Hauptpreis bleibt eine Sache des Wettbewerbs.',
  },
  juryTypeLabel: { fr: 'Type de jury',       en: 'Jury type',          de: 'Jury-Art' },
  juryRegular:   { fr: 'Jury régulier',      en: 'Regular jury',       de: 'Reguläre Jury' },
  jurySpecial:   { fr: 'Jury spécial',       en: 'Special jury',       de: 'Sonderjury' },
  juryHint: {
    fr: 'Régulier = le jury constitué de la session. Spécial = jury distinct (partenaires, fondateurs…).',
    en: 'Regular = the session’s standing jury. Special = a distinct jury (partners, founders…).',
    de: 'Regulär = die reguläre Jury der Session. Sonder = eine separate Jury (Partner, Gründer…).',
  },
  sessionLabel:  { fr: 'Session associée',   en: 'Associated session', de: 'Verknüpfte Session' },
  sessionPlaceholder: {
    fr: 'Aucune session précise',
    en: 'No specific session',
    de: 'Keine bestimmte Session',
  },
  sessionHint: {
    fr: 'Facultatif : un prix peut être rattaché à une session thématique précise ou rester au niveau de l’édition.',
    en: 'Optional: a prize can be tied to a specific thematic session or stay at the edition level.',
    de: 'Optional: Ein Preis kann an eine bestimmte Themen-Session gebunden sein oder auf Editionsebene bleiben.',
  },
  descriptionLabel: { fr: 'Description',     en: 'Description',        de: 'Beschreibung' },
  descriptionPlaceholder: {
    fr: 'Prix offert par les partenaires de Paris, doté par…',
    en: 'Prize sponsored by the Paris partners, endowed by…',
    de: 'Preis gestiftet von den Pariser Partnern, ausgeschrieben von…',
  },

  // Erreurs
  errNameTooShort: {
    fr: 'Le nom du prix doit contenir au moins 2 caractères.',
    en: 'Prize name must be at least 2 characters long.',
    de: 'Der Preisname muss mindestens 2 Zeichen lang sein.',
  },
  errAmountInvalid: {
    fr: 'Le montant doit être un nombre positif (ou zéro).',
    en: 'Amount must be a positive number (or zero).',
    de: 'Der Betrag muss eine positive Zahl (oder Null) sein.',
  },
  // Feedback
  prizeCreated: { fr: 'Prix créé.',         en: 'Prize created.',     de: 'Preis erstellt.' },
  prizeSaved:   { fr: 'Prix enregistré.',   en: 'Prize saved.',       de: 'Preis gespeichert.' },
  prizeDeleted: { fr: 'Prix supprimé.',     en: 'Prize deleted.',     de: 'Preis gelöscht.' },
};

// ── Modale de remise (award) ────────────────────────────────────────────────
export const AWARD_MODAL = {
  title: {
    fr: 'Décerner ce prix',
    en: 'Award this prize',
    de: 'Diesen Preis verleihen',
  },
  lede: {
    fr: 'Sélectionnez la startup lauréate. La remise sera enregistrée avec date et auteur ; le palmarès public sera mis à jour.',
    en: 'Pick the laureate startup. The award is logged with date and author; the public roll will be updated.',
    de: 'Wählen Sie das ausgezeichnete Startup. Die Verleihung wird mit Datum und Autor protokolliert; die öffentliche Liste wird aktualisiert.',
  },
  startupLabel: {
    fr: 'Startup lauréate',
    en: 'Laureate startup',
    de: 'Ausgezeichnetes Startup',
  },
  startupPlaceholder: {
    fr: 'Sélectionnez une startup',
    en: 'Pick a startup',
    de: 'Startup auswählen',
  },
  confirm:    { fr: 'Décerner',              en: 'Award',              de: 'Verleihen' },
  awarding:   { fr: 'Remise en cours…',      en: 'Awarding…',          de: 'Verleihen…' },
  awarded:    { fr: 'Prix décerné.',         en: 'Prize awarded.',     de: 'Preis verliehen.' },
  noStartups: {
    fr: 'Aucune candidature soumise pour cette compétition.',
    en: 'No application submitted for this competition yet.',
    de: 'Noch keine Bewerbung für diesen Wettbewerb.',
  },
};

// ── Confirm typé (suppression) ──────────────────────────────────────────────
export const PRIZE_DELETE = {
  title: {
    fr: 'Supprimer ce prix',
    en: 'Delete this prize',
    de: 'Diesen Preis löschen',
  },
  body: {
    fr: 'Cette action est définitive. Tapez SUPPRIMER pour confirmer.',
    en: 'This action is permanent. Type DELETE to confirm.',
    de: 'Diese Aktion ist endgültig. Geben Sie LÖSCHEN zur Bestätigung ein.',
  },
  typedPrompt: {
    fr: 'Tapez SUPPRIMER pour confirmer',
    en: 'Type DELETE to confirm',
    de: 'Geben Sie LÖSCHEN zur Bestätigung ein',
  },
  typedExpected: {
    fr: 'SUPPRIMER',
    en: 'DELETE',
    de: 'LÖSCHEN',
  },
  awardedBlocked: {
    fr: 'Impossible : ce prix a déjà été décerné. Annulez la remise avant de supprimer.',
    en: 'Cannot proceed: this prize has already been awarded. Undo the award first.',
    de: 'Nicht möglich: Dieser Preis wurde bereits verliehen. Heben Sie die Verleihung zuerst auf.',
  },
  confirm: { fr: 'Supprimer définitivement', en: 'Delete permanently', de: 'Endgültig löschen' },
};

// ── Catalogues ──────────────────────────────────────────────────────────────
export const CURRENCY_OPTIONS = [
  { code: 'EUR', symbol: '€' },
  { code: 'USD', symbol: '$' },
  { code: 'CHF', symbol: 'CHF' },
  { code: 'GBP', symbol: '£' },
];

export const KIND_VALUES = ['general', 'special'];
export const JURY_TYPE_VALUES = ['regular', 'special'];
