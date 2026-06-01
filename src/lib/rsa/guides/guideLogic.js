// Logique pure des guides — sans React ni Supabase, testable en isolation.
//
// resolveGuidesForScope : override par compétition (édition). Si l'édition
// courante a des guides dédiés, on les prend ; sinon on retombe sur les guides
// globaux (edition_id null). Pas de merge ligne-à-ligne (cf. design §héritage).
//
// hasNewBadge : la pastille « nouveau » s'allume tant que le user n'a pas vu
// la dernière mise à jour publiée de l'espace.

export function resolveGuidesForScope(rows, editionId) {
  const list = Array.isArray(rows) ? rows : [];
  const scoped = editionId
    ? list.filter((r) => r.edition_id === editionId)
    : [];
  const chosen = scoped.length > 0
    ? scoped
    : list.filter((r) => r.edition_id == null);
  return [...chosen].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function hasNewBadge(resolvedRows, lastSeenAt) {
  const list = Array.isArray(resolvedRows) ? resolvedRows : [];
  if (list.length === 0) return false;
  if (!lastSeenAt) return true;
  const seen = new Date(lastSeenAt).getTime();
  // Garde : updated_at absent/invalide ⇒ on ignore (jamais de badge fantôme).
  return list.some((r) => r.updated_at && new Date(r.updated_at).getTime() > seen);
}
