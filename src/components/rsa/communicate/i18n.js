// src/components/rsa/communicate/i18n.js
// ---------------------------------------------------------------------------
// V3 Vague 2 — Feature B : CTA "Communiquer" pré-câblé.
//
// Dictionnaires trilingues FR/EN/DE pour le CommunicatePanel + CommunicateModal
// + templates pré-rédigés (ton Élysée pro, ni trop chaleureux ni cold corporate).
//
// Forme { fr, en, de } compatible useLang().t(dict) (cf. @/lib/platform/i18n).
//
// Voix éditoriale :
//   - vouvoiement systématique en français
//   - politesse formelle sans flatterie en anglais
//   - "Sehr geehrte/r" en allemand
//   - jamais d'emojis, jamais de "!", jamais de "Bravo / Congratulations"
//   - signature institutionnelle "Rotary Startup Award"
// ---------------------------------------------------------------------------

// ── UI Panel (cards d'action) ──────────────────────────────────────────────
export const COMMUNICATE_UI = {
  eyebrow: {
    fr: 'Communications · Sélection',
    en: 'Communications · Selection',
    de: 'Kommunikation · Auswahl',
  },
  title: {
    fr: 'Communiquer',
    en: 'Communicate',
    de: 'Kommunizieren',
  },
  subtitle: {
    fr: 'Deux actions pré-câblées pour clôturer le processus de sélection avec rigueur — message éditable avant envoi.',
    en: 'Two pre-wired actions to close the selection process with editorial rigour — message is editable before sending.',
    de: 'Zwei vorkonfigurierte Aktionen, um den Auswahlprozess sauber abzuschließen — Nachricht vor dem Versand bearbeitbar.',
  },
  thanksTitle: {
    fr: 'Remercier les non-sélectionnés',
    en: 'Thank the unselected applicants',
    de: 'Die nicht ausgewählten Bewerber danken',
  },
  thanksDescription: {
    fr: 'Email courtois aux candidatures recalées au comité ou non retenues après une session jury. Statuts ciblés : rejete, liste_attente, note.',
    en: 'Courteous email to applications dismissed by the committee or not retained after a jury session. Statuses targeted: rejete, liste_attente, note.',
    de: 'Höfliche E-Mail an Bewerbungen, die vom Komitee abgelehnt oder nach einer Jury-Sitzung nicht ausgewählt wurden. Zielstatus: rejete, liste_attente, note.',
  },
  announceTitle: {
    fr: 'Annoncer aux sélectionnés',
    en: 'Announce to the selected applicants',
    de: 'Den ausgewählten Bewerbern ankündigen',
  },
  announceDescription: {
    fr: 'Email d’annonce aux candidatures retenues pour la prochaine étape (session jury, finale ou lauréat). Statuts ciblés : affecte, finaliste, laureat.',
    en: 'Announcement email to applications retained for the next stage (jury session, finale or laureate). Statuses targeted: affecte, finaliste, laureat.',
    de: 'Ankündigungs-E-Mail an Bewerbungen, die für die nächste Etappe ausgewählt wurden (Jury-Sitzung, Finale oder Preisträger). Zielstatus: affecte, finaliste, laureat.',
  },
  openAction: {
    fr: 'Préparer l’envoi',
    en: 'Prepare send',
    de: 'Versand vorbereiten',
  },
  noEdition: {
    fr: 'Sélectionnez une compétition pour activer les actions.',
    en: 'Pick a competition to enable these actions.',
    de: 'Wählen Sie einen Wettbewerb, um die Aktionen zu aktivieren.',
  },
  estimating: {
    fr: 'Calcul du nombre de destinataires…',
    en: 'Computing recipient count…',
    de: 'Empfängeranzahl wird berechnet…',
  },
  recipientsLabel: {
    fr: 'destinataire(s)',
    en: 'recipient(s)',
    de: 'Empfänger',
  },
  countError: {
    fr: 'Impossible de calculer l’audience.',
    en: 'Could not compute the audience.',
    de: 'Zielgruppe konnte nicht berechnet werden.',
  },
  scopeMaster: {
    fr: 'Toutes les candidatures de la compétition (tous clubs).',
    en: 'All competition applications across every club.',
    de: 'Alle Bewerbungen des Wettbewerbs (alle Clubs).',
  },
  scopeClub: {
    fr: 'Candidatures de votre club uniquement.',
    en: 'Applications from your club only.',
    de: 'Nur Bewerbungen Ihres Clubs.',
  },
};

// ── Modale d'envoi (tabs Audience / Template + footer Envoyer) ─────────────
export const COMMUNICATE_MODAL = {
  modalEyebrowThanks: {
    fr: 'Communiquer · Remerciement',
    en: 'Communicate · Thanks',
    de: 'Kommunizieren · Dank',
  },
  modalEyebrowAnnounce: {
    fr: 'Communiquer · Annonce',
    en: 'Communicate · Announcement',
    de: 'Kommunizieren · Ankündigung',
  },
  modalTitleThanks: {
    fr: 'Remercier les non-sélectionnés',
    en: 'Thank the unselected',
    de: 'Nicht ausgewählte danken',
  },
  modalTitleAnnounce: {
    fr: 'Annoncer aux sélectionnés',
    en: 'Announce to the selected',
    de: 'Ausgewählte ankündigen',
  },
  tabAudience: {
    fr: 'Destinataires',
    en: 'Recipients',
    de: 'Empfänger',
  },
  tabTemplate: {
    fr: 'Message',
    en: 'Message',
    de: 'Nachricht',
  },
  audienceSummaryTitle: {
    fr: 'Audience résolue côté serveur',
    en: 'Audience resolved server-side',
    de: 'Zielgruppe serverseitig aufgelöst',
  },
  audienceSummaryHint: {
    fr: 'La liste est recalculée à chaque envoi : seules les candidatures actuellement dans les statuts ciblés recevront le message.',
    en: 'The list is recomputed at send time: only applications currently in the targeted statuses will receive the message.',
    de: 'Die Liste wird zum Sendezeitpunkt neu berechnet: Nur Bewerbungen im aktuellen Zielstatus erhalten die Nachricht.',
  },
  audienceCountLabel: {
    fr: 'destinataires',
    en: 'recipients',
    de: 'Empfänger',
  },
  audienceSampleLabel: {
    fr: 'Premiers destinataires',
    en: 'First recipients',
    de: 'Erste Empfänger',
  },
  audienceEmpty: {
    fr: 'Aucune candidature dans les statuts ciblés. L’envoi est désactivé.',
    en: 'No application in the targeted statuses. Send is disabled.',
    de: 'Keine Bewerbung im Zielstatus. Versand ist deaktiviert.',
  },
  audienceStatusesLabel: {
    fr: 'Statuts ciblés',
    en: 'Targeted statuses',
    de: 'Zielstatus',
  },
  langLabel: {
    fr: 'Langue de l’email',
    en: 'Email language',
    de: 'E-Mail-Sprache',
  },
  subjectLabel: {
    fr: 'Sujet',
    en: 'Subject',
    de: 'Betreff',
  },
  bodyLabel: {
    fr: 'Corps du message',
    en: 'Message body',
    de: 'Nachrichtentext',
  },
  bodyHelper: {
    fr: 'Mise en forme légère : **gras**, *italique*, [lien](https://exemple.org). Rendu Élysée appliqué automatiquement (en-tête navy, signature institutionnelle).',
    en: 'Light formatting: **bold**, *italic*, [link](https://example.org). Élysée rendering applied automatically (navy header, institutional signature).',
    de: 'Leichte Formatierung: **fett**, *kursiv*, [Link](https://beispiel.org). Élysée-Rendering wird automatisch angewendet (Navy-Header, institutionelle Signatur).',
  },
  resetTemplate: {
    fr: 'Restaurer le modèle pré-rédigé',
    en: 'Restore the pre-written template',
    de: 'Vorgefertigte Vorlage wiederherstellen',
  },
  previewTitle: {
    fr: 'Aperçu Élysée',
    en: 'Élysée preview',
    de: 'Élysée-Vorschau',
  },
  sendCta: {
    // {n} sera remplacé par le compte côté composant
    fr: 'Envoyer à {n} candidat·e·s',
    en: 'Send to {n} applicant(s)',
    de: 'An {n} Bewerber senden',
  },
  sendCtaZero: {
    fr: 'Aucun destinataire',
    en: 'No recipient',
    de: 'Keine Empfänger',
  },
  sending: {
    fr: 'Envoi en cours…',
    en: 'Sending…',
    de: 'Senden läuft…',
  },
  cancel: {
    fr: 'Annuler',
    en: 'Cancel',
    de: 'Abbrechen',
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
  recipientsSummary: {
    // ex. "12 / 14 destinataires"
    fr: '{sent}/{total} destinataires',
    en: '{sent}/{total} recipients',
    de: '{sent}/{total} Empfänger',
  },
  confirmTitle: {
    fr: 'Confirmer l’envoi groupé',
    en: 'Confirm bulk send',
    de: 'Massenversand bestätigen',
  },
  confirmBody: {
    // {n} = count, {scope} = "votre club" / "toutes les candidatures"
    fr: 'Vous êtes sur le point d’envoyer ce message à {n} candidat·e·s ({scope}). L’action est irréversible.',
    en: 'You are about to send this message to {n} applicant(s) ({scope}). This action cannot be undone.',
    de: 'Sie senden gleich diese Nachricht an {n} Bewerber ({scope}). Diese Aktion kann nicht rückgängig gemacht werden.',
  },
  confirmYes: {
    fr: 'Envoyer maintenant',
    en: 'Send now',
    de: 'Jetzt senden',
  },
  confirmNo: {
    fr: 'Retour',
    en: 'Back',
    de: 'Zurück',
  },
};

// ── Templates pré-rédigés (FR/EN/DE × 2 kinds) ─────────────────────────────
// Ton institutionnel, vouvoiement. Markdown léger consommé par buildEmailHtml
// (cf. comms/EmailPreview.jsx). On ne signe PAS individuellement (la signature
// "Rotary Startup Award" est déjà rendue par le shell Élysée).
// ---------------------------------------------------------------------------
export const COMMUNICATE_TEMPLATES = {
  unselected: {
    subject: {
      fr: 'Rotary Startup Award — suite donnée à votre candidature',
      en: 'Rotary Startup Award — outcome of your application',
      de: 'Rotary Startup Award — Entscheidung zu Ihrer Bewerbung',
    },
    body: {
      fr: [
        'Madame, Monsieur,',
        '',
        'Nous vous remercions sincèrement d’avoir candidaté au **Rotary Startup Award**.',
        '',
        'Votre dossier a retenu notre attention et a été examiné avec soin par notre comité de sélection. Nous regrettons toutefois de ne pas pouvoir le retenir pour la suite du processus cette année. Le niveau des candidatures a été particulièrement élevé et plusieurs dossiers de qualité n’ont pas pu être retenus malgré leurs mérites.',
        '',
        'Nous tenons à saluer l’engagement dont vous faites preuve à travers votre projet, et nous vous encourageons à poursuivre votre dynamique entrepreneuriale.',
        '',
        'Nous vous souhaitons une pleine réussite dans la suite de votre parcours.',
        '',
        'Bien cordialement,',
      ].join('\n'),
      en: [
        'Dear applicant,',
        '',
        'Thank you for applying to the **Rotary Startup Award**.',
        '',
        'Your application received our full attention and was carefully reviewed by our selection committee. We regret to inform you that we were unable to retain it for the next stage of the process this year. The standard of applications was particularly high and several strong dossiers could not be retained despite their merit.',
        '',
        'We commend the commitment you demonstrate through your project and encourage you to pursue your entrepreneurial journey with the same energy.',
        '',
        'We wish you every success going forward.',
        '',
        'With kindest regards,',
      ].join('\n'),
      de: [
        'Sehr geehrte Damen und Herren,',
        '',
        'wir bedanken uns aufrichtig für Ihre Bewerbung beim **Rotary Startup Award**.',
        '',
        'Ihre Unterlagen wurden von unserer Auswahlkommission sorgfältig geprüft. Wir bedauern, Ihnen mitteilen zu müssen, dass wir Ihre Bewerbung für die nächste Etappe in diesem Jahr nicht berücksichtigen können. Das Niveau der Bewerbungen war außerordentlich hoch, und mehrere überzeugende Dossiers konnten trotz ihrer Qualität nicht ausgewählt werden.',
        '',
        'Wir würdigen das Engagement, das Sie durch Ihr Projekt zeigen, und ermutigen Sie, Ihren unternehmerischen Weg mit derselben Dynamik fortzusetzen.',
        '',
        'Wir wünschen Ihnen für die Zukunft viel Erfolg.',
        '',
        'Mit freundlichen Grüßen,',
      ].join('\n'),
    },
  },

  selected: {
    subject: {
      fr: 'Rotary Startup Award — votre candidature est retenue',
      en: 'Rotary Startup Award — your application has been retained',
      de: 'Rotary Startup Award — Ihre Bewerbung wurde ausgewählt',
    },
    body: {
      fr: [
        'Madame, Monsieur,',
        '',
        'Nous avons le plaisir de vous informer que votre candidature au **Rotary Startup Award** a été *retenue pour la prochaine étape du processus*.',
        '',
        'Notre comité a salué la qualité de votre dossier et l’intérêt de votre projet. Vous serez sollicité·e très prochainement par l’équipe d’organisation pour les modalités pratiques de la suite — agenda, format de présentation, documents complémentaires éventuels.',
        '',
        'Nous vous remercions de rester attentif·ve aux prochains messages qui vous seront adressés depuis cette adresse.',
        '',
        'Bien cordialement,',
      ].join('\n'),
      en: [
        'Dear applicant,',
        '',
        'We are pleased to inform you that your application to the **Rotary Startup Award** has been *retained for the next stage of the process*.',
        '',
        'Our committee commended the quality of your application and the interest of your project. You will be contacted shortly by the organising team regarding the practical details of the next stage — agenda, pitch format, any additional documents required.',
        '',
        'Please keep an eye on this address for upcoming messages.',
        '',
        'With kindest regards,',
      ].join('\n'),
      de: [
        'Sehr geehrte Damen und Herren,',
        '',
        'wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung beim **Rotary Startup Award** *für die nächste Etappe des Prozesses ausgewählt wurde*.',
        '',
        'Unser Komitee hat die Qualität Ihrer Unterlagen und das Interesse Ihres Projekts gewürdigt. Sie werden in Kürze vom Organisationsteam wegen der praktischen Modalitäten der nächsten Etappe kontaktiert — Zeitplan, Präsentationsformat, eventuell ergänzende Dokumente.',
        '',
        'Bitte achten Sie auf weitere Nachrichten von dieser Adresse.',
        '',
        'Mit freundlichen Grüßen,',
      ].join('\n'),
    },
  },
};

// ── Utilitaires ────────────────────────────────────────────────────────────

// Renvoie { subject, body } pré-rédigés pour un kind + lang donnés.
// `kind` ∈ { 'unselected', 'selected' } ; `lang` ∈ { 'fr', 'en', 'de' }.
export function getTemplate(kind, lang) {
  const safeKind = kind === 'selected' ? 'selected' : 'unselected';
  const safeLang = ['fr', 'en', 'de'].includes(lang) ? lang : 'fr';
  const dict = COMMUNICATE_TEMPLATES[safeKind];
  return {
    subject: dict.subject[safeLang],
    body: dict.body[safeLang],
  };
}

// Mapping kind → audience_type pour send-bulk (cf. migration v3 communicate).
export function audienceTypeForKind(kind) {
  return kind === 'selected' ? 'communicate_selected' : 'communicate_unselected';
}

// Liste textuelle des statuts ciblés, pour affichage UI.
export const STATUSES_BY_KIND = {
  unselected: ['rejete', 'liste_attente', 'note'],
  selected:   ['affecte', 'finaliste', 'laureat'],
};
