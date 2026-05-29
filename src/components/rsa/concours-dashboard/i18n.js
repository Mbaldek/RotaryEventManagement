// Dictionnaires trilingues FR/EN/DE du dashboard public du concours (V2.5).
//
// Forme { fr, en, de } compatible useLang().t(dict). Co-localisés avec les
// composants concours-dashboard/* (même patron que jury/i18n.js, candidature/i18n.js).
// La page Concours est PUBLIQUE (juré + comité + admin + candidat authentifié) :
// elle parle un langage non-administratif (« Concours », « En direct », « Voir
// la session »), pas le jargon admin (« Setup », « Live tab »).

export const UI = {
  // ── TopNav ────────────────────────────────────────────────────────────────
  navTitle: {
    fr: 'Rotary Startup Award',
    en: 'Rotary Startup Award',
    de: 'Rotary Startup Award',
  },
  navSubtitle: {
    fr: 'Le concours en transparence',
    en: 'The awards in transparency',
    de: 'Der Award in voller Transparenz',
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroEyebrow: {
    fr: 'Rotary Startup Award',
    en: 'Rotary Startup Award',
    de: 'Rotary Startup Award',
  },
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
    fr: 'Cette page est consultable par tous les jurés, comités et candidats. Elle reflète en temps réel l’avancement du concours — sessions à venir, sessions live, résultats publiés, finalistes désignés.',
    en: 'This page is open to every juror, comité member and applicant. It reflects the live state of the awards — upcoming sessions, sessions in progress, published results, designated finalists.',
    de: 'Diese Seite steht allen Jurymitgliedern, Komitee-Mitgliedern und Bewerbern offen. Sie zeigt in Echtzeit den Stand des Wettbewerbs — anstehende Sessions, laufende Sessions, veröffentlichte Ergebnisse, benannte Finalisten.',
  },

  // ── Edition selector ──────────────────────────────────────────────────────
  selectEdition: {
    fr: 'Compétition',
    en: 'Competition',
    de: 'Wettbewerb',
  },
  noEdition: {
    fr: 'Aucune compétition publiée.',
    en: 'No competition published yet.',
    de: 'Noch kein Wettbewerb veröffentlicht.',
  },

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
  kpiNext: {
    fr: 'Prochaine session',
    en: 'Next session',
    de: 'Nächste Session',
  },
  kpiClubs: {
    fr: 'Clubs participants',
    en: 'Participating clubs',
    de: 'Teilnehmende Clubs',
  },
  none: { fr: '—', en: '—', de: '—' },

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

  // ── Session card ──────────────────────────────────────────────────────────
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
  cardJuryPack: {
    fr: 'Pack jury',
    en: 'Jury pack',
    de: 'Jury-Paket',
  },
  cardOpenSession: {
    fr: 'Détail de la session',
    en: 'Session details',
    de: 'Session-Details',
  },
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
  drawerNotAvailable: {
    fr: 'Non disponible',
    en: 'Not available',
    de: 'Nicht verfügbar',
  },

  // ── Federated finale ──────────────────────────────────────────────────────
  finaleEyebrow: {
    fr: 'Grande Finale fédérée',
    en: 'Federated Grand Final',
    de: 'Föderiertes Grand Finale',
  },
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
  finaleFromSession: {
    fr: 'Issue de',
    en: 'From',
    de: 'Aus',
  },
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
  footerContact: {
    fr: 'Contact :',
    en: 'Contact:',
    de: 'Kontakt:',
  },

  // ── Misc ──────────────────────────────────────────────────────────────────
  loading: { fr: 'Chargement…', en: 'Loading…', de: 'Wird geladen…' },
  loadError: {
    fr: 'Impossible de charger le dashboard. Réessayez plus tard.',
    en: 'Could not load the dashboard. Please try again later.',
    de: 'Das Dashboard konnte nicht geladen werden. Bitte versuchen Sie es später erneut.',
  },
  retry: { fr: 'Réessayer', en: 'Retry', de: 'Erneut versuchen' },
};

// Date formatter trilingue : « lundi 5 novembre 2026 » / « Monday, 5 Nov 2026 » / « Montag, 5. Nov. 2026 ».
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
