// Dictionnaires trilingues FR/EN/DE du funnel d'inscription juré unifié.
//
// Forme { fr, en, de } compatible avec useLang().t(dict) de @/lib/platform/i18n.
// Co-localisé sous src/components/rsa/jury-funnel/. AUCUNE string FR hardcodée
// dans le .jsx — tout passe par JF (UI) / JF_STEPS / JF_QUALITES.
//
// Référence : docs/blueprints/jury-application-funnel.md §2,§4. Le funnel est
// SCOPÉ par compétition (édition) : club + sessions + finale appartiennent à
// l'édition résolue depuis l'URL (?competition= / ?edition=).

// ── Étapes du funnel ────────────────────────────────────────────────────────
export const JF_STEPS = [
  { id: 'identite',      label: { fr: 'Identité',       en: 'Identity',     de: 'Identität' } },
  { id: 'presentation',  label: { fr: 'Présentation',   en: 'About you',    de: 'Vorstellung' } },
  { id: 'club',          label: { fr: 'Club',           en: 'Club',         de: 'Club' } },
  { id: 'disponibilites',label: { fr: 'Disponibilités', en: 'Availability', de: 'Verfügbarkeit' } },
  { id: 'review',        label: { fr: 'Récapitulatif',  en: 'Review',       de: 'Zusammenfassung' } },
];

export const JF_STEP_IDS = JF_STEPS.map((s) => s.id);

// Qualités acceptées par le RPC rsa_apply_jury (CHECK constraint côté SQL) :
// {investisseur, entrepreneur, expert, corporate, autre}.
export const JF_QUALITES = [
  { value: 'investisseur', label: { fr: 'Investisseur',     en: 'Investor',      de: 'Investor' } },
  { value: 'entrepreneur', label: { fr: 'Entrepreneur',     en: 'Entrepreneur',  de: 'Unternehmer' } },
  { value: 'expert',       label: { fr: 'Expert sectoriel', en: 'Sector expert', de: 'Fachexperte' } },
  { value: 'corporate',    label: { fr: 'Corporate',        en: 'Corporate',     de: 'Konzern' } },
  { value: 'autre',        label: { fr: 'Autre',            en: 'Other',         de: 'Andere' } },
];

export const JF = {
  // ── Chrome / hero ─────────────────────────────────────────────────────────
  eyebrow: { fr: 'Rejoindre le jury', en: 'Join the jury', de: 'Jury beitreten' },
  title:   { fr: 'Devenir juré', en: 'Become a juror', de: 'Jurymitglied werden' },
  titleItalic: {
    fr: 'du Rotary Startup Award.',
    en: 'of the Rotary Startup Award.',
    de: 'des Rotary Startup Award.',
  },
  pitch: {
    fr: 'Entrepreneur, investisseur ou expert sectoriel ? Évaluez les startups finalistes aux côtés des Rotariens et des partenaires.',
    en: 'Entrepreneur, investor or sector expert? Evaluate the finalist startups alongside Rotarians and partners.',
    de: 'Unternehmer·in, Investor·in oder Branchenexpert·in? Bewerten Sie die Finalist-Startups gemeinsam mit Rotariern und Partnern.',
  },
  backToCandidater: {
    fr: 'Vous êtes une startup ? Candidater',
    en: 'Are you a startup? Apply here',
    de: 'Sie sind ein Startup? Hier bewerben',
  },

  // ── Sélection de compétition (pas de ?competition= dans l'URL) ─────────────
  pickCompetitionEyebrow: { fr: 'Compétition', en: 'Competition', de: 'Wettbewerb' },
  pickCompetitionTitle: {
    fr: 'À quelle compétition souhaitez-vous candidater ?',
    en: 'Which competition would you like to apply to?',
    de: 'Für welchen Wettbewerb möchten Sie sich bewerben?',
  },
  pickCompetitionSubtitle: {
    fr: 'Choisissez la compétition Rotary Startup Award dont vous souhaitez rejoindre le jury.',
    en: 'Pick the Rotary Startup Award competition whose jury you want to join.',
    de: 'Wählen Sie den Rotary-Startup-Award-Wettbewerb, dessen Jury Sie beitreten möchten.',
  },
  pickCompetitionLabel: { fr: 'Compétition', en: 'Competition', de: 'Wettbewerb' },
  pickCompetitionPlaceholder: {
    fr: 'Choisissez une compétition…',
    en: 'Pick a competition…',
    de: 'Wettbewerb wählen…',
  },
  noCompetitions: {
    fr: 'Aucune compétition n’est ouverte aux candidatures jury pour le moment.',
    en: 'No competition is currently open to jury applications.',
    de: 'Derzeit nimmt kein Wettbewerb Jury-Bewerbungen an.',
  },

  // ── Navigation ──────────────────────────────────────────────────────────────
  next: { fr: 'Suivant', en: 'Next', de: 'Weiter' },
  prev: { fr: 'Précédent', en: 'Back', de: 'Zurück' },
  submit: { fr: 'Confirmer ma participation', en: 'Confirm my participation', de: 'Teilnahme bestätigen' },
  submitting: { fr: 'Envoi…', en: 'Submitting…', de: 'Wird gesendet…' },
  edit: { fr: 'Modifier', en: 'Edit', de: 'Bearbeiten' },
  optional: { fr: 'facultatif', en: 'optional', de: 'optional' },
  charCount: { fr: 'caractères', en: 'characters', de: 'Zeichen' },
  step: { fr: 'Étape', en: 'Step', de: 'Schritt' },

  // ── Step 1 — Identité ──────────────────────────────────────────────────────
  step1Title: { fr: 'Votre identité', en: 'About you', de: 'Über Sie' },
  step1Subtitle: {
    fr: 'Renseignez les informations qui permettront au club de prendre contact.',
    en: 'Provide the details the club will use to reach out.',
    de: 'Geben Sie die Daten an, die der Club zur Kontaktaufnahme benötigt.',
  },
  fullName: { fr: 'Nom complet', en: 'Full name', de: 'Vollständiger Name' },
  fullNamePlaceholder: { fr: 'Prénom Nom', en: 'First Last', de: 'Vorname Nachname' },
  email: { fr: 'Email', en: 'Email', de: 'E-Mail' },
  emailHelp: {
    fr: 'Sert d’identifiant ; vous recevrez un magic-link en cas d’approbation.',
    en: 'Used as your sign-in id; a magic-link will be sent if approved.',
    de: 'Wird als Anmeldekennung verwendet; bei Genehmigung erhalten Sie einen Magic-Link.',
  },
  qualite: { fr: 'Qualité', en: 'Profile', de: 'Profil' },
  qualiteHelp: {
    fr: 'Sélectionnez la qualité qui décrit le mieux votre rôle.',
    en: 'Pick the profile that best describes your role.',
    de: 'Wählen Sie das Profil, das Ihre Rolle am besten beschreibt.',
  },
  qualitePlaceholder: { fr: 'Choisissez…', en: 'Pick one…', de: 'Auswählen…' },
  organisation: { fr: 'Organisation', en: 'Organisation', de: 'Organisation' },
  organisationHelp: {
    fr: 'Fonds, entreprise, cabinet… (facultatif).',
    en: 'Fund, company, firm… (optional).',
    de: 'Fonds, Unternehmen, Kanzlei… (optional).',
  },
  organisationPlaceholder: {
    fr: 'Fonds, entreprise, cabinet…',
    en: 'Fund, company, firm…',
    de: 'Fonds, Unternehmen, Kanzlei…',
  },

  // ── Step 2 — Présentation ──────────────────────────────────────────────────
  step2Title: { fr: 'Votre présentation', en: 'Your introduction', de: 'Ihre Vorstellung' },
  step2Subtitle: {
    fr: 'Quelques lignes pour permettre au club de comprendre votre apport au jury.',
    en: 'A few lines so the club understands what you bring to the jury.',
    de: 'Ein paar Zeilen, damit der Club Ihren Beitrag zur Jury einschätzen kann.',
  },
  bio: { fr: 'Bio courte', en: 'Short bio', de: 'Kurz-Bio' },
  bioHelp: {
    fr: 'Parcours, expertises, motivation. 1000 caractères max.',
    en: 'Background, expertise, motivation. 1000 characters max.',
    de: 'Werdegang, Expertise, Motivation. Max. 1000 Zeichen.',
  },
  bioPlaceholder: {
    fr: 'Parcours, expertises, motivation…',
    en: 'Background, expertise, motivation…',
    de: 'Werdegang, Expertise, Motivation…',
  },
  photo: { fr: 'Photo', en: 'Photo', de: 'Foto' },
  photoHelp: {
    fr: 'Une photo professionnelle pour les supports de présentation (JPG/PNG, 5 Mo max).',
    en: 'A professional photo for the session presentation materials (JPG/PNG, 5 MB max).',
    de: 'Ein professionelles Foto für die Präsentationsunterlagen (JPG/PNG, max. 5 MB).',
  },

  // ── Step 3 — Club (obligatoire) ────────────────────────────────────────────
  step3Title: { fr: 'Votre club', en: 'Your club', de: 'Ihr Club' },
  step3Subtitle: {
    fr: 'Choisissez le club Rotary dont vous souhaitez rejoindre le jury pour cette compétition.',
    en: 'Pick the Rotary club whose jury you want to join for this competition.',
    de: 'Wählen Sie den Rotary-Club, dessen Jury Sie für diesen Wettbewerb beitreten möchten.',
  },
  club: { fr: 'Club hôte', en: 'Host club', de: 'Gastgebender Club' },
  clubHint: {
    fr: 'Choisissez le club de votre pays ou le plus proche de vous.',
    en: 'Choose the club in your country or the one nearest to you.',
    de: 'Wählen Sie den Club in Ihrem Land oder den nächstgelegenen.',
  },
  clubPlaceholder: { fr: 'Choisissez un club…', en: 'Pick a club…', de: 'Club wählen…' },
  clubNone: {
    fr: 'Aucun club n’est rattaché à cette compétition pour le moment.',
    en: 'No club is attached to this competition yet.',
    de: 'Diesem Wettbewerb ist noch kein Club zugeordnet.',
  },
  errClubRequired: {
    fr: 'Sélectionnez un club hôte pour continuer.',
    en: 'Select a host club to continue.',
    de: 'Wählen Sie einen gastgebenden Club, um fortzufahren.',
  },

  // ── Step 4 — Disponibilités (cartes session + finale) ──────────────────────
  step4Title: { fr: 'Vos disponibilités', en: 'Your availability', de: 'Ihre Verfügbarkeit' },
  step4Subtitle: {
    fr: 'Sélectionnez les sessions pour lesquelles vous êtes disponible (visio, ~2h). La Grande Finale a lieu en présentiel.',
    en: 'Select the sessions you are available for (remote, ~2h). The Grand Final is held in person.',
    de: 'Wählen Sie die Sessions aus, für die Sie verfügbar sind (online, ~2 Std.). Das große Finale findet vor Ort statt.',
  },
  sessionsNone: {
    fr: 'Aucune session n’est encore publiée pour cette compétition. Le club vous proposera des créneaux après approbation.',
    en: 'No session is published yet for this competition. The club will share slots after approval.',
    de: 'Für diesen Wettbewerb ist noch keine Session veröffentlicht. Der Club teilt Termine nach der Freigabe mit.',
  },
  finaleCardTitle: { fr: 'Grande Finale', en: 'Grand Final', de: 'Großes Finale' },
  finaleCardNote: {
    fr: 'En présentiel · sous réserve de validation par le comité d’organisation.',
    en: 'In person · subject to validation by the organising committee.',
    de: 'Vor Ort · vorbehaltlich der Bestätigung durch das Organisationskomitee.',
  },
  closedTag: { fr: 'Inscriptions fermées', en: 'Registration closed', de: 'Anmeldung geschlossen' },
  closedNote: {
    fr: 'Brief envoyé · contactez l’organisation si besoin.',
    en: 'Brief sent · contact the organisation if needed.',
    de: 'Brief versendet · bei Bedarf die Organisation kontaktieren.',
  },
  errSessionsRequired: {
    fr: 'Sélectionnez au moins une session ou la Grande Finale.',
    en: 'Select at least one session or the Grand Final.',
    de: 'Wählen Sie mindestens eine Session oder das große Finale aus.',
  },

  // ── Step 5 — Récapitulatif ─────────────────────────────────────────────────
  step5Title: { fr: 'Vérifiez votre candidature', en: 'Review your application', de: 'Bewerbung prüfen' },
  step5Subtitle: {
    fr: 'Relisez vos réponses avant de confirmer. Vous pouvez encore éditer une étape.',
    en: 'Read your answers before confirming. You can still edit any step.',
    de: 'Bitte prüfen Sie Ihre Antworten vor der Bestätigung. Sie können jede Stufe noch bearbeiten.',
  },
  reviewIdentity: { fr: 'Identité', en: 'Identity', de: 'Identität' },
  reviewPresentation: { fr: 'Présentation', en: 'Introduction', de: 'Vorstellung' },
  reviewClub: { fr: 'Club', en: 'Club', de: 'Club' },
  reviewAvailability: { fr: 'Disponibilités', en: 'Availability', de: 'Verfügbarkeit' },
  notProvided: { fr: 'Non renseigné', en: 'Not provided', de: 'Nicht angegeben' },
  noPhoto: { fr: 'Aucune photo transmise.', en: 'No photo provided.', de: 'Kein Foto übermittelt.' },
  noAvailability: { fr: 'Aucune session sélectionnée.', en: 'No session selected.', de: 'Keine Session ausgewählt.' },

  // ── Erreurs validation ─────────────────────────────────────────────────────
  errRequired: { fr: 'Ce champ est requis.', en: 'This field is required.', de: 'Dieses Feld ist erforderlich.' },
  errEmail: { fr: 'Email invalide.', en: 'Invalid email.', de: 'Ungültige E-Mail.' },
  errNameShort: {
    fr: 'Le nom doit comporter au moins 2 caractères.',
    en: 'Name must be at least 2 characters long.',
    de: 'Der Name muss mindestens 2 Zeichen lang sein.',
  },
  errQualite: { fr: 'Sélectionnez une qualité.', en: 'Pick a profile.', de: 'Wählen Sie ein Profil.' },
  errBioLong: { fr: 'La bio dépasse 1000 caractères.', en: 'Bio exceeds 1000 characters.', de: 'Die Bio überschreitet 1000 Zeichen.' },
  errMissing: {
    fr: 'Des champs requis sont manquants. Complétez-les pour confirmer.',
    en: 'Some required fields are missing. Complete them to confirm.',
    de: 'Einige Pflichtfelder fehlen. Bitte ergänzen, um zu bestätigen.',
  },

  // ── Photo dropzone labels ──────────────────────────────────────────────────
  dzPrompt: { fr: 'Déposez votre photo', en: 'Drop your photo', de: 'Foto hier ablegen' },
  dzHint: { fr: 'ou cliquez pour parcourir', en: 'or click to browse', de: 'oder klicken zum Auswählen' },
  dzUploading: { fr: 'Envoi en cours…', en: 'Uploading…', de: 'Wird hochgeladen…' },
  dzReplace: { fr: 'Remplacer', en: 'Replace', de: 'Ersetzen' },
  dzRemove: { fr: 'Retirer', en: 'Remove', de: 'Entfernen' },
  dzErrFormat: { fr: 'Format non supporté (JPG/PNG).', en: 'Unsupported format (JPG/PNG).', de: 'Format nicht unterstützt (JPG/PNG).' },
  dzErrSize: { fr: 'Photo trop volumineuse (5 Mo max).', en: 'Photo too large (5 MB max).', de: 'Foto zu groß (max. 5 MB).' },
  dzErrUpload: { fr: 'Échec de l’envoi. Réessayez.', en: 'Upload failed. Try again.', de: 'Upload fehlgeschlagen. Erneut versuchen.' },

  // ── États transverses ──────────────────────────────────────────────────────
  loading: { fr: 'Chargement…', en: 'Loading…', de: 'Wird geladen…' },
  loadError: {
    fr: 'Une erreur est survenue. Réessayez dans un instant.',
    en: 'An error occurred. Please try again shortly.',
    de: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es gleich erneut.',
  },
  retry: { fr: 'Réessayer', en: 'Retry', de: 'Erneut versuchen' },
  competitionMissing: {
    fr: 'Compétition introuvable. Vérifiez le lien qui vous a été transmis.',
    en: 'Competition not found. Please check the link you were given.',
    de: 'Wettbewerb nicht gefunden. Bitte prüfen Sie den Ihnen mitgeteilten Link.',
  },
  alreadyPending: {
    fr: 'Une candidature en attente existe déjà pour cet email sur cette compétition.',
    en: 'A pending application already exists for this email on this competition.',
    de: 'Für diese E-Mail liegt bereits eine ausstehende Bewerbung für diesen Wettbewerb vor.',
  },
  submitError: {
    fr: 'Impossible de confirmer votre participation. Vérifiez vos informations puis réessayez.',
    en: 'Could not confirm your participation. Check your information and try again.',
    de: 'Teilnahme konnte nicht bestätigt werden. Bitte prüfen Sie Ihre Angaben und erneut versuchen.',
  },

  // ── Confirmation ───────────────────────────────────────────────────────────
  thanksTitle: { fr: 'Merci !', en: 'Thank you!', de: 'Vielen Dank!' },
  thanksBody: {
    fr: 'Votre candidature à la compétition {competition} a bien été reçue. Le club {club} vous contactera dans les prochains jours.',
    en: 'Your application to the {competition} competition has been received. The {club} club will reach out within the next few days.',
    de: 'Ihre Bewerbung für den Wettbewerb {competition} ist eingegangen. Der Club {club} wird sich in den nächsten Tagen melden.',
  },
  thanksNext: {
    fr: 'En cas d’approbation, vous recevrez un email avec un magic-link pour accéder à votre espace juré.',
    en: 'Upon approval, you will receive an email with a magic-link to access your jury area.',
    de: 'Bei Genehmigung erhalten Sie eine E-Mail mit einem Magic-Link zu Ihrem Jury-Bereich.',
  },
  thanksRecap: { fr: 'Récapitulatif', en: 'Summary', de: 'Zusammenfassung' },
  legal: {
    fr: 'Données utilisées exclusivement pour le Rotary Startup Award.',
    en: 'Data used exclusively for the Rotary Startup Award.',
    de: 'Daten werden ausschließlich für den Rotary Startup Award verwendet.',
  },
};
