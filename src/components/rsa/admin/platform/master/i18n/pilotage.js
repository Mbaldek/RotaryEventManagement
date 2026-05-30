// ── Pilotage tab (B-pilotage-tab) ───────────────────────────────────────────
// Checklist visuelle "next steps" rendue par défaut après création d'une
// compétition pour guider le master_admin (clubs à attacher, admins à inviter,
// sessions à configurer, finale à activer, URLs publiques à diffuser).
export const PILOTAGE = {
  tabLabel: {
    fr: 'Vue d’ensemble',
    en: 'Overview',
    de: 'Übersicht',
  },
  eyebrow: {
    fr: 'Mise en route',
    en: 'Onboarding',
    de: 'Inbetriebnahme',
  },
  checklistTitle: {
    fr: 'Étapes de configuration',
    en: 'Setup checklist',
    de: 'Konfigurationsschritte',
  },
  checklistIntro: {
    fr: 'Suivez ces étapes dans l’ordre pour amener la compétition jusqu’à la diffusion publique.',
    en: 'Follow these steps in order to bring the competition from draft to public launch.',
    de: 'Folgen Sie diesen Schritten in dieser Reihenfolge, um den Wettbewerb bis zur öffentlichen Bekanntgabe zu führen.',
  },
  completionLabel: {
    fr: 'Avancement',
    en: 'Progress',
    de: 'Fortschritt',
  },
  // {percent} sera remplacé côté composant.
  completionTemplate: {
    fr: '{percent} % configuré',
    en: '{percent} % configured',
    de: '{percent} % konfiguriert',
  },
  statusDone: {
    fr: 'Terminé',
    en: 'Done',
    de: 'Erledigt',
  },
  statusPending: {
    fr: 'À faire',
    en: 'To do',
    de: 'Offen',
  },
  statusOptional: {
    fr: 'Optionnel',
    en: 'Optional',
    de: 'Optional',
  },

  // Step 1 — Compétition créée
  step1Title: {
    fr: 'Compétition créée',
    en: 'Competition created',
    de: 'Wettbewerb erstellt',
  },
  step1Subtitle: {
    fr: 'Identité, calendrier et règles enregistrés.',
    en: 'Identity, calendar and rules saved.',
    de: 'Identität, Kalender und Regeln gespeichert.',
  },
  // {percent} = % de champs identité/calendrier/règles remplis.
  step1Fill: {
    fr: 'Identité, calendrier, règles configurés à {percent} %.',
    en: 'Identity, calendar, rules configured at {percent} %.',
    de: 'Identität, Kalender, Regeln zu {percent} % konfiguriert.',
  },
  step1CtaEditIdentity: {
    fr: 'Compléter l’identité',
    en: 'Complete identity',
    de: 'Identität ergänzen',
  },

  // Step 2 — Clubs participants attachés
  step2Title: {
    fr: 'Clubs participants attachés',
    en: 'Participating clubs attached',
    de: 'Teilnehmende Clubs zugeordnet',
  },
  // {count} = clubs attachés, {recommended} = min recommandé selon model.
  step2Count: {
    fr: '{count}/{recommended} clubs attachés',
    en: '{count}/{recommended} clubs attached',
    de: '{count}/{recommended} Clubs zugeordnet',
  },
  step2EmptyMulti: {
    fr: 'Aucun club attaché. Pour une compétition multiclub, attache au moins 2 clubs.',
    en: 'No club attached yet. For a multiclub competition, attach at least 2 clubs.',
    de: 'Noch kein Club zugeordnet. Für einen Multiclub-Wettbewerb mindestens 2 Clubs zuordnen.',
  },
  step2EmptyMono: {
    fr: 'Aucun club attaché. Une compétition monoclub doit avoir exactement 1 club.',
    en: 'No club attached yet. A monoclub competition needs exactly 1 club.',
    de: 'Noch kein Club zugeordnet. Ein Monoclub-Wettbewerb benötigt genau 1 Club.',
  },
  step2CtaAttach: {
    fr: 'Attacher un club',
    en: 'Attach a club',
    de: 'Club zuordnen',
  },

  // Step 3 — Club admins assignés
  step3Title: {
    fr: 'Club admins assignés',
    en: 'Club admins assigned',
    de: 'Club-Administratoren zugewiesen',
  },
  // {with} = clubs avec >=1 admin, {total} = clubs attachés
  step3Count: {
    fr: '{with}/{total} clubs ont un admin',
    en: '{with}/{total} clubs have an admin',
    de: '{with}/{total} Clubs haben eine·n Administrator·in',
  },
  step3MissingHeading: {
    fr: 'Clubs sans admin :',
    en: 'Clubs without an admin:',
    de: 'Clubs ohne Administrator·in:',
  },
  step3CtaInvite: {
    fr: 'Inviter club admins',
    en: 'Invite club admins',
    de: 'Club-Administrator·innen einladen',
  },
  step3NoClubsYet: {
    fr: 'Attache d’abord des clubs avant d’assigner des admins.',
    en: 'Attach clubs first before assigning admins.',
    de: 'Bitte zuerst Clubs zuordnen, bevor Administrator·innen zugewiesen werden.',
  },

  // Step 4 — Sessions configurées
  step4Title: {
    fr: 'Sessions configurées',
    en: 'Sessions configured',
    de: 'Sessions konfiguriert',
  },
  // {with} = clubs avec >=1 session, {total} = clubs attachés
  step4Count: {
    fr: '{with}/{total} clubs ont une session',
    en: '{with}/{total} clubs have a session',
    de: '{with}/{total} Clubs haben eine Session',
  },
  step4NeedsAdmin: {
    fr: 'Les sessions seront configurées par les club_admins une fois assignés.',
    en: 'Sessions will be configured by club admins once assigned.',
    de: 'Sessions werden von den Club-Administrator·innen konfiguriert, sobald diese benannt sind.',
  },
  // {clubName} sera remplacé côté composant.
  step4CtaCockpit: {
    fr: 'Ouvrir le cockpit de {clubName}',
    en: 'Open the {clubName} cockpit',
    de: 'Cockpit von {clubName} öffnen',
  },
  step4MissingHeading: {
    fr: 'Clubs sans session :',
    en: 'Clubs without a session:',
    de: 'Clubs ohne Session:',
  },

  // Step 5 — Finale configurée
  step5Title: {
    fr: 'Finale configurée',
    en: 'Finale configured',
    de: 'Finale konfiguriert',
  },
  step5Disabled: {
    fr: 'Finale non activée — cette compétition n’a pas de Grande Finale.',
    en: 'Finale not enabled — this competition has no Grand Finale.',
    de: 'Finale nicht aktiviert — dieser Wettbewerb hat kein Grand Finale.',
  },
  step5CtaEnable: {
    fr: 'Activer la Finale',
    en: 'Enable the Finale',
    de: 'Finale aktivieren',
  },
  step5CtaConfigure: {
    fr: 'Configurer la Finale',
    en: 'Configure the Finale',
    de: 'Finale konfigurieren',
  },
  step5MissingDate: {
    fr: 'Date non définie',
    en: 'Date not set',
    de: 'Datum nicht festgelegt',
  },
  step5MissingLocation: {
    fr: 'Lieu non défini',
    en: 'Location not set',
    de: 'Ort nicht festgelegt',
  },

  // Step 6 — URLs publiques
  step6Title: {
    fr: 'URLs publiques à diffuser',
    en: 'Public URLs to share',
    de: 'Öffentliche URLs zum Teilen',
  },
  step6Intro: {
    fr: 'Trois liens à diffuser pour ouvrir la compétition au public et au jury.',
    en: 'Three links to share to open the competition to candidates and jury.',
    de: 'Drei Links zur Verbreitung, um Bewerbungen und Jury anzusprechen.',
  },
  step6LinkApply: {
    fr: 'Candidater (startups)',
    en: 'Apply (startups)',
    de: 'Bewerben (Startups)',
  },
  step6LinkJury: {
    fr: 'Rejoindre le jury',
    en: 'Join the jury',
    de: 'Der Jury beitreten',
  },
  step6LinkPublic: {
    fr: 'Page publique',
    en: 'Public page',
    de: 'Öffentliche Seite',
  },
  step6Copy: {
    fr: 'Copier',
    en: 'Copy',
    de: 'Kopieren',
  },
  step6Copied: {
    fr: 'Copié',
    en: 'Copied',
    de: 'Kopiert',
  },
  step6CopyError: {
    fr: 'Échec de copie',
    en: 'Copy failed',
    de: 'Kopieren fehlgeschlagen',
  },
};
