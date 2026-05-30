// ── Competition admins tab (master_admin only) ─────────────────────────────
export const COMP_ADMINS = {
  sectionTitle: {
    fr: 'Admins compétition',
    en: 'Competition admins',
    de: 'Wettbewerbs-Administratoren',
  },
  intro: {
    fr: 'Un admin compétition pilote une édition entière (toutes les sessions, tous les clubs participants) sans avoir les pouvoirs plateforme du master. Sélectionnez une compétition pour voir ses admins.',
    en: 'A competition admin runs a whole edition (every session, every participating club) without holding platform-wide master powers. Pick a competition to see its admins.',
    de: 'Ein Wettbewerbs-Administrator führt eine ganze Ausgabe (alle Sessions, alle teilnehmenden Clubs), ohne die plattformweiten Master-Rechte zu besitzen. Wählen Sie einen Wettbewerb, um dessen Administratoren zu sehen.',
  },
  pickCompetition: {
    fr: 'Compétition',
    en: 'Competition',
    de: 'Wettbewerb',
  },
  pickCompetitionPlaceholder: {
    fr: 'Choisissez une compétition',
    en: 'Pick a competition',
    de: 'Wählen Sie einen Wettbewerb',
  },
  noCompetitions: {
    fr: 'Aucune compétition pour l’instant. Créez-en une avant d’attribuer des admins.',
    en: 'No competitions yet. Create one before granting admin rights.',
    de: 'Noch keine Wettbewerbe. Erstellen Sie zuerst einen, bevor Sie Admin-Rechte vergeben.',
  },
  inviteButton: {
    fr: 'Inviter admin compétition',
    en: 'Invite competition admin',
    de: 'Wettbewerbs-Administrator·in einladen',
  },
  empty: {
    fr: 'Aucun admin pour cette compétition.',
    en: 'No admin yet for this competition.',
    de: 'Noch kein Administrator für diesen Wettbewerb.',
  },
  emptyHint: {
    fr: 'Cliquez sur « Inviter admin compétition » pour déléguer la gestion d’une édition à un membre Rotary.',
    en: 'Click “Invite competition admin” to delegate an edition to a Rotary member.',
    de: 'Klicken Sie auf „Wettbewerbs-Administrator·in einladen", um die Verwaltung einer Ausgabe an ein Rotary-Mitglied zu delegieren.',
  },
  loading: {
    fr: 'Chargement des admins…',
    en: 'Loading admins…',
    de: 'Administratoren werden geladen…',
  },
  loadError: {
    fr: 'Impossible de charger les admins. Réessayez.',
    en: 'Could not load admins. Please retry.',
    de: 'Administratoren konnten nicht geladen werden. Bitte erneut versuchen.',
  },
  colEmail:     { fr: 'Email',           en: 'Email',           de: 'E-Mail' },
  colName:      { fr: 'Nom',             en: 'Name',            de: 'Name' },
  colGrantedAt: { fr: 'Promu le',        en: 'Granted on',      de: 'Zugewiesen am' },
  colActions:   { fr: 'Actions',         en: 'Actions',         de: 'Aktionen' },
  revokeAction: { fr: 'Révoquer',        en: 'Revoke',          de: 'Entziehen' },

  // Invite modal
  modalEyebrow: {
    fr: 'Nouvel admin compétition',
    en: 'New competition admin',
    de: 'Neuer Wettbewerbs-Administrator',
  },
  modalTitle: {
    fr: 'Inviter un admin compétition',
    en: 'Invite a competition admin',
    de: 'Wettbewerbs-Administrator·in einladen',
  },
  modalSubtitle: {
    fr: 'L’invité recevra un magic-link et un message expliquant son rôle.',
    en: 'The invitee will receive a magic-link with an explanation of their role.',
    de: 'Die eingeladene Person erhält einen Magic-Link mit einer Erläuterung der Rolle.',
  },
  emailLabel: { fr: 'Email', en: 'Email', de: 'E-Mail' },
  emailPlaceholder: {
    fr: 'utilisateur@rotary-club.org',
    en: 'user@rotary-club.org',
    de: 'benutzer@rotary-club.org',
  },
  emailHelper: {
    fr: 'L’adresse à laquelle envoyer le magic-link. Doit appartenir à un membre Rotary identifiable.',
    en: 'Email address to receive the magic-link. Must belong to an identifiable Rotary member.',
    de: 'E-Mail-Adresse für den Magic-Link. Muss einer identifizierbaren Rotary-Person gehören.',
  },
  inviteSubmit: { fr: 'Envoyer l’invitation', en: 'Send invitation', de: 'Einladung senden' },
  inviting:     { fr: 'Envoi…',                en: 'Sending…',         de: 'Wird gesendet…' },
  inviteSuccess: {
    fr: 'Invitation envoyée.',
    en: 'Invitation sent.',
    de: 'Einladung versendet.',
  },
  inviteError: {
    fr: 'Échec de l’envoi : ',
    en: 'Could not send invitation: ',
    de: 'Senden fehlgeschlagen: ',
  },
  errInvalidEmail: {
    fr: 'Adresse email invalide.',
    en: 'Invalid email address.',
    de: 'Ungültige E-Mail-Adresse.',
  },

  // Revoke (typed-confirm)
  revokeTitle: {
    fr: 'Révoquer cet admin compétition',
    en: 'Revoke this competition admin',
    de: 'Diese Wettbewerbs-Administrator·in entziehen',
  },
  revokeBody: {
    fr: 'Cette action retire immédiatement l’accès à la compétition. Tapez REVOQUER {email} pour confirmer.',
    en: 'This immediately revokes access to the competition. Type REVOKE {email} to confirm.',
    de: 'Damit wird der Zugriff auf den Wettbewerb sofort entzogen. Tippen Sie REVOKE {email} ein, um zu bestätigen.',
  },
  revokeTypedWordFr: { fr: 'REVOQUER', en: 'REVOQUER', de: 'REVOQUER' },
  revokeTypedWordEn: { fr: 'REVOKE',   en: 'REVOKE',   de: 'REVOKE' },
  revokeTypedWordDe: { fr: 'REVOKE',   en: 'REVOKE',   de: 'REVOKE' },
  revokeTypedPrompt: {
    fr: 'Recopiez la phrase ci-dessus',
    en: 'Copy the phrase above',
    de: 'Übernehmen Sie den oben angezeigten Wortlaut',
  },
  revokeConfirmCta: {
    fr: 'Révoquer définitivement',
    en: 'Revoke permanently',
    de: 'Endgültig entziehen',
  },
  revokeCancel: { fr: 'Annuler', en: 'Cancel', de: 'Abbrechen' },
  revokeMismatch: {
    fr: 'La phrase ne correspond pas.',
    en: 'The phrase does not match.',
    de: 'Der Wortlaut stimmt nicht überein.',
  },
  revokeSuccess: {
    fr: 'Admin compétition révoqué.',
    en: 'Competition admin revoked.',
    de: 'Wettbewerbs-Administrator·in entzogen.',
  },
  revokeError: {
    fr: 'Échec de la révocation.',
    en: 'Could not revoke.',
    de: 'Entziehen fehlgeschlagen.',
  },
};
