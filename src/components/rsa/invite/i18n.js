// i18n — V2.5 user management (invite + delete modals).
//
// Dictionnaires { fr, en, de } consommés via useLang().t(...). Ne JAMAIS coder
// en dur de copie dans les composants (cf. docs/design/elysee-designbook.md §1.3,
// §11). Le pitch reste anglais (convention RSA international jury), mais le
// chrome de la plateforme est trilingue.

export const INVITE = {
  // ── titres / éléments structurants ─────────────────────────────────────────
  modalTitleGlobal: {
    fr: 'Inviter un administrateur',
    en: 'Invite an administrator',
    de: 'Administrator/in einladen',
  },
  modalTitleClub: {
    fr: 'Inviter un membre du club',
    en: 'Invite a club member',
    de: 'Clubmitglied einladen',
  },
  eyebrow: {
    fr: 'Invitation',
    en: 'Invitation',
    de: 'Einladung',
  },
  introGlobal: {
    fr: 'L\'invité recevra un email brandé avec un lien magique de connexion. Son rôle est appliqué immédiatement.',
    en: 'The recipient will receive a branded email with a magic sign-in link. Their role is applied immediately.',
    de: 'Die eingeladene Person erhält eine im Design der Plattform gestaltete E-Mail mit einem Magic-Link zur Anmeldung. Ihre Rolle wird sofort wirksam.',
  },
  introClub: {
    fr: 'Invite un membre dans ce club. L\'invité recevra un email brandé avec un lien magique de connexion.',
    en: 'Invite a member into this club. The recipient will receive a branded email with a magic sign-in link.',
    de: 'Laden Sie ein Mitglied in diesen Club ein. Die eingeladene Person erhält eine im Design der Plattform gestaltete E-Mail mit einem Magic-Link zur Anmeldung.',
  },

  // ── champs ────────────────────────────────────────────────────────────────
  emailLabel: { fr: 'Email', en: 'Email', de: 'E-Mail' },
  emailPlaceholder: {
    fr: 'prenom.nom@exemple.org',
    en: 'first.last@example.org',
    de: 'vorname.name@beispiel.org',
  },
  roleLabel: { fr: 'Rôle', en: 'Role', de: 'Rolle' },
  rolePlaceholder: {
    fr: 'Choisir un rôle',
    en: 'Choose a role',
    de: 'Rolle auswählen',
  },
  customMessageLabel: {
    fr: 'Message personnel (facultatif)',
    en: 'Personal note (optional)',
    de: 'Persönliche Nachricht (optional)',
  },
  customMessagePlaceholder: {
    fr: 'Quelques mots de bienvenue qui apparaîtront dans l\'email.',
    en: 'A few words of welcome that will appear in the email.',
    de: 'Einige persönliche Begrüßungsworte, die in der E-Mail erscheinen werden.',
  },
  customMessageHelper: {
    fr: '300 caractères maximum.',
    en: '300 characters maximum.',
    de: 'Maximal 300 Zeichen.',
  },

  // ── rôles ─────────────────────────────────────────────────────────────────
  roleMasterAdmin: { fr: 'Administrateur principal', en: 'Master administrator', de: 'Master-Administrator·in' },
  roleAdmin: { fr: 'Administrateur', en: 'Administrator', de: 'Administrator·in' },
  roleClubAdmin: { fr: 'Administrateur de club', en: 'Club administrator', de: 'Club-Administrator·in' },
  roleComite: { fr: 'Membre du comité', en: 'Selection committee member', de: 'Mitglied des Auswahlkomitees' },
  roleJury: { fr: 'Juré', en: 'Jury member', de: 'Jurymitglied' },

  // ── actions ───────────────────────────────────────────────────────────────
  cancel: { fr: 'Annuler', en: 'Cancel', de: 'Abbrechen' },
  submit: { fr: 'Inviter', en: 'Invite', de: 'Einladen' },
  submitting: { fr: 'Envoi…', en: 'Sending…', de: 'Wird gesendet…' },

  // ── feedback ──────────────────────────────────────────────────────────────
  successNew: {
    fr: 'Invitation envoyée.',
    en: 'Invitation sent.',
    de: 'Einladung versendet.',
  },
  successExisting: {
    fr: 'Cet utilisateur existe déjà — son rôle a été mis à jour et un email de bienvenue lui a été envoyé.',
    en: 'This user already exists — their role has been updated and a welcome email has been sent.',
    de: 'Dieser Nutzer existiert bereits — die Rolle wurde aktualisiert und eine Willkommens-E-Mail versendet.',
  },
  errorGeneric: {
    fr: 'L\'invitation n\'a pas pu être envoyée.',
    en: 'The invitation could not be sent.',
    de: 'Die Einladung konnte nicht gesendet werden.',
  },
  errorRateLimited: {
    fr: 'Une invitation a déjà été envoyée à cet email il y a moins d\'une heure.',
    en: 'An invitation was already sent to this email less than an hour ago.',
    de: 'Eine Einladung wurde bereits vor weniger als einer Stunde an diese E-Mail-Adresse gesendet.',
  },
  errorForbidden: {
    fr: 'Vous n\'avez pas les droits pour cette opération.',
    en: 'You do not have permission for this operation.',
    de: 'Sie haben keine Berechtigung für diese Aktion.',
  },
  errorClubRequired: {
    fr: 'Veuillez sélectionner un club pour ce rôle.',
    en: 'Please select a club for this role.',
    de: 'Bitte wählen Sie einen Club für diese Rolle aus.',
  },
  errorInvalidEmail: {
    fr: 'Email invalide.',
    en: 'Invalid email.',
    de: 'Ungültige E-Mail-Adresse.',
  },
};

export const DELETE_USER = {
  // ── titres ────────────────────────────────────────────────────────────────
  modalTitle: {
    fr: 'Supprimer définitivement le compte',
    en: 'Delete the account permanently',
    de: 'Konto endgültig löschen',
  },
  eyebrow: {
    fr: 'Suppression de compte',
    en: 'Account deletion',
    de: 'Kontolöschung',
  },

  // ── step 1 ────────────────────────────────────────────────────────────────
  step1Title: {
    fr: 'Cette action est définitive',
    en: 'This action is permanent',
    de: 'Diese Aktion ist endgültig',
  },
  step1Intro: {
    fr: 'Vous êtes sur le point de supprimer définitivement ce compte de la plateforme. Les éléments suivants seront effacés ou anonymisés :',
    en: 'You are about to permanently delete this account from the platform. The following will be erased or anonymised:',
    de: 'Sie sind dabei, dieses Konto endgültig von der Plattform zu löschen. Die folgenden Daten werden gelöscht oder anonymisiert:',
  },
  step1Bullets: {
    fr: [
      'Tous les rôles globaux (administrateur, comité, juré).',
      'Toutes les adhésions à des clubs (club_admin, comité, juré).',
      'Le profil juré associé (si applicable).',
      'Le compte d\'authentification (auth.users).',
      'Les références d\'audit (granted_by, sent_by, reviewed_by…) sont anonymisées.',
    ],
    en: [
      'All global roles (admin, committee, jury).',
      'All club memberships (club_admin, committee, jury).',
      'The associated jury profile (if applicable).',
      'The authentication account (auth.users).',
      'Audit references (granted_by, sent_by, reviewed_by…) are anonymised.',
    ],
    de: [
      'Sämtliche globalen Rollen (Administrator, Komitee, Jury).',
      'Sämtliche Clubmitgliedschaften (club_admin, Komitee, Jury).',
      'Das zugehörige Jury-Profil (sofern vorhanden).',
      'Das Authentifizierungskonto (auth.users).',
      'Audit-Verweise (granted_by, sent_by, reviewed_by…) werden anonymisiert.',
    ],
  },
  step1Continue: {
    fr: 'Continuer',
    en: 'Continue',
    de: 'Weiter',
  },

  // ── step 2 ────────────────────────────────────────────────────────────────
  step2Title: {
    fr: 'Confirmation de la suppression',
    en: 'Deletion confirmation',
    de: 'Löschbestätigung',
  },
  step2Intro: {
    fr: 'Pour confirmer, saisissez exactement la chaîne ci-dessous.',
    en: 'To confirm, type the exact string below.',
    de: 'Um zu bestätigen, geben Sie genau die untenstehende Zeichenfolge ein.',
  },
  step2TypedLabel: {
    fr: 'Saisie de confirmation',
    en: 'Confirmation input',
    de: 'Bestätigungseingabe',
  },
  step2TypedPlaceholder: {
    fr: 'DELETE-…',
    en: 'DELETE-…',
    de: 'DELETE-…',
  },
  step2TypedHelper: {
    fr: 'Sensible à la casse : DELETE- en majuscules.',
    en: 'Case-sensitive: DELETE- in uppercase.',
    de: 'Groß-/Kleinschreibung beachten: DELETE- in Großbuchstaben.',
  },
  step2Submit: {
    fr: 'Supprimer définitivement',
    en: 'Delete permanently',
    de: 'Endgültig löschen',
  },
  step2Submitting: {
    fr: 'Suppression…',
    en: 'Deleting…',
    de: 'Wird gelöscht…',
  },

  // ── step 3 (résultat) ──────────────────────────────────────────────────────
  step3SuccessTitle: {
    fr: 'Compte supprimé.',
    en: 'Account deleted.',
    de: 'Konto gelöscht.',
  },
  step3SuccessBody: {
    fr: 'Le compte et toutes ses adhésions ont été retirés. L\'opération est tracée dans le journal d\'audit.',
    en: 'The account and all its memberships have been removed. The operation is logged in the audit trail.',
    de: 'Das Konto und alle Mitgliedschaften wurden entfernt. Die Aktion ist im Audit-Log dokumentiert.',
  },
  step3ErrorTitle: {
    fr: 'La suppression a échoué.',
    en: 'The deletion failed.',
    de: 'Die Löschung ist fehlgeschlagen.',
  },
  step3Close: {
    fr: 'Fermer',
    en: 'Close',
    de: 'Schließen',
  },

  // ── erreurs ───────────────────────────────────────────────────────────────
  errorForbidden: {
    fr: 'Seul un administrateur principal peut supprimer un compte.',
    en: 'Only a master administrator can delete an account.',
    de: 'Nur ein Master-Administrator kann ein Konto löschen.',
  },
  errorSelfDelete: {
    fr: 'Vous ne pouvez pas supprimer votre propre compte via cette interface.',
    en: 'You cannot delete your own account through this interface.',
    de: 'Sie können Ihr eigenes Konto über diese Oberfläche nicht löschen.',
  },
  errorNotFound: {
    fr: 'Aucun compte ne correspond à cet email.',
    en: 'No account matches this email.',
    de: 'Kein Konto entspricht dieser E-Mail-Adresse.',
  },
  errorMismatch: {
    fr: 'La saisie de confirmation ne correspond pas.',
    en: 'The confirmation input does not match.',
    de: 'Die Bestätigungseingabe stimmt nicht überein.',
  },

  // ── common ────────────────────────────────────────────────────────────────
  cancel: { fr: 'Annuler', en: 'Cancel', de: 'Abbrechen' },
  targetLabel: { fr: 'Cible', en: 'Target', de: 'Ziel' },
};

// Map rôle -> clé i18n pour les options de Select.
export const ROLE_LABEL_KEYS = {
  master_admin: INVITE.roleMasterAdmin,
  admin: INVITE.roleAdmin,
  club_admin: INVITE.roleClubAdmin,
  comite: INVITE.roleComite,
  jury: INVITE.roleJury,
};
