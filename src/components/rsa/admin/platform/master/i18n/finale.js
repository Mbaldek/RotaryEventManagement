// ── Finale tab ──────────────────────────────────────────────────────────────
export const FINALE = {
  sectionTitle:  { fr: 'Grande Finale', en: 'Grand Finale', de: 'Grand Finale' },
  needMulticlub: {
    fr: 'La finale n’existe que pour les compétitions multiclub. Sélectionnez ou créez-en une.',
    en: 'The finale only applies to multiclub competitions. Select or create one.',
    de: 'Das Finale ist nur für Multiclub-Wettbewerbe vorgesehen. Bitte wählen oder erstellen Sie einen solchen.',
  },
  championsPerClub: { fr: 'Championnes & champions par club', en: 'Club champions', de: 'Club-Champions' },
  noChampions: {
    fr: 'Aucune championne ni champion qualifié pour l’instant. Les clubs doivent verrouiller et publier leurs sessions.',
    en: 'No qualified champions yet. Clubs must lock and publish their qualifying sessions first.',
    de: 'Noch keine qualifizierten Champions. Die Clubs müssen zunächst ihre Qualifikations-Sessions sperren und veröffentlichen.',
  },
  promoteToFinale: { fr: 'Promouvoir en finale', en: 'Promote to finale', de: 'Ins Finale weiterleiten' },
  promoteTodo: {
    fr: 'Disponible en M4b — la promotion automatique vers la finale arrive avec le module 4b.',
    en: 'Coming in M4b — automatic finale promotion ships with module 4b.',
    de: 'Verfügbar ab M4b — die automatische Weiterleitung ins Finale wird mit Modul 4b ausgeliefert.',
  },
  finaleSection: { fr: 'Configuration de la finale', en: 'Finale configuration', de: 'Finale-Konfiguration' },
  finaleExists: {
    fr: 'Une session « finale » existe pour cette compétition.',
    en: 'A finale session exists for this competition.',
    de: 'Für diesen Wettbewerb besteht bereits eine Session „Finale".',
  },
  finaleMissing: {
    fr: 'Aucune session « finale » pour l’instant. Créez-en une pour orchestrer la finale.',
    en: 'No finale session yet. Create one to orchestrate the finale.',
    de: 'Noch keine Session „Finale" angelegt. Erstellen Sie eine, um das Finale zu organisieren.',
  },
  createFinale:   { fr: 'Créer la Grande Finale', en: 'Create the grand finale', de: 'Grand Finale erstellen' },
  finaleSessionName: { fr: 'Nom de la session', en: 'Session name', de: 'Session-Name' },
  finaleDate:     { fr: 'Date',                en: 'Date',          de: 'Datum' },
  finaleIdHint:   {
    fr: 'Identifiant unique de la session, ex. « finale_2027 ».',
    en: 'Unique session identifier, e.g. “finale_2027”.',
    de: 'Eindeutige Session-Kennung, z. B. „finale_2027".',
  },
  finaleLink:     { fr: 'Gérer dans l’admin session (legacy)', en: 'Manage in legacy session admin', de: 'In der Legacy-Session-Verwaltung bearbeiten' },
  championClubCol:{ fr: 'Club',                en: 'Club',          de: 'Club' },
  championStartupCol: { fr: 'Startup',         en: 'Startup',       de: 'Startup' },
  championSessionCol: { fr: 'Session qualificative', en: 'Qualifying session', de: 'Qualifikations-Session' },
  championActionsCol: { fr: 'Actions',         en: 'Actions',       de: 'Aktionen' },

  // ── V3 Vague 2 (A) — Pool finale (platform_finale_membership) ─────────────
  poolSectionTitle: {
    fr: 'Pool de la Grande Finale',
    en: 'Finale pool',
    de: 'Pool des Finales',
  },
  poolSectionHint: {
    fr: 'Startups promues automatiquement à la Grande Finale après conclusion d’une session qualificative. Seul le master_admin peut retirer une startup du pool.',
    en: 'Startups automatically promoted to the finale once a qualifying session was concluded. Only master_admin can remove a startup from the pool.',
    de: 'Startups, die nach Abschluss einer Qualifikationssession automatisch ins Grand Finale befördert wurden. Nur master_admin kann eine Startup aus dem Pool entfernen.',
  },
  poolEmpty: {
    fr: 'Le pool est vide. Concluez une session qualifiée pour y promouvoir les vainqueurs.',
    en: 'The pool is empty. Conclude a qualifying session to promote the winners here.',
    de: 'Der Pool ist leer. Schließen Sie eine Qualifikationssession ab, um die Gewinner hier zu befördern.',
  },
  poolColStartup:    { fr: 'Startup',                en: 'Startup',           de: 'Startup' },
  poolColClub:       { fr: 'Club d’origine',        en: 'Origin club',       de: 'Herkunftsclub' },
  poolColSource:     { fr: 'Session source',         en: 'Source session',    de: 'Quell-Session' },
  poolColPromotedAt: { fr: 'Promu le',               en: 'Promoted on',       de: 'Befördert am' },
  poolColActions:    { fr: 'Actions',                en: 'Actions',           de: 'Aktionen' },
  poolRemoveAction:  { fr: 'Retirer',                en: 'Remove',            de: 'Entfernen' },
  poolRemoveConfirmTitle: {
    fr: 'Retirer cette startup du pool finale ?',
    en: 'Remove this startup from the finale pool?',
    de: 'Diese Startup aus dem Finale-Pool entfernen?',
  },
  poolRemoveConfirmBody: {
    fr: 'La startup sortira du pool de la Grande Finale et sera rétrogradée au statut « évalué ». Action tracée dans l’audit log.',
    en: 'The startup will leave the finale pool and be downgraded to “scored” status. Tracked in the audit log.',
    de: 'Die Startup wird aus dem Finale-Pool entfernt und auf „bewertet“ zurückgestuft. Wird im Audit-Log erfasst.',
  },
  poolRemoveTypedWord: {
    fr: 'RETIRER',
    en: 'REMOVE',
    de: 'ENTFERNEN',
  },
  poolUnknownStartup: { fr: 'Startup inconnue',     en: 'Unknown startup',   de: 'Unbekannte Startup' },
  poolUnknownClub:    { fr: '—',                     en: '—',                 de: '—' },
};
