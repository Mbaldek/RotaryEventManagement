// Mapper pur : transforme des lignes brutes club-scoped en métriques par session.
// Lot 1 = startups/session (startups.session_id) + jurés uniques/session
// (platform_jury_assignments). Scoring/prep déférés au #3 (pas de source fiable).

export function mapSessionMetrics({ startupRows = [], juryRows = [] }) {
  const out = {};
  const ensure = (sid) => {
    if (!out[sid]) out[sid] = { startups: 0, jurors: 0 };
    return out[sid];
  };

  for (const r of startupRows) {
    if (!r.session_id) continue;
    ensure(r.session_id).startups += 1;
  }

  // Jurés uniques par session : un même jury_user_id sur la même session ne compte
  // qu'une fois.
  const seen = {};
  for (const r of juryRows) {
    if (!r.session_id) continue;
    if (!r.jury_user_id) continue; // pas de juré fantôme (undefined compterait pour 1)
    ensure(r.session_id); // garantit l'entrée même si 0 startup
    if (!seen[r.session_id]) seen[r.session_id] = new Set();
    seen[r.session_id].add(r.jury_user_id);
  }
  for (const sid of Object.keys(seen)) {
    out[sid].jurors = seen[sid].size;
  }

  return out;
}
