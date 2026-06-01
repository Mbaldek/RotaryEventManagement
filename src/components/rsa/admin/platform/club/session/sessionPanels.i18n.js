// i18n des panneaux session (running order + deck generator). FR/EN/DE.
export const SESSION_PANELS = {
  back: { fr: 'Retour à la session', en: 'Back to session', de: 'Zurück zur Sitzung' },

  // Running order
  orderTitle: { fr: 'Ordre de passage', en: 'Running order', de: 'Reihenfolge' },
  orderIntro: {
    fr: "Définissez l'ordre de passage des startups. L'horaire estimé se calcule depuis l'heure de début.",
    en: "Set the startups' pitch order. Estimated times derive from the start time.",
    de: 'Legen Sie die Reihenfolge fest. Die geschätzten Zeiten ergeben sich aus der Startzeit.',
  },
  startTime: { fr: 'Heure de début', en: 'Start time', de: 'Startzeit' },
  slotMinutes: { fr: 'Durée par passage (min)', en: 'Minutes per slot', de: 'Minuten pro Slot' },
  moveUp: { fr: 'Monter', en: 'Move up', de: 'Nach oben' },
  moveDown: { fr: 'Descendre', en: 'Move down', de: 'Nach unten' },
  save: { fr: "Enregistrer l'ordre", en: 'Save order', de: 'Reihenfolge speichern' },
  saved: { fr: 'Ordre enregistré.', en: 'Order saved.', de: 'Reihenfolge gespeichert.' },
  emptyStartups: {
    fr: 'Aucune startup affectée à cette session.',
    en: 'No startup assigned to this session.',
    de: 'Dieser Sitzung ist kein Startup zugewiesen.',
  },

  // Deck generator
  deckTitle: { fr: 'Générer la présentation', en: 'Generate the deck', de: 'Präsentation erzeugen' },
  deckIntro: {
    fr: 'Produit un fichier HTML autonome (plein écran, navigation clavier) pour la projection.',
    en: 'Produces a standalone HTML file (fullscreen, keyboard nav) for projection.',
    de: 'Erzeugt eine eigenständige HTML-Datei (Vollbild, Tastatur) für die Projektion.',
  },
  specialPrize: { fr: 'Prix spécial', en: 'Special prize', de: 'Sonderpreis' },
  agenda: { fr: 'Agenda (une ligne par étape)', en: 'Agenda (one line per item)', de: 'Agenda (eine Zeile pro Punkt)' },
  criteriaHint: { fr: 'Critères & accroches', en: 'Criteria & taglines', de: 'Kriterien & Slogans' },
  orderReadonly: {
    fr: "L'ordre de passage se règle en Préparation.",
    en: 'The running order is set in Preparation.',
    de: 'Die Reihenfolge wird in der Vorbereitung festgelegt.',
  },
  orderedCount: {
    fr: (n, total) => `${n} / ${total} startup(s) ordonnée(s)${n < total ? ' — les autres ne figureront pas dans le deck.' : '.'}`,
    en: (n, total) => `${n} / ${total} startup(s) ordered${n < total ? " — the others won't appear in the deck." : '.'}`,
    de: (n, total) => `${n} / ${total} Startup(s) sortiert${n < total ? ' — die übrigen erscheinen nicht im Deck.' : '.'}`,
  },
  download: { fr: 'Télécharger le deck', en: 'Download deck', de: 'Deck herunterladen' },

  // Emails d'ordre de passage (un par startup, langue du destinataire)
  roEmailTitle: {
    fr: 'Emails d’ordre de passage',
    en: 'Running-order emails',
    de: 'E-Mails zur Reihenfolge',
  },
  roEmailIntro: {
    fr: 'Envoie à chaque startup ordonnée son rang et son horaire estimé, dans sa langue.',
    en: 'Sends each ordered startup its rank and estimated time, in its own language.',
    de: 'Sendet jedem sortierten Startup Rang und geschätzte Zeit in seiner Sprache.',
  },
  roEmailSend: {
    fr: 'Envoyer les emails',
    en: 'Send the emails',
    de: 'E-Mails senden',
  },
  roEmailSending: { fr: 'Envoi en cours…', en: 'Sending…', de: 'Wird gesendet…' },
  roEmailIncomplete: {
    fr: (n) => `Ordre incomplet : ${n} startup(s) sans rang. Réglez l’ordre de passage en Préparation d’abord.`,
    en: (n) => `Order incomplete: ${n} startup(s) without a rank. Set the running order in Preparation first.`,
    de: (n) => `Reihenfolge unvollständig: ${n} Startup(s) ohne Rang. Legen Sie zuerst die Reihenfolge in der Vorbereitung fest.`,
  },
  roEmailSuccess: {
    fr: (n) => `${n} email(s) envoyé(s).`,
    en: (n) => `${n} email(s) sent.`,
    de: (n) => `${n} E-Mail(s) gesendet.`,
  },
  roEmailPartial: {
    fr: (ok, total) => `${ok}/${total} email(s) envoyé(s) — ${total - ok} en échec.`,
    en: (ok, total) => `${ok}/${total} email(s) sent — ${total - ok} failed.`,
    de: (ok, total) => `${ok}/${total} E-Mail(s) gesendet — ${total - ok} fehlgeschlagen.`,
  },
  roEmailNone: {
    fr: 'Aucune startup avec une adresse email à notifier.',
    en: 'No startup with an email address to notify.',
    de: 'Kein Startup mit E-Mail-Adresse zu benachrichtigen.',
  },
};
