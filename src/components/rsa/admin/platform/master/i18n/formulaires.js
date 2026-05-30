// ── Équipe B (FORMULAIRES) — Custom fields builder ──────────────────────────
// Tab "Formulaires" dans CompetitionEditView. Permet à l'admin compétition
// d'ajouter des champs custom au formulaire candidat startup et au formulaire
// candidature jury (le squelette obligatoire reste). Builder split 50/50 avec
// preview live à droite. Modale 4-onglets pour éditer un champ.
export const FORMULAIRES = {
  // Header section editorial -------------------------------------------------
  sectionEyebrow: {
    fr: 'Formulaires personnalisés',
    en: 'Custom forms',
    de: 'Benutzerdefinierte Formulare',
  },
  sectionTitle: {
    fr: 'Champs custom par compétition',
    en: 'Custom fields per competition',
    de: 'Custom-Felder pro Wettbewerb',
  },
  sectionIntro: {
    fr: 'Ajoute des champs spécifiques à cette compétition pour les formulaires candidat startup et jury. Le squelette obligatoire reste, tu rajoutes par-dessus.',
    en: 'Add competition-specific fields to the startup application form and the jury candidacy form. The mandatory skeleton stays in place — you add on top.',
    de: 'Fügen Sie wettbewerbsspezifische Felder zum Startup-Bewerbungsformular und zum Jury-Bewerbungsformular hinzu. Das Pflichtgerüst bleibt bestehen, Sie ergänzen es nur.',
  },
  // Sub-tabs ----------------------------------------------------------------
  subTabCandidate: {
    fr: 'Formulaire candidat startup',
    en: 'Startup application form',
    de: 'Startup-Bewerbungsformular',
  },
  subTabJury: {
    fr: 'Formulaire candidature jury',
    en: 'Jury candidacy form',
    de: 'Jury-Bewerbungsformular',
  },
  // {count} sera remplacé côté composant.
  subTabCounts: {
    fr: '{count} champs',
    en: '{count} fields',
    de: '{count} Felder',
  },
  subTabCountOne: {
    fr: '1 champ',
    en: '1 field',
    de: '1 Feld',
  },
  // Builder list ------------------------------------------------------------
  // {count} = nb champs custom dans la liste.
  listHeading: {
    fr: '{count} champs custom',
    en: '{count} custom fields',
    de: '{count} Custom-Felder',
  },
  listHeadingOne: {
    fr: '1 champ custom',
    en: '1 custom field',
    de: '1 Custom-Feld',
  },
  addField: {
    fr: '+ Ajouter un champ',
    en: '+ Add a field',
    de: '+ Feld hinzufügen',
  },
  editField: {
    fr: 'Éditer',
    en: 'Edit',
    de: 'Bearbeiten',
  },
  duplicateField: {
    fr: 'Dupliquer',
    en: 'Duplicate',
    de: 'Duplizieren',
  },
  deleteField: {
    fr: 'Supprimer',
    en: 'Delete',
    de: 'Löschen',
  },
  deleteConfirm: {
    fr: 'Supprimer ce champ custom ? Les réponses déjà collectées resteront en base mais ne seront plus collectées.',
    en: 'Delete this custom field? Existing responses will remain in the database but new ones will no longer be collected.',
    de: 'Dieses Custom-Feld löschen? Bereits erfasste Antworten bleiben in der Datenbank, neue werden nicht mehr erhoben.',
  },
  emptyState: {
    fr: 'Aucun champ custom — le formulaire utilise uniquement le squelette obligatoire.',
    en: 'No custom fields yet — the form uses only the mandatory skeleton.',
    de: 'Noch keine Custom-Felder — das Formular verwendet nur das Pflichtgerüst.',
  },
  dragHandle: {
    fr: 'Réordonner',
    en: 'Reorder',
    de: 'Neu anordnen',
  },
  moveUp: {
    fr: 'Monter',
    en: 'Move up',
    de: 'Nach oben',
  },
  moveDown: {
    fr: 'Descendre',
    en: 'Move down',
    de: 'Nach unten',
  },
  requiredDot: {
    fr: 'Obligatoire',
    en: 'Required',
    de: 'Pflichtfeld',
  },
  // Preview pane -------------------------------------------------------------
  previewEyebrow: {
    fr: 'Aperçu du formulaire public',
    en: 'Public form preview',
    de: 'Vorschau des öffentlichen Formulars',
  },
  previewEmptyState: {
    fr: 'Ajoute au moins un champ pour voir l’aperçu du formulaire public.',
    en: 'Add at least one field to preview the public form.',
    de: 'Fügen Sie mindestens ein Feld hinzu, um die Vorschau des öffentlichen Formulars zu sehen.',
  },
  // Mobile accordion --------------------------------------------------------
  previewToggleOpen: {
    fr: 'Voir l’aperçu',
    en: 'Show preview',
    de: 'Vorschau anzeigen',
  },
  previewToggleClose: {
    fr: 'Masquer l’aperçu',
    en: 'Hide preview',
    de: 'Vorschau ausblenden',
  },
};

// ── Équipe B (CUSTOM FIELD MODAL) — éditeur de champ custom ─────────────────
// Modale 4-onglets via FunnelEditorModal. Onglets : Identité / Helpers /
// Options (si select/multiselect/checkbox) / Validation.
export const CUSTOM_FIELD_MODAL = {
  // Title / eyebrow ---------------------------------------------------------
  eyebrowNew: {
    fr: 'Nouveau champ',
    en: 'New field',
    de: 'Neues Feld',
  },
  eyebrowEdit: {
    fr: 'Édition du champ',
    en: 'Edit field',
    de: 'Feld bearbeiten',
  },
  titleNew: {
    fr: 'Configurer un champ custom',
    en: 'Configure a custom field',
    de: 'Custom-Feld konfigurieren',
  },
  titleEdit: {
    fr: 'Configurer un champ custom',
    en: 'Configure a custom field',
    de: 'Custom-Feld konfigurieren',
  },
  // Tabs --------------------------------------------------------------------
  tabIdentity: {
    fr: 'Identité',
    en: 'Identity',
    de: 'Identität',
  },
  tabHelpers: {
    fr: 'Aides',
    en: 'Helpers',
    de: 'Hilfetexte',
  },
  tabOptions: {
    fr: 'Options',
    en: 'Options',
    de: 'Optionen',
  },
  tabValidation: {
    fr: 'Validation',
    en: 'Validation',
    de: 'Validierung',
  },
  // Identity tab fields -----------------------------------------------------
  fieldKey: {
    fr: 'Clé technique',
    en: 'Technical key',
    de: 'Technischer Schlüssel',
  },
  fieldKeyHelper: {
    fr: 'lowercase + underscore uniquement. Générée automatiquement à partir du label FR. Immuable côté base.',
    en: 'Lowercase + underscore only. Auto-generated from the FR label. Immutable in the database.',
    de: 'Nur Kleinbuchstaben und Unterstriche. Wird automatisch aus dem FR-Label erzeugt. Datenbankseitig unveränderlich.',
  },
  fieldKeyInvalid: {
    fr: 'La clé doit commencer par une lettre et ne contenir que des minuscules, chiffres et underscores.',
    en: 'The key must start with a letter and contain only lowercase letters, digits and underscores.',
    de: 'Der Schlüssel muss mit einem Buchstaben beginnen und darf nur Kleinbuchstaben, Ziffern und Unterstriche enthalten.',
  },
  fieldLabel: {
    fr: 'Label',
    en: 'Label',
    de: 'Bezeichnung',
  },
  fieldLabelFr: {
    fr: 'Label (FR)',
    en: 'Label (FR)',
    de: 'Bezeichnung (FR)',
  },
  fieldLabelEn: {
    fr: 'Label (EN)',
    en: 'Label (EN)',
    de: 'Bezeichnung (EN)',
  },
  fieldLabelDe: {
    fr: 'Label (DE)',
    en: 'Label (DE)',
    de: 'Bezeichnung (DE)',
  },
  fieldType: {
    fr: 'Type de champ',
    en: 'Field type',
    de: 'Feldtyp',
  },
  fieldRequired: {
    fr: 'Champ obligatoire',
    en: 'Required field',
    de: 'Pflichtfeld',
  },
  fieldRequiredHint: {
    fr: 'Le candidat ne pourra pas soumettre le formulaire sans renseigner ce champ.',
    en: 'The applicant cannot submit the form without filling this field.',
    de: 'Der/die Bewerber·in kann das Formular ohne dieses Feld nicht absenden.',
  },
  fieldPosition: {
    fr: 'Position dans le formulaire',
    en: 'Position in the form',
    de: 'Position im Formular',
  },
  fieldPositionHint: {
    fr: 'Ordre d’affichage (1 = en haut). Auto-incrémenté à la création.',
    en: 'Display order (1 = top). Auto-incremented on creation.',
    de: 'Anzeigereihenfolge (1 = oben). Bei Erstellung automatisch hochgezählt.',
  },
  // Helpers tab -------------------------------------------------------------
  fieldPlaceholder: {
    fr: 'Placeholder',
    en: 'Placeholder',
    de: 'Platzhalter',
  },
  fieldPlaceholderFr: {
    fr: 'Placeholder (FR)',
    en: 'Placeholder (FR)',
    de: 'Platzhalter (FR)',
  },
  fieldPlaceholderEn: {
    fr: 'Placeholder (EN)',
    en: 'Placeholder (EN)',
    de: 'Platzhalter (EN)',
  },
  fieldPlaceholderDe: {
    fr: 'Placeholder (DE)',
    en: 'Placeholder (DE)',
    de: 'Platzhalter (DE)',
  },
  fieldHelpText: {
    fr: 'Texte d’aide',
    en: 'Help text',
    de: 'Hilfetext',
  },
  fieldHelpTextFr: {
    fr: 'Aide (FR)',
    en: 'Help (FR)',
    de: 'Hilfe (FR)',
  },
  fieldHelpTextEn: {
    fr: 'Aide (EN)',
    en: 'Help (EN)',
    de: 'Hilfe (EN)',
  },
  fieldHelpTextDe: {
    fr: 'Aide (DE)',
    en: 'Help (DE)',
    de: 'Hilfe (DE)',
  },
  fieldHelpTextHint: {
    fr: '~150 caractères max. Affiché sous le champ pour expliquer ce qu’on attend.',
    en: '~150 chars max. Shown below the field to explain what is expected.',
    de: 'Max. ca. 150 Zeichen. Erscheint unter dem Feld, um die Erwartung zu erläutern.',
  },
  // Options tab -------------------------------------------------------------
  fieldOptions: {
    fr: 'Options disponibles',
    en: 'Available options',
    de: 'Verfügbare Optionen',
  },
  fieldOptionsHint: {
    fr: 'Une option = une valeur stockée + un label affiché. Réordonne avec les flèches.',
    en: 'One option = one stored value + one displayed label. Reorder with the arrows.',
    de: 'Eine Option = ein gespeicherter Wert + eine angezeigte Bezeichnung. Mit den Pfeilen neu anordnen.',
  },
  fieldOptionsNotApplicable: {
    fr: 'Les options ne s’appliquent qu’aux types Liste, Liste multiple et Cases à cocher.',
    en: 'Options only apply to Select, Multiselect and Checkbox types.',
    de: 'Optionen gelten nur für die Typen Auswahlliste, Mehrfachauswahl und Kontrollkästchen.',
  },
  optionValue: {
    fr: 'Valeur',
    en: 'Value',
    de: 'Wert',
  },
  optionLabelFr: {
    fr: 'Label (FR)',
    en: 'Label (FR)',
    de: 'Bezeichnung (FR)',
  },
  optionLabelEn: {
    fr: 'Label (EN)',
    en: 'Label (EN)',
    de: 'Bezeichnung (EN)',
  },
  optionLabelDe: {
    fr: 'Label (DE)',
    en: 'Label (DE)',
    de: 'Bezeichnung (DE)',
  },
  addOption: {
    fr: '+ Ajouter une option',
    en: '+ Add an option',
    de: '+ Option hinzufügen',
  },
  removeOption: {
    fr: 'Supprimer',
    en: 'Remove',
    de: 'Entfernen',
  },
  optionMoveUp: {
    fr: 'Monter',
    en: 'Move up',
    de: 'Nach oben',
  },
  optionMoveDown: {
    fr: 'Descendre',
    en: 'Move down',
    de: 'Nach unten',
  },
  optionsEmpty: {
    fr: 'Aucune option — ajoutes-en au moins une.',
    en: 'No options yet — add at least one.',
    de: 'Noch keine Optionen — fügen Sie mindestens eine hinzu.',
  },
  // Validation tab ----------------------------------------------------------
  validationSectionIntro: {
    fr: 'Contraintes appliquées à la saisie côté formulaire public.',
    en: 'Constraints applied to user input on the public form.',
    de: 'Einschränkungen für die Eingabe im öffentlichen Formular.',
  },
  validationMinChars: {
    fr: 'Caractères min.',
    en: 'Min chars',
    de: 'Mindestzeichen',
  },
  validationMaxChars: {
    fr: 'Caractères max.',
    en: 'Max chars',
    de: 'Maximalzeichen',
  },
  validationPattern: {
    fr: 'Expression régulière',
    en: 'Regex pattern',
    de: 'Regex-Muster',
  },
  validationPatternHint: {
    fr: 'Optionnel. Ex. ^[A-Z0-9-]+$ pour un code interne.',
    en: 'Optional. E.g. ^[A-Z0-9-]+$ for an internal code.',
    de: 'Optional. Z. B. ^[A-Z0-9-]+$ für einen internen Code.',
  },
  validationMin: {
    fr: 'Valeur min.',
    en: 'Min value',
    de: 'Mindestwert',
  },
  validationMax: {
    fr: 'Valeur max.',
    en: 'Max value',
    de: 'Höchstwert',
  },
  validationStep: {
    fr: 'Pas',
    en: 'Step',
    de: 'Schritt',
  },
  validationMinItems: {
    fr: 'Choix min.',
    en: 'Min items',
    de: 'Mindestauswahl',
  },
  validationMaxItems: {
    fr: 'Choix max.',
    en: 'Max items',
    de: 'Höchstauswahl',
  },
  validationMaxSize: {
    fr: 'Taille max. (Mo)',
    en: 'Max size (MB)',
    de: 'Max. Größe (MB)',
  },
  validationAcceptedMimes: {
    fr: 'Types MIME acceptés',
    en: 'Accepted MIME types',
    de: 'Zulässige MIME-Typen',
  },
  validationAcceptedMimesHint: {
    fr: 'CSV. Ex. application/pdf,image/png,image/jpeg',
    en: 'CSV. E.g. application/pdf,image/png,image/jpeg',
    de: 'CSV. Z. B. application/pdf,image/png,image/jpeg',
  },
  validationMinDate: {
    fr: 'Date min.',
    en: 'Min date',
    de: 'Mindestdatum',
  },
  validationMaxDate: {
    fr: 'Date max.',
    en: 'Max date',
    de: 'Höchstdatum',
  },
  validationNotApplicable: {
    fr: 'Aucune contrainte de validation pour ce type de champ.',
    en: 'No validation constraints for this field type.',
    de: 'Für diesen Feldtyp sind keine Validierungseinschränkungen verfügbar.',
  },
  // Footer actions ----------------------------------------------------------
  submitCreate: {
    fr: 'Ajouter le champ',
    en: 'Add field',
    de: 'Feld hinzufügen',
  },
  submitUpdate: {
    fr: 'Enregistrer',
    en: 'Save',
    de: 'Speichern',
  },
  cancel: {
    fr: 'Annuler',
    en: 'Cancel',
    de: 'Abbrechen',
  },
  errLabelRequired: {
    fr: 'Le label FR est obligatoire.',
    en: 'The FR label is required.',
    de: 'Die FR-Bezeichnung ist erforderlich.',
  },
  errOptionsRequired: {
    fr: 'Ajoute au moins une option pour ce type de champ.',
    en: 'Add at least one option for this field type.',
    de: 'Fügen Sie für diesen Feldtyp mindestens eine Option hinzu.',
  },
  errKeyDuplicate: {
    fr: 'Cette clé est déjà utilisée par un autre champ — choisis-en une autre.',
    en: 'This key is already used by another field — pick a different one.',
    de: 'Dieser Schlüssel wird bereits von einem anderen Feld verwendet — bitte einen anderen wählen.',
  },
};

// ── Équipe B — Field type catalog (i18n labels for the type Select) ─────────
export const CUSTOM_FIELD_TYPES = [
  { value: 'text',        fr: 'Texte court',         en: 'Short text',         de: 'Kurzer Text' },
  { value: 'textarea',    fr: 'Texte long',          en: 'Long text',          de: 'Langer Text' },
  { value: 'email',       fr: 'Email',               en: 'Email',              de: 'E-Mail' },
  { value: 'url',         fr: 'URL',                 en: 'URL',                de: 'URL' },
  { value: 'tel',         fr: 'Téléphone',           en: 'Phone',              de: 'Telefon' },
  { value: 'number',      fr: 'Nombre',              en: 'Number',             de: 'Zahl' },
  { value: 'select',      fr: 'Liste déroulante',    en: 'Select',             de: 'Auswahlliste' },
  { value: 'multiselect', fr: 'Liste multiple',      en: 'Multiselect',        de: 'Mehrfachauswahl' },
  { value: 'checkbox',    fr: 'Cases à cocher',      en: 'Checkbox',           de: 'Kontrollkästchen' },
  { value: 'date',        fr: 'Date',                en: 'Date',               de: 'Datum' },
  { value: 'file',        fr: 'Fichier',             en: 'File',               de: 'Datei' },
];

// Types qui nécessitent un onglet "Options".
export const CUSTOM_FIELD_TYPES_WITH_OPTIONS = ['select', 'multiselect', 'checkbox'];
