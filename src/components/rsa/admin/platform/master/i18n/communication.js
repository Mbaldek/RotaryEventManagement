// ── Communication Refonte (B-comm-refonte) ──────────────────────────────────
// Refonte par étape du funnel de la compétition — chaque stage embarque ses
// templates Élysée FR/EN/DE prêts à envoyer + audience auto basée sur status.
// L'EmailStudio existant est exposé en accordion "Outils avancés" en bas du
// tab, pour les envois ad-hoc qui ne rentrent pas dans les étapes structurées.
export const COMMUNICATION_REFONTE = {
  // Header
  headerEyebrow: {
    fr: 'Communications · {name}',
    en: 'Communications · {name}',
    de: 'Kommunikation · {name}',
  },
  headerTitleLead: {
    fr: 'Préparez les envois',
    en: 'Plan every send',
    de: 'Versand vorbereiten',
  },
  headerTitleItalic: {
    fr: 'étape par étape',
    en: 'stage by stage',
    de: 'Schritt für Schritt',
  },
  headerSubtitle: {
    fr: 'Chaque phase du funnel embarque ses modèles d’email Élysée trilingues, prêts à envoyer aux bonnes personnes. Pour un envoi sur mesure, l’Email Studio reste accessible en bas de page.',
    en: 'Every funnel phase ships its own trilingual Élysée email templates ready to deliver to the right people. For ad-hoc sends, the Email Studio remains accessible at the bottom of the page.',
    de: 'Jede Phase des Funnels bringt eigene dreisprachige Élysée-E-Mail-Vorlagen mit, die direkt an die richtigen Empfänger gesendet werden können. Für individuelle Versendungen bleibt das Email Studio am Seitenende verfügbar.',
  },
  noEdition: {
    fr: 'Sélectionnez une compétition pour activer les communications.',
    en: 'Pick a competition to enable communications.',
    de: 'Wählen Sie einen Wettbewerb, um die Kommunikation zu aktivieren.',
  },

  // Sub-tablist (5 stages + advanced + history)
  stagesAriaLabel: {
    fr: 'Phases de communication',
    en: 'Communication phases',
    de: 'Kommunikationsphasen',
  },

  // ── Stage 1 — Candidatures ────────────────────────────────────────────────
  stage1Eyebrow: {
    fr: 'Phase 1 · Candidatures',
    en: 'Stage 1 · Applications',
    de: 'Phase 1 · Bewerbungen',
  },
  stage1Title: {
    fr: 'Recevoir, accompagner, valider',
    en: 'Welcome, nudge, validate',
    de: 'Empfangen, begleiten, validieren',
  },
  stage1Intro: {
    fr: 'Confirmer la réception, relancer les dossiers brouillons, accuser réception des candidatures officielles.',
    en: 'Acknowledge submissions, nudge drafts, confirm received applications.',
    de: 'Eingang bestätigen, Entwürfe anmahnen, eingegangene Bewerbungen bestätigen.',
  },
  s1tplConfirmTitle: {
    fr: 'Confirmation de soumission de dossier',
    en: 'Application submission confirmation',
    de: 'Bestätigung des Bewerbungseingangs',
  },
  s1tplConfirmDescription: {
    fr: 'Email de confirmation envoyé automatiquement à la soumission. Géré par send-transactional (auto-trigger).',
    en: 'Confirmation email auto-sent on submission. Handled by send-transactional (auto-trigger).',
    de: 'Bestätigungs-E-Mail wird beim Absenden automatisch verschickt. Wird von send-transactional verwaltet (Auto-Trigger).',
  },
  s1tplConfirmAutoNote: {
    fr: 'Envoi automatique — pas d’action manuelle nécessaire.',
    en: 'Automatic send — no manual action needed.',
    de: 'Automatischer Versand — keine manuelle Aktion erforderlich.',
  },
  s1tplDraftReminderTitle: {
    fr: 'Relance candidats avec dossier brouillon',
    en: 'Nudge applicants still in draft',
    de: 'Erinnerung an Bewerber im Entwurfsstatus',
  },
  s1tplDraftReminderDescription: {
    fr: 'Email courtois aux porteurs qui n’ont pas finalisé leur dossier. Statut ciblé : brouillon.',
    en: 'Courteous reminder to applicants who have not finalised their dossier. Target status: brouillon.',
    de: 'Höfliche Erinnerung an Bewerber, die ihr Dossier noch nicht abgeschlossen haben. Zielstatus: brouillon.',
  },
  s1tplValidatedTitle: {
    fr: 'Votre dossier est validé',
    en: 'Your application has been validated',
    de: 'Ihre Bewerbung wurde bestätigt',
  },
  s1tplValidatedDescription: {
    fr: 'Confirmation aux candidatures officiellement soumises. Statuts ciblés : soumis et au-delà.',
    en: 'Confirmation to officially submitted applications. Target statuses: soumis and beyond.',
    de: 'Bestätigung an offiziell eingereichte Bewerbungen. Zielstatus: soumis und folgende.',
  },

  // ── Stage 2 — Pré-sélection ───────────────────────────────────────────────
  stage2Eyebrow: {
    fr: 'Phase 2 · Pré-sélection',
    en: 'Stage 2 · Pre-selection',
    de: 'Phase 2 · Vorauswahl',
  },
  stage2Title: {
    fr: 'Mobiliser le comité, rassurer les candidats',
    en: 'Mobilise the committee, reassure applicants',
    de: 'Komitee einberufen, Bewerber beruhigen',
  },
  stage2Intro: {
    fr: 'Convoquer les membres du comité, tenir les candidats informés du processus d’examen.',
    en: 'Convene committee members, keep applicants informed of the review process.',
    de: 'Komitee-Mitglieder einladen und Bewerber über den Prüfprozess informieren.',
  },
  s2tplComiteSummonTitle: {
    fr: 'Convocation du comité',
    en: 'Committee summons',
    de: 'Komitee-Einladung',
  },
  s2tplComiteSummonDescription: {
    fr: 'Convocation officielle des membres comité à la session d’instruction.',
    en: 'Official summons to committee members for the review session.',
    de: 'Offizielle Einladung der Komitee-Mitglieder zur Prüfungssitzung.',
  },
  s2tplInReviewTitle: {
    fr: 'Notre comité étudie votre dossier',
    en: 'Our committee is reviewing your application',
    de: 'Unser Komitee prüft Ihre Bewerbung',
  },
  s2tplInReviewDescription: {
    fr: 'Mise à jour adressée aux candidats en cours d’examen. Statuts ciblés : en_selection.',
    en: 'Status update sent to applications under review. Target statuses: en_selection.',
    de: 'Statusmeldung an Bewerbungen in der Prüfung. Zielstatus: en_selection.',
  },

  // ── Stage 3 — Sessions jury ────────────────────────────────────────────────
  stage3Eyebrow: {
    fr: 'Phase 3 · Sessions jury',
    en: 'Stage 3 · Jury sessions',
    de: 'Phase 3 · Jury-Sitzungen',
  },
  stage3Title: {
    fr: 'Préparer le jury, cadencer les rappels',
    en: 'Brief the jury, time the reminders',
    de: 'Jury einweisen, Erinnerungen takten',
  },
  stage3Intro: {
    fr: 'Inviter les jurés, partager le brief pitch + Q&A, rappeler à J-7 et à la veille.',
    en: 'Invite jurors, share the pitch + Q&A brief, ping at D-7 and the day before.',
    de: 'Jurorinnen und Juroren einladen, Pitch- und Q&A-Briefing teilen, an D-7 und am Vortag erinnern.',
  },
  s3tplJuryInviteTitle: {
    fr: 'Invitation jury à session',
    en: 'Jury invitation to session',
    de: 'Einladung der Jury zur Sitzung',
  },
  s3tplJuryInviteDescription: {
    fr: 'Convocation officielle des jurés assignés à une session.',
    en: 'Official summons to jurors assigned to a session.',
    de: 'Offizielle Einladung der einer Sitzung zugewiesenen Jury.',
  },
  s3tplJuryBriefingTitle: {
    fr: 'Briefing pitch + Q&A formats',
    en: 'Pitch + Q&A format briefing',
    de: 'Briefing Pitch + Q&A Formate',
  },
  s3tplJuryBriefingDescription: {
    fr: 'Rappel J-7 : format pitch (10-12 min) + Q&A (8-10 min), critères d’évaluation.',
    en: 'D-7 reminder: pitch format (10-12 min) + Q&A (8-10 min), scoring criteria.',
    de: 'Erinnerung 7 Tage zuvor: Pitch-Format (10–12 Min.) + Q&A (8–10 Min.), Bewertungskriterien.',
  },
  s3tplJuryReminderTitle: {
    fr: 'Rappel J-1 / J0',
    en: 'D-1 / D-day reminder',
    de: 'Erinnerung am Vortag/Tag selbst',
  },
  s3tplJuryReminderDescription: {
    fr: 'Court rappel logistique la veille ou le matin : lieu, heure, ordre de passage.',
    en: 'Short logistical reminder the day before or morning of: venue, time, running order.',
    de: 'Kurze logistische Erinnerung am Vorabend oder Morgen: Ort, Zeit, Reihenfolge.',
  },

  // ── Stage 4 — Résultats ────────────────────────────────────────────────────
  stage4Eyebrow: {
    fr: 'Phase 4 · Résultats',
    en: 'Stage 4 · Results',
    de: 'Phase 4 · Ergebnisse',
  },
  stage4Title: {
    fr: 'Annoncer avec rigueur, célébrer avec retenue',
    en: 'Announce rigorously, celebrate with restraint',
    de: 'Klar mitteilen, mit Würde feiern',
  },
  stage4Intro: {
    fr: 'Les deux actions pré-câblées « Remercier » et « Annoncer » couvrent l’essentiel. En complément, trois modèles institutionnels (lauréats, finalistes, press kit) sont disponibles ci-dessous.',
    en: 'The two pre-wired actions “Thank” and “Announce” handle the core. Three institutional templates (laureates, finalists, press kit) round it off below.',
    de: 'Die beiden vorkonfigurierten Aktionen „Danken" und „Ankündigen" decken den Kern ab. Drei institutionelle Vorlagen (Preisträger, Finalisten, Press-Kit) ergänzen das Ganze weiter unten.',
  },
  stage4CommunicatePanelHint: {
    fr: 'Réutilise le CTA « Communiquer » déjà en place — audience résolue côté serveur.',
    en: 'Re-uses the existing “Communicate” CTA — audience resolved server-side.',
    de: 'Nutzt das bestehende CTA „Kommunizieren" — Zielgruppe serverseitig aufgelöst.',
  },
  s4tplLaureatesTitle: {
    fr: 'Annonce des lauréats (top 3)',
    en: 'Laureates announcement (top 3)',
    de: 'Ankündigung der Preisträger (Top 3)',
  },
  s4tplLaureatesDescription: {
    fr: 'Email institutionnel aux lauréats du palmarès, avec rappel des étapes post-finale.',
    en: 'Institutional email to the laureates, with a recap of post-finale steps.',
    de: 'Institutionelle E-Mail an die Preisträger, inkl. Hinweisen zu den Schritten nach dem Finale.',
  },
  s4tplFinalistsTitle: {
    fr: 'Finalistes promus',
    en: 'Promoted finalists',
    de: 'Ins Finale beförderte Bewerber',
  },
  s4tplFinalistsDescription: {
    fr: 'Confirmation aux startups promues en finale. Statut ciblé : finaliste.',
    en: 'Confirmation to startups promoted to the finale. Target status: finaliste.',
    de: 'Bestätigung an Startups, die für das Finale befördert wurden. Zielstatus: finaliste.',
  },
  s4tplPresskitTitle: {
    fr: 'Press kit et partage du palmarès',
    en: 'Press kit and palmarès sharing',
    de: 'Press-Kit und Verbreitung des Palmarès',
  },
  s4tplPresskitDescription: {
    fr: 'Document de presse + visuels prêts à partager auprès des relais médias et partenaires.',
    en: 'Press document and visuals ready to share with media partners and stakeholders.',
    de: 'Pressedokument und Visuals zum Teilen mit Medienpartnern und Förderern.',
  },

  // ── Stage 5 — Post-finale ──────────────────────────────────────────────────
  stage5Eyebrow: {
    fr: 'Phase 5 · Post-finale',
    en: 'Stage 5 · Post-finale',
    de: 'Phase 5 · Nach dem Finale',
  },
  stage5Title: {
    fr: 'Clôturer l’édition, préparer la suivante',
    en: 'Close the edition, prepare the next',
    de: 'Edition abschließen, nächste vorbereiten',
  },
  stage5Intro: {
    fr: 'Remercier tous les contributeurs, diffuser le press release, lancer la prochaine édition.',
    en: 'Thank every contributor, share the press release, tease the next edition.',
    de: 'Allen Beteiligten danken, Press Release verbreiten, nächste Edition anteasern.',
  },
  s5tplThanksTitle: {
    fr: 'Remerciements généraux',
    en: 'General thanks',
    de: 'Allgemeiner Dank',
  },
  s5tplThanksDescription: {
    fr: 'Email institutionnel à toutes les parties prenantes de l’édition (clubs, jurés, partenaires).',
    en: 'Institutional email to every edition stakeholder (clubs, jurors, partners).',
    de: 'Institutionelle E-Mail an alle Beteiligten der Edition (Clubs, Jury, Partner).',
  },
  s5tplPressreleaseTitle: {
    fr: 'Press release',
    en: 'Press release',
    de: 'Pressemitteilung',
  },
  s5tplPressreleaseDescription: {
    fr: 'Communiqué de presse final à diffuser auprès des médias suite au palmarès.',
    en: 'Final press release to share with media partners after the palmarès.',
    de: 'Abschließende Pressemitteilung zur Verbreitung an Medienpartner nach dem Palmarès.',
  },
  s5tplSavethedateTitle: {
    fr: 'Save the date — prochaine édition',
    en: 'Save the date — next edition',
    de: 'Save the date — nächste Edition',
  },
  s5tplSavethedateDescription: {
    fr: 'Annonce préliminaire de la date de la prochaine édition — calendrier ouvert.',
    en: 'Preliminary announcement of the next edition date — calendar open.',
    de: 'Vorläufige Ankündigung des Datums der nächsten Edition — Kalender offen.',
  },

  // ── Stage 6 — Ad-hoc / Email Studio ────────────────────────────────────────
  advancedEyebrow: {
    fr: 'Outils avancés',
    en: 'Advanced tools',
    de: 'Erweiterte Werkzeuge',
  },
  advancedTitle: {
    fr: 'Email Studio — envoi ad-hoc',
    en: 'Email Studio — ad-hoc send',
    de: 'Email Studio — Ad-hoc-Versand',
  },
  advancedSummary: {
    fr: 'Ouvrir l’éditeur libre pour composer un envoi sur mesure',
    en: 'Open the free editor to compose a custom send',
    de: 'Freien Editor öffnen, um einen Versand individuell zu verfassen',
  },
  advancedIntro: {
    fr: 'Pour les envois qui ne rentrent dans aucune des phases ci-dessus : audience personnalisée, message libre, templates sauvegardés.',
    en: 'For sends that do not fit any of the phases above: custom audience, free-form message, saved templates.',
    de: 'Für Versendungen, die in keine der obigen Phasen passen: individuelle Zielgruppe, freier Text, gespeicherte Vorlagen.',
  },

  // ── Stage 7 — Historique ──────────────────────────────────────────────────
  historyEyebrow: {
    fr: 'Historique',
    en: 'History',
    de: 'Verlauf',
  },
  historyTitle: {
    fr: 'Envois sur cette compétition',
    en: 'Sends on this competition',
    de: 'Versendungen für diesen Wettbewerb',
  },
  historyIntro: {
    fr: 'Tous les envois groupés émis dans le cadre de cette compétition — toutes phases confondues.',
    en: 'Every bulk send issued for this competition — across all phases.',
    de: 'Sämtliche Bulk-Versendungen dieses Wettbewerbs — über alle Phasen hinweg.',
  },
  historyColDate:      { fr: 'Date',         en: 'Date',         de: 'Datum' },
  historyColSubject:   { fr: 'Sujet',        en: 'Subject',      de: 'Betreff' },
  historyColAudience:  { fr: 'Audience',     en: 'Audience',     de: 'Zielgruppe' },
  historyColCount:     { fr: 'Destinataires', en: 'Recipients',   de: 'Empfänger' },
  historyColStatus:    { fr: 'Statut',       en: 'Status',       de: 'Status' },
  historyEmpty: {
    fr: 'Aucun envoi enregistré pour cette compétition.',
    en: 'No send recorded for this competition yet.',
    de: 'Noch keine Versendung für diesen Wettbewerb erfasst.',
  },
  historyLoading: {
    fr: 'Chargement de l’historique…',
    en: 'Loading history…',
    de: 'Verlauf wird geladen…',
  },
  historyLoadError: {
    fr: 'Impossible de charger l’historique.',
    en: 'Could not load history.',
    de: 'Verlauf konnte nicht geladen werden.',
  },

  // ── StageTemplateCard ──────────────────────────────────────────────────────
  cardAudienceCount: {
    // {n} sera remplacé côté composant
    fr: '{n} destinataire(s)',
    en: '{n} recipient(s)',
    de: '{n} Empfänger',
  },
  cardAudienceLoading: {
    fr: 'Calcul de l’audience…',
    en: 'Computing audience…',
    de: 'Zielgruppe wird berechnet…',
  },
  cardAudienceError: {
    fr: 'Audience indisponible.',
    en: 'Audience unavailable.',
    de: 'Zielgruppe nicht verfügbar.',
  },
  cardAudienceUnknown: {
    fr: 'Audience résolue à l’envoi',
    en: 'Audience resolved at send time',
    de: 'Zielgruppe wird beim Versand ermittelt',
  },
  cardPrepareSend: {
    fr: 'Préparer l’envoi',
    en: 'Prepare send',
    de: 'Versand vorbereiten',
  },
  cardOpenTemplate: {
    fr: 'Voir le modèle',
    en: 'View template',
    de: 'Vorlage ansehen',
  },
  cardDuplicate: {
    fr: 'Dupliquer',
    en: 'Duplicate',
    de: 'Duplizieren',
  },
  cardAutoTriggerBadge: {
    fr: 'Auto',
    en: 'Auto',
    de: 'Auto',
  },
  cardAutoTriggerTitle: {
    fr: 'Email transactionnel envoyé automatiquement',
    en: 'Transactional email sent automatically',
    de: 'Transaktionale E-Mail wird automatisch versendet',
  },
  cardManualBadge: {
    fr: 'Manuel',
    en: 'Manual',
    de: 'Manuell',
  },

  // ── StageEmailModal ────────────────────────────────────────────────────────
  modalEyebrow: {
    fr: 'Préparer un envoi · {stage}',
    en: 'Prepare send · {stage}',
    de: 'Versand vorbereiten · {stage}',
  },
  modalTabAudience: {
    fr: 'Destinataires',
    en: 'Recipients',
    de: 'Empfänger',
  },
  modalTabTemplate: {
    fr: 'Modèle',
    en: 'Template',
    de: 'Vorlage',
  },
  modalTabDryRun: {
    fr: 'Dry-run',
    en: 'Dry-run',
    de: 'Dry-run',
  },
  modalAudienceTitle: {
    fr: 'Audience prévisualisée',
    en: 'Audience preview',
    de: 'Vorschau der Zielgruppe',
  },
  modalAudienceHint: {
    fr: 'La liste sera recalculée à l’envoi : seuls les profils encore éligibles recevront le message.',
    en: 'The list is recomputed at send time: only profiles still eligible will receive the message.',
    de: 'Die Liste wird beim Versand neu berechnet: Nur weiterhin geeignete Profile erhalten die Nachricht.',
  },
  modalAudienceCount: {
    fr: 'destinataires actuellement éligibles',
    en: 'currently eligible recipients',
    de: 'aktuell berechtigte Empfänger',
  },
  modalAudienceSampleLabel: {
    fr: 'Premiers destinataires',
    en: 'First recipients',
    de: 'Erste Empfänger',
  },
  modalAudienceEmpty: {
    fr: 'Aucun destinataire dans cette audience pour l’instant. L’envoi est désactivé.',
    en: 'No recipient in this audience yet. Sending is disabled.',
    de: 'Aktuell keine Empfänger in dieser Zielgruppe. Der Versand ist deaktiviert.',
  },
  modalLangLabel: {
    fr: 'Langue de l’email',
    en: 'Email language',
    de: 'E-Mail-Sprache',
  },
  modalSubjectLabel: {
    fr: 'Sujet',
    en: 'Subject',
    de: 'Betreff',
  },
  modalBodyLabel: {
    fr: 'Corps du message',
    en: 'Message body',
    de: 'Nachrichtentext',
  },
  modalBodyHelper: {
    fr: 'Markdown léger : **gras**, *italique*, [lien](https://exemple.org). Rendu Élysée appliqué côté serveur.',
    en: 'Light markdown: **bold**, *italic*, [link](https://example.org). Élysée rendering applied server-side.',
    de: 'Leichtes Markdown: **fett**, *kursiv*, [Link](https://beispiel.org). Élysée-Rendering wird serverseitig angewendet.',
  },
  modalResetTemplate: {
    fr: 'Restaurer le modèle pré-rédigé',
    en: 'Restore the pre-written template',
    de: 'Vorlage wiederherstellen',
  },
  modalDryRunTitle: {
    fr: 'Aperçu — données mockées',
    en: 'Preview — mocked data',
    de: 'Vorschau — mit Testdaten',
  },
  modalDryRunHint: {
    fr: 'Rendu final du message tel qu’il sera reçu. Les variables sont remplacées par des exemples.',
    en: 'Final rendering of the message as recipients will see it. Variables are replaced by examples.',
    de: 'Endgültige Darstellung der Nachricht, wie sie die Empfänger sehen werden. Variablen werden durch Beispiele ersetzt.',
  },
  modalSendCta: {
    // {n} = recipients count
    fr: 'Envoyer à {n} destinataires',
    en: 'Send to {n} recipients',
    de: 'An {n} Empfänger senden',
  },
  modalSendCtaZero: {
    fr: 'Aucun destinataire',
    en: 'No recipient',
    de: 'Keine Empfänger',
  },
  modalSending: {
    fr: 'Envoi en cours…',
    en: 'Sending…',
    de: 'Senden läuft…',
  },
  modalSendOk: {
    fr: 'Envoi effectué.',
    en: 'Send completed.',
    de: 'Versand abgeschlossen.',
  },
  modalSendPartial: {
    fr: 'Envoi partiellement effectué.',
    en: 'Send partially completed.',
    de: 'Versand teilweise abgeschlossen.',
  },
  modalSendFailed: {
    fr: 'Échec de l’envoi.',
    en: 'Send failed.',
    de: 'Versand fehlgeschlagen.',
  },
  modalSendSummary: {
    // {sent}, {total} — ex. "12 / 14 destinataires"
    fr: '{sent}/{total} destinataires servis',
    en: '{sent}/{total} recipients served',
    de: '{sent}/{total} Empfänger zugestellt',
  },
  modalConfirmTitle: {
    fr: 'Confirmer l’envoi groupé',
    en: 'Confirm bulk send',
    de: 'Massenversand bestätigen',
  },
  modalConfirmBody: {
    fr: 'Vous êtes sur le point d’envoyer ce message à {n} destinataires. L’action est irréversible.',
    en: 'You are about to send this message to {n} recipients. This action cannot be undone.',
    de: 'Sie senden gleich diese Nachricht an {n} Empfänger. Diese Aktion kann nicht rückgängig gemacht werden.',
  },
  modalConfirmYes: {
    fr: 'Envoyer maintenant',
    en: 'Send now',
    de: 'Jetzt senden',
  },
  modalConfirmNo: {
    fr: 'Retour',
    en: 'Back',
    de: 'Zurück',
  },
  modalNoAudienceTypeWarning: {
    fr: 'Ce modèle n’expose pas d’audience structurée — utilisez l’Email Studio pour un envoi sur mesure.',
    en: 'This template does not expose a structured audience — use the Email Studio for a custom send.',
    de: 'Diese Vorlage stellt keine strukturierte Zielgruppe bereit — nutzen Sie Email Studio für einen individuellen Versand.',
  },
};
