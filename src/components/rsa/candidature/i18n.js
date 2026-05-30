// Dictionnaires trilingues FR/EN/DE du tunnel de candidature (Module 1).
//
// Forme { fr, en, de } compatible avec useLang().t(dict) de @/lib/platform/i18n :
// chaque entrée se résout vers la branche active. On garde tout colocalisé ici
// (steps, labels de champs, copy UI, libellés de règles d'éligibilité, statuts)
// plutôt que d'éparpiller dans chaque composant.
//
// NB : le contenu *projet* (value_proposition, etc.) reste rédigé par le candidat,
// idéalement en anglais (jury international) — seul le chrome est trilingue.

// ── Étapes du tunnel (ordre = ordre d'affichage) ─────────────────────────────
export const STEPS = [
  { id: 'contact', label: { fr: 'Contact', en: 'Contact', de: 'Kontakt' } },
  { id: 'company', label: { fr: 'Société', en: 'Company', de: 'Unternehmen' } },
  { id: 'project', label: { fr: 'Projet', en: 'Project', de: 'Projekt' } },
  { id: 'finance', label: { fr: 'Finances', en: 'Financials', de: 'Finanzen' } },
  { id: 'documents', label: { fr: 'Documents', en: 'Documents', de: 'Dokumente' } },
  { id: 'club', label: { fr: 'Club', en: 'Club', de: 'Club' } },
  { id: 'review', label: { fr: 'Récapitulatif', en: 'Review', de: 'Zusammenfassung' } },
];

export const STEP_IDS = STEPS.map((s) => s.id);

// ── Libellés + aides des champs (label + help facultatif) ────────────────────
export const FIELDS = {
  // Step 1 — Contact
  name: {
    label: { fr: 'Nom de la startup', en: 'Startup name', de: 'Name des Startups' },
  },
  contact_person: {
    label: { fr: 'Personne de contact', en: 'Contact person', de: 'Ansprechpartner' },
  },
  email: {
    label: { fr: 'Email', en: 'Email', de: 'E-Mail' },
    help: {
      fr: 'Pré-rempli avec votre email de connexion.',
      en: 'Pre-filled with your sign-in email.',
      de: 'Mit Ihrer Anmelde-E-Mail vorausgefüllt.',
    },
  },
  phone: {
    label: { fr: 'Téléphone', en: 'Phone', de: 'Telefon' },
  },
  website: {
    label: { fr: 'Site web', en: 'Website', de: 'Webseite' },
    help: { fr: 'https:// ajouté automatiquement.', en: 'https:// added automatically.', de: 'https:// wird automatisch ergänzt.' },
  },

  // Step 2 — Société
  country: {
    label: { fr: 'Pays', en: 'Country', de: 'Land' },
    help: {
      fr: 'France ou Allemagne (Règlement Art. 2).',
      en: 'France or Germany (Rules Art. 2).',
      de: 'Frankreich oder Deutschland (Reglement Art. 2).',
    },
  },
  creation_date: {
    label: { fr: 'Date de création', en: 'Founding date', de: 'Gründungsdatum' },
    help: {
      fr: 'Après le 1er janvier 2020.',
      en: 'After 1 January 2020.',
      de: 'Nach dem 1. Januar 2020.',
    },
  },
  registration_number: {
    label: {
      fr: "N° d'immatriculation (SIREN/SIRET, HRB…)",
      en: 'Registration number (SIREN/SIRET, HRB…)',
      de: 'Registernummer (SIREN/SIRET, HRB…)',
    },
  },
  founders_majority: {
    label: {
      fr: 'Les fondateurs sont-ils majoritaires au capital ?',
      en: 'Do the founders hold a majority of the equity?',
      de: 'Halten die Gründer die Kapitalmehrheit?',
    },
    help: {
      fr: 'Détenez-vous ensemble plus de 50 % des parts ?',
      en: 'Do you together hold more than 50% of the shares?',
      de: 'Halten Sie zusammen mehr als 50 % der Anteile?',
    },
  },
  partner_institution: {
    label: { fr: 'Institution partenaire (incubateur…)', en: 'Partner institution (incubator…)', de: 'Partnerinstitution (Inkubator…)' },
  },
  rotary_club: {
    label: { fr: 'Club Rotary parrain', en: 'Sponsoring Rotary club', de: 'Patenschaftsclub (Rotary)' },
  },

  // Étape Club — affiliation obligatoire (blueprint §5). NB : distinct du champ
  // texte libre `rotary_club` ci-dessus ; `club_id` est la clé structurée vers
  // le club organisateur dont le comité examinera le dossier.
  club_id: {
    label: { fr: 'Club organisateur', en: 'Organising club', de: 'Organisierender Club' },
  },

  // Step 3 — Projet (Art. 4)
  value_proposition: {
    label: { fr: 'Proposition de valeur', en: 'Value proposition', de: 'Wertversprechen' },
  },
  business_model: {
    label: { fr: 'Modèle économique', en: 'Business model', de: 'Geschäftsmodell' },
  },
  roadmap: {
    label: { fr: 'Roadmap', en: 'Roadmap', de: 'Roadmap' },
  },
  team: {
    label: { fr: 'Équipe', en: 'Team', de: 'Team' },
    help: {
      fr: 'Fondateurs, rôles, parcours pertinents.',
      en: 'Founders, roles, relevant background.',
      de: 'Gründer, Rollen, relevanter Hintergrund.',
    },
  },
  traction: {
    label: { fr: 'Traction', en: 'Traction', de: 'Traction' },
    help: {
      fr: 'Laissez vide et expliquez si vous êtes pré-revenu.',
      en: 'Leave empty and explain if you are pre-revenue.',
      de: 'Bitte leer lassen und erläutern, wenn Sie noch keinen Umsatz erzielen.',
    },
  },
  esg_impact: {
    label: { fr: 'Impact ESG', en: 'ESG impact', de: 'ESG-Wirkung' },
  },
  sectors: {
    label: { fr: 'Secteurs', en: 'Sectors', de: 'Sektoren' },
    help: {
      fr: 'Au moins un secteur. Oriente le cluster de session.',
      en: 'At least one sector. Guides session cluster.',
      de: 'Mindestens ein Sektor. Lenkt das Session-Cluster.',
    },
  },

  // Step 4 — Finances
  last_revenue: {
    label: { fr: 'Dernier chiffre d’affaires annuel (€)', en: 'Last annual revenue (€)', de: 'Letzter Jahresumsatz (€)' },
    help: {
      fr: 'Laisser vide si pré-revenu. Au-delà de 500 000 € : signalé.',
      en: 'Leave empty if pre-revenue. Above €500,000: flagged.',
      de: 'Bei noch keinem Umsatz bitte leer lassen. Über 500.000 €: zur Prüfung markiert.',
    },
  },
  amount_raised: {
    label: { fr: 'Montant total levé (€)', en: 'Total funds raised (€)', de: 'Insgesamt eingeworbenes Kapital (€)' },
    help: {
      fr: 'Au-delà de 800 000 € : signalé.',
      en: 'Above €800,000: flagged.',
      de: 'Über 800.000 €: zur Prüfung markiert.',
    },
  },

  // Step 5 — Documents (V2.5+ : libellés par doc_key catalogue, requis/recommandé
  // dérivé dynamiquement de edition.eligibility_rules.docs_required)
  pitch_deck_path: {
    label: { fr: 'Pitch deck (PDF)', en: 'Pitch deck (PDF)', de: 'Pitch-Deck (PDF)' },
    help: { fr: 'PDF, PPT ou PPTX · max 50 Mo.', en: 'PDF, PPT or PPTX · max 50 MB.', de: 'PDF, PPT oder PPTX · max. 50 MB.' },
  },
  exec_summary_path: {
    label: { fr: 'Executive summary', en: 'Executive summary', de: 'Executive Summary' },
    help: {
      fr: 'Un seul document combinant FR & DE. PDF/DOC · max 20 Mo.',
      en: 'A single document combining FR & DE. PDF/DOC · max 20 MB.',
      de: 'Ein Dokument mit FR & DE. PDF/DOC · max. 20 MB.',
    },
  },
  financials_path: {
    label: { fr: 'États financiers', en: 'Financial statements', de: 'Finanzunterlagen' },
    help: {
      fr: 'Comptes annuels ou prévisionnel signé. PDF/DOC.',
      en: 'Annual accounts or signed forecast. PDF/DOC.',
      de: 'Jahresabschluss oder unterzeichnete Prognose. PDF/DOC.',
    },
  },
  video_pitch_url: {
    label: { fr: 'Vidéo de pitch', en: 'Pitch video', de: 'Pitch-Video' },
    help: {
      fr: 'Lien YouTube, Vimeo ou Loom.',
      en: 'YouTube, Vimeo or Loom link.',
      de: 'YouTube-, Vimeo- oder Loom-Link.',
    },
  },
};

// ── Copy UI générale ─────────────────────────────────────────────────────────
export const UI = {
  // Boutons / navigation
  saveDraft: { fr: 'Enregistrer le brouillon', en: 'Save draft', de: 'Entwurf speichern' },
  saving: { fr: 'Enregistrement…', en: 'Saving…', de: 'Wird gespeichert…' },
  saved: { fr: 'Brouillon enregistré', en: 'Draft saved', de: 'Entwurf gespeichert' },
  submit: { fr: 'Soumettre ma candidature', en: 'Submit application', de: 'Bewerbung absenden' },
  submitting: { fr: 'Soumission…', en: 'Submitting…', de: 'Wird gesendet…' },
  next: { fr: 'Suivant', en: 'Next', de: 'Weiter' },
  prev: { fr: 'Précédent', en: 'Back', de: 'Zurück' },
  edit: { fr: 'Éditer', en: 'Edit', de: 'Bearbeiten' },
  yes: { fr: 'Oui', en: 'Yes', de: 'Ja' },
  no: { fr: 'Non', en: 'No', de: 'Nein' },
  notProvided: { fr: 'Non renseigné', en: 'Not provided', de: 'Nicht angegeben' },
  optional: { fr: 'facultatif', en: 'optional', de: 'optional' },
  required: { fr: 'requis', en: 'required', de: 'erforderlich' },
  recommended: { fr: 'recommandé', en: 'recommended', de: 'empfohlen' },
  docsFlagNotice: {
    fr: 'Votre dossier sera marqué pour examen attentif par le comité si vous ne fournissez pas les pièces recommandées.',
    en: 'Your application will be flagged for close committee review if you do not provide the recommended files.',
    de: 'Ihre Bewerbung wird zur eingehenden Prüfung durch das Komitee markiert, sofern Sie die empfohlenen Unterlagen nicht beifügen.',
  },
  docsNoneRequested: {
    fr: 'Aucun document n’est demandé pour cette édition.',
    en: 'No document is requested for this edition.',
    de: 'Für diese Ausgabe wird kein Dokument angefordert.',
  },

  // Helpers / conventions
  preferEn: {
    fr: 'En anglais de préférence (jury international).',
    en: 'Preferably in English (international jury).',
    de: 'Bitte vorzugsweise auf Englisch (internationale Jury).',
  },
  charCount: { fr: 'caractères', en: 'characters', de: 'Zeichen' },

  // Intro (nouveau candidat)
  eyebrow: { fr: 'Espace candidat', en: 'Applicant area', de: 'Bewerberbereich' },
  introTitle: { fr: 'Votre candidature', en: 'Your application', de: 'Ihre Bewerbung' },
  introBody: {
    fr: 'Déposez votre dossier de candidature au Rotary Startup Award en quelques étapes. Vous pouvez enregistrer un brouillon à tout moment et le reprendre plus tard.',
    en: 'Submit your Rotary Startup Award application in a few steps. You can save a draft at any time and resume later.',
    de: 'Reichen Sie Ihre Bewerbung für den Rotary Startup Award in wenigen Schritten ein. Sie können jederzeit einen Entwurf speichern und zu einem späteren Zeitpunkt fortsetzen.',
  },
  introStart: { fr: 'Commencer mon dossier', en: 'Start my application', de: 'Bewerbung beginnen' },
  introResume: { fr: 'Reprendre mon dossier', en: 'Resume my application', de: 'Bewerbung fortsetzen' },
  signedInAs: { fr: 'Connecté·e en tant que', en: 'Signed in as', de: 'Angemeldet als' },

  // V2 multi-club — picker de club
  pickClubEyebrow: {
    fr: 'Étape 1 · Choisissez votre club',
    en: 'Step 1 · Choose your club',
    de: 'Schritt 1 · Wählen Sie Ihren Club',
  },
  pickClubBody: {
    fr: 'Votre candidature sera examinée par le comité du club que vous choisissez. Vous ne pourrez pas changer ce choix après création du dossier.',
    en: 'Your application will be reviewed by the committee of the club you pick. You will not be able to change this choice after the dossier is created.',
    de: 'Ihre Bewerbung wird vom Komitee des gewählten Clubs geprüft. Diese Wahl ist nach Erstellung der Bewerbung nicht mehr änderbar.',
  },
  pickClubLoading: {
    fr: 'Chargement des clubs…',
    en: 'Loading clubs…',
    de: 'Clubs werden geladen…',
  },
  pickClubEmpty: {
    fr: 'Aucun club n’est rattaché à cette compétition pour le moment.',
    en: 'No club is attached to this competition yet.',
    de: 'Diesem Wettbewerb ist noch kein Club zugeordnet.',
  },
  pickClubFirst: {
    fr: 'Choisissez d’abord un club',
    en: 'Pick a club first',
    de: 'Wählen Sie zuerst einen Club',
  },

  // ── Étape Club (startup) — sélection OBLIGATOIRE + hint pays/proche ──────────
  // Décision verrouillée (blueprint §5/§9.1) : hint seul, pas de champ pays ni de
  // tri/matching automatique. Le choix reste libre mais bloquant.
  clubStepTitle: {
    fr: 'Votre club organisateur',
    en: 'Your organising club',
    de: 'Ihr organisierender Club',
  },
  clubStepSubtitle: {
    fr: 'Votre candidature sera rattachée à un club et examinée par son comité de sélection.',
    en: 'Your application will be affiliated with a club and reviewed by its selection committee.',
    de: 'Ihre Bewerbung wird einem Club zugeordnet und von dessen Auswahlkomitee geprüft.',
  },
  clubSelectPlaceholder: {
    fr: 'Sélectionnez un club…',
    en: 'Select a club…',
    de: 'Club auswählen…',
  },
  // Hint sous le sélecteur (texte exact verrouillé : pays ou le plus proche).
  clubRecommendHint: {
    fr: 'Choisissez le club de votre pays ou le plus proche.',
    en: 'Choose the club of your country or the closest one.',
    de: 'Wählen Sie den Club Ihres Landes oder den nächstgelegenen.',
  },
  clubLoading: {
    fr: 'Chargement des clubs…',
    en: 'Loading clubs…',
    de: 'Clubs werden geladen…',
  },
  clubEmpty: {
    fr: 'Aucun club n’est rattaché à cette compétition pour le moment. Contactez l’organisation.',
    en: 'No club is attached to this competition yet. Please contact the organisers.',
    de: 'Diesem Wettbewerb ist noch kein Club zugeordnet. Bitte wenden Sie sich an die Organisation.',
  },
  clubLoadError: {
    fr: 'Impossible de charger les clubs. Réessayez.',
    en: 'Could not load the clubs. Please try again.',
    de: 'Clubs konnten nicht geladen werden. Bitte erneut versuchen.',
  },
  errClubRequired: {
    fr: 'Veuillez choisir un club pour rattacher votre candidature.',
    en: 'Please choose a club to affiliate your application.',
    de: 'Bitte wählen Sie einen Club, um Ihre Bewerbung zuzuordnen.',
  },

  // Récapitulatif / soumission
  reviewIntro: {
    fr: 'Vérifiez votre dossier avant de le soumettre. Vous pourrez encore le modifier après soumission, jusqu’à la date de clôture.',
    en: 'Review your application before submitting. You can still edit it after submission, until the closing date.',
    de: 'Bitte prüfen Sie Ihre Bewerbung vor dem Absenden. Sie können sie auch nach dem Absenden bis zum Stichtag weiterhin bearbeiten.',
  },
  missingRequired: {
    fr: 'Des champs requis sont manquants. Complétez-les pour soumettre.',
    en: 'Some required fields are missing. Complete them to submit.',
    de: 'Es fehlen Pflichtangaben. Bitte vervollständigen Sie diese, um die Bewerbung abzusenden.',
  },
  confirmTitle: { fr: 'Soumettre votre candidature ?', en: 'Submit your application?', de: 'Bewerbung absenden?' },
  confirmBody: {
    fr: 'Votre dossier sera transmis au comité de sélection. Vous pourrez encore le modifier jusqu’au {date}.',
    en: 'Your application will be sent to the selection committee. You can still edit it until {date}.',
    de: 'Ihre Bewerbung wird dem Auswahlkomitee übermittelt. Sie können sie bis zum {date} noch bearbeiten.',
  },
  confirmExcluded: {
    fr: 'Selon le règlement, un critère est normalement exclusif. Vous pouvez tout de même soumettre ; le comité reste souverain.',
    en: 'Per the rules, one criterion is normally exclusionary. You may still submit; the committee remains sovereign.',
    de: 'Laut Reglement ist ein Kriterium grundsätzlich ausschließend. Sie können dennoch absenden — die Entscheidung obliegt dem Komitee.',
  },
  confirmCta: { fr: 'Confirmer et soumettre', en: 'Confirm and submit', de: 'Bestätigen und absenden' },
  cancel: { fr: 'Annuler', en: 'Cancel', de: 'Abbrechen' },

  // Erreurs de validation (inline)
  errRequired: { fr: 'Ce champ est requis.', en: 'This field is required.', de: 'Dieses Feld ist erforderlich.' },
  errEmail: { fr: 'Email invalide.', en: 'Invalid email.', de: 'Ungültige E-Mail.' },
  errUrl: { fr: 'URL invalide.', en: 'Invalid URL.', de: 'Ungültige URL.' },
  errPhone: { fr: 'Numéro de téléphone invalide.', en: 'Invalid phone number.', de: 'Ungültige Telefonnummer.' },
  errDateFuture: { fr: 'La date ne peut pas être dans le futur.', en: 'The date cannot be in the future.', de: 'Das Datum darf nicht in der Zukunft liegen.' },
  errSectors: { fr: 'Sélectionnez au moins un secteur.', en: 'Select at least one sector.', de: 'Wählen Sie mindestens einen Sektor.' },
  errNumber: { fr: 'Doit être un nombre positif.', en: 'Must be a positive number.', de: 'Muss eine positive Zahl sein.' },

  // Dropzone
  dzPrompt: { fr: 'Déposez votre fichier ici', en: 'Drop your file here', de: 'Datei hier ablegen' },
  dzHint: { fr: 'ou cliquez pour parcourir', en: 'or click to browse', de: 'oder klicken zum Auswählen' },
  dzUploading: { fr: 'Envoi en cours…', en: 'Uploading…', de: 'Wird hochgeladen…' },
  dzReplace: { fr: 'Remplacer', en: 'Replace', de: 'Ersetzen' },
  dzRemove: { fr: 'Retirer', en: 'Remove', de: 'Entfernen' },
  dzErrFormat: { fr: 'Format non supporté.', en: 'Unsupported format.', de: 'Format nicht unterstützt.' },
  dzErrSize: { fr: 'Fichier trop volumineux.', en: 'File too large.', de: 'Datei zu groß.' },
  dzErrUpload: { fr: 'Échec de l’envoi. Réessayez.', en: 'Upload failed. Try again.', de: 'Upload fehlgeschlagen. Erneut versuchen.' },
  download: { fr: 'Télécharger', en: 'Download', de: 'Herunterladen' },
  uploaded: { fr: 'Document reçu', en: 'Document received', de: 'Dokument erhalten' },

  // Pays
  countryFR: { fr: 'France', en: 'France', de: 'Frankreich' },
  countryDE: { fr: 'Allemagne', en: 'Germany', de: 'Deutschland' },
  countryOther: { fr: 'Autre', en: 'Other', de: 'Andere' },
  countryOtherLabel: { fr: 'Précisez le pays', en: 'Specify the country', de: 'Land angeben' },

  // Erreurs de chargement
  loadError: {
    fr: 'Impossible de charger votre dossier. Réessayez plus tard.',
    en: 'Could not load your application. Please try again later.',
    de: 'Bewerbung konnte nicht geladen werden. Bitte später erneut versuchen.',
  },
  noOpenEdition: {
    fr: 'Aucune édition n’est ouverte aux candidatures pour le moment.',
    en: 'No edition is currently open for applications.',
    de: 'Derzeit ist keine Ausgabe für Bewerbungen geöffnet.',
  },
  retry: { fr: 'Réessayer', en: 'Retry', de: 'Erneut versuchen' },
};

// ── Libellés des règles d'éligibilité (clé `rule` renvoyée par evaluateEligibility) ─
export const RULE_LABELS = {
  country: { fr: 'Pays', en: 'Country', de: 'Land' },
  created_after: { fr: 'Date de création', en: 'Founding date', de: 'Gründungsdatum' },
  revenue_max: { fr: 'Chiffre d’affaires', en: 'Revenue', de: 'Umsatz' },
  raised_max: { fr: 'Montant levé', en: 'Funds raised', de: 'Eingeworbenes Kapital' },
  founders_majority: { fr: 'Fondateurs majoritaires', en: 'Founder majority', de: 'Gründermehrheit' },
  registration: { fr: 'Immatriculation', en: 'Registration', de: 'Registrierung' },
  docs_required: { fr: 'Documents requis', en: 'Required documents', de: 'Erforderliche Dokumente' },
};

// ── Verdict d'éligibilité : titre + intention de copy (ton informatif) ───────
export const VERDICT_COPY = {
  eligible: {
    title: { fr: 'Critères indicatifs remplis', en: 'Indicative criteria met', de: 'Indikative Kriterien erfüllt' },
    body: {
      fr: 'Votre dossier remplit les critères indicatifs du règlement.',
      en: 'Your application meets the indicative eligibility criteria.',
      de: 'Ihre Bewerbung erfüllt die im Reglement festgelegten indikativen Kriterien.',
    },
  },
  flagged: {
    title: { fr: 'Quelques points à examiner', en: 'A few points to review', de: 'Einige Punkte zur Prüfung' },
    body: {
      fr: 'Quelques points seront examinés par le comité — cela ne vous empêche pas de candidater.',
      en: 'A few points will be reviewed by the committee — this does not prevent you from applying.',
      de: 'Einige Punkte werden vom Komitee geprüft — Ihre Bewerbung ist davon nicht ausgeschlossen.',
    },
  },
  excluded: {
    title: { fr: 'Critère normalement exclusif', en: 'Normally exclusionary criterion', de: 'Grundsätzlich ausschließendes Kriterium' },
    body: {
      fr: 'Selon le règlement, ce critère est normalement exclusif. Vous pouvez tout de même soumettre ; le comité reste souverain.',
      en: 'Per the rules, this criterion is normally exclusionary. You may still submit; the committee remains sovereign.',
      de: 'Laut Reglement ist dieses Kriterium grundsätzlich ausschließend. Sie können dennoch absenden — die Entscheidung obliegt dem Komitee.',
    },
  },
};

export const ELIGIBILITY_TITLE = { fr: 'Éligibilité (indicative)', en: 'Eligibility (indicative)', de: 'Teilnahmevoraussetzungen (indikativ)' };
export const FLAG_CHIP = { fr: 'À examiner', en: 'To review', de: 'Zu prüfen' };
export const EXCLU_CHIP = { fr: 'Exclusif', en: 'Exclusionary', de: 'Ausschließend' };

// ── Suivi post-soumission : libellés de statut + jalons ──────────────────────
// Les statuts internes (en_selection, eligible, liste_attente, affecte, en_session,
// note, finaliste, laureat, rejete) sont regroupés pour le candidat.
export const STATUS_LABELS = {
  brouillon: { fr: 'Brouillon', en: 'Draft', de: 'Entwurf' },
  soumis: { fr: 'Soumis', en: 'Submitted', de: 'Eingereicht' },
  en_selection: { fr: 'En sélection', en: 'Under review', de: 'In Auswahl' },
  eligible: { fr: 'Éligible', en: 'Eligible', de: 'Zugelassen' },
  liste_attente: { fr: 'Liste d’attente', en: 'Waiting list', de: 'Warteliste' },
  affecte: { fr: 'Affecté à une session', en: 'Assigned to a session', de: 'Einer Session zugewiesen' },
  en_session: { fr: 'En session', en: 'In session', de: 'In Session' },
  note: { fr: 'Évalué', en: 'Scored', de: 'Bewertet' },
  finaliste: { fr: 'Finaliste', en: 'Finalist', de: 'Finalist' },
  laureat: { fr: 'Lauréat', en: 'Winner', de: 'Preisträger' },
  rejete: { fr: 'Non retenu', en: 'Not selected', de: 'Nicht berücksichtigt' },
};

// Mappe un statut métier vers le `kind`/`status` de StatusPill (lifecycle 'dossier').
export const STATUS_PILL = {
  brouillon: 'draft',
  soumis: 'submitted',
  en_selection: 'under_review',
  eligible: 'shortlisted',
  liste_attente: 'under_review',
  affecte: 'shortlisted',
  en_session: 'shortlisted',
  note: 'shortlisted',
  finaliste: 'finalist',
  laureat: 'winner',
  rejete: 'rejected',
};

// Jalons de la frise (ordre). `rejete` est une branche terminale discrète.
export const TIMELINE = [
  { id: 'soumis', label: { fr: 'Soumis', en: 'Submitted', de: 'Eingereicht' } },
  { id: 'en_selection', label: { fr: 'En sélection', en: 'Under review', de: 'In Auswahl' } },
  { id: 'eligible', label: { fr: 'Éligible', en: 'Eligible', de: 'Zugelassen' } },
  { id: 'affecte', label: { fr: 'Affecté à une session', en: 'Assigned to a session', de: 'Einer Session zugewiesen' } },
  { id: 'en_session', label: { fr: 'En session', en: 'In session', de: 'In Session' } },
  { id: 'finaliste', label: { fr: 'Finaliste', en: 'Finalist', de: 'Finalist' } },
  { id: 'laureat', label: { fr: 'Lauréat', en: 'Winner', de: 'Preisträger' } },
];

// Rang d'un statut dans la frise (pour marquer les jalons atteints).
// liste_attente, note → assimilés au jalon précédent ; rejete → branche à part.
export const STATUS_RANK = {
  brouillon: -1,
  soumis: 0,
  en_selection: 1,
  eligible: 2,
  liste_attente: 2,
  affecte: 3,
  en_session: 4,
  note: 4,
  finaliste: 5,
  laureat: 6,
  rejete: 1, // s'arrête après la sélection
};

export const TRACKING = {
  eyebrow: { fr: 'Suivi de candidature', en: 'Application tracking', de: 'Bewerbungsverlauf' },
  statusTitle: { fr: 'Statut', en: 'Status', de: 'Status' },
  timelineTitle: { fr: 'Avancement', en: 'Progress', de: 'Fortschritt' },
  sessionTitle: { fr: 'Session affectée', en: 'Assigned session', de: 'Zugewiesene Session' },
  docsTitle: { fr: 'Documents déposés', en: 'Submitted documents', de: 'Eingereichte Dokumente' },
  eligibilityTitle: { fr: 'Éligibilité au moment de la soumission', en: 'Eligibility at submission', de: 'Eignung bei Einreichung' },
  submittedOn: { fr: 'Soumis le', en: 'Submitted on', de: 'Eingereicht am' },
  editCta: { fr: 'Modifier mon dossier', en: 'Edit my application', de: 'Bewerbung bearbeiten' },
  lockedNotice: {
    fr: 'Les candidatures sont closes depuis le {date}. Votre dossier n’est plus modifiable.',
    en: 'Applications closed on {date}. Your file can no longer be edited.',
    de: 'Die Bewerbungsphase endete am {date}. Ihre Bewerbung kann nicht mehr bearbeitet werden.',
  },
  editableUntil: {
    fr: 'Modifiable jusqu’au {date}.',
    en: 'Editable until {date}.',
    de: 'Bearbeitbar bis zum {date}.',
  },
  rejectedNotice: {
    fr: 'Votre dossier n’a pas été retenu pour cette édition. Merci pour votre participation.',
    en: 'Your application was not selected for this edition. Thank you for participating.',
    de: 'Ihre Bewerbung konnte für diese Ausgabe nicht berücksichtigt werden. Wir danken Ihnen für Ihre Teilnahme.',
  },
  noDocs: { fr: 'Aucun document déposé.', en: 'No documents submitted.', de: 'Keine Dokumente eingereicht.' },
  deckLabel: { fr: 'Pitch deck', en: 'Pitch deck', de: 'Pitch-Deck' },
  execLabel: { fr: 'Executive summary', en: 'Executive summary', de: 'Executive Summary' },
};

// Options secteurs : réutilise les clusters de SESSIONS (constants.js) + "Autre".
// value = id du cluster (s1_foodtech…) ; label trilingue depuis le cluster.
