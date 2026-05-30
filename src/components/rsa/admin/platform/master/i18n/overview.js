// ── Overview tab (master cockpit landing) ───────────────────────────────────
export const OVERVIEW = {
  eyebrow:       { fr: 'Administration', en: 'Administration', de: 'Verwaltung' },
  titleLead:     { fr: "Vue d'ensemble",  en: 'Overview',        de: 'Übersicht' },
  titleItalic:   { fr: '',                en: '',                de: '' },
  // Hairline opener placed above the Live dashboard (top block after the hero).
  liveDashboardEyebrow: {
    fr: 'En direct',
    en: 'Live',
    de: 'Live',
  },
  liveDashboardTitle: {
    fr: 'Tableau de bord',
    en: 'Live dashboard',
    de: 'Live-Dashboard',
  },
  // Empty-state shown when the activity feed has no row (data === [] after fetch).
  feedEmptyShort: {
    fr: 'Aucune activité encore.',
    en: 'No activity yet.',
    de: 'Noch keine Aktivität.',
  },
  pulseNoActive: {
    fr: 'Aucune compétition active. Le pouls de la plateforme reprendra dès qu’une édition sera ouverte.',
    en: 'No active competition yet. The platform pulse will resume as soon as an edition opens.',
    de: 'Noch kein aktiver Wettbewerb. Der Plattform-Puls setzt wieder ein, sobald eine Ausgabe eröffnet wird.',
  },
  // Pulse template — {name} et {applied}/{sessions}/{clubs} sont remplacés côté composant.
  pulseTemplate: {
    fr: '{name} est en cours — {applied} candidature(s), {sessions} session(s) sur {clubs} club(s) participant(s).',
    en: '{name} is live — {applied} application(s), {sessions} session(s) across {clubs} participating club(s).',
    de: '{name} läuft — {applied} Bewerbung(en), {sessions} Session(s) über {clubs} teilnehmende Club(s).',
  },

  // Activity feed
  feedEyebrow:   { fr: 'Administration',    en: 'Administration',   de: 'Verwaltung' },
  feedTitle:     { fr: 'Fil d’activité',    en: 'Activity feed',    de: 'Aktivitäts-Feed' },
  feedHint: {
    fr: 'Dix dernières actions auditées sur la plateforme — suppression de compétitions, promotion de finalistes, déclenchements de sessions.',
    en: 'Last ten audited actions across the platform — competition deletions, finalist promotions, session triggers.',
    de: 'Die zehn letzten geprüften Plattform-Aktionen — Wettbewerbslöschungen, Finalisten-Beförderungen, Session-Auslöser.',
  },
  feedEmpty: {
    fr: 'Aucune action auditée pour l’instant. Les évènements critiques apparaîtront ici en temps réel.',
    en: 'No audited action yet. Critical events will surface here in real time.',
    de: 'Noch keine geprüften Aktionen. Kritische Ereignisse erscheinen hier in Echtzeit.',
  },
  feedTime: {
    fr: 'à l’instant',  en: 'just now',         de: 'gerade eben',
  },
  feedMinutesAgo: { fr: 'il y a {n} min', en: '{n} min ago', de: 'vor {n} Min.' },
  feedHoursAgo:   { fr: 'il y a {n} h',   en: '{n} h ago',   de: 'vor {n} Std.' },
  feedDaysAgo:    { fr: 'il y a {n} j',   en: '{n} d ago',   de: 'vor {n} Tagen' },

  // Action labels (admin_audit_log.action)
  actionCompetitionDeleted: {
    fr: 'Compétition supprimée',
    en: 'Competition deleted',
    de: 'Wettbewerb gelöscht',
  },
  actionFinalistPromoted: {
    fr: 'Finaliste promu en Grande Finale',
    en: 'Finalist promoted to Grand Finale',
    de: 'Finalist ins Grand Finale befördert',
  },
  actionFinalistRemoved: {
    fr: 'Finaliste retiré du pool',
    en: 'Finalist removed from pool',
    de: 'Finalist aus dem Pool entfernt',
  },
  actionSessionPublished: {
    fr: 'Session publiée',
    en: 'Session published',
    de: 'Session veröffentlicht',
  },
  actionSessionConcluded: {
    fr: 'Session conclue',
    en: 'Session concluded',
    de: 'Session abgeschlossen',
  },
  actionClubRoleAssigned: {
    fr: 'Rôle club assigné',
    en: 'Club role assigned',
    de: 'Club-Rolle zugewiesen',
  },
  actionClubRoleRevoked: {
    fr: 'Rôle club retiré',
    en: 'Club role revoked',
    de: 'Club-Rolle entzogen',
  },
  actionClubCreated: {
    fr: 'Club créé',
    en: 'Club created',
    de: 'Club erstellt',
  },
  actionGeneric: {
    fr: 'Action',
    en: 'Action',
    de: 'Aktion',
  },

  // KPI rail — bande hairline éditoriale
  kpiRailEyebrow: {
    fr: 'Pouls plateforme',
    en: 'Platform pulse',
    de: 'Plattform-Puls',
  },
  kpiCompetitions: { fr: 'compétition(s)',  en: 'competition(s)',  de: 'Wettbewerb(e)' },
  kpiClubs:        { fr: 'club(s)',          en: 'club(s)',         de: 'Club(s)' },
  kpiApplications: { fr: 'candidature(s)',   en: 'application(s)',  de: 'Bewerbung(en)' },
  kpiSessions:     { fr: 'session(s)',       en: 'session(s)',      de: 'Session(s)' },
  kpiLiveSessions: { fr: 'en direct',        en: 'live',            de: 'live' },

  // Quick actions (raccourcis création)
  quickActionsEyebrow: {
    fr: 'Lancer un cycle',
    en: 'Kick off a cycle',
    de: 'Zyklus starten',
  },
  quickCreateCompetition: {
    fr: 'Nouvelle compétition',
    en: 'New competition',
    de: 'Neuer Wettbewerb',
  },
  quickCreateCompetitionHint: {
    fr: 'Ouvre le funnel — identité, calendrier, clubs participants.',
    en: 'Opens the funnel — identity, calendar, participating clubs.',
    de: 'Öffnet den Funnel — Identität, Kalender, teilnehmende Clubs.',
  },
  quickCreateClub: {
    fr: 'Nouveau club Rotary',
    en: 'New Rotary club',
    de: 'Neuer Rotary-Club',
  },
  quickCreateClubHint: {
    fr: 'Funnel club — informations, représentant, président.',
    en: 'Club funnel — information, representative, president.',
    de: 'Club-Funnel — Informationen, Vertreter, Präsident.',
  },
  quickInviteMember: {
    fr: 'Inviter un administrateur',
    en: 'Invite an administrator',
    de: 'Administrator·in einladen',
  },
  quickInviteMemberHint: {
    fr: 'Provisionne un rôle global (master_admin / admin legacy).',
    en: 'Provision a global role (master_admin / legacy admin).',
    de: 'Globale Rolle bereitstellen (master_admin / Legacy-Admin).',
  },

  // Chart sections
  chartsEyebrow: {
    fr: 'Tableau de bord',
    en: 'Live dashboard',
    de: 'Live-Dashboard',
  },
  chartsHint: {
    fr: 'Lecture temps réel — funnel agrégé de la compétition active et activité comparée des clubs.',
    en: 'Real-time read — aggregated funnel of the active competition and comparative club activity.',
    de: 'Echtzeit-Lesung — aggregierter Funnel des aktiven Wettbewerbs und vergleichende Club-Aktivität.',
  },
  chartFunnelTitle: {
    fr: 'Funnel candidatures',
    en: 'Application funnel',
    de: 'Bewerbungs-Funnel',
  },
  chartClubsTitle: {
    fr: 'Activité par club',
    en: 'Activity by club',
    de: 'Aktivität nach Club',
  },
  chartJuryTitle: {
    fr: 'Activité jury',
    en: 'Jury activity',
    de: 'Jury-Aktivität',
  },
  chartsNoActive: {
    fr: 'Les tableaux apparaîtront dès qu’une compétition aura une édition active.',
    en: 'Charts will appear as soon as one competition has an active edition.',
    de: 'Diagramme erscheinen, sobald ein Wettbewerb eine aktive Ausgabe hat.',
  },
};

// ── Advanced tools tab : SUPPRIMÉ (2026-05-29 équipe D — kill extensions). ──
