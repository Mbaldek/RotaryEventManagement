// Shared ranking helper — used by ResultsTab to compute the live leaderboard
// and by the finalist picker to read the published winner of each qualifier.

import { weightedScore } from "./constants";

// Aggregate raw scores + admin overrides into a ranked list of startups.
//   scores:    array of jury_scores rows for one session
//   overrides: { [startup_name]: { bonus, final_rank, note } }
// Returns rows sorted by final_rank, each shaped:
//   { startup, avg, n, bonus, final_score, fixed_rank, note, final_rank }
// Startups with zero scores from any juror are silently excluded (they are
// effectively absent — no UI flag needed).
export function buildRanking(scores, overrides = {}) {
  const byStartup = new Map();
  for (const row of scores) {
    const w = weightedScore(row);
    if (w == null) continue;
    if (!byStartup.has(row.startup_name)) byStartup.set(row.startup_name, []);
    byStartup.get(row.startup_name).push(w);
  }

  const rows = [];
  for (const [startup, ws] of byStartup) {
    const avg = ws.reduce((a, b) => a + b, 0) / ws.length;
    const o = overrides[startup] || {};
    const bonus = Number(o.bonus) || 0;
    rows.push({
      startup,
      avg,
      n: ws.length,
      bonus,
      final_score: avg + bonus,
      fixed_rank: o.final_rank || null,
      note: o.note || "",
    });
  }

  rows.sort((a, b) => b.final_score - a.final_score);

  const fixed = rows.filter((r) => r.fixed_rank != null);
  const auto = rows.filter((r) => r.fixed_rank == null);

  if (fixed.length === 0) {
    return rows.map((r, i) => ({ ...r, final_rank: i + 1 }));
  }

  const totalCount = rows.length;
  const result = new Array(totalCount).fill(null);
  for (const r of fixed.sort((a, b) => a.fixed_rank - b.fixed_rank)) {
    const idx = Math.max(0, Math.min(totalCount - 1, r.fixed_rank - 1));
    if (result[idx] == null) {
      result[idx] = { ...r, final_rank: r.fixed_rank };
    } else {
      for (let i = 0; i < totalCount; i++) {
        if (result[i] == null) {
          result[i] = { ...r, final_rank: i + 1 };
          break;
        }
      }
    }
  }
  let ai = 0;
  for (let i = 0; i < totalCount; i++) {
    if (result[i] == null) {
      const r = auto[ai++];
      if (r) result[i] = { ...r, final_rank: i + 1 };
    }
  }
  return result.filter(Boolean);
}

// Read the published winner of a qualifying session from its session_config row.
// Returns null when the session isn't published or the snapshot is empty.
export function getPublishedWinner(sessionRow) {
  const ranking = sessionRow?.final_ranking;
  if (!Array.isArray(ranking) || ranking.length === 0) return null;
  return ranking.find((r) => r.final_rank === 1) || null;
}

// Read the runner-up (rank #2) — used as the natural fallback when the winner
// can't make the finale.
export function getPublishedRunnerUp(sessionRow) {
  const ranking = sessionRow?.final_ranking;
  if (!Array.isArray(ranking) || ranking.length === 0) return null;
  return ranking.find((r) => r.final_rank === 2) || null;
}
