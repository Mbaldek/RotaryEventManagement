// Dictionnaires trilingues FR/EN/DE de l'éditeur de règles d'éligibilité (V2.5).
//
// Co-localisé avec EligibilityRulesEditor / catalog, comme les autres modules
// (candidature/i18n.js, admin/platform/i18n.js). Forme { fr, en, de } compatible
// useLang().t(dict). Couvre :
//   - copy de chrome (titre, sous-titre, behaviors, hints…),
//   - labels & descriptions des 7 critères du catalogue,
//   - libellés des pays (TagSelect) et documents (MultiCheckbox).
//
// NB labels critères : ce module est l'unique source de vérité UI ; le
// RULE_LABELS dans candidature/i18n.js reste pour les previews côté startup.

// ── Chrome de l'éditeur ──────────────────────────────────────────────────────
export const UI = {
  title: {
    fr: 'Règles d’éligibilité',
    en: 'Eligibility rules',
    de: 'Eignungsregeln',
  },
  intro: {
    fr: 'Activez les critères que la plateforme doit appliquer aux candidatures, puis paramétrez-les. « Exclu » écarte automatiquement le dossier ; « Flag » le marque pour le comité.',
    en: 'Toggle the criteria the platform should apply to applications, then configure each one. “Exclude” auto-rejects the file; “Flag” marks it for the committee.',
    de: 'Aktivieren Sie die Kriterien, die die Plattform auf Bewerbungen anwenden soll, und konfigurieren Sie sie. „Ausschluss“ lehnt das Dossier automatisch ab; „Flag“ markiert es für das Komitee.',
  },
  active: { fr: 'Actif', en: 'Active', de: 'Aktiv' },
  inactive: { fr: 'Désactivé', en: 'Off', de: 'Aus' },
  enable: { fr: 'Activer', en: 'Enable', de: 'Aktivieren' },
  disable: { fr: 'Désactiver', en: 'Disable', de: 'Deaktivieren' },
  behaviorLabel: { fr: 'Comportement', en: 'Behavior', de: 'Verhalten' },
  behaviorExclu: { fr: 'Exclu (bloquant)', en: 'Exclude (blocking)', de: 'Ausschluss (sperrend)' },
  behaviorFlag: { fr: 'Flag (avertissement)', en: 'Flag (warning)', de: 'Flag (Hinweis)' },
  advancedMode: { fr: 'Mode avancé (JSON)', en: 'Advanced mode (JSON)', de: 'Erweiterter Modus (JSON)' },
  advancedHint: {
    fr: 'Aperçu JSON brut en lecture seule — utile pour vérification ou export.',
    en: 'Raw JSON preview, read-only — useful for verification or export.',
    de: 'Roher JSON-Vorschau, nur lesbar — nützlich zur Prüfung oder zum Export.',
  },
  paramsTitle: { fr: 'Paramètres', en: 'Parameters', de: 'Parameter' },
  noParams: { fr: 'Aucun paramètre — uniquement actif/inactif.', en: 'No parameters — on/off only.', de: 'Keine Parameter — nur an/aus.' },
};

// ── Catalogue : labels + descriptions courtes par critère ────────────────────
export const CRITERIA = {
  country: {
    label: { fr: 'Pays autorisés', en: 'Allowed countries', de: 'Zugelassene Länder' },
    desc: {
      fr: 'Liste des pays admissibles. Une startup hors liste sera écartée ou signalée.',
      en: 'List of admissible countries. A startup outside this list is excluded or flagged.',
      de: 'Liste der zulässigen Länder. Startups außerhalb dieser Liste werden ausgeschlossen oder markiert.',
    },
    paramLabel: { fr: 'Pays admis', en: 'Admitted countries', de: 'Zugelassene Länder' },
    paramHelp: {
      fr: 'Ajoutez chaque pays autorisé.',
      en: 'Add each authorised country.',
      de: 'Fügen Sie jedes zugelassene Land hinzu.',
    },
    placeholder: { fr: 'Choisir un pays…', en: 'Pick a country…', de: 'Land wählen…' },
  },
  created_after: {
    label: { fr: 'Date de création minimum', en: 'Minimum founding date', de: 'Mindestgründungsdatum' },
    desc: {
      fr: 'Les startups créées avant cette date sont écartées ou signalées.',
      en: 'Startups founded before this date are excluded or flagged.',
      de: 'Vor diesem Datum gegründete Startups werden ausgeschlossen oder markiert.',
    },
    paramLabel: { fr: 'Seuil de date', en: 'Date threshold', de: 'Datumsschwelle' },
    paramHelp: {
      fr: 'Le règlement RSA actuel exige une création postérieure au 1er janvier 2020.',
      en: 'The current RSA rules require a founding date after 1 January 2020.',
      de: 'Das aktuelle RSA-Reglement verlangt ein Gründungsdatum nach dem 1. Januar 2020.',
    },
  },
  revenue_max: {
    label: { fr: 'Chiffre d’affaires maximum', en: 'Maximum revenue', de: 'Maximaler Umsatz' },
    desc: {
      fr: 'Plafond annuel de CA (en €). Au-delà, la candidature est signalée ou écartée.',
      en: 'Annual revenue cap (in €). Above this, the application is flagged or excluded.',
      de: 'Jährliche Umsatzobergrenze (in €). Darüber wird die Bewerbung markiert oder ausgeschlossen.',
    },
    paramLabel: { fr: 'Seuil de CA (€)', en: 'Revenue threshold (€)', de: 'Umsatzschwelle (€)' },
    paramHelp: {
      fr: 'Seuil actuel du règlement : 500 000 €.',
      en: 'Current rulebook threshold: €500,000.',
      de: 'Aktuelle Schwelle im Reglement: 500.000 €.',
    },
  },
  raised_max: {
    label: { fr: 'Levée de fonds maximum', en: 'Maximum funds raised', de: 'Maximales eingeworbenes Kapital' },
    desc: {
      fr: 'Plafond du capital levé (en €). Au-delà, la candidature est signalée ou écartée.',
      en: 'Cap on funds raised (in €). Above this, the application is flagged or excluded.',
      de: 'Obergrenze für eingeworbenes Kapital (in €). Darüber wird die Bewerbung markiert oder ausgeschlossen.',
    },
    paramLabel: { fr: 'Seuil de levée (€)', en: 'Funds raised threshold (€)', de: 'Kapitalschwelle (€)' },
    paramHelp: {
      fr: 'Seuil actuel du règlement : 800 000 €.',
      en: 'Current rulebook threshold: €800,000.',
      de: 'Aktuelle Schwelle im Reglement: 800.000 €.',
    },
  },
  registration: {
    label: { fr: 'Immatriculation requise', en: 'Registration required', de: 'Registrierung erforderlich' },
    desc: {
      fr: 'La startup doit fournir un numéro d’immatriculation officiel (SIREN, HRB…).',
      en: 'The startup must provide an official registration number (SIREN, HRB…).',
      de: 'Das Startup muss eine offizielle Registernummer (SIREN, HRB…) angeben.',
    },
  },
  founders_majority: {
    label: { fr: 'Fondateurs majoritaires', en: 'Founders hold majority', de: 'Gründermehrheit' },
    desc: {
      fr: 'Les fondateurs doivent détenir une majorité du capital de la société.',
      en: 'Founders must collectively hold a majority of the company’s equity.',
      de: 'Die Gründer müssen gemeinsam die Kapitalmehrheit halten.',
    },
  },
  docs_required: {
    label: { fr: 'Documents requis', en: 'Required documents', de: 'Erforderliche Dokumente' },
    desc: {
      fr: 'Cochez les pièces obligatoires pour qu’une candidature soit complète.',
      en: 'Tick the files that must be provided for an application to be complete.',
      de: 'Wählen Sie die Dokumente, die für eine vollständige Bewerbung erforderlich sind.',
    },
    paramLabel: { fr: 'Pièces obligatoires', en: 'Required files', de: 'Pflichtdokumente' },
  },
};

// ── Pays disponibles pour TagSelect (ISO 3166 alpha-2) ───────────────────────
// Couvre le périmètre RSA actuel (FR/DE) + voisinage européen + Amérique du Nord.
// TODO refine DE copy si certains noms officiels doivent être ajustés.
export const COUNTRIES = [
  { value: 'FR', label: { fr: 'France', en: 'France', de: 'Frankreich' } },
  { value: 'DE', label: { fr: 'Allemagne', en: 'Germany', de: 'Deutschland' } },
  { value: 'BE', label: { fr: 'Belgique', en: 'Belgium', de: 'Belgien' } },
  { value: 'CH', label: { fr: 'Suisse', en: 'Switzerland', de: 'Schweiz' } },
  { value: 'LU', label: { fr: 'Luxembourg', en: 'Luxembourg', de: 'Luxemburg' } },
  { value: 'IT', label: { fr: 'Italie', en: 'Italy', de: 'Italien' } },
  { value: 'ES', label: { fr: 'Espagne', en: 'Spain', de: 'Spanien' } },
  { value: 'UK', label: { fr: 'Royaume-Uni', en: 'United Kingdom', de: 'Vereinigtes Königreich' } },
  { value: 'NL', label: { fr: 'Pays-Bas', en: 'Netherlands', de: 'Niederlande' } },
  { value: 'PT', label: { fr: 'Portugal', en: 'Portugal', de: 'Portugal' } },
  { value: 'US', label: { fr: 'États-Unis', en: 'United States', de: 'Vereinigte Staaten' } },
  { value: 'CA', label: { fr: 'Canada', en: 'Canada', de: 'Kanada' } },
];

// ── Documents requis (mêmes clés que rsa_evaluate_eligibility) ───────────────
export const DOCS = [
  { value: 'pitch_deck', label: { fr: 'Pitch deck', en: 'Pitch deck', de: 'Pitch-Deck' } },
  { value: 'exec_summary', label: { fr: 'Executive summary', en: 'Executive summary', de: 'Executive Summary' } },
  {
    value: 'financials',
    label: { fr: 'Liasse financière', en: 'Financial statements', de: 'Finanzunterlagen' },
  },
  { value: 'video', label: { fr: 'Vidéo de présentation', en: 'Pitch video', de: 'Pitch-Video' } },
];
