// Public palmarès (/Resultats) — dictionnaire FR/EN/DE.
//
// Tone : institutionnel + célébratoire. Mirroir du palmarès de la landing
// rotary-startup.org. Le SUJET est l'édition (« Palmarès 2026 »), pas l'app.
//
// Convention : on expose UN seul objet T = { fr, en, de } passé à `useLang().t(T)`
// pour résoudre la branche active. Les helpers locaux (formatDate, formatPrize)
// dépendent du `locale` JS standard (fr-FR / en-GB / de-DE).
//
// Trilingual rule du designbook : pitch content stays English (jury international) —
// ici on traduit TOUT car la page est destinée au grand public.

export const LOCALES = {
  fr: 'fr-FR',
  en: 'en-GB',
  de: 'de-DE',
};

export const T = {
  fr: {
    htmlTitle: 'Palmarès — Rotary Startup Award',
    eyebrow: (year) => `Palmarès ${year}`,
    titleLead: 'Rotary Startup Award',
    titleItalic: (year) => `Édition ${year}`,
    subtitleFinale: (date) => `Grande Finale du ${date}`,
    subtitleLead:
      'Lauréats des sessions qualificatives et de la Grande Finale.',
    languageGroup: 'Langue',
    // Loading
    loadingTitle: 'Chargement du palmarès…',
    // Empty / gated states
    notPublicTitle: 'Palmarès non encore public',
    notPublicBody: (date) =>
      date
        ? `Les résultats de cette édition seront publiés après le ${date}.`
        : 'Les résultats de cette édition ne sont pas encore publics. Revenez bientôt.',
    noEditionTitle: 'Palmarès à venir',
    noEditionBody: (year) =>
      `Les premiers résultats publics seront disponibles ${
        year ? `lors de l'édition ${year}` : 'lors de la prochaine édition'
      }.`,
    // Error
    errorTitle: 'Une erreur est survenue',
    errorBody: 'Impossible de charger le palmarès pour le moment.',
    retry: 'Réessayer',
    // Sections
    grandLaureat: 'Grand Lauréat',
    grandPrize: 'Grand Prix',
    specialPrize: 'Prix Spécial',
    finalists: 'Finalistes',
    finalistsLead: 'Les finalistes de la Grande Finale',
    sessions: 'Sessions qualificatives',
    sessionsLead: 'Le parcours vers la finale',
    sessionLabel: (n) => `Session ${n}`,
    sessionWinner: 'Vainqueur — qualifié pour la finale',
    sessionPodium: 'Podium',
    sessionFinalScore: 'Score',
    sectorFrom: (session) => `Vainqueur de ${session}`,
    // Méthodologie / partners
    partnersTitle: 'Avec le soutien',
    partnersBody:
      'Avec le soutien du Rotary Club de Paris, de la Commission Rotary Startup Award et de ses partenaires institutionnels.',
    // Footer
    landingLink: 'rotary-startup.org',
    applyCta: "Candidater à l'édition suivante",
    footerLine: (year) => `Rotary Startup Award · Édition ${year}`,
    // Misc
    rank: (n) => `#${n}`,
    avg: 'Moyenne jury',
    onN: (n) => `sur ${n}`,
    juror: 'juré',
    jurors: 'jurés',
    // V3 visual sweep — Stats rail
    statsRailSessions: 'Sessions',
    statsRailStartups: 'Startups',
    statsRailJurors: 'Jurés mobilisés',
    statsRailLaureat: 'Grand Lauréat',
    // V3 visual sweep — Retrospective timeline
    retrospectiveEyebrow: 'Rétrospective',
    retrospectiveLead: 'Le parcours du concours',
    retrospectiveEmpty: 'Pas encore de session publiée pour cette édition.',
    fromSession: (label) => `Issu de ${label}`,
    qualifiedFrom: (label) => `Vainqueur ${label}`,
  },
  en: {
    // TODO refine EN copy
    htmlTitle: 'Results — Rotary Startup Award',
    eyebrow: (year) => `Results ${year}`,
    titleLead: 'Rotary Startup Award',
    titleItalic: (year) => `${year} Edition`,
    subtitleFinale: (date) => `Grand Final · ${date}`,
    subtitleLead:
      'Winners of the qualifying sessions and the Grand Final.',
    languageGroup: 'Language',
    loadingTitle: 'Loading results…',
    notPublicTitle: 'Results not yet public',
    notPublicBody: (date) =>
      date
        ? `The results of this edition will be published after ${date}.`
        : 'The results of this edition are not public yet. Please check back soon.',
    noEditionTitle: 'Results coming soon',
    noEditionBody: (year) =>
      `The first public results will be available ${
        year ? `in the ${year} edition` : 'with the next edition'
      }.`,
    errorTitle: 'Something went wrong',
    errorBody: 'We could not load the results at the moment.',
    retry: 'Retry',
    grandLaureat: 'Grand Prize Winner',
    grandPrize: 'Grand Prize',
    specialPrize: 'Special Prize',
    finalists: 'Finalists',
    finalistsLead: 'The Grand Final finalists',
    sessions: 'Qualifying sessions',
    sessionsLead: 'The road to the final',
    sessionLabel: (n) => `Session ${n}`,
    sessionWinner: 'Winner — qualified for the final',
    sessionPodium: 'Podium',
    sessionFinalScore: 'Score',
    sectorFrom: (session) => `Winner of ${session}`,
    partnersTitle: 'With the support of',
    partnersBody:
      'With the support of the Rotary Club of Paris, of the Rotary Startup Award Commission and its institutional partners.',
    landingLink: 'rotary-startup.org',
    applyCta: 'Apply to the next edition',
    footerLine: (year) => `Rotary Startup Award · ${year} Edition`,
    rank: (n) => `#${n}`,
    avg: 'Jury average',
    onN: (n) => `across ${n}`,
    juror: 'juror',
    jurors: 'jurors',
    // V3 visual sweep
    statsRailSessions: 'Sessions',
    statsRailStartups: 'Startups',
    statsRailJurors: 'Jurors',
    statsRailLaureat: 'Grand Prize',
    retrospectiveEyebrow: 'Retrospective',
    retrospectiveLead: 'The competition journey',
    retrospectiveEmpty: 'No session published yet for this edition.',
    fromSession: (label) => `From ${label}`,
    qualifiedFrom: (label) => `Winner of ${label}`,
  },
  de: {
    htmlTitle: 'Palmarès — Rotary Startup Award',
    eyebrow: (year) => `Palmarès ${year}`,
    titleLead: 'Rotary Startup Award',
    titleItalic: (year) => `Ausgabe ${year}`,
    subtitleFinale: (date) => `Grand Finale · ${date}`,
    subtitleLead:
      'Die Preisträgerinnen und Preisträger der Qualifikationssessions und des Grand Finale.',
    languageGroup: 'Sprache',
    loadingTitle: 'Palmarès wird geladen…',
    notPublicTitle: 'Palmarès noch nicht öffentlich',
    notPublicBody: (date) =>
      date
        ? `Die Ergebnisse dieser Ausgabe werden ab dem ${date} veröffentlicht.`
        : 'Die Ergebnisse dieser Ausgabe sind noch nicht öffentlich. Bitte schauen Sie in Kürze erneut vorbei.',
    noEditionTitle: 'Palmarès in Vorbereitung',
    noEditionBody: (year) =>
      `Die ersten öffentlichen Ergebnisse werden ${
        year ? `mit der Ausgabe ${year}` : 'mit der nächsten Ausgabe'
      } verfügbar sein.`,
    errorTitle: 'Ein Fehler ist aufgetreten',
    errorBody: 'Das Palmarès konnte derzeit nicht geladen werden.',
    retry: 'Erneut versuchen',
    grandLaureat: 'Hauptpreisträger·in',
    grandPrize: 'Hauptpreis',
    specialPrize: 'Sonderpreis',
    finalists: 'Finalistinnen und Finalisten',
    finalistsLead: 'Die Finalistinnen und Finalisten des Grand Finale',
    sessions: 'Qualifikations-Sessions',
    sessionsLead: 'Der Weg ins Finale',
    sessionLabel: (n) => `Session ${n}`,
    sessionWinner: 'Sieger·in — für das Finale qualifiziert',
    sessionPodium: 'Podium',
    sessionFinalScore: 'Punktzahl',
    sectorFrom: (session) => `Sieger·in von ${session}`,
    partnersTitle: 'Mit Unterstützung von',
    partnersBody:
      'Mit Unterstützung des Rotary Club Paris, der Kommission Rotary Startup Award und ihrer institutionellen Partner.',
    landingLink: 'rotary-startup.org',
    applyCta: 'Für die nächste Ausgabe bewerben',
    footerLine: (year) => `Rotary Startup Award · Ausgabe ${year}`,
    rank: (n) => `#${n}`,
    avg: 'Jury-Durchschnitt',
    onN: (n) => `von ${n}`,
    juror: 'Juror',
    jurors: 'Juroren',
    // V3 visual sweep
    statsRailSessions: 'Sessions',
    statsRailStartups: 'Startups',
    statsRailJurors: 'Jurymitglieder',
    statsRailLaureat: 'Hauptpreis',
    retrospectiveEyebrow: 'Rückblick',
    retrospectiveLead: 'Der Verlauf des Wettbewerbs',
    retrospectiveEmpty: 'Noch keine Session in dieser Ausgabe veröffentlicht.',
    fromSession: (label) => `Aus ${label}`,
    qualifiedFrom: (label) => `Sieger·in von ${label}`,
  },
};

// Format a YYYY-MM-DD date in the given lang (returns null for null/undefined).
export function formatDate(dateStr, lang) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleDateString(LOCALES[lang] || LOCALES.fr, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Format a numeric prize amount as EUR — null/undefined returns null.
export function formatPrize(value, lang) {
  if (value == null || Number.isNaN(Number(value))) return null;
  try {
    return new Intl.NumberFormat(LOCALES[lang] || LOCALES.fr, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(Number(value));
  } catch {
    return `${value} €`;
  }
}
