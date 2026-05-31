// Dictionnaires trilingues FR/EN/DE du funnel d'acquisition jury (Module 7).
//
// Forme { fr, en, de } compatible avec useLang().t(dict) de @/lib/platform/i18n.
// Co-localisé sous src/components/rsa/candidature/ (le funnel public partage le
// vocabulaire et l'esthétique du tunnel startup). DE marqué `// TODO refine DE
// copy` quand la traduction reste à valider par un locuteur natif.

export const JURY_STEPS = [
  { id: 'identite',     label: { fr: 'Identité',       en: 'Identity',     de: 'Identität' } },
  { id: 'presentation', label: { fr: 'Présentation',   en: 'About you',    de: 'Vorstellung' } },
  { id: 'preferences',  label: { fr: 'Préférences',    en: 'Preferences',  de: 'Vorlieben' } },
  { id: 'review',       label: { fr: 'Récapitulatif',  en: 'Review',       de: 'Zusammenfassung' } },
];

export const JURY_STEP_IDS = JURY_STEPS.map((s) => s.id);

// Qualités acceptées par le RPC rsa_apply_jury (CHECK constraint côté SQL).
export const JURY_QUALITES = [
  { value: 'investisseur', label: { fr: 'Investisseur',     en: 'Investor',     de: 'Investor' } },
  { value: 'entrepreneur', label: { fr: 'Entrepreneur',     en: 'Entrepreneur', de: 'Unternehmer' } },
  { value: 'expert',       label: { fr: 'Expert sectoriel', en: 'Sector expert', de: 'Fachexperte' } },
  { value: 'corporate',    label: { fr: 'Corporate',        en: 'Corporate',    de: 'Konzern' } },
  { value: 'autre',        label: { fr: 'Autre',            en: 'Other',        de: 'Andere' } },
];

export const JURY_UI = {
  // En-tête + chrome
  eyebrow: { fr: 'Espace jury', en: 'Jury area', de: 'Jury-Bereich' },
  title: {
    fr: 'Rejoindre le jury',
    en: 'Join the jury',
    de: 'Der Jury beitreten',
  },
  subtitle: {
    fr: 'Soumettez votre candidature au jury du Rotary Startup Award. Le club valide chaque profil avant de vous transmettre les accès.',
    en: 'Submit your application to the Rotary Startup Award jury. The host club reviews each profile before granting access.',
    de: 'Bewerben Sie sich für die Jury des Rotary Startup Award. Der gastgebende Club prüft jedes Profil vor der Zugangsfreigabe.',
  },
  clubLabel: { fr: 'Club hôte', en: 'Host club', de: 'Gastgebender Club' },
  clubPickerTitle: {
    fr: 'Quel club souhaitez-vous rejoindre ?',
    en: 'Which club would you like to join?',
    de: 'Welchem Club möchten Sie beitreten?',
  },
  clubPickerHint: {
    fr: 'Sélectionnez le club Rotary dont vous souhaitez intégrer le jury.',
    en: 'Pick the Rotary club whose jury you want to join.',
    de: 'Wählen Sie den Rotary-Club aus, dessen Jury Sie beitreten möchten.',
  },
  clubPickerPlaceholder: {
    fr: 'Choisissez un club…',
    en: 'Pick a club…',
    de: 'Club wählen…',
  },
  clubMissing: {
    fr: 'Club introuvable. Vérifiez le lien qui vous a été transmis.',
    en: 'Club not found. Please check the link you were given.',
    de: 'Club nicht gefunden. Bitte prüfen Sie den Ihnen mitgeteilten Link.',
  },
  noClubs: {
    fr: 'Aucun club n’est ouvert aux candidatures jury pour le moment.',
    en: 'No club is currently open to jury applications.',
    de: 'Derzeit nimmt kein Club Jury-Bewerbungen an.',
  },
  next: { fr: 'Suivant', en: 'Next', de: 'Weiter' },
  prev: { fr: 'Précédent', en: 'Back', de: 'Zurück' },
  submit: { fr: 'Soumettre ma candidature', en: 'Submit my application', de: 'Bewerbung absenden' },
  submitting: { fr: 'Envoi…', en: 'Submitting…', de: 'Wird gesendet…' },
  edit: { fr: 'Modifier', en: 'Edit', de: 'Bearbeiten' },
  optional: { fr: 'facultatif', en: 'optional', de: 'optional' },
  charCount: { fr: 'caractères', en: 'characters', de: 'Zeichen' },

  // Step 1 — Identité
  step1Title: { fr: 'Votre identité', en: 'About you', de: 'Über Sie' },
  step1Subtitle: {
    fr: 'Renseignez les informations qui permettront au club de prendre contact.',
    en: 'Provide the details the club will use to reach out.',
    de: 'Geben Sie die Daten an, die der Club zur Kontaktaufnahme benötigt.',
  },
  fullName: { fr: 'Nom complet', en: 'Full name', de: 'Vollständiger Name' },
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

  // Step 2 — Présentation
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
  photo: { fr: 'Photo', en: 'Photo', de: 'Foto' },
  photoHelp: {
    fr: 'Une photo professionnelle pour le profil interne (JPG/PNG, 5 Mo max). Facultatif.',
    en: 'A professional photo for the internal profile (JPG/PNG, 5 MB max). Optional.',
    de: 'Ein professionelles Foto für das interne Profil (JPG/PNG, max. 5 MB). Optional.',
  },

  // Step 3 — Préférences
  step3Title: { fr: 'Vos préférences', en: 'Your preferences', de: 'Ihre Vorlieben' },
  step3Subtitle: {
    fr: 'Indiquez les sessions auxquelles vous pourriez participer et les thèmes qui vous intéressent.',
    en: 'Tell us which sessions you could attend and the themes you care about.',
    de: 'Teilen Sie uns mit, an welchen Sessions Sie teilnehmen könnten und welche Themen Sie interessieren.',
  },
  themes: { fr: 'Thèmes préférés', en: 'Preferred themes', de: 'Bevorzugte Themen' },
  themesHelp: {
    fr: 'Choisissez parmi les clusters proposés par le club.',
    en: 'Pick from the clusters offered by the club.',
    de: 'Wählen Sie aus den vom Club angebotenen Clustern.',
  },
  themesPlaceholder: { fr: 'Ajouter un thème…', en: 'Add a theme…', de: 'Thema hinzufügen…' },
  themesFreeform: {
    fr: 'Thèmes libres (séparés par des virgules)',
    en: 'Free-form themes (comma-separated)',
    de: 'Freie Themen (kommagetrennt)',
  },
  themesFreeformHelp: {
    fr: 'Aucune session publique n’est encore définie : décrivez vos thèmes d’intérêt librement.',
    en: 'No public session is defined yet: describe your themes of interest freely.',
    de: 'Es ist noch keine öffentliche Session definiert: Beschreiben Sie Ihre Themen frei.',
  },
  themesFreeformPlaceholder: {
    fr: 'ex. foodtech, climate, deeptech',
    en: 'e.g. foodtech, climate, deeptech',
    de: 'z. B. Foodtech, Climate, Deeptech',
  },
  availability: { fr: 'Disponibilités', en: 'Availability', de: 'Verfügbarkeit' },
  availabilityHelp: {
    fr: 'Cochez les sessions auxquelles vous pourriez siéger.',
    en: 'Tick the sessions you could attend.',
    de: 'Markieren Sie die Sessions, an denen Sie teilnehmen könnten.',
  },
  availabilityNone: {
    fr: 'Aucune session ouverte pour le moment. Le club vous proposera des créneaux après approbation.',
    en: 'No session open yet. The club will share slots with you after approval.',
    de: 'Noch keine offene Session. Der Club teilt Termine nach der Freigabe mit.',
  },

  // Step 4 — Récap
  step4Title: { fr: 'Vérifiez votre candidature', en: 'Review your application', de: 'Bewerbung prüfen' },
  step4Subtitle: {
    fr: 'Relisez vos réponses avant de soumettre. Vous pourrez encore éditer une étape via le bouton dédié.',
    en: 'Read your answers before submitting. You can still edit any step using the dedicated button.',
    de: 'Bitte prüfen Sie Ihre Antworten vor dem Absenden. Sie können jede Stufe noch über die Schaltfläche bearbeiten.',
  },
  reviewSectionIdentity: { fr: 'Identité', en: 'Identity', de: 'Identität' },
  reviewSectionPresentation: { fr: 'Présentation', en: 'Introduction', de: 'Vorstellung' },
  reviewSectionPreferences: { fr: 'Préférences', en: 'Preferences', de: 'Vorlieben' },
  notProvided: { fr: 'Non renseigné', en: 'Not provided', de: 'Nicht angegeben' },
  noPhoto: { fr: 'Aucune photo transmise.', en: 'No photo provided.', de: 'Kein Foto übermittelt.' },
  noThemes: { fr: 'Aucun thème sélectionné.', en: 'No theme selected.', de: 'Kein Thema ausgewählt.' },
  noAvailability: { fr: 'Aucune session cochée.', en: 'No session ticked.', de: 'Keine Session markiert.' },

  // Erreurs validation
  errRequired: { fr: 'Ce champ est requis.', en: 'This field is required.', de: 'Dieses Feld ist erforderlich.' },
  errEmail: { fr: 'Email invalide.', en: 'Invalid email.', de: 'Ungültige E-Mail.' },
  errNameShort: {
    fr: 'Le nom doit comporter au moins 2 caractères.',
    en: 'Name must be at least 2 characters long.',
    de: 'Der Name muss mindestens 2 Zeichen lang sein.',
  },
  errQualite: {
    fr: 'Sélectionnez une qualité.',
    en: 'Pick a profile.',
    de: 'Wählen Sie ein Profil.',
  },
  errBioLong: {
    fr: 'La bio dépasse 1000 caractères.',
    en: 'Bio exceeds 1000 characters.',
    de: 'Die Bio überschreitet 1000 Zeichen.',
  },
  errMissing: {
    fr: 'Des champs requis sont manquants. Complétez-les pour soumettre.',
    en: 'Some required fields are missing. Complete them to submit.',
    de: 'Einige Pflichtfelder fehlen. Bitte ergänzen, um abzusenden.',
  },

  // Photo dropzone labels
  dzPrompt: { fr: 'Déposez votre photo', en: 'Drop your photo', de: 'Foto hier ablegen' },
  dzHint: { fr: 'ou cliquez pour parcourir', en: 'or click to browse', de: 'oder klicken zum Auswählen' },
  dzUploading: { fr: 'Envoi en cours…', en: 'Uploading…', de: 'Wird hochgeladen…' },
  dzReplace: { fr: 'Remplacer', en: 'Replace', de: 'Ersetzen' },
  dzRemove: { fr: 'Retirer', en: 'Remove', de: 'Entfernen' },
  dzErrFormat: { fr: 'Format non supporté (JPG/PNG).', en: 'Unsupported format (JPG/PNG).', de: 'Format nicht unterstützt (JPG/PNG).' },
  dzErrSize: { fr: 'Photo trop volumineuse (5 Mo max).', en: 'Photo too large (5 MB max).', de: 'Foto zu groß (max. 5 MB).' },
  dzErrUpload: { fr: 'Échec de l’envoi. Réessayez.', en: 'Upload failed. Try again.', de: 'Upload fehlgeschlagen. Erneut versuchen.' },

  // États transverses
  loading: { fr: 'Chargement…', en: 'Loading…', de: 'Wird geladen…' },
  loadError: {
    fr: 'Une erreur est survenue. Réessayez dans un instant.',
    en: 'An error occurred. Please try again shortly.',
    de: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es gleich erneut.',
  },
  retry: { fr: 'Réessayer', en: 'Retry', de: 'Erneut versuchen' },
  alreadyPending: {
    fr: 'Une candidature en attente existe déjà pour cet email dans ce club. Le responsable du club a été notifié.',
    en: 'A pending application already exists for this email in this club. The club lead has been notified.',
    de: 'Für diese E-Mail liegt bereits eine ausstehende Bewerbung für diesen Club vor. Die Clubleitung wurde benachrichtigt.',
  },
  submitError: {
    fr: 'Impossible de soumettre votre candidature. Vérifiez vos informations puis réessayez.',
    en: 'Could not submit your application. Check your information and try again.',
    de: 'Bewerbung konnte nicht gesendet werden. Bitte prüfen Sie Ihre Angaben und erneut versuchen.',
  },

  // Confirmation
  thanksTitle: { fr: 'Merci !', en: 'Thank you!', de: 'Vielen Dank!' },
  thanksBody: {
    fr: 'Votre candidature au club {club} a bien été reçue. Le responsable du club vous contactera dans les prochains jours.',
    en: 'Your application to the {club} club has been received. The club lead will reach out within the next few days.',
    de: 'Ihre Bewerbung beim Club {club} ist eingegangen. Die Clubleitung wird sich in den nächsten Tagen melden.',
  },
  thanksNext: {
    fr: 'En cas d’approbation, vous recevrez un email avec un magic-link pour accéder à votre espace juré.',
    en: 'Upon approval, you will receive an email with a magic-link to access your jury area.',
    de: 'Bei Genehmigung erhalten Sie eine E-Mail mit einem Magic-Link zu Ihrem Jury-Bereich.',
  },
  thanksAck: { fr: 'Fermer', en: 'Close', de: 'Schließen' },
};

// ── Dictionnaire dédié à la tab JuryApplicationsTab (Cockpit Club) ──────────
export const JURY_TAB_UI = {
  eyebrow: { fr: 'Candidatures jury', en: 'Jury applications', de: 'Jury-Bewerbungen' },
  title: { fr: 'Candidatures au jury', en: 'Jury applications', de: 'Jury-Bewerbungen' },
  subtitle: {
    fr: 'Revoyez les candidatures déposées via le funnel public, approuvez ou refusez chaque profil.',
    en: 'Review applications received from the public funnel, approve or reject each profile.',
    de: 'Prüfen Sie die über das öffentliche Funnel eingegangenen Bewerbungen und entscheiden Sie pro Profil.',
  },
  shareLink: { fr: 'Lien public à partager', en: 'Public link to share', de: 'Öffentlicher Link zum Teilen' },
  copy: { fr: 'Copier', en: 'Copy', de: 'Kopieren' },
  copied: { fr: 'Copié', en: 'Copied', de: 'Kopiert' },

  filterAll: { fr: 'Toutes', en: 'All', de: 'Alle' },
  filterPending: { fr: 'En attente', en: 'Pending', de: 'Ausstehend' },
  filterApproved: { fr: 'Approuvées', en: 'Approved', de: 'Genehmigt' },
  filterRejected: { fr: 'Refusées', en: 'Rejected', de: 'Abgelehnt' },

  countOne: { fr: 'candidature', en: 'application', de: 'Bewerbung' },
  countMany: { fr: 'candidatures', en: 'applications', de: 'Bewerbungen' },

  empty: {
    fr: 'Aucune candidature pour ce filtre.',
    en: 'No application matches this filter.',
    de: 'Keine Bewerbung für diesen Filter.',
  },

  qualiteLabel: { fr: 'Qualité', en: 'Profile', de: 'Profil' },
  organisationLabel: { fr: 'Organisation', en: 'Organisation', de: 'Organisation' },
  bioLabel: { fr: 'Bio', en: 'Bio', de: 'Bio' },
  themesLabel: { fr: 'Thèmes préférés', en: 'Preferred themes', de: 'Bevorzugte Themen' },
  availabilityLabel: { fr: 'Disponibilités', en: 'Availability', de: 'Verfügbarkeit' },
  appliedAt: { fr: 'Soumise le', en: 'Submitted on', de: 'Eingereicht am' },
  reviewedBy: { fr: 'Décidée par', en: 'Decided by', de: 'Entschieden von' },
  reviewedAt: { fr: 'le', en: 'on', de: 'am' },
  noteLabel: { fr: 'Note', en: 'Note', de: 'Notiz' },

  approve: { fr: 'Approuver', en: 'Approve', de: 'Genehmigen' },
  reject: { fr: 'Refuser', en: 'Reject', de: 'Ablehnen' },

  approveSuccess: {
    fr: 'Approuvé ! Le candidat est désormais juré du club.',
    en: 'Approved! The candidate is now a club juror.',
    de: 'Genehmigt! Der/die Kandidat·in ist nun Juror·in des Clubs.',
  },
  approveInvited: {
    fr: 'Approuvé ! Compte créé et email d’accès envoyé au juré.',
    en: 'Approved! Account created and access email sent to the juror.',
    de: 'Genehmigt! Konto erstellt und Zugangs-E-Mail an das Jurymitglied gesendet.',
  },
  approveInviteError: {
    fr: 'Approbation enregistrée, mais l’envoi de l’email d’accès a échoué. Réessayez ou invitez le juré via l’Email Studio.',
    en: 'Approval saved, but sending the access email failed. Retry or invite the juror via the Email Studio.',
    de: 'Genehmigung gespeichert, aber der Versand der Zugangs-E-Mail ist fehlgeschlagen. Erneut versuchen oder über das Email Studio einladen.',
  },
  approveNeedsAuthTitle: {
    fr: 'Approbation enregistrée — finalisation requise',
    en: 'Approval recorded — finalisation needed',
    de: 'Genehmigung gespeichert — Finalisierung erforderlich',
  },
  approveNeedsAuthBody: {
    fr: 'Ce candidat n’a pas encore de compte. Envoyez-lui un magic-link via l’Email Studio (Module 9) pour qu’il se connecte une fois. Le membership jury sera créé automatiquement à sa première connexion.',
    en: 'This candidate has no account yet. Send them a magic-link via the Email Studio (Module 9) so they sign in once. The jury membership will be created automatically on their first sign-in.',
    de: 'Diese·r Kandidat·in hat noch kein Konto. Senden Sie ihm/ihr einen Magic-Link über das Email Studio (Modul 9), damit er/sie sich einmal anmeldet. Die Jury-Mitgliedschaft wird bei der ersten Anmeldung automatisch erstellt.',
  },
  copyEmail: { fr: 'Copier l’email', en: 'Copy email', de: 'E-Mail kopieren' },

  rejectModalTitle: { fr: 'Refuser cette candidature ?', en: 'Reject this application?', de: 'Bewerbung ablehnen?' },
  rejectModalBody: {
    fr: 'Vous pouvez ajouter une raison (visible uniquement par l’équipe du club). Pour confirmer, tapez "REFUSER".',
    en: 'You may add a reason (visible only to the club team). Type "REJECT" to confirm.',
    de: 'Sie können eine Begründung hinzufügen (nur für das Clubteam sichtbar). Geben Sie "REJECT" zur Bestätigung ein.',
  },
  rejectModalPlaceholder: {
    fr: 'Raison (facultatif)…',
    en: 'Reason (optional)…',
    de: 'Begründung (optional)…',
  },
  rejectConfirmWord: { fr: 'REFUSER', en: 'REJECT', de: 'REJECT' },
  rejectSuccess: {
    fr: 'Candidature refusée.',
    en: 'Application rejected.',
    de: 'Bewerbung abgelehnt.',
  },
  cancel: { fr: 'Annuler', en: 'Cancel', de: 'Abbrechen' },

  // Status pills (labels custom — la JuryApplicationsTab ne réutilise pas
  // dossier/eligibility/jury lifecycles).
  statusPending: { fr: 'En attente', en: 'Pending', de: 'Ausstehend' },
  statusApproved: { fr: 'Approuvée', en: 'Approved', de: 'Genehmigt' },
  statusRejected: { fr: 'Refusée', en: 'Rejected', de: 'Abgelehnt' },
  statusCancelled: { fr: 'Annulée', en: 'Cancelled', de: 'Storniert' },
};
