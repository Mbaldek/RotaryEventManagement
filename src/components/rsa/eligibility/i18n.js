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
    de: 'Teilnahmeregeln',
  },
  intro: {
    fr: 'Activez les critères que la plateforme doit appliquer aux candidatures, puis paramétrez-les. « Exclu » écarte automatiquement le dossier ; « Flag » le marque pour le comité.',
    en: 'Toggle the criteria the platform should apply to applications, then configure each one. “Exclude” auto-rejects the file; “Flag” marks it for the committee.',
    de: 'Aktivieren Sie die Kriterien, die die Plattform auf Bewerbungen anwenden soll, und konfigurieren Sie diese anschließend. „Ausschluss" weist das Dossier automatisch ab; „Flag" markiert es zur Prüfung durch das Komitee.',
  },
  active: { fr: 'Actif', en: 'Active', de: 'Aktiv' },
  inactive: { fr: 'Désactivé', en: 'Off', de: 'Deaktiviert' },
  enable: { fr: 'Activer', en: 'Enable', de: 'Aktivieren' },
  disable: { fr: 'Désactiver', en: 'Disable', de: 'Deaktivieren' },
  behaviorLabel: { fr: 'Comportement', en: 'Behavior', de: 'Verhalten' },
  behaviorExclu: { fr: 'Exclu (bloquant)', en: 'Exclude (blocking)', de: 'Ausschluss (sperrend)' },
  behaviorFlag: { fr: 'Flag (avertissement)', en: 'Flag (warning)', de: 'Flag (Hinweis)' },
  paramsTitle: { fr: 'Paramètres', en: 'Parameters', de: 'Parameter' },
  noParams: { fr: 'Aucun paramètre — uniquement actif/inactif.', en: 'No parameters — on/off only.', de: 'Keine Parameter — nur aktiv/deaktiviert.' },
};

// ── Catalogue : labels + descriptions courtes par critère ────────────────────
export const CRITERIA = {
  country: {
    label: { fr: 'Pays autorisés', en: 'Allowed countries', de: 'Zugelassene Länder' },
    desc: {
      fr: 'Liste des pays admissibles. Une startup hors liste sera écartée ou signalée.',
      en: 'List of admissible countries. A startup outside this list is excluded or flagged.',
      de: 'Liste der zulässigen Länder. Startups außerhalb der Liste werden ausgeschlossen oder zur Prüfung markiert.',
    },
    paramLabel: { fr: 'Pays admis', en: 'Admitted countries', de: 'Zugelassene Länder' },
    paramHelp: {
      fr: 'Ajoutez chaque pays autorisé.',
      en: 'Add each authorised country.',
      de: 'Fügen Sie jedes zugelassene Land hinzu.',
    },
    placeholder: { fr: 'Choisir un pays…', en: 'Pick a country…', de: 'Land auswählen…' },
  },
  created_after: {
    label: { fr: 'Date de création minimum', en: 'Minimum founding date', de: 'Mindestgründungsdatum' },
    desc: {
      fr: 'Les startups créées avant cette date sont écartées ou signalées.',
      en: 'Startups founded before this date are excluded or flagged.',
      de: 'Startups, die vor diesem Datum gegründet wurden, werden ausgeschlossen oder zur Prüfung markiert.',
    },
    paramLabel: { fr: 'Seuil de date', en: 'Date threshold', de: 'Stichtag' },
    paramHelp: {
      fr: 'Le règlement actuel exige une création postérieure au 1er janvier 2020.',
      en: 'The current rules require a founding date after 1 January 2020.',
      de: 'Das aktuelle Reglement setzt eine Gründung nach dem 1. Januar 2020 voraus.',
    },
  },
  revenue_max: {
    label: { fr: 'Chiffre d’affaires maximum', en: 'Maximum revenue', de: 'Maximaler Umsatz' },
    desc: {
      fr: 'Plafond annuel de CA (en €). Au-delà, la candidature est signalée ou écartée.',
      en: 'Annual revenue cap (in €). Above this, the application is flagged or excluded.',
      de: 'Jährliche Umsatzobergrenze (in €). Darüber wird die Bewerbung zur Prüfung markiert oder ausgeschlossen.',
    },
    paramLabel: { fr: 'Seuil de CA (€)', en: 'Revenue threshold (€)', de: 'Umsatzschwelle (€)' },
    paramHelp: {
      fr: 'Seuil actuel du règlement : 500 000 €.',
      en: 'Current rulebook threshold: €500,000.',
      de: 'Aktuell im Reglement festgelegte Schwelle: 500.000 €.',
    },
  },
  raised_max: {
    label: { fr: 'Levée de fonds maximum', en: 'Maximum funds raised', de: 'Maximales eingeworbenes Kapital' },
    desc: {
      fr: 'Plafond du capital levé (en €). Au-delà, la candidature est signalée ou écartée.',
      en: 'Cap on funds raised (in €). Above this, the application is flagged or excluded.',
      de: 'Obergrenze für eingeworbenes Kapital (in €). Darüber wird die Bewerbung zur Prüfung markiert oder ausgeschlossen.',
    },
    paramLabel: { fr: 'Seuil de levée (€)', en: 'Funds raised threshold (€)', de: 'Kapitalschwelle (€)' },
    paramHelp: {
      fr: 'Seuil actuel du règlement : 800 000 €.',
      en: 'Current rulebook threshold: €800,000.',
      de: 'Aktuell im Reglement festgelegte Schwelle: 800.000 €.',
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
    label: { fr: 'Documents demandés au candidat', en: 'Documents requested from the applicant', de: 'Vom Bewerber angeforderte Dokumente' },
    desc: {
      fr: 'Activez chaque pièce attendue et choisissez son comportement : « exclu » bloque le dossier en cas d’absence, « flag » l’envoie pour examen au comité.',
      en: 'Toggle each expected file and pick its behavior: "exclude" blocks the file if missing, "flag" sends it for committee review.',
      de: 'Aktivieren Sie jedes erwartete Dokument und wählen Sie das Verhalten: „Ausschluss" sperrt das Dossier bei Fehlen, „Flag" leitet es zur Prüfung an das Komitee weiter.',
    },
    paramLabel: { fr: 'Documents demandés', en: 'Requested documents', de: 'Angeforderte Dokumente' },
    notRequested: { fr: 'Non demandé', en: 'Not requested', de: 'Nicht angefordert' },
    requested: { fr: 'Demandé', en: 'Requested', de: 'Angefordert' },
    emptyHint: {
      fr: 'Aucun document n’est demandé tant qu’aucune ligne n’est activée.',
      en: 'No document is requested until at least one row is enabled.',
      de: 'Solange keine Zeile aktiviert ist, wird kein Dokument angefordert.',
    },
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
// V2.5+ : chaque doc est une LIGNE indépendante dans l'éditeur (toggle + behavior
// individuel). `hint` est rendu en clair à droite du label dans la ligne.
export const DOCS = [
  {
    value: 'pitch_deck',
    label: { fr: 'Pitch deck (PDF)', en: 'Pitch deck (PDF)', de: 'Pitch-Deck (PDF)' },
    hint: {
      fr: 'Document de présentation principal pour le jury.',
      en: 'Main presentation document for the jury.',
      de: 'Hauptpräsentationsdokument für die Jury.',
    },
  },
  {
    value: 'exec_summary',
    label: { fr: 'Executive summary', en: 'Executive summary', de: 'Executive Summary' },
    hint: {
      fr: 'Synthèse écrite FR & DE (1 à 2 pages).',
      en: 'Short written summary FR & DE (1–2 pages).',
      de: 'Kurze schriftliche Zusammenfassung FR & DE (1–2 Seiten).',
    },
  },
  {
    value: 'financials',
    label: { fr: 'États financiers', en: 'Financial statements', de: 'Finanzunterlagen' },
    hint: {
      fr: 'Comptes annuels ou prévisionnel signé.',
      en: 'Annual accounts or signed forecast.',
      de: 'Jahresabschluss oder unterzeichnete Prognose.',
    },
  },
  {
    value: 'video_pitch',
    label: { fr: 'Vidéo de pitch', en: 'Pitch video', de: 'Pitch-Video' },
    hint: {
      fr: 'Format court (≤ 3 min) — YouTube, Vimeo ou Loom.',
      en: 'Short format (≤ 3 min) — YouTube, Vimeo or Loom.',
      de: 'Kurzformat (≤ 3 Min.) — YouTube, Vimeo oder Loom.',
    },
  },
];
