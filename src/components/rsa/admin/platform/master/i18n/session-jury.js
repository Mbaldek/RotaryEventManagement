// ── Session jury composition (V3.0 Prizes V2 — équipe jurys par session) ─────
// Strings du panneau "Composition du jury" rendu sous chaque SessionCard du
// SessionsManager Club Cockpit + AddJurorModal (3 modes : existant, créer,
// inviter par email). Importé par les composants club/jury/* ; AUCUN
// composant master/* n'utilise ce dict.
export const SESSION_JURY = {
  sectionTitle: { fr: 'Composition du jury', en: 'Jury composition', de: 'Jury-Zusammensetzung' },
  sectionHint: {
    fr: 'Définissez les jurés de chaque session. Les jurés "spéciaux" sont des experts externes au Rotary.',
    en: 'Define the jurors for each session. "Special" jurors are external experts (non-Rotarians).',
    de: 'Definieren Sie die Juroren jeder Session. "Sonder"-Juroren sind externe Experten (nicht-Rotarier).',
  },
  roleRegular: { fr: 'Régulier', en: 'Regular', de: 'Regulär' },
  roleSpecial: { fr: 'Spécial', en: 'Special', de: 'Sonder' },
  roleSpecialHint: {
    fr: "Expert externe ajouté manuellement par l'organisateur (non-Rotarien).",
    en: 'External expert added manually by the organiser (non-Rotarian).',
    de: 'Externer Experte, manuell vom Veranstalter hinzugefügt (nicht-Rotarier).',
  },
  addJuror: { fr: 'Ajouter un juré', en: 'Add a juror', de: 'Juror hinzufügen' },
  modeExisting: { fr: 'Sélectionner un juré existant', en: 'Pick an existing juror', de: 'Vorhandenen Juror auswählen' },
  modeCreate: { fr: 'Créer un juré externe', en: 'Create an external juror', de: 'Externen Juror anlegen' },
  modeInvite: { fr: 'Inviter par email', en: 'Invite by email', de: 'Per E-Mail einladen' },
  formRoleTitle: { fr: 'Fonction / Titre', en: 'Role / Title', de: 'Funktion / Titel' },
  formQualite: { fr: 'Qualité', en: 'Profile', de: 'Profil' },
  formOrganisation: { fr: 'Organisation / entreprise', en: 'Organisation / company', de: 'Organisation / Unternehmen' },
  formBio: { fr: 'Bio courte', en: 'Short bio', de: 'Kurzbio' },
  formPhoto: { fr: 'Photo (optionnelle)', en: 'Photo (optional)', de: 'Foto (optional)' },
  formEmail: { fr: 'Email', en: 'Email', de: 'E-Mail' },
  formFirstName: { fr: 'Prénom', en: 'First name', de: 'Vorname' },
  formLastName: { fr: 'Nom', en: 'Last name', de: 'Nachname' },
  remove: { fr: 'Retirer', en: 'Remove', de: 'Entfernen' },
  removeBlockedScores: {
    fr: 'Ce juré a déjà saisi des scores et ne peut être retiré.',
    en: 'This juror has already submitted scores and cannot be removed.',
    de: 'Dieser Juror hat bereits Bewertungen abgegeben und kann nicht entfernt werden.',
  },
  jurorCreated: { fr: 'Juré créé.', en: 'Juror created.', de: 'Juror angelegt.' },
  jurorInvited: { fr: 'Invitation envoyée.', en: 'Invitation sent.', de: 'Einladung gesendet.' },
  jurorAssigned: { fr: 'Juré ajouté.', en: 'Juror added.', de: 'Juror hinzugefügt.' },
  jurorRemoved: { fr: 'Juré retiré.', en: 'Juror removed.', de: 'Juror entfernt.' },
  empty: {
    fr: "Aucun juré assigné à cette session pour l'instant.",
    en: 'No juror assigned to this session yet.',
    de: 'Diesem Session-Slot ist noch kein Juror zugewiesen.',
  },
  // Petits strings additionnels pour la modale et la liste
  modalEyebrow: { fr: 'Composition du jury', en: 'Jury composition', de: 'Jury-Zusammensetzung' },
  modalSubmit: { fr: 'Ajouter', en: 'Add', de: 'Hinzufügen' },
  modalCancel: { fr: 'Annuler', en: 'Cancel', de: 'Abbrechen' },
  pickJurorPlaceholder: { fr: 'Choisir un juré…', en: 'Pick a juror…', de: 'Juror wählen…' },
  noPoolAvailable: {
    fr: 'Aucun juré disponible dans le pool de ce club. Utilisez « Créer un juré externe » ou « Inviter par email ».',
    en: 'No juror available in this club’s pool. Use "Create an external juror" or "Invite by email".',
    de: 'Kein Juror im Pool dieses Clubs verfügbar. Nutzen Sie „Externen Juror anlegen" oder „Per E-Mail einladen".',
  },
  errInvalidEmail: { fr: 'Adresse email invalide.', en: 'Invalid email address.', de: 'Ungültige E-Mail-Adresse.' },
  errQualiteRequired: { fr: 'La qualité est requise.', en: 'Title is required.', de: 'Funktion ist erforderlich.' },
  errPhotoUpload: { fr: "Échec de l'envoi de la photo.", en: 'Photo upload failed.', de: 'Foto-Upload fehlgeschlagen.' },
  uploading: { fr: 'Envoi…', en: 'Uploading…', de: 'Wird hochgeladen…' },
  ghostBadge: {
    fr: 'En attente de connexion',
    en: 'Awaiting sign-in',
    de: 'Wartet auf Anmeldung',
  },
};
