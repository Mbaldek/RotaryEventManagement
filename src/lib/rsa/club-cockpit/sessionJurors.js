// Résolveur pur : lignes jury_applications d'une session -> { assigned, pending }.
// Affectés = approved, En attente = pending. Tri alpha par nom dans chaque groupe.
// Aucune dépendance réseau/DB. Cf. blueprint Lot A §A.2.

function byName(a, b) {
  return String(a.full_name || '').localeCompare(String(b.full_name || ''));
}

export function splitSessionJurors(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const assigned = list.filter((r) => r.status === 'approved').slice().sort(byName);
  const pending = list.filter((r) => r.status === 'pending').slice().sort(byName);
  return { assigned, pending };
}
