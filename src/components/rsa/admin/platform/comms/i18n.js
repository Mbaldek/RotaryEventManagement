// i18n trilingue FR/EN/DE pour le Module 9 — Email Studio.
//
// Forme { fr, en, de } compatible useLang().t(dict). Toute string utilisateur
// passe par ce dictionnaire — jamais hardcodé dans les composants.
//
// Voix éditoriale : courtoise, factuelle, institutionnelle (cf. designbook §1.3).

// ── Sub-tabs internes ───────────────────────────────────────────────────────
export const COMMS_TABS = {
  composer:  { fr: 'Composer',      en: 'Composer',     de: 'Verfassen' },
  templates: { fr: 'Modèles',       en: 'Templates',    de: 'Vorlagen' },
  history:   { fr: 'Historique',    en: 'History',      de: 'Verlauf' },
};

export const COMMS_TAB_IDS = ['composer', 'templates', 'history'];

// ── Page header ─────────────────────────────────────────────────────────────
export const COMMS_UI = {
  eyebrow:    { fr: 'Communications', en: 'Communications', de: 'Kommunikation' },
  titleLead:  { fr: 'Email',           en: 'Email',          de: 'E-Mail' },
  titleItalic: { fr: 'Studio',         en: 'Studio',         de: 'Studio' },
  subtitle: {
    fr: 'Composez, prévisualisez et envoyez un email brandé Élysée à une audience ciblée en quelques secondes.',
    en: 'Compose, preview and send an Élysée-branded email to a targeted audience in seconds.',
    de: 'Verfassen, vorschauen und senden Sie eine Élysée-Branded-E-Mail an eine gezielte Zielgruppe in Sekunden.',
  },
  loading:    { fr: 'Chargement…',     en: 'Loading…',       de: 'Lädt…' },
  loadError:  {
    fr: 'Impossible de charger les données. Réessayez plus tard.',
    en: 'Could not load the data. Please try again later.',
    de: 'Daten konnten nicht geladen werden. Bitte später erneut versuchen.',
  },
  empty:      { fr: 'Aucun élément.',  en: 'Nothing here yet.', de: 'Noch nichts vorhanden.' },
  cancel:     { fr: 'Annuler',         en: 'Cancel',         de: 'Abbrechen' },
  close:      { fr: 'Fermer',          en: 'Close',          de: 'Schließen' },
  save:       { fr: 'Enregistrer',     en: 'Save',           de: 'Speichern' },
  saving:     { fr: 'Enregistrement…', en: 'Saving…',        de: 'Speichern…' },
  saved:      { fr: 'Enregistré',      en: 'Saved',          de: 'Gespeichert' },
  delete:     { fr: 'Supprimer',       en: 'Delete',         de: 'Löschen' },
  edit:       { fr: 'Éditer',          en: 'Edit',           de: 'Bearbeiten' },
  insert:     { fr: 'Insérer dans le composer', en: 'Insert into composer', de: 'Im Editor einfügen' },
  newTemplate: { fr: 'Nouveau modèle', en: 'New template',   de: 'Neue Vorlage' },
};

// ── Composer ────────────────────────────────────────────────────────────────
export const COMMS_COMPOSER = {
  subjectLabel: { fr: 'Sujet',        en: 'Subject',       de: 'Betreff' },
  subjectPlaceholder: {
    fr: 'Rappel J-7 — session jury Foodtech',
    en: 'D-7 reminder — Foodtech jury session',
    de: 'Erinnerung T-7 — Foodtech-Jury-Sitzung',
  },
  bodyLabel:    { fr: 'Corps du message', en: 'Message body', de: 'Nachrichtentext' },
  bodyHelper: {
    fr: 'Mise en forme légère : **gras**, *italique*, [lien](https://exemple.org), - listes. Tout est rendu dans le shell Élysée à droite.',
    en: 'Light formatting: **bold**, *italic*, [link](https://example.org), - lists. Rendered live in the Élysée shell on the right.',
    de: 'Leichte Formatierung: **fett**, *kursiv*, [Link](https://beispiel.org), - Listen. Live im Élysée-Rahmen rechts dargestellt.',
  },
  bodyPlaceholder: {
    fr: 'Bonjour,\n\nNous vous rappelons que la session jury **Foodtech** aura lieu *jeudi 5 novembre à 18h*.\n\nDocuments disponibles dans votre espace : [Mon espace juré](https://app.rotary-startup.org/Jury).\n\nÀ très vite.',
    en: 'Dear member,\n\nThis is a reminder that the **Foodtech** jury session will take place *Thursday 5 November at 6pm*.\n\nDocuments available in your space: [My jury space](https://app.rotary-startup.org/Jury).\n\nWith kindest regards.',
    de: 'Sehr geehrte/r,\n\nzur Erinnerung: Die **Foodtech**-Jurysitzung findet *am Donnerstag, 5. November um 18 Uhr* statt.\n\nDokumente in Ihrem Bereich: [Mein Jury-Bereich](https://app.rotary-startup.org/Jury).\n\nMit freundlichen Grüßen.',
  },
  audienceLabel:{ fr: 'Audience',     en: 'Audience',      de: 'Zielgruppe' },
  langLabel:    { fr: 'Langue de l’email', en: 'Email language', de: 'E-Mail-Sprache' },
  preview:      { fr: 'Aperçu Élysée', en: 'Élysée preview', de: 'Élysée-Vorschau' },
  previewSend:  { fr: 'Aperçu envoi', en: 'Preview send',  de: 'Sendevorschau' },
  send:         { fr: 'Envoyer maintenant', en: 'Send now', de: 'Jetzt senden' },
  sending:      { fr: 'Envoi en cours…', en: 'Sending…',  de: 'Senden läuft…' },
  recipients:   { fr: 'destinataires', en: 'recipients',  de: 'Empfänger' },
  recipientsPreviewTitle: { fr: 'Aperçu de l’envoi', en: 'Send preview', de: 'Sende-Vorschau' },
  recipientsPreviewBody: {
    fr: 'Cet envoi atteindra les destinataires suivants. Confirmation requise au-delà de 50 personnes.',
    en: 'This send will reach the following recipients. Typed confirmation required above 50.',
    de: 'Dieser Versand erreicht die folgenden Empfänger. Bestätigung erforderlich ab 50 Empfängern.',
  },
  recipientsSample: { fr: 'Exemples', en: 'Sample',        de: 'Beispiele' },
  noRecipients: {
    fr: 'Aucun destinataire pour cette audience.',
    en: 'No recipient for this audience.',
    de: 'Keine Empfänger für diese Zielgruppe.',
  },
  confirmTypedTitle: {
    fr: 'Plus de 50 destinataires — confirmation requise',
    en: 'More than 50 recipients — confirmation required',
    de: 'Mehr als 50 Empfänger — Bestätigung erforderlich',
  },
  confirmTypedBody: {
    fr: 'Tapez ENVOYER pour confirmer l’envoi groupé.',
    en: 'Type SEND to confirm the bulk send.',
    de: 'Geben Sie SEND zur Bestätigung des Massenversands ein.',
  },
  confirmTypedTokenFr: 'ENVOYER',
  confirmTypedTokenEn: 'SEND',
  confirmTypedTokenDe: 'SEND',
  forceLabel: {
    fr: 'Forcer (au-delà de 100, master_admin uniquement)',
    en: 'Force (above 100, master_admin only)',
    de: 'Erzwingen (über 100, nur master_admin)',
  },
  sendOk: {
    fr: 'Envoi effectué.',
    en: 'Send completed.',
    de: 'Versand abgeschlossen.',
  },
  sendPartial: {
    fr: 'Envoi partiellement effectué.',
    en: 'Send partially completed.',
    de: 'Versand teilweise abgeschlossen.',
  },
  sendFailed: {
    fr: 'Échec de l’envoi.',
    en: 'Send failed.',
    de: 'Versand fehlgeschlagen.',
  },
  saveAsTemplate: { fr: 'Enregistrer comme modèle', en: 'Save as template', de: 'Als Vorlage speichern' },
  saveTemplateName: { fr: 'Nom du modèle', en: 'Template name',  de: 'Vorlagenname' },
};

// ── Audience selector ──────────────────────────────────────────────────────
export const COMMS_AUDIENCE = {
  pickType: { fr: 'Choisissez une audience', en: 'Pick an audience', de: 'Zielgruppe wählen' },
  singleEmail:         { fr: 'Email unique',           en: 'Single email',          de: 'Einzelne E-Mail' },
  singleEmailHint:     { fr: 'Saisissez une adresse.', en: 'Enter an address.',     de: 'Eine Adresse eingeben.' },
  clubCandidates:      { fr: 'Tous les candidats du club', en: 'All club candidates', de: 'Alle Bewerber des Clubs' },
  clubFinalists:       { fr: 'Finalistes du club',     en: 'Club finalists',        de: 'Finalisten des Clubs' },
  clubJurys:           { fr: 'Jurés du club',          en: 'Club jurors',           de: 'Juroren des Clubs' },
  clubComite:          { fr: 'Comité du club',         en: 'Club committee',        de: 'Komitee des Clubs' },
  clubAdmins:          { fr: 'Admins du club',         en: 'Club admins',           de: 'Club-Admins' },
  sessionJurys:        { fr: 'Jurés d’une session',    en: 'Session jurors',        de: 'Juroren einer Session' },
  sessionCandidates:   { fr: 'Candidats d’une session', en: 'Session candidates',   de: 'Bewerber einer Session' },
  allFinalistsEdition: { fr: 'Tous les finalistes (compétition)', en: 'All finalists (competition)', de: 'Alle Finalisten (Wettbewerb)' },
  pickSession: { fr: 'Choisissez une session', en: 'Pick a session', de: 'Session wählen' },
  pickEdition: { fr: 'Choisissez une compétition', en: 'Pick a competition', de: 'Wettbewerb wählen' },
  emailLabel:  { fr: 'Adresse email', en: 'Email address', de: 'E-Mail-Adresse' },
  estimatedCount: { fr: 'destinataires estimés', en: 'estimated recipients', de: 'geschätzte Empfänger' },
  resolveError: {
    fr: 'Impossible de calculer l’audience.',
    en: 'Could not compute the audience.',
    de: 'Zielgruppe konnte nicht berechnet werden.',
  },
  scopeNote: {
    fr: 'Audience filtrée automatiquement sur votre club.',
    en: 'Audience automatically scoped to your club.',
    de: 'Zielgruppe automatisch auf Ihren Club beschränkt.',
  },
  statusFilter: { fr: 'Statut(s) (optionnel)', en: 'Status(es) (optional)', de: 'Status (optional)' },
};

// ── Templates library ──────────────────────────────────────────────────────
export const COMMS_TEMPLATES = {
  sectionTitle: { fr: 'Bibliothèque de modèles', en: 'Templates library', de: 'Vorlagenbibliothek' },
  noTemplates: {
    fr: 'Aucun modèle pour l’instant. Créez votre premier modèle pour gagner du temps sur vos envois récurrents.',
    en: 'No template yet. Create your first one to save time on recurring sends.',
    de: 'Noch keine Vorlage. Erstellen Sie Ihre erste, um Zeit bei wiederkehrenden Versendungen zu sparen.',
  },
  scopeGlobal: { fr: 'Global (master)', en: 'Global (master)', de: 'Global (Master)' },
  scopeClub:   { fr: 'Club',           en: 'Club',           de: 'Club' },
  formName:    { fr: 'Nom du modèle',  en: 'Template name',  de: 'Vorlagenname' },
  formSubject: { fr: 'Sujet par défaut', en: 'Default subject', de: 'Standardbetreff' },
  formBody:    { fr: 'Corps du message', en: 'Message body',  de: 'Nachrichtentext' },
  formAudience: { fr: 'Audience par défaut', en: 'Default audience', de: 'Standard-Zielgruppe' },
  formLang:    { fr: 'Langue',         en: 'Language',       de: 'Sprache' },
  confirmDelete: {
    fr: 'Supprimer ce modèle ?',
    en: 'Delete this template?',
    de: 'Diese Vorlage löschen?',
  },
};

// ── History ────────────────────────────────────────────────────────────────
export const COMMS_HISTORY = {
  sectionTitle: { fr: 'Historique des envois', en: 'Send history', de: 'Versandverlauf' },
  noSends: {
    fr: 'Aucun envoi pour l’instant.',
    en: 'No send yet.',
    de: 'Noch kein Versand.',
  },
  date:        { fr: 'Date',            en: 'Date',           de: 'Datum' },
  subject:     { fr: 'Sujet',           en: 'Subject',        de: 'Betreff' },
  audience:    { fr: 'Audience',        en: 'Audience',       de: 'Zielgruppe' },
  recipients:  { fr: 'Destinataires',   en: 'Recipients',     de: 'Empfänger' },
  status:      { fr: 'Statut',          en: 'Status',         de: 'Status' },
  sender:      { fr: 'Expéditeur',      en: 'Sender',         de: 'Absender' },
  statusSent:    { fr: 'envoyé',        en: 'sent',           de: 'gesendet' },
  statusPartial: { fr: 'partiel',       en: 'partial',        de: 'teilweise' },
  statusFailed:  { fr: 'échec',         en: 'failed',         de: 'fehlgeschlagen' },
  detailsTitle:{ fr: 'Détails de l’envoi', en: 'Send details', de: 'Versanddetails' },
  recipientsList:{ fr: 'Premiers destinataires', en: 'First recipients', de: 'Erste Empfänger' },
  messageIds:  { fr: 'IDs Resend',      en: 'Resend IDs',     de: 'Resend-IDs' },
  errorMessage:{ fr: 'Message d’erreur', en: 'Error message', de: 'Fehlermeldung' },
  bodyPreview: { fr: 'Aperçu du corps', en: 'Body preview',  de: 'Textvorschau' },
};

// ── Sentinels ──────────────────────────────────────────────────────────────
export const AUDIENCE_TYPES = [
  'single_email',
  'club_candidates',
  'club_finalists',
  'club_jurys',
  'club_comite',
  'club_admins',
  'session_jurys',
  'session_candidates',
  'all_finalists_edition',
];

// Types d'audience disponibles côté UI selon le scope (club vs master).
export function audienceTypesForScope({ clubId, isMasterAdmin }) {
  if (clubId) {
    return [
      'club_candidates',
      'club_finalists',
      'club_jurys',
      'club_comite',
      'club_admins',
      'session_jurys',
      'session_candidates',
      'single_email',
    ];
  }
  // Master global view
  return isMasterAdmin
    ? ['all_finalists_edition', 'single_email']
    : ['single_email'];
}
