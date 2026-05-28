// Dictionnaires trilingues FR/EN/DE de l'Espace Jury (Module 3).
//
// Forme { fr, en, de } compatible avec useLang().t(dict) de @/lib/platform/i18n.
// On RÉUTILISE les libellés règles d'éligibilité du Module 1 (single source of truth)
// et les libellés de critères/sessions de constants.js — ne pas dupliquer.

export { RULE_LABELS } from '@/components/rsa/candidature/i18n';

// ── Statuts du lifecycle de session (kind="jury" de StatusPill) ──────────────
// Clés ASCII = session_config.status (draft|live|locked|published).
export const JURY_STATUS_LABELS = {
  draft:     { fr: 'Pas encore ouverte', en: 'Not yet open',     de: 'Noch nicht offen' },
  live:      { fr: 'En direct',          en: 'Live',             de: 'Live' },
  locked:    { fr: 'Verrouillée',        en: 'Locked',           de: 'Gesperrt' },
  published: { fr: 'Publiée',            en: 'Published',        de: 'Veröffentlicht' },
};

// ── Mapping startups.status -> kind="dossier" du StatusPill (rappel) ────────
// On garde compact ici puisque le juré ne voit que `note` / `finaliste` en sortie.
export const DOSSIER_STATUS_LABELS = {
  affecte:   { fr: 'Affecté',  en: 'Assigned',   de: 'Zugewiesen' },
  en_session:{ fr: 'En session',en: 'In session', de: 'In Session' },
  note:      { fr: 'Évalué',   en: 'Scored',     de: 'Bewertet' },
  finaliste: { fr: 'Finaliste',en: 'Finalist',   de: 'Finalist' },
  laureat:   { fr: 'Lauréat',  en: 'Winner',     de: 'Preisträger' },
};

// ── Progress chip de la file de notation ─────────────────────────────────────
// `partial(n)` renvoie un dict { fr, en, de } interpolé.
export const SCORE_PROGRESS = {
  toRate:    { fr: 'À noter',  en: 'To rate',    de: 'Zu bewerten' },
  partial:   (n) => ({
    fr: `${n}/6 critères notés`,
    en: `${n}/6 criteria rated`,
    de: `${n}/6 Kriterien bewertet`,
  }),
  submitted: { fr: 'Envoyé · cliquez pour modifier',
               en: 'Submitted · click to edit',
               de: 'Eingereicht · zum Bearbeiten klicken' },
  locked:    { fr: 'Verrouillé', en: 'Locked',   de: 'Gesperrt' },
};

// ── Copy UI ─────────────────────────────────────────────────────────────────
export const UI = {
  // En-tête / accès
  eyebrow:        { fr: 'Espace Jury',           en: 'Jury desk',          de: 'Jury-Bereich' },
  pageTitle:      { fr: 'Mes sessions',          en: 'My sessions',        de: 'Meine Sessions' },
  pageSubtitle:   { fr: 'Préparez vos pré-lectures, notez les startups, suivez la publication des résultats.',
                    en: 'Prepare your pre-reads, score the startups, watch results roll in.',
                    de: 'Vorab-Lektüren vorbereiten, Startups bewerten, Ergebnisse verfolgen.' },
  emptySessions:  { fr: "Aucune session assignée pour cette édition.",
                    en: 'No session assigned for this edition.',
                    de: 'Keine Session für diese Ausgabe zugewiesen.' },
  noAccess:       { fr: "Cette section est réservée au jury et à l'administration.",
                    en: 'This area is restricted to the jury and administrators.',
                    de: 'Dieser Bereich ist der Jury und der Administration vorbehalten.' },
  authLoading:    { fr: 'Vérification de votre session…',
                    en: 'Checking your session…',
                    de: 'Sitzung wird geprüft…' },
  loadError:      { fr: 'Impossible de charger.',
                    en: 'Could not load.',
                    de: 'Konnte nicht geladen werden.' },
  retry:          { fr: 'Réessayer',             en: 'Retry',              de: 'Erneut versuchen' },

  // Liste de sessions
  sectionMySessions: { fr: 'Mes sessions',       en: 'My sessions',        de: 'Meine Sessions' },
  back:              { fr: 'Retour aux sessions',en: 'Back to sessions',   de: 'Zurück zu den Sessions' },

  // Session detail
  countdownToday:   { fr: "Aujourd'hui",        en: 'Today',              de: 'Heute' },
  countdownTomorrow:{ fr: 'Demain',              en: 'Tomorrow',           de: 'Morgen' },
  countdownYesterday: { fr: 'Hier · session terminée', en: 'Yesterday · session over', de: 'Gestern · Session beendet' },
  countdownIn:      (n) => ({ fr: `J-${n}`, en: `${n} days to go`, de: `Noch ${n} Tage` }),
  countdownPast:    (n) => ({ fr: `Session passée (il y a ${n} j)`, en: `Past session (${n}d ago)`, de: `Vergangene Session (vor ${n} T.)` }),
  coJurorsBtn:      (n) => ({ fr: `Vous + ${n} jurés · voir`, en: `You + ${n} jurors · view`, de: `Sie + ${n} Juroren · ansehen` }),
  coJurorsTitle:    { fr: 'Co-jurés sur cette session', en: 'Co-jurors on this session', de: 'Mit-Juroren in dieser Session' },
  coJurorsEmpty:    { fr: 'Aucun autre juré pour le moment.',
                      en: 'No other juror yet.',
                      de: 'Noch keine weiteren Juroren.' },

  preReadTitle:     { fr: 'Pré-lecture',         en: 'Pre-read',           de: 'Vorab-Lektüre' },
  preReadHelp:      { fr: 'Téléchargez decks et exec summaries en amont. Liens signés (5 min).',
                      en: 'Download decks and exec summaries ahead. Signed links (5 min).',
                      de: 'Decks und Exec Summaries vorab herunterladen. Signierte Links (5 Min).' },
  preReadEmpty:     { fr: 'Aucun dossier rattaché à cette session pour le moment.',
                      en: 'No application attached to this session yet.',
                      de: 'Noch keine Bewerbung in dieser Session.' },
  scoringTitle:     { fr: 'Notation',            en: 'Scoring',            de: 'Bewertung' },
  bannerDraft:      { fr: 'Le scoring ouvrira au début de la session. Vous pouvez préparer vos pré-lectures.',
                      en: 'Scoring will open when the session starts. You can prepare your pre-reads now.',
                      de: 'Die Bewertung öffnet zum Start der Session. Sie können sich vorab vorbereiten.' },
  bannerLive:       { fr: 'EN DIRECT — vos notes s\'enregistrent automatiquement.',
                      en: 'LIVE — your scores save automatically.',
                      de: 'LIVE — Ihre Bewertungen werden automatisch gespeichert.' },
  bannerLocked:     { fr: 'Scoring fermé — vos notes ont été enregistrées.',
                      en: 'Scoring closed — your scores have been saved.',
                      de: 'Bewertung geschlossen — Ihre Bewertungen wurden gespeichert.' },
  bannerPublished:  { fr: 'Résultats publiés.', en: 'Results published.', de: 'Ergebnisse veröffentlicht.' },

  // Scoring panel
  anchors:          { fr: 'Repères de notation',  en: 'Score anchors',     de: 'Bewertungsanker' },
  weight:           (pct) => ({ fr: `${pct}%`, en: `${pct}%`, de: `${pct}%` }),
  commentLabel:     { fr: 'Commentaire',         en: 'Comment',            de: 'Kommentar' },
  commentOptional:  { fr: '(optionnel · staff uniquement)',
                      en: '(optional · staff only)',
                      de: '(optional · nur Staff)' },
  commentPlaceholder: { fr: 'Notes libres pour le staff (le candidat ne les voit pas).',
                        en: 'Free notes for staff (not visible to the candidate).',
                        de: 'Freie Notizen für das Staff (Kandidat sieht sie nicht).' },
  remaining:        (n) => ({ fr: `${n} critères restants`, en: `${n} criteria remaining`, de: `${n} Kriterien verbleibend` }),
  weightedTotal:    { fr: 'Total pondéré :',     en: 'Weighted total:',    de: 'Gewichtete Gesamtpunktzahl:' },
  submit:           { fr: 'Envoyer les notes',   en: 'Submit scores',      de: 'Bewertungen einreichen' },
  update:           { fr: "Modifier l'envoi",    en: 'Update submission',  de: 'Einreichung aktualisieren' },
  autosaved:        { fr: 'Enregistrement auto — reprenez sur n\'importe quel appareil.',
                      en: 'Auto-saved — resume on any device.',
                      de: 'Auto-gespeichert — auf jedem Gerät fortsetzen.' },
  cannotSubmit:     { fr: 'Veuillez noter les 6 critères avant d\'envoyer.',
                      en: 'Please rate all 6 criteria before submitting.',
                      de: 'Bitte bewerten Sie alle 6 Kriterien vor dem Einreichen.' },
  submitError:      { fr: "Échec de l'envoi. Réessayez.",
                      en: 'Submission failed. Please retry.',
                      de: 'Einreichung fehlgeschlagen. Bitte erneut versuchen.' },

  // Results view (published)
  rankingTitle:     { fr: 'Classement de la session',
                      en: 'Session ranking',
                      de: 'Session-Ranking' },
  rankingEmpty:     { fr: 'Aucune note enregistrée pour cette session.',
                      en: 'No score recorded for this session.',
                      de: 'Keine Bewertungen für diese Session.' },
  finalistBadge:    { fr: 'Finaliste',           en: 'Finalist',           de: 'Finalist' },
  rankCol:          { fr: 'Rang',                en: 'Rank',               de: 'Rang' },
  startupCol:       { fr: 'Startup',             en: 'Startup',            de: 'Startup' },
  avgCol:           { fr: 'Moyenne pondérée',    en: 'Weighted avg.',      de: 'Gewichteter Schnitt' },
  jurorsCol:        { fr: 'Jurés',               en: 'Jurors',             de: 'Juroren' },
  myScoreLabel:     { fr: 'Mes notes',           en: 'My scores',          de: 'Meine Bewertungen' },

  // Admin (lock / publish + assignments)
  adminTitle:       { fr: 'Administration',      en: 'Administration',     de: 'Administration' },
  adminLockBtn:     { fr: 'Verrouiller la session', en: 'Lock session',    de: 'Session sperren' },
  adminPublishBtn:  { fr: 'Publier les résultats',  en: 'Publish results', de: 'Ergebnisse veröffentlichen' },
  adminLockConfirm: { fr: 'Verrouiller ? Les jurés ne pourront plus modifier leurs notes.',
                      en: 'Lock? Jurors can no longer edit their scores.',
                      de: 'Sperren? Juroren können ihre Bewertungen nicht mehr ändern.' },
  adminPublishConfirm: { fr: 'Publier ? Les résultats deviennent visibles et les finalistes sont marqués.',
                          en: 'Publish? Results become visible and finalists get marked.',
                          de: 'Veröffentlichen? Ergebnisse werden sichtbar und Finalisten markiert.' },
  adminLockNeedsLive: { fr: 'La session doit être « en direct » pour pouvoir être verrouillée.',
                        en: 'Session must be "live" to be locked.',
                        de: 'Session muss „Live" sein, um sie zu sperren.' },
  adminPublishNeedsLocked: { fr: 'Verrouillez d\'abord la session pour publier les résultats.',
                              en: 'Lock the session first to publish results.',
                              de: 'Sperren Sie zuerst die Session, um Ergebnisse zu veröffentlichen.' },

  // Assignments admin embedded panel
  assignmentsTitle: { fr: 'Affectations jurés × sessions',
                      en: 'Juror × session assignments',
                      de: 'Juror × Session Zuweisungen' },
  assignmentsHelp:  { fr: 'Cochez pour affecter un juré à une session ; décochez pour retirer.',
                      en: 'Tick to assign a juror to a session; untick to remove.',
                      de: 'Anhaken, um einen Juror einer Session zuzuweisen; abhaken zum Entfernen.' },
  assignmentsEmpty: { fr: 'Aucun juré dans app_user_roles. Provisionnez via Studio.',
                      en: 'No juror in app_user_roles. Provision via Studio.',
                      de: 'Kein Juror in app_user_roles. Über Studio bereitstellen.' },
  jurorCol:         { fr: 'Juré',                en: 'Juror',              de: 'Juror' },
};
