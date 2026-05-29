// Copies trilingues (FR/EN/DE) du chantier 3 — Devenir jury.
// Pattern { fr, en, de } compatible useLang().t(dict).
//
// Garde-fou : aucune string n'est hardcodée dans les .jsx, tout passe par UI/*.
// Les copies EN/DE visent un usage institutionnel (Rotary international).

// ── Page DevenirJury (hero + chrome) ────────────────────────────────────────
export const UI = {
  // Hero
  pageEyebrow: {
    fr: 'Rejoindre le jury',
    en: 'Join the jury',
    de: 'Jury beitreten',
  },
  pageTitle: {
    fr: 'Devenir jury',
    en: 'Become a juror',
    de: 'Jurymitglied werden',
  },
  pageItalic: {
    fr: 'du Rotary Startup Award.',
    en: 'of the Rotary Startup Award.',
    de: 'des Rotary Startup Award.',
  },
  pagePitchLine1: {
    fr: 'Vous êtes entrepreneur, investisseur ou expert sectoriel ?',
    en: 'Are you an entrepreneur, investor or sector expert?',
    de: 'Sind Sie Unternehmer·in, Investor·in oder Branchenexpert·in?',
  },
  pagePitchLine2: {
    fr: 'Évaluez les startups finalistes aux côtés des Rotariens et des partenaires.',
    en: 'Evaluate the finalist startups alongside Rotarians and partners.',
    de: 'Bewerten Sie die Finalist-Startups gemeinsam mit Rotariern und Partnern.',
  },
  backToCandidater: {
    fr: 'Vous êtes une startup ? Candidater',
    en: 'Are you a startup? Apply here',
    de: 'Sie sind ein Startup? Hier bewerben',
  },

  // ── Champs du formulaire ──────────────────────────────────────────────────
  fieldEmail:        { fr: 'Email',            en: 'Email',           de: 'E-Mail' },
  fieldFullName:     { fr: 'Nom complet',      en: 'Full name',       de: 'Vollständiger Name' },
  fieldEdition:      { fr: 'Compétition',      en: 'Competition',     de: 'Wettbewerb' },
  fieldClub:         { fr: 'Club préféré',     en: 'Preferred club',  de: 'Bevorzugter Club' },
  fieldExpertise:    { fr: 'Domaines d’expertise', en: 'Areas of expertise', de: 'Fachgebiete' },
  fieldMotivation:   { fr: 'Motivation',       en: 'Motivation',      de: 'Motivation' },
  fieldAvailability: { fr: 'Disponibilité',    en: 'Availability',    de: 'Verfügbarkeit' },

  // Placeholders & helpers
  emailPlaceholder:    { fr: 'vous@exemple.com', en: 'you@example.com', de: 'ihre.adresse@beispiel.com' },
  fullNamePlaceholder: { fr: 'Prénom NOM',       en: 'First LAST',      de: 'Vorname NACHNAME' },
  editionPlaceholder:  { fr: 'Choisir une compétition…', en: 'Choose a competition…', de: 'Wettbewerb auswählen…' },
  clubPlaceholder:     { fr: 'Optionnel — choisir un club', en: 'Optional — choose a club', de: 'Optional — Club wählen' },
  clubNoneSelected:    { fr: 'Aucun club préféré',           en: 'No preferred club',         de: 'Kein bevorzugter Club' },
  expertisePlaceholder:{ fr: 'Ajouter un domaine…',     en: 'Add an area…',         de: 'Bereich hinzufügen…' },
  motivationPlaceholder: {
    fr: 'Pourquoi souhaitez-vous rejoindre le jury ? (200-2000 caractères)',
    en: 'Why do you want to join the jury? (200-2000 characters)',
    de: 'Warum möchten Sie der Jury beitreten? (200-2000 Zeichen)',
  },
  availabilityPlaceholder: {
    fr: 'Ex. « Disponible en présentiel à Paris, soirées de semaine OK »',
    en: 'E.g. "Available in person in Paris, weekday evenings work"',
    de: 'Z. B. „Verfügbar vor Ort in Paris, Wochenabende möglich"',
  },

  // Helpers (sous-libellés gris MUTED)
  emailHelper: {
    fr: 'Nous vous écrirons à cette adresse — utilisez votre email professionnel si possible.',
    en: 'We will contact you at this address — please use your professional email if possible.',
    de: 'Wir werden Sie unter dieser Adresse kontaktieren — bitte nutzen Sie nach Möglichkeit Ihre berufliche E-Mail-Adresse.',
  },
  editionHelper: {
    fr: 'Compétition à laquelle vous souhaiteriez participer comme juré.',
    en: 'Competition you would like to take part in as a juror.',
    de: 'Wettbewerb, an dem Sie als Jurymitglied teilnehmen möchten.',
  },
  clubHelper: {
    fr: 'Si vous avez une préférence parmi les clubs partenaires.',
    en: 'If you have a preference among the partner clubs.',
    de: 'Falls Sie unter den Partnerclubs eine Präferenz haben.',
  },
  expertiseHelper: {
    fr: 'Sélectionnez 1 à 4 domaines où vous pourriez évaluer.',
    en: 'Pick 1 to 4 areas where you could evaluate.',
    de: 'Wählen Sie 1 bis 4 Bereiche aus, in denen Sie bewerten könnten.',
  },

  // ── Validation (errors) ──────────────────────────────────────────────────
  errRequired:    { fr: 'Champ requis.',            en: 'Required field.',          de: 'Pflichtfeld.' },
  errEmail:       { fr: 'Email invalide.',           en: 'Invalid email.',           de: 'Ungültige E-Mail.' },
  errNameShort:   { fr: 'Nom trop court (min 2).',   en: 'Name too short (min 2).',  de: 'Name zu kurz (mind. 2).' },
  errMotivationShort: {
    fr: 'Motivation trop courte (min 200 caractères).',
    en: 'Motivation too short (min 200 characters).',
    de: 'Motivation zu kurz (mindestens 200 Zeichen).',
  },
  errMotivationLong: {
    fr: 'Motivation trop longue (max 2000 caractères).',
    en: 'Motivation too long (max 2000 characters).',
    de: 'Motivation zu lang (maximal 2000 Zeichen).',
  },
  errExpertiseEmpty: {
    fr: 'Sélectionnez au moins un domaine.',
    en: 'Pick at least one area.',
    de: 'Wählen Sie mindestens einen Bereich aus.',
  },

  // ── Submit & feedback ────────────────────────────────────────────────────
  submitCta: {
    fr: 'Envoyer ma candidature',
    en: 'Submit my application',
    de: 'Bewerbung absenden',
  },
  submitting: { fr: 'Envoi…', en: 'Sending…', de: 'Senden…' },
  successTitle: {
    fr: 'Merci !',
    en: 'Thank you!',
    de: 'Danke!',
  },
  successBody: {
    fr: 'Votre candidature a bien été enregistrée. Nous reviendrons vers vous sous 7 jours.',
    en: 'Your application has been received. We will get back to you within 7 days.',
    de: 'Ihre Bewerbung ist eingegangen. Wir werden uns innerhalb von 7 Tagen bei Ihnen melden.',
  },
  errorTitle: {
    fr: 'Un souci est survenu',
    en: 'Something went wrong',
    de: 'Ein Problem ist aufgetreten',
  },
  errorBody: {
    fr: 'Votre candidature n’a pas pu être enregistrée. Réessayez dans un instant.',
    en: 'We could not save your application. Please try again in a moment.',
    de: 'Ihre Bewerbung konnte nicht gespeichert werden. Bitte versuchen Sie es gleich erneut.',
  },
  charsCounter: {
    fr: 'caractères',
    en: 'characters',
    de: 'Zeichen',
  },

  // ── Master cockpit panel — review queue ───────────────────────────────────
  panelEyebrow:  { fr: 'Modération',           en: 'Moderation',     de: 'Moderation' },
  panelTitle:    { fr: 'Candidatures jury',    en: 'Jury applications', de: 'Jury-Bewerbungen' },
  panelSubtitle: {
    fr: 'Les candidatures spontanées arrivent ici. Approuvez ou refusez avec une note.',
    en: 'Spontaneous applications land here. Approve or reject with a note.',
    de: 'Spontane Bewerbungen landen hier. Sie können diese mit einer Begründung annehmen oder ablehnen.',
  },
  tabPending:   { fr: 'En attente',   en: 'Pending',   de: 'Ausstehend' },
  tabApproved:  { fr: 'Approuvées',   en: 'Approved',  de: 'Genehmigt' },
  tabRejected:  { fr: 'Refusées',     en: 'Rejected',  de: 'Abgelehnt' },
  tabAll:       { fr: 'Toutes',       en: 'All',       de: 'Alle' },

  statusPending:  { fr: 'En attente',  en: 'Pending',  de: 'Ausstehend' },
  statusApproved: { fr: 'Approuvée',   en: 'Approved', de: 'Genehmigt' },
  statusRejected: { fr: 'Refusée',     en: 'Rejected', de: 'Abgelehnt' },

  emptyQueue: {
    fr: 'Aucune candidature dans cet onglet.',
    en: 'No application in this tab.',
    de: 'Keine Bewerbung in diesem Tab.',
  },
  emptyDetail: {
    fr: 'Sélectionnez une candidature à gauche pour voir le détail.',
    en: 'Pick an application on the left to see the detail.',
    de: 'Wählen Sie links eine Bewerbung aus, um die Details anzuzeigen.',
  },

  detailEmailLabel:        { fr: 'Email',           en: 'Email',           de: 'E-Mail' },
  detailEditionLabel:      { fr: 'Compétition',     en: 'Competition',     de: 'Wettbewerb' },
  detailClubLabel:         { fr: 'Club préféré',    en: 'Preferred club',  de: 'Bevorzugter Club' },
  detailExpertiseLabel:    { fr: 'Expertise',       en: 'Expertise',       de: 'Fachgebiete' },
  detailMotivationLabel:   { fr: 'Motivation',      en: 'Motivation',      de: 'Motivation' },
  detailAvailabilityLabel: { fr: 'Disponibilité',   en: 'Availability',    de: 'Verfügbarkeit' },
  detailSubmittedLabel:    { fr: 'Soumise le',      en: 'Submitted on',    de: 'Eingegangen am' },
  detailReviewedLabel:     { fr: 'Reviewée le',     en: 'Reviewed on',     de: 'Bearbeitet am' },
  detailRejectionLabel:    { fr: 'Raison du refus', en: 'Rejection reason', de: 'Ablehnungsgrund' },
  detailNone:              { fr: '—',           en: '—',           de: '—' },

  actionApprove: { fr: 'Approuver',         en: 'Approve',        de: 'Genehmigen' },
  actionReject:  { fr: 'Refuser',           en: 'Reject',         de: 'Ablehnen' },
  actionCancel:  { fr: 'Annuler',           en: 'Cancel',         de: 'Abbrechen' },
  actionConfirmReject: { fr: 'Confirmer le refus', en: 'Confirm rejection', de: 'Ablehnung bestätigen' },

  rejectReasonLabel: {
    fr: 'Raison (visible par le candidat dans l’email)',
    en: 'Reason (shown to the candidate in the email)',
    de: 'Begründung (wird dem Bewerber in der E-Mail mitgeteilt)',
  },
  rejectReasonPlaceholder: {
    fr: 'Ex. « Profil intéressant mais hors thématique 2027 ».',
    en: 'E.g. "Strong profile, off-topic for 2027."',
    de: 'Z. B. „Überzeugendes Profil, jedoch nicht zur Thematik 2027 passend."',
  },

  mutationApprovedToast: { fr: 'Candidature approuvée', en: 'Application approved', de: 'Bewerbung genehmigt' },
  mutationRejectedToast: { fr: 'Candidature refusée',   en: 'Application rejected', de: 'Bewerbung abgelehnt' },
  mutationErrorToast:    { fr: 'Action impossible — réessayez.', en: 'Action failed — please retry.', de: 'Aktion fehlgeschlagen — bitte erneut versuchen.' },

  forbidden: {
    fr: 'Accès refusé. Ce panneau est réservé aux master_admins.',
    en: 'Forbidden. This panel is reserved for master_admins.',
    de: 'Zugriff verweigert. Dieser Bereich ist Master-Administratoren vorbehalten.',
  },
};

// ── Domaines d'expertise (chips multi-select) ──────────────────────────────
// Stockés tels quels (slug stable, jamais traduit côté DB).
export const EXPERTISE_OPTIONS = [
  { value: 'fintech',  label: { fr: 'Fintech',          en: 'Fintech',         de: 'Fintech' } },
  { value: 'saas',     label: { fr: 'SaaS',             en: 'SaaS',            de: 'SaaS' } },
  { value: 'health',   label: { fr: 'Health / MedTech', en: 'Health / MedTech', de: 'Gesundheit / MedTech' } },
  { value: 'edtech',   label: { fr: 'EdTech',           en: 'EdTech',          de: 'EdTech' } },
  { value: 'climate',  label: { fr: 'Climat / Cleantech', en: 'Climate / Cleantech', de: 'Klima / Cleantech' } },
  { value: 'ai',       label: { fr: 'IA',                en: 'AI',              de: 'KI' } },
  { value: 'hardware', label: { fr: 'Hardware / DeepTech', en: 'Hardware / DeepTech', de: 'Hardware / DeepTech' } },
  { value: 'other',    label: { fr: 'Autre',             en: 'Other',           de: 'Sonstiges' } },
];

// Bornes motivation côté UI (alignées avec la spec : 200 < len <= 2000).
export const MOTIVATION_MIN = 200;
export const MOTIVATION_MAX = 2000;

// Regex email simple — cohérent avec EMAIL_RE des autres pages RSA.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
