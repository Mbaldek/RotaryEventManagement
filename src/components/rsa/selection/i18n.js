// Dictionnaires trilingues FR/EN/DE de l'Espace Sélection (Module 2).
//
// Forme { fr, en, de } compatible avec useLang().t(dict) de @/lib/platform/i18n.
// On colocalise tout ici (libellés statuts, décisions, copy UI) plutôt que d'éparpiller
// dans chaque composant. Pour les libellés de règles d'éligibilité on RÉUTILISE
// RULE_LABELS du Module 1 (single source of truth) — ne pas les redupliquer.

export { RULE_LABELS } from '@/components/rsa/candidature/i18n';

// ── Statuts dossier (côté queue + drawer) — clés ASCII = startups.status ─────
// Le mapping vers les `kind="dossier"` de StatusPill vit dans constants.js (STATUS_TO_PILL).
export const DOSSIER_STATUS_LABELS = {
  brouillon:     { fr: 'Brouillon',                  en: 'Draft',                de: 'Entwurf' },
  soumis:        { fr: 'Soumis',                     en: 'Submitted',            de: 'Eingereicht' },
  en_selection:  { fr: 'En sélection',               en: 'Under review',         de: 'In Auswahl' },
  eligible:      { fr: 'Éligible',                   en: 'Eligible',             de: 'Förderfähig' },
  liste_attente: { fr: "Liste d'attente",            en: 'Waitlist',             de: 'Warteliste' },
  affecte:       { fr: 'Affecté à une session',      en: 'Session-assigned',     de: 'Session zugewiesen' },
  en_session:    { fr: 'En session',                 en: 'In session',           de: 'In Session' },
  note:          { fr: 'Évalué',                     en: 'Scored',               de: 'Bewertet' },
  finaliste:     { fr: 'Finaliste',                  en: 'Finalist',             de: 'Finalist' },
  laureat:       { fr: 'Lauréat',                    en: 'Winner',               de: 'Preisträger' },
  rejete:        { fr: 'Rejeté',                     en: 'Rejected',             de: 'Abgelehnt' },
};

// ── Décisions comité (radio) — clés ASCII = selection_reviews.decision ──────
export const DECISION_LABELS = {
  a_examiner:    { fr: 'À examiner',                 en: 'Pending review',       de: 'Zu prüfen' },
  eligible:      { fr: 'Éligible',                   en: 'Eligible',             de: 'Förderfähig' },
  liste_attente: { fr: "Liste d'attente",            en: 'Waitlist',             de: 'Warteliste' },
  rejete:        { fr: 'Rejeté',                     en: 'Rejected',             de: 'Abgelehnt' },
};

// ── Verdicts d'éligibilité (snapshot) — repris du Module 1 mais colocalisés ─
export const VERDICT_LABELS = {
  eligible:      { fr: 'Éligible',                   en: 'Eligible',             de: 'Förderfähig' },
  flagged:       { fr: 'Signalé',                    en: 'Flagged',              de: 'Markiert' },
  excluded:      { fr: 'Exclu',                      en: 'Excluded',             de: 'Ausgeschlossen' },
};

// ── Copy UI ────────────────────────────────────────────────────────────────
export const UI = {
  // En-tête / navigation
  eyebrow:        { fr: 'Espace Sélection',          en: 'Selection desk',       de: 'Auswahl-Bereich' },
  pageTitle:      { fr: 'File des candidatures',     en: 'Candidate queue',      de: 'Bewerbungsliste' },
  pageSubtitle:   { fr: 'Décidez de l’éligibilité des dossiers, validez en équipe. L’allocation aux clusters se fait ensuite dans le cockpit.',
                    en: 'Decide dossier eligibility, validate as a team. Cluster allocation happens afterwards in the cockpit.',
                    de: 'Entscheiden Sie über die Eignung der Dossiers, validieren Sie im Team. Die Cluster-Zuteilung erfolgt anschließend im Cockpit.' },

  // Onglets / filtres
  filtersAll:     { fr: 'Tous',                      en: 'All',                  de: 'Alle' },
  filterToReview: { fr: 'À examiner',                en: 'To review',            de: 'Zu prüfen' },
  filterDecided:  { fr: 'Décidés',                   en: 'Decided',              de: 'Entschieden' },
  filterToValidate: { fr: 'À valider',               en: 'To validate',          de: 'Zu validieren' },
  searchPlaceholder: { fr: 'Rechercher (nom, contact, email)…',
                       en: 'Search (name, contact, email)…',
                       de: 'Suchen (Name, Kontakt, E-Mail)…' },
  editionLabel:   { fr: 'Édition',                   en: 'Edition',              de: 'Ausgabe' },
  editionAll:     { fr: 'Toutes les éditions',       en: 'All editions',         de: 'Alle Ausgaben' },
  verdictLabel:   { fr: 'Verdict d’éligibilité',     en: 'Eligibility verdict',  de: 'Förderfähigkeit' },
  resetFilters:   { fr: 'Réinitialiser',             en: 'Reset',                de: 'Zurücksetzen' },

  // Liste
  emptyQueue:     { fr: 'Aucun dossier à examiner pour le moment.',
                    en: 'No applications to review at the moment.',
                    de: 'Derzeit liegen keine Bewerbungen zur Prüfung vor.' },
  loadMore:       { fr: 'Charger plus',              en: 'Load more',            de: 'Mehr laden' },
  loading:        { fr: 'Chargement…',               en: 'Loading…',             de: 'Wird geladen…' },
  loadError:      { fr: 'Impossible de charger la file. Réessayez plus tard.',
                    en: 'Could not load the queue. Please try again later.',
                    de: 'Die Liste konnte nicht geladen werden. Bitte versuchen Sie es später erneut.' },
  retry:          { fr: 'Réessayer',                 en: 'Retry',                de: 'Erneut versuchen' },

  // Drawer
  back:           { fr: 'Retour à la file',          en: 'Back to queue',        de: 'Zurück zur Liste' },
  close:          { fr: 'Fermer',                    en: 'Close',                de: 'Schließen' },
  sectionDossier:     { fr: 'Dossier',                en: 'Dossier',              de: 'Bewerbungsunterlagen' },
  sectionEligibility: { fr: 'Éligibilité',            en: 'Eligibility',          de: 'Förderfähigkeit' },
  sectionDocuments:   { fr: 'Documents',              en: 'Documents',            de: 'Dokumente' },
  sectionTimeline:    { fr: 'Historique des décisions', en: 'Decision history',  de: 'Entscheidungsverlauf' },

  // Read-only labels du dossier
  contactGroup:    { fr: 'Contact',                   en: 'Contact',              de: 'Kontakt' },
  companyGroup:    { fr: 'Société',                   en: 'Company',              de: 'Unternehmen' },
  projectGroup:    { fr: 'Projet',                    en: 'Project',              de: 'Projekt' },
  financeGroup:    { fr: 'Finances',                  en: 'Financials',           de: 'Finanzen' },
  rattachGroup:    { fr: 'Rattachement',              en: 'Affiliation',          de: 'Anbindung' },
  notProvided:     { fr: 'Non renseigné',             en: 'Not provided',         de: 'Nicht angegeben' },
  noDocs:          { fr: 'Document non fourni',       en: 'Document not provided', de: 'Dokument nicht bereitgestellt' },
  deckLabel:       { fr: 'Pitch deck',                en: 'Pitch deck',           de: 'Pitch-Deck' },
  execLabel:       { fr: 'Executive summary',         en: 'Executive summary',    de: 'Executive Summary' },
  videoLabel:      { fr: 'Vidéo de pitch',            en: 'Pitch video',          de: 'Pitch-Video' },
  download:        { fr: 'Télécharger',               en: 'Download',             de: 'Herunterladen' },
  openExternal:    { fr: 'Ouvrir',                    en: 'Open',                 de: 'Öffnen' },
  rulesNote:       { fr: 'Les critères d’éligibilité sont indicatifs (Règlement Art. 2). Le comité reste souverain.',
                     en: 'Eligibility criteria are indicative (Rules Art. 2). The committee remains sovereign.',
                     de: 'Die Förderkriterien sind indikativ (Reglement Art. 2). Die endgültige Entscheidung obliegt dem Komitee.' },
  snapshotComputedOn: { fr: 'Calculée le {date}',     en: 'Computed on {date}',   de: 'Berechnet am {date}' },

  // Decision panel
  decisionTitle:   { fr: 'Décision du comité',        en: 'Committee decision',   de: 'Komitee-Entscheidung' },
  decisionField:   { fr: 'Décision',                  en: 'Decision',             de: 'Entscheidung' },
  rationaleField:  { fr: 'Motif',                     en: 'Rationale',            de: 'Begründung' },
  rationaleRequired: { fr: 'Requis pour un rejet ou une mise en liste d’attente.',
                       en: 'Required when rejecting or waitlisting.',
                       de: 'Pflicht bei Ablehnung oder Warteliste.' },
  rationalePlaceholder: { fr: 'Notes pour le comité (optionnel pour éligible).',
                          en: 'Notes for the committee (optional for eligible).',
                          de: 'Notizen für das Komitee (bei „förderfähig" optional).' },
  saveDecision:    { fr: 'Enregistrer la décision',   en: 'Save decision',        de: 'Entscheidung speichern' },
  updateDecision:  { fr: 'Modifier ma décision',      en: 'Update my decision',   de: 'Meine Entscheidung ändern' },
  saving:          { fr: 'Enregistrement…',           en: 'Saving…',              de: 'Wird gespeichert…' },
  decisionSaved:   { fr: 'Décision enregistrée.',     en: 'Decision saved.',      de: 'Entscheidung gespeichert.' },
  decisionSaveError: { fr: "Échec de l'enregistrement. Réessayez.",
                       en: 'Save failed. Please retry.',
                       de: 'Speichern fehlgeschlagen. Bitte erneut versuchen.' },
  errRationale: { fr: 'Le motif est requis pour ce verdict.',
                  en: 'A rationale is required for this verdict.',
                  de: 'Für dieses Urteil ist eine Begründung erforderlich.' },
  pendingHint:    { fr: 'Décision en attente de {who} ({when}).',
                    en: 'Pending decision by {who} ({when}).',
                    de: 'Entscheidung steht aus von {who} ({when}).' },
  pendingHintMine: { fr: 'Vous avez une décision en attente sur ce dossier ({when}).',
                     en: 'You have a pending decision on this application ({when}).',
                     de: 'Sie haben eine ausstehende Entscheidung zu dieser Bewerbung ({when}).' },

  // Admin override
  adminTitle:     { fr: 'Validation administrateur',  en: 'Admin validation',     de: 'Administrator-Validierung' },
  adminValidate:  { fr: 'Valider tel quel',           en: 'Validate as-is',       de: 'So bestätigen' },
  adminOverride:  { fr: 'Remplacer la décision',      en: 'Override decision',    de: 'Entscheidung ersetzen' },
  adminOverrideTitle: { fr: 'Nouvelle décision finale', en: 'New final decision', de: 'Neue endgültige Entscheidung' },
  adminCancel:    { fr: 'Annuler',                    en: 'Cancel',               de: 'Abbrechen' },
  adminOverrideSubmit: { fr: 'Verrouiller comme décision finale',
                         en: 'Lock as final decision',
                         de: 'Als endgültig festlegen' },
  needsValidation: { fr: 'À valider',                 en: 'Needs validation',     de: 'Validierung erforderlich' },
  finalLocked:    { fr: 'Décision verrouillée par l’admin.',
                    en: 'Decision locked by admin.',
                    de: 'Entscheidung wurde von der Administration gesperrt.' },
  finalCaption:   { fr: 'Final',                      en: 'Final',                de: 'Endgültig' },
  comiteOnlyEdit: { fr: 'Demandez à l’administrateur pour rouvrir.',
                    en: 'Ask the admin to reopen.',
                    de: 'Bitte wenden Sie sich an die Administration, um die Entscheidung wiederzuöffnen.' },
  overrideOf:    { fr: 'Remplace #{id}',              en: 'Overrides #{id}',      de: 'Ersetzt #{id}' },
  actionError:   { fr: "L'action a échoué. Réessayez.",
                   en: 'The action failed. Please retry.',
                   de: 'Die Aktion ist fehlgeschlagen. Bitte erneut versuchen.' },

  // Timeline
  byReviewer:    { fr: 'par',                          en: 'by',                  de: 'von' },
  roleComite:    { fr: 'Comité',                       en: 'Committee',           de: 'Komitee' },
  roleAdmin:     { fr: 'Admin',                        en: 'Admin',               de: 'Admin' },
  timelineEmpty: { fr: 'Aucune décision pour l’instant.',
                   en: 'No decisions yet.',
                   de: 'Noch keine Entscheidungen.' },
  rationaleNone: { fr: 'Sans motif renseigné.',        en: 'No rationale provided.', de: 'Keine Begründung angegeben.' },
  assignedTo:    { fr: 'Affecté à',                    en: 'Assigned to',         de: 'Zugewiesen an' },

  // Accès
  authLoading:    { fr: 'Vérification de votre session…', en: 'Checking your session…', de: 'Ihre Sitzung wird geprüft…' },
  noAccess:       { fr: 'Cette section est réservée au comité et à l’administration.',
                    en: 'This area is restricted to the committee and administrators.',
                    de: 'Dieser Bereich ist dem Komitee und der Administration vorbehalten.' },

  // Misc
  effectiveDecision: { fr: 'Décision effective',      en: 'Effective decision',    de: 'Geltende Entscheidung' },
  noEffectiveDecision: { fr: 'Aucune décision encore.', en: 'No decision yet.',    de: 'Noch keine Entscheidung.' },
  emptyDetailHint: { fr: 'Sélectionnez un dossier dans la liste pour afficher son contenu.',
                     en: 'Pick an application from the list to view its content.',
                     de: 'Wählen Sie eine Bewerbung in der Liste aus, um die Details anzuzeigen.' },
};
