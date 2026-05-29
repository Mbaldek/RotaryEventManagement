// Analytics i18n — dictionnaires trilingues FR/EN/DE (V3 Vague 3 · Feature F).
//
// Forme { fr, en, de } compatible useLang().t(dict). Co-localisé avec les
// composants analytics/*. Pas de hardcode dans les composants.

export const ANALYTICS_UI = {
  eyebrow:        { fr: 'Analytics',           en: 'Analytics',         de: 'Analytics' },
  titleLead:      { fr: 'Analytics',           en: 'Analytics',         de: 'Analytics' },
  titleItalic:    { fr: 'temps réel',          en: 'real-time',         de: 'in Echtzeit' },
  subtitleClub: {
    fr: 'Suivi temps réel du funnel de candidatures, de l’activité jury et de la conversion par étape pour votre club.',
    en: 'Real-time tracking of your club’s application funnel, jury activity and stage-by-stage conversion.',
    de: 'Echtzeit-Tracking des Bewerbungs-Funnels, der Jury-Aktivität und der Konversion nach Phase Ihres Clubs.',
  },
  subtitleMaster: {
    fr: 'Vue plateforme — funnel agrégé, comparaison entre clubs, activité jury et conversion par étape.',
    en: 'Platform view — aggregated funnel, club-by-club comparison, jury activity and stage conversion.',
    de: 'Plattformsicht — aggregierter Funnel, Vergleich nach Club, Jury-Aktivität und Phasen-Konversion.',
  },

  loading:        { fr: 'Chargement des analytics…', en: 'Loading analytics…', de: 'Analytics werden geladen…' },
  emptyTitle:     { fr: 'Pas encore de données', en: 'No data yet',        de: 'Noch keine Daten' },
  emptyBody: {
    fr: 'Les analytics apparaîtront dès la première candidature soumise.',
    en: 'Analytics will appear as soon as the first application is submitted.',
    de: 'Die Analytics erscheinen, sobald die erste Bewerbung eingereicht wurde.',
  },
  errorTitle:     { fr: 'Impossible de charger', en: 'Could not load',     de: 'Konnte nicht laden' },
  errorBody: {
    fr: 'Les analytics n’ont pas pu être récupérées. Réessayez plus tard.',
    en: 'Analytics could not be fetched. Please try again later.',
    de: 'Die Analytics konnten nicht abgerufen werden. Bitte später erneut versuchen.',
  },
  retry:          { fr: 'Réessayer',            en: 'Retry',             de: 'Erneut versuchen' },
  liveDot:        { fr: 'En direct',            en: 'Live',              de: 'Live' },
  noEdition: {
    fr: 'Sélectionnez une compétition pour afficher les analytics.',
    en: 'Pick a competition to display analytics.',
    de: 'Wählen Sie einen Wettbewerb aus, um die Analytics anzuzeigen.',
  },

  // KPI labels
  kpiApplied:       { fr: 'Candidatures',         en: 'Applications',      de: 'Bewerbungen' },
  kpiEligible:      { fr: 'Éligibles',            en: 'Eligible',          de: 'Förderfähig' },
  kpiInReview:      { fr: 'En instruction',       en: 'In review',         de: 'In Prüfung' },
  kpiSelected:      { fr: 'Sélectionnées',        en: 'Selected',          de: 'Ausgewählt' },
  kpiScored:        { fr: 'Évaluées',             en: 'Scored',            de: 'Bewertet' },
  kpiFinaliste:     { fr: 'Finalistes',           en: 'Finalists',         de: 'Finalisten' },
  kpiLaureat:       { fr: 'Lauréates',            en: 'Laureates',         de: 'Preisträger' },
  kpiRejected:      { fr: 'Refusées',             en: 'Rejected',          de: 'Abgelehnt' },

  // KPI tooltips (concise — montrer la définition exacte du statut)
  tooltipApplied: {
    fr: 'Total des dossiers déposés (tous statuts hors brouillon).',
    en: 'Total dossiers submitted (every status except draft).',
    de: 'Gesamtzahl eingereichter Dossiers (alle Status außer Entwurf).',
  },
  tooltipEligible: {
    fr: 'Dossiers déclarés éligibles par le comité ou en aval (affecté, en session, noté, finaliste, lauréat).',
    en: 'Dossiers declared eligible by the committee or downstream (assigned, in session, scored, finalist, laureate).',
    de: 'Vom Komitee oder weiter unten als förderfähig eingestufte Dossiers (zugewiesen, in Session, bewertet, Finalist, Preisträger).',
  },
  tooltipInReview: {
    fr: 'Dossiers en cours d’examen par le comité (en sélection, éligibles, liste d’attente, affectés, en session).',
    en: 'Dossiers under committee review (in selection, eligible, waitlist, assigned, in session).',
    de: 'Vom Komitee geprüfte Dossiers (in Auswahl, förderfähig, Warteliste, zugewiesen, in Session).',
  },
  tooltipSelected: {
    fr: 'Dossiers retenus pour une session jury (affecté, en session, noté, finaliste, lauréat).',
    en: 'Dossiers retained for a jury session (assigned, in session, scored, finalist, laureate).',
    de: 'Für eine Jury-Session ausgewählte Dossiers (zugewiesen, in Session, bewertet, Finalist, Preisträger).',
  },
  tooltipScored: {
    fr: 'Dossiers ayant reçu au moins une note finale (noté, finaliste, lauréat).',
    en: 'Dossiers with at least one final score (scored, finalist, laureate).',
    de: 'Dossiers mit mindestens einer finalen Bewertung (bewertet, Finalist, Preisträger).',
  },
  tooltipFinaliste: {
    fr: 'Dossiers promus en finale fédérée (finaliste, lauréat).',
    en: 'Dossiers promoted to the federated finale (finalist, laureate).',
    de: 'Ins föderierte Finale beförderte Dossiers (Finalist, Preisträger).',
  },
  tooltipLaureat: {
    fr: 'Lauréates et lauréats de la Grande Finale.',
    en: 'Laureates of the Grand Finale.',
    de: 'Preisträger des Grand Finale.',
  },
  tooltipRejected: {
    fr: 'Dossiers refusés par le comité ou non retenus.',
    en: 'Dossiers rejected by the committee or not retained.',
    de: 'Vom Komitee abgelehnte oder nicht ausgewählte Dossiers.',
  },

  // Funnel chart
  funnelTitle:       { fr: 'Funnel de conversion', en: 'Conversion funnel', de: 'Konversionsfunnel' },
  funnelHint: {
    fr: 'Du dépôt à la lauréate — % du total des candidatures.',
    en: 'From submission to laureate — % of total applications.',
    de: 'Von der Einreichung zum Preisträger — % aller Bewerbungen.',
  },
  funnelStagePctOfApplied: {
    fr: '% des candidatures',
    en: '% of applications',
    de: '% der Bewerbungen',
  },
  funnelStagePctOfPrevious: {
    fr: '% de l’étape précédente',
    en: '% of previous stage',
    de: '% der vorherigen Phase',
  },

  // Clubs breakdown
  clubsTitle:        { fr: 'Comparaison par club', en: 'Club-by-club comparison', de: 'Vergleich nach Club' },
  clubsHint: {
    fr: 'Candidatures par club, triées du plus actif au moins actif.',
    en: 'Applications per club, sorted from most to least active.',
    de: 'Bewerbungen pro Club, sortiert vom aktivsten zum am wenigsten aktiven.',
  },
  clubsEmpty: {
    fr: 'Aucun club n’a encore de candidature pour cette compétition.',
    en: 'No club has any applications for this competition yet.',
    de: 'Noch hat kein Club Bewerbungen für diesen Wettbewerb.',
  },
  clubColClub:      { fr: 'Club',                 en: 'Club',              de: 'Club' },
  clubColCountry:   { fr: 'Pays',                 en: 'Country',           de: 'Land' },
  clubColApplied:   { fr: 'Candid.',              en: 'Apps',              de: 'Bewerb.' },
  clubColSelected:  { fr: 'Sélect.',              en: 'Selected',          de: 'Ausgew.' },
  clubColScored:    { fr: 'Évaluées',             en: 'Scored',            de: 'Bewertet' },
  clubColFinaliste: { fr: 'Finalistes',           en: 'Finalists',         de: 'Finalisten' },
  clubColLaureat:   { fr: 'Lauréates',            en: 'Laureates',         de: 'Preisträger' },

  // Jury activity table
  juryTitle:        { fr: 'Activité jury',        en: 'Jury activity',     de: 'Jury-Aktivität' },
  juryHint: {
    fr: 'Sessions assignées vs scorées + temps moyen jusqu’à la notation.',
    en: 'Assigned vs scored sessions plus average time-to-score.',
    de: 'Zugewiesene vs. bewertete Sessions plus durchschnittliche Bewertungszeit.',
  },
  juryEmpty: {
    fr: 'Aucun juré assigné pour cette compétition.',
    en: 'No juror assigned to this competition.',
    de: 'Kein Juror diesem Wettbewerb zugewiesen.',
  },
  juryColJuror:     { fr: 'Juré',                 en: 'Juror',             de: 'Juror' },
  juryColAssign:    { fr: 'Sessions assignées',   en: 'Sessions assigned', de: 'Zugewiesen' },
  juryColScored:    { fr: 'Sessions scorées',     en: 'Sessions scored',   de: 'Bewertet' },
  juryColScores:    { fr: 'Notes soumises',       en: 'Scores submitted',  de: 'Bewertungen' },
  juryColCompletion:{ fr: 'Complétion',           en: 'Completion',        de: 'Vollständigkeit' },
  juryColAvgTime:   { fr: 'Temps moyen',          en: 'Avg time',          de: 'Ø Zeit' },
  juryAvgTimeUnit:  { fr: 'h',                    en: 'h',                 de: 'h' },
  juryUnknown:      { fr: '—',                    en: '—',                 de: '—' },
};

// Stage labels — réutilisés par le chart funnel + le tableau de conversion.
// Pour cohérence avec les statuts SQL, les clés sont stables.
export const STAGE_LABELS = {
  applied:   { fr: 'Candidat.',     en: 'Applied',    de: 'Bewerb.' },
  in_review: { fr: 'Instruction',   en: 'In review',  de: 'Prüfung' },
  eligible:  { fr: 'Éligibles',     en: 'Eligible',   de: 'Förderfähig' },
  selected:  { fr: 'Sélectionnées', en: 'Selected',   de: 'Ausgewählt' },
  scored:    { fr: 'Évaluées',      en: 'Scored',     de: 'Bewertet' },
  finaliste: { fr: 'Finalistes',    en: 'Finalists',  de: 'Finalisten' },
  laureat:   { fr: 'Lauréates',     en: 'Laureates',  de: 'Preisträger' },
};

export const FUNNEL_ORDER = ['applied', 'in_review', 'eligible', 'selected', 'scored', 'finaliste', 'laureat'];
