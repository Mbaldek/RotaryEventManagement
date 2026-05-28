// Espace Sélection — constantes partagées (mappings statuts / décisions / heuristiques).
//
// Single source of truth pour les enums Module 2. Aucune logique React ici.

// ── Décision comité — clés ASCII (twin de la CHECK constraint serveur) ─────
export const DECISIONS = ['a_examiner', 'eligible', 'liste_attente', 'rejete'];

export const DECISION_DEFAULT = 'a_examiner';

// ── Mapping startups.status → kind="dossier" du StatusPill ─────────────────
// Le StatusPill du designbook expose désormais 'waitlist' / 'liste_attente' (cf. notre
// ajout additif). Pour les statuts en aval (en_session/note/etc.) on retombe sur
// 'shortlisted' visuellement (le statut littéral est de toute façon affiché dans le label).
export const STATUS_TO_PILL = {
  brouillon:     'draft',
  soumis:        'submitted',
  en_selection:  'under_review',
  eligible:      'shortlisted',
  liste_attente: 'liste_attente',
  affecte:       'shortlisted',
  en_session:    'shortlisted',
  note:          'shortlisted',
  finaliste:     'finalist',
  laureat:       'winner',
  rejete:        'rejected',
};

// ── Mapping selection_reviews.decision → kind="dossier" ────────────────────
export const DECISION_TO_PILL = {
  a_examiner:    'under_review',
  eligible:      'shortlisted',
  liste_attente: 'liste_attente',
  rejete:        'rejected',
};

// ── Verdict d'éligibilité → kind="eligibility" du StatusPill ───────────────
export const VERDICT_TO_PILL = {
  eligible: 'eligible',
  flagged:  'flagged',
  excluded: 'excluded',
};

// ── Statuts utilisés pour les filtres rapides "À examiner" / "Décidés" ─────
export const STATUS_FILTERS = {
  toReview: ['soumis', 'en_selection'],
  decided:  ['eligible', 'rejete', 'liste_attente', 'affecte', 'finaliste', 'laureat'],
};

// ── Heuristique secteur → cluster (sectorToClusterHeuristic) ───────────────
// On match sur substring lowercased d'un secteur déclaré (string ou id de session)
// vers un suffixe d'id de session (sans le préfixe d'édition).
// La fonction reçoit la liste des sessions qualifying de l'édition pour pré-fil.
// Pas exhaustif — l'admin peut toujours forcer le choix dans le UI.
export const SECTOR_TO_CLUSTER_KEYWORDS = {
  s1_foodtech:  ['s1_foodtech', 'foodtech', 'food', 'agritech', 'agri', 'circular', 'circulaire', 'economie circulaire', 'kreislauf'],
  s2_social:    ['s2_social', 'edtech', 'social', 'impact social', 'education', 'éducation', 'soziale'],
  s3_tech:      ['s3_tech', 'ai', 'fintech', 'mobilite', 'mobilité', 'mobility', 'saas', 'tech', 'ki', 'mobilität'],
  s4_health:    ['s4_health', 'health', 'biotech', 'medtech', 'healthtech'],
  s5_greentech: ['s5_greentech', 'greentech', 'environnement', 'environment', 'umwelt', 'cleantech', 'energy', 'énergie', 'energie'],
};

// Range U+0300..U+036F = "Combining Diacritical Marks" block produced by NFD.
const DIACRITICS_RE = /[̀-ͯ]/g;

function normalize(s) {
  // Strip diacritics so "écologie" matches "ecologie", "Mobilität" matches "mobilitat".
  return String(s || '').toLowerCase().normalize('NFD').replace(DIACRITICS_RE, '');
}

// suggestClusterForSectors(sectors, sessions) -> session.id | null
// `sectors` est un text[] de la colonne startups.sectors ; `sessions` la liste des
// sessions kind='qualifying' de l'édition (provient de RsaSession.filter()).
export function sectorToClusterHeuristic(sectors, sessions) {
  if (!Array.isArray(sectors) || !sectors.length || !Array.isArray(sessions) || !sessions.length) {
    return null;
  }
  const normalizedSectors = sectors.map(normalize);
  // Pour chaque suffixe canonique, on cherche un keyword match dans les secteurs déclarés.
  for (const [canonicalSuffix, keywords] of Object.entries(SECTOR_TO_CLUSTER_KEYWORDS)) {
    const hasMatch = normalizedSectors.some((sector) =>
      keywords.some((kw) => sector.includes(normalize(kw))),
    );
    if (!hasMatch) continue;
    // Cherche une session de l'édition qui se termine par ce suffixe (ex: 'dev_s1_foodtech'
    // ou '2026_s1_foodtech' ou simplement 's1_foodtech').
    const match = sessions.find((s) => {
      const id = String(s.id || '');
      return id === canonicalSuffix || id.endsWith(`_${canonicalSuffix}`) || id.endsWith(canonicalSuffix);
    });
    if (match) return match.id;
  }
  return null;
}

// ── Résolveur effective decision (côté JS) ─────────────────────────────────
// La review effective d'un dossier = la is_final=true s'il existe (admin),
// sinon la plus récente par reviewed_at.
export function pickEffectiveReview(reviews) {
  if (!Array.isArray(reviews) || !reviews.length) return null;
  const finalRow = reviews.find((r) => r.is_final);
  if (finalRow) return finalRow;
  // Pas garanti trié ; on trie defensively par reviewed_at DESC.
  const sorted = [...reviews].sort((a, b) => {
    const ta = a.reviewed_at ? Date.parse(a.reviewed_at) : 0;
    const tb = b.reviewed_at ? Date.parse(b.reviewed_at) : 0;
    return tb - ta;
  });
  return sorted[0] || null;
}

// ── Détection du badge "À valider" (needs validation) ──────────────────────
// L'admin doit valider TOUTE décision comité (UX), mais la spec souligne que c'est
// SPÉCIALEMENT important pour rejete/liste_attente. On surface le badge à tout
// dossier qui a une review non-finale.
export function needsAdminValidation(effective) {
  if (!effective) return false;
  return effective.is_final !== true;
}

// ── Format d'une date courte pour la file (FR/EN/DE compact) ───────────────
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

export function formatDateTime(iso, lang = 'fr') {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const locale = lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-GB';
    return d.toLocaleString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
