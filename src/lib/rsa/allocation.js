// src/lib/rsa/allocation.js
// Helpers PURS de l'écran Allocation (aucune dépendance React/Supabase) —
// testables en node:test, à l'identique de competitionShell.js.

// Résumé chiffré du pool d'allocation.
// pool : startups status='eligible' (à placer) ; allocated : status='affecte'.
export function summarizeAllocation({ pool = [], allocated = [], toReviewCount = 0 } = {}) {
  const toPlaceCount = pool.length;
  const allocatedCount = allocated.length;
  return {
    toPlaceCount,
    allocatedCount,
    eligibleTotal: toPlaceCount + allocatedCount,
    toReviewCount,
  };
}

// Regroupe les startups allouées par cluster, dans l'ordre de la liste clusters.
// Renvoie [{ cluster, startups: [] }] (clusters vides inclus).
export function groupAllocatedByCluster(allocated = [], clusters = []) {
  const bySession = new Map();
  for (const s of allocated) {
    const k = s.session_id;
    if (!k) continue;
    const arr = bySession.get(k) || [];
    arr.push(s);
    bySession.set(k, arr);
  }
  return clusters.map((cluster) => ({
    cluster,
    startups: bySession.get(cluster.id) || [],
  }));
}

// Diacritics block produit par NFD (U+0300..U+036F).
const DIACRITICS_RE = /[\u0300-\u036F]/g;

// Génère un id text de session : `${editionId}_${slug}` (a-z0-9_), sans accents.
export function slugSessionId(editionId, name) {
  const slug = String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${editionId}_${slug}`;
}
