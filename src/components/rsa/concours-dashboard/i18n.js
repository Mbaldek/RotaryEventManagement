// Dictionnaires trilingues FR/EN/DE du dashboard public du concours (V3).
//
// V3 enrichit V2.5 avec : eyebrow thématique session, KPI labels courts,
// timeline horizontale, winner label, accès jury QR code dans le drawer.

export const UI = {
  // ── TopNav ────────────────────────────────────────────────────────────────
  navTitle: { fr: 'Compétitions', en: 'Competitions', de: 'Wettbewerbe' },
  navSubtitle: {
    fr: 'Le concours en transparence',
    en: 'The awards in transparency',
    de: 'Der Award in voller Transparenz',
  },

  // ── Hero H-Ambient ────────────────────────────────────────────────────────
  heroEyebrow: { fr: 'Compétition', en: 'Competition', de: 'Wettbewerb' },
  heroTitleLead: {
    fr: 'Le concours en un coup d’œil',
    en: 'The awards at a glance',
    de: 'Der Award auf einen Blick',
  },
  heroTitleItalic: {
    fr: 'Toutes les sessions, tous les clubs.',
    en: 'Every session, every club.',
    de: 'Alle Sessions, alle Clubs.',
  },
  heroIntro: {
    fr: 'Vue partagée à tous les jurés, comités et candidats — sessions à venir, sessions en direct, résultats publiés et finalistes désignés en temps réel.',
    en: 'A shared view for every juror, comité member and applicant — upcoming sessions, sessions in progress, published results and designated finalists, in real time.',
    de: 'Geteilte Übersicht für alle Jurymitglieder, Komitee-Mitglieder und Bewerber — anstehende Sessions, laufende Sessions, veröffentlichte Ergebnisse und benannte Finalisten in Echtzeit.',
  },

  // ── Edition selector ──────────────────────────────────────────────────────
  selectEdition: { fr: 'Compétition', en: 'Competition', de: 'Wettbewerb' },
  noEdition: {
    fr: 'Aucune compétition publiée.',
    en: 'No competition published yet.',
    de: 'Noch kein Wettbewerb veröffentlicht.',
  },

  // ── Stats line (saison) ──────────────────────────────────────────────────
  statClubs:     { fr: 'clubs', en: 'clubs', de: 'Clubs' },
  statSessions:  { fr: 'sessions', en: 'sessions', de: 'Sitzungen' },
  statFinalists: { fr: 'finalistes', en: 'finalists', de: 'Finalistinnen' },
  statNext:      { fr: 'prochaine', en: 'next', de: 'nächste' },

  // ── KPI bar ───────────────────────────────────────────────────────────────
  kpiSessionsDone: {
    fr: 'Sessions terminées',
    en: 'Sessions completed',
    de: 'Abgeschlossene Sessions',
  },
  kpiFinalists: {
    fr: 'Finalistes désignés',
    en: 'Finalists designated',
    de: 'Benannte Finalisten',
  },
  kpiNext: { fr: 'Prochaine session', en: 'Next session', de: 'Nächste Session' },
  kpiClubs: { fr: 'Clubs participants', en: 'Participating clubs', de: 'Teilnehmende Clubs' },
  none: { fr: '—', en: '—', de: '—' },

  // ── Programme (saison) ───────────────────────────────────────────────────
  programOpener: { fr: 'La saison, dans l’ordre', en: 'The season, in order', de: 'Die Saison, der Reihe nach' },
  monthSessions: {
    fr: (n) => `${n} session${n > 1 ? 's' : ''}`,
    en: (n) => `${n} session${n > 1 ? 's' : ''}`,
    de: (n) => `${n} Sitzung${n === 1 ? '' : 'en'}`,
  },

  // ── Timeline ──────────────────────────────────────────────────────────────
  timelineEyebrow: { fr: 'Calendrier', en: 'Calendar', de: 'Kalender' },
  timelineTitle: {
    fr: 'Le parcours du concours',
    en: 'The competition journey',
    de: 'Der Verlauf des Wettbewerbs',
  },
  timelineLegendUpcoming: { fr: 'À venir', en: 'Upcoming', de: 'Bevorstehend' },
  timelineLegendLive: { fr: 'En direct', en: 'Live', de: 'Live' },
  timelineLegendDone: { fr: 'Publiée', en: 'Published', de: 'Veröffentlicht' },
  timelineEmpty: {
    fr: 'Aucune session programmée pour cette compétition.',
    en: 'No session scheduled for this competition.',
    de: 'Für diesen Wettbewerb ist keine Session geplant.',
  },

  // ── Club section ──────────────────────────────────────────────────────────
  clubEyebrow: { fr: 'Club', en: 'Club', de: 'Club' },
  clubSessionsCount: {
    fr: (n) => `${n} session${n > 1 ? 's' : ''}`,
    en: (n) => `${n} session${n > 1 ? 's' : ''}`,
    de: (n) => `${n} Session${n > 1 ? 's' : ''}`,
  },
  clubCandidaturesCount: {
    fr: (n) => `${n} candidature${n > 1 ? 's' : ''}`,
    en: (n) => `${n} application${n > 1 ? 's' : ''}`,
    de: (n) => `${n} Bewerbung${n > 1 ? 'en' : ''}`,
  },
  noSessionsForClub: {
    fr: 'Aucune session programmée pour ce club.',
    en: 'No session scheduled for this club yet.',
    de: 'Für diesen Club ist noch keine Session geplant.',
  },
  noClubs: {
    fr: 'Aucun club rattaché à cette compétition.',
    en: 'No club attached to this competition yet.',
    de: 'Diesem Wettbewerb ist noch kein Club zugeordnet.',
  },
  clubNextLabel: {
    fr: 'Prochaine session',
    en: 'Next session',
    de: 'Nächste Session',
  },

  // ── Session card ──────────────────────────────────────────────────────────
  themeFallback: { fr: 'Session', en: 'Session', de: 'Session' },
  cardJurorsLabel: {
    fr: (n) => `${n} juré${n > 1 ? 's' : ''}`,
    en: (n) => `${n} juror${n > 1 ? 's' : ''}`,
    de: (n) => `${n} Jurymitglied${n > 1 ? 'er' : ''}`,
  },
  cardStartupsLabel: {
    fr: (n) => `${n} startup${n > 1 ? 's' : ''}`,
    en: (n) => `${n} startup${n > 1 ? 's' : ''}`,
    de: (n) => `${n} Startup${n > 1 ? 's' : ''}`,
  },
  // Short labels for the KPI bar (the number is rendered as a separate node).
  cardJurorsShort: { fr: 'jurés', en: 'jurors', de: 'Juroren' },
  cardStartupsShort: { fr: 'startups', en: 'startups', de: 'Startups' },
  cardJuryPack: { fr: 'Pack jury', en: 'Jury pack', de: 'Jury-Paket' },
  cardOpenSession: { fr: 'Détail', en: 'Details', de: 'Details' },
  cardFinalistLabel: {
    fr: 'Finaliste retenu',
    en: 'Selected finalist',
    de: 'Ausgewählter Finalist',
  },
  cardFinalistPending: {
    fr: 'Finaliste à désigner',
    en: 'Finalist to be designated',
    de: 'Finalist noch zu bestimmen',
  },
  cardWinner: { fr: 'Lauréat', en: 'Winner', de: 'Gewinner' },

  // ── Session row (saison) ─────────────────────────────────────────────────
  rowFollowLive:  { fr: 'Suivre le scoring', en: 'Follow scoring', de: 'Bewertung verfolgen' },
  rowOpen:        { fr: 'Détail', en: 'Details', de: 'Details' },
  rowScoringLive: { fr: 'scoring en cours', en: 'scoring in progress', de: 'Bewertung läuft' },
  rowLaureate:    { fr: 'Lauréate', en: 'Winner', de: 'Siegerin' },

  // ── Status pills ──────────────────────────────────────────────────────────
  statusDraft: { fr: 'À venir', en: 'Upcoming', de: 'Bevorstehend' },
  statusLive: { fr: 'En direct', en: 'Live', de: 'Live' },
  statusLocked: { fr: 'Notations closes', en: 'Scoring closed', de: 'Bewertung geschlossen' },
  statusPublished: { fr: 'Résultats publiés', en: 'Results published', de: 'Ergebnisse veröffentlicht' },
  statusFinished: { fr: 'Terminée', en: 'Completed', de: 'Abgeschlossen' },

  // ── Countdown ─────────────────────────────────────────────────────────────
  today: { fr: 'Aujourd’hui', en: 'Today', de: 'Heute' },
  tomorrow: { fr: 'Demain', en: 'Tomorrow', de: 'Morgen' },
  inDays: {
    fr: (n) => `J-${n}`,
    en: (n) => `D-${n}`,
    de: (n) => `T-${n}`,
  },
  ago: { fr: 'Passée', en: 'Past', de: 'Vergangen' },

  // ── Detail drawer ─────────────────────────────────────────────────────────
  drawerClose: { fr: 'Fermer', en: 'Close', de: 'Schließen' },
  drawerSection: {
    fr: 'Détail de la session',
    en: 'Session detail',
    de: 'Session-Detail',
  },
  drawerStartups: {
    fr: 'Startups au programme',
    en: 'Pitching startups',
    de: 'Pitchende Startups',
  },
  drawerJurors: {
    fr: 'Jurés confirmés',
    en: 'Confirmed jurors',
    de: 'Bestätigte Jurymitglieder',
  },
  drawerEmpty: {
    fr: 'Aucune donnée pour le moment.',
    en: 'No data yet.',
    de: 'Noch keine Daten.',
  },
  drawerDeck: { fr: 'Deck', en: 'Deck', de: 'Deck' },
  drawerExec: { fr: 'Executive summary', en: 'Executive summary', de: 'Executive Summary' },
  drawerNotAvailable: { fr: 'Non disponible', en: 'Not available', de: 'Nicht verfügbar' },
  drawerScoringLabel: {
    fr: 'Accès scoring jury',
    en: 'Jury scoring access',
    de: 'Jury-Scoring-Zugang',
  },
  drawerScoringHelp: {
    fr: 'Scannez le QR avec votre téléphone, ou ouvrez le lien sur tout appareil. À l’arrivée, sélectionnez votre nom dans la liste.',
    en: 'Scan the QR with your phone, or open the link on any device. On arrival, pick your name from the list.',
    de: 'Scannen Sie den QR mit Ihrem Telefon oder öffnen Sie den Link auf einem beliebigen Gerät. Wählen Sie Ihren Namen aus der Liste.',
  },
  drawerCopy: { fr: 'Copier', en: 'Copy', de: 'Kopieren' },
  drawerOpenScoring: { fr: 'Ouvrir le scoring', en: 'Open scoring', de: 'Scoring öffnen' },
  drawerJuryPack: {
    fr: 'Télécharger le pack jury',
    en: 'Download jury pack',
    de: 'Jury-Paket herunterladen',
  },
  drawerWinnerLabel: { fr: 'Lauréat de la session', en: 'Session winner', de: 'Sessionsgewinner' },
  drawerRankingTitle: {
    fr: 'Classement final',
    en: 'Final ranking',
    de: 'Endgültiges Ranking',
  },
  drawerCopied: { fr: 'Lien copié', en: 'Link copied', de: 'Link kopiert' },
  drawerCopyFailed: { fr: 'Copie impossible', en: 'Copy failed', de: 'Kopieren fehlgeschlagen' },

  // ── Finale ────────────────────────────────────────────────────────────────
  finaleEyebrow: { fr: 'Grande Finale', en: 'Grand Final', de: 'Grand Finale' },
  finaleTitle: {
    fr: 'La Grande Finale',
    en: 'The Grand Final',
    de: 'Das Grand Finale',
  },
  finaleNoData: {
    fr: 'La Grande Finale n’est pas encore programmée — date à confirmer.',
    en: 'The Grand Final has not been scheduled yet — date to be confirmed.',
    de: 'Das Grand Finale ist noch nicht terminiert — der genaue Termin wird noch bekanntgegeben.',
  },
  finaleFinalistsLabel: {
    fr: (n, total) => `Finalistes confirmés · ${n}${total ? ` / ${total}` : ''}`,
    en: (n, total) => `Confirmed finalists · ${n}${total ? ` / ${total}` : ''}`,
    de: (n, total) => `Bestätigte Finalisten · ${n}${total ? ` / ${total}` : ''}`,
  },
  finaleNoFinalists: {
    fr: 'Finalistes désignés au fil des sessions qualificatives.',
    en: 'Finalists are designated as qualifying sessions go.',
    de: 'Die Finalisten werden im Laufe der Qualifikations-Sessions benannt.',
  },
  finaleFromSession: { fr: 'Issue de', en: 'From', de: 'Aus' },
  finaleRsvpCta: {
    fr: 'Confirmer ma présence à la finale',
    en: 'Confirm my attendance',
    de: 'Teilnahme bestätigen',
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footerLine: {
    fr: 'Page consultable par tous les jurés, comités et candidats authentifiés. Mise à jour en temps réel.',
    en: 'Page open to every authenticated juror, comité member and applicant. Updated in real time.',
    de: 'Diese Seite steht allen authentifizierten Jurymitgliedern, Komitee-Mitgliedern und Bewerbern offen. Aktualisierung in Echtzeit.',
  },
  footerContact: { fr: 'Contact :', en: 'Contact:', de: 'Kontakt:' },

  // ── Misc ──────────────────────────────────────────────────────────────────
  loading: { fr: 'Chargement…', en: 'Loading…', de: 'Wird geladen…' },
  loadError: {
    fr: 'Impossible de charger le dashboard. Réessayez plus tard.',
    en: 'Could not load the dashboard. Please try again later.',
    de: 'Das Dashboard konnte nicht geladen werden. Bitte versuchen Sie es später erneut.',
  },
  retry: { fr: 'Réessayer', en: 'Retry', de: 'Erneut versuchen' },
};

// Date formatter trilingue.
export function formatSessionDate(iso, lang = 'fr') {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const locale = lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-GB';
    return d.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

// Date courte (timeline, badges) — « 6 mai », « May 6 », « 6. Mai ».
export function formatShortDate(iso, lang = 'fr') {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const locale = lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-GB';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}
