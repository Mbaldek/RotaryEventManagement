// i18n trilingue (FR/EN/DE) du module Extensions V3.0.
//
// Forme { fr, en, de } compatible useLang().t(dict) (cf. @/lib/platform/i18n).
// Style imité de @/components/rsa/admin/platform/master/i18n.js (registre
// institutionnel, jamais d'emoji, copie courte et précise). Les composants
// de @/components/rsa/extensions/* ne contiennent AUCUNE chaîne hardcodée.

// ── UI commune ─────────────────────────────────────────────────────────────
export const EXT_UI = {
  // Section
  sectionTitleMaster: {
    fr: 'Extensions plateforme',
    en: 'Platform extensions',
    de: 'Plattform-Erweiterungen',
  },
  sectionTitleClub: {
    fr: 'Extensions du club',
    en: 'Club extensions',
    de: 'Club-Erweiterungen',
  },
  sectionTitleEdition: {
    fr: 'Extensions de la compétition',
    en: 'Competition extensions',
    de: 'Wettbewerbs-Erweiterungen',
  },
  sectionHintMaster: {
    fr: 'Étendez la plateforme avec vos propres steps de funnel, onglets cockpit, templates email ou webhooks. Géré par le master admin.',
    en: 'Extend the platform with your own funnel steps, cockpit tabs, email templates or webhooks. Managed by the master admin.',
    de: 'Erweitern Sie die Plattform mit eigenen Funnel-Schritten, Cockpit-Tabs, E-Mail-Vorlagen oder Webhooks. Vom Master-Admin verwaltet.',
  },
  sectionHintClub: {
    fr: 'Personnalisez l’expérience de votre club avec des extensions sur mesure.',
    en: 'Customize your club’s experience with bespoke extensions.',
    de: 'Passen Sie das Erlebnis Ihres Clubs mit maßgeschneiderten Erweiterungen an.',
  },

  // Actions
  newExtension:    { fr: 'Nouvelle extension',   en: 'New extension',  de: 'Neue Erweiterung' },
  edit:            { fr: 'Éditer',               en: 'Edit',           de: 'Bearbeiten' },
  remove:          { fr: 'Supprimer',            en: 'Delete',         de: 'Löschen' },
  cancel:          { fr: 'Annuler',              en: 'Cancel',         de: 'Abbrechen' },
  save:            { fr: 'Enregistrer',          en: 'Save',           de: 'Speichern' },
  saving:          { fr: 'Enregistrement…',      en: 'Saving…',        de: 'Speichern…' },
  create:          { fr: 'Créer',                en: 'Create',         de: 'Erstellen' },
  creating:        { fr: 'Création…',            en: 'Creating…',      de: 'Erstellen…' },
  close:           { fr: 'Fermer',               en: 'Close',          de: 'Schließen' },
  loading:         { fr: 'Chargement…',          en: 'Loading…',       de: 'Lädt…' },

  // States
  empty: {
    fr: 'Aucune extension définie pour l’instant. Créez la première pour étendre la plateforme.',
    en: 'No extension defined yet. Create the first one to extend the platform.',
    de: 'Noch keine Erweiterung definiert. Erstellen Sie die erste, um die Plattform zu erweitern.',
  },
  active:          { fr: 'Active',               en: 'Active',         de: 'Aktiv' },
  inactive:        { fr: 'Inactive',             en: 'Inactive',       de: 'Inaktiv' },
  enable:          { fr: 'Activer',              en: 'Enable',         de: 'Aktivieren' },
  disable:         { fr: 'Désactiver',           en: 'Disable',        de: 'Deaktivieren' },

  // Filtres
  filterAll:       { fr: 'Toutes',               en: 'All',            de: 'Alle' },
  filterByKind:    { fr: 'Filtrer par type',     en: 'Filter by kind', de: 'Nach Art filtern' },

  // Confirm suppression
  removeConfirmTitle: {
    fr: 'Supprimer cette extension',
    en: 'Delete this extension',
    de: 'Diese Erweiterung löschen',
  },
  removeConfirmBody: {
    fr: 'Cette action est définitive. L’extension sera retirée de la plateforme. Confirmer ?',
    en: 'This action is permanent. The extension will be removed from the platform. Confirm?',
    de: 'Diese Aktion ist endgültig. Die Erweiterung wird von der Plattform entfernt. Bestätigen?',
  },

  // Placeholder slot rendering (V1 — vrai render JSON-schema en V4)
  slotPlaceholder: {
    fr: 'Extension',
    en: 'Extension',
    de: 'Erweiterung',
  },
  slotPlaceholderHint: {
    fr: 'Rendu réel disponible en V4 (marketplace).',
    en: 'Real rendering available in V4 (marketplace).',
    de: 'Echtes Rendering ab V4 (Marktplatz) verfügbar.',
  },
};

// ── Kind labels (badges + sélecteurs) ───────────────────────────────────────
export const EXT_KIND_LABELS = {
  funnel_step: {
    fr: 'Step de funnel',
    en: 'Funnel step',
    de: 'Funnel-Schritt',
  },
  cockpit_tab: {
    fr: 'Onglet cockpit',
    en: 'Cockpit tab',
    de: 'Cockpit-Tab',
  },
  email_template: {
    fr: 'Template email',
    en: 'Email template',
    de: 'E-Mail-Vorlage',
  },
  webhook: {
    fr: 'Webhook',
    en: 'Webhook',
    de: 'Webhook',
  },
};

// ── Scope labels (badges) ───────────────────────────────────────────────────
export const EXT_SCOPE_LABELS = {
  master:  { fr: 'Plateforme', en: 'Platform',    de: 'Plattform' },
  club:    { fr: 'Club',       en: 'Club',        de: 'Club' },
  edition: { fr: 'Compétition', en: 'Competition', de: 'Wettbewerb' },
};

// ── Form (création / édition) ───────────────────────────────────────────────
export const EXT_FORM = {
  // Eyebrows + titles
  eyebrowCreate: {
    fr: 'nouvelle extension',
    en: 'new extension',
    de: 'neue Erweiterung',
  },
  eyebrowEdit: {
    fr: 'éditer l’extension',
    en: 'edit extension',
    de: 'Erweiterung bearbeiten',
  },
  titleCreate: {
    fr: 'Créer une extension',
    en: 'Create an extension',
    de: 'Erweiterung erstellen',
  },
  titleEdit: {
    fr: 'Éditer l’extension',
    en: 'Edit the extension',
    de: 'Erweiterung bearbeiten',
  },

  // Tabs
  tabIdentity: { fr: 'Identité', en: 'Identity', de: 'Identität' },
  tabConfig:   { fr: 'Configuration', en: 'Configuration', de: 'Konfiguration' },
  tabAdvanced: { fr: 'Avancé', en: 'Advanced', de: 'Erweitert' },

  // Identity
  nameLabel:   { fr: 'Nom de l’extension', en: 'Extension name', de: 'Name der Erweiterung' },
  namePlaceholder: {
    fr: 'ex. Step Pitch deck enrichi',
    en: 'e.g. Enhanced pitch deck step',
    de: 'z. B. Erweiterter Pitch-Deck-Schritt',
  },
  descriptionLabel: { fr: 'Description', en: 'Description', de: 'Beschreibung' },
  descriptionPlaceholder: {
    fr: 'À quoi sert cette extension, pour qui, dans quel contexte.',
    en: 'What this extension does, for whom, in what context.',
    de: 'Wozu dient diese Erweiterung, für wen, in welchem Kontext.',
  },
  kindLabel:    { fr: 'Type', en: 'Kind', de: 'Art' },
  kindHint: {
    fr: 'Détermine où l’extension sera rendue (funnel, cockpit, email, webhook).',
    en: 'Determines where the extension will be rendered (funnel, cockpit, email, webhook).',
    de: 'Legt fest, wo die Erweiterung gerendert wird (Funnel, Cockpit, E-Mail, Webhook).',
  },
  activeLabel:  { fr: 'Active', en: 'Active', de: 'Aktiv' },
  activeHint: {
    fr: 'Quand inactive, l’extension n’est pas rendue dans la plateforme.',
    en: 'When inactive, the extension is not rendered in the platform.',
    de: 'Wenn inaktiv, wird die Erweiterung nicht in der Plattform gerendert.',
  },

  // Config (JSON)
  configLabel:  { fr: 'Configuration (JSON)', en: 'Configuration (JSON)', de: 'Konfiguration (JSON)' },
  configHint: {
    fr: 'JSON libre. Le schéma exact dépend du type d’extension — documenté en V4.',
    en: 'Free-form JSON. The exact schema depends on the extension kind — documented in V4.',
    de: 'Freies JSON. Das genaue Schema hängt von der Art der Erweiterung ab — in V4 dokumentiert.',
  },
  configInvalid: { fr: 'JSON invalide.', en: 'Invalid JSON.', de: 'Ungültiges JSON.' },
  configPlaceholder: {
    fr: '{\n  "key": "value"\n}',
    en: '{\n  "key": "value"\n}',
    de: '{\n  "key": "value"\n}',
  },

  // Advanced
  positionLabel: { fr: 'Position', en: 'Position', de: 'Position' },
  positionHint: {
    fr: 'Ordre d’affichage (plus petit = plus haut). Par défaut : 0.',
    en: 'Display order (lower = higher). Defaults to 0.',
    de: 'Anzeigereihenfolge (niedriger = höher). Standard: 0.',
  },
  scopeLabel: { fr: 'Scope', en: 'Scope', de: 'Bereich' },
  scopeHint: {
    fr: 'Le scope (plateforme / club / compétition) est immuable après création.',
    en: 'The scope (platform / club / competition) is immutable after creation.',
    de: 'Der Scope (Plattform / Club / Wettbewerb) ist nach der Erstellung unveränderlich.',
  },

  // Errors
  errNameTooShort: {
    fr: 'Le nom doit contenir au moins 2 caractères.',
    en: 'Name must be at least 2 characters long.',
    de: 'Der Name muss mindestens 2 Zeichen lang sein.',
  },
};
