import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Download, Save, Rocket, AlertTriangle, Trophy, Sparkles } from "lucide-react";
import { SESSION_BY_ID, weightedScore, JURY_STATUS } from "@/lib/rsa/constants";
import { buildRanking } from "@/lib/rsa/ranking";
import { JuryScore, SessionConfig } from "@/lib/db";
import StatusPill from "./StatusPill";

export default function ResultsTab({ sessionId }) {
  const session = SESSION_BY_ID[sessionId];
  const [sessionRow, setSessionRow] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState({}); // { [startup]: { bonus, final_rank, note } }
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [cfg, sc] = await Promise.all([
          SessionConfig.filter({ session_id: sessionId }),
          JuryScore.filter({ session_id: sessionId }),
        ]);
        if (cancelled) return;
        const cfgRow = cfg[0] ?? null;
        setSessionRow(cfgRow);
        setScores(sc);
        setOverrides(cfgRow?.admin_overrides || {});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const unsub = SessionConfig.subscribe((evt) => {
      if (evt.data?.session_id === sessionId) {
        setSessionRow((prev) => ({ ...(prev || {}), ...evt.data }));
      }
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [sessionId]);

  // Derived rankings
  const rankedRows = useMemo(() => buildRanking(scores, overrides), [scores, overrides]);

  const status = sessionRow?.status || JURY_STATUS.DRAFT;
  const canEdit = status === JURY_STATUS.LOCKED;
  const published = status === JURY_STATUS.PUBLISHED;

  function updateOverride(startup, patch) {
    setOverrides((prev) => ({
      ...prev,
      [startup]: { ...(prev[startup] || { bonus: 0, final_rank: null, note: "" }), ...patch },
    }));
    setDirty(true);
  }

  async function saveOverrides() {
    setSaving(true);
    try {
      await SessionConfig.updateBySessionId(sessionId, { admin_overrides: overrides });
      setDirty(false);
      toast.success("Overrides saved");
    } catch (err) {
      console.error(err);
      toast.error("Could not save overrides");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setPublishing(true);
    try {
      if (dirty) {
        await SessionConfig.updateBySessionId(sessionId, { admin_overrides: overrides });
        setDirty(false);
      }
      const snapshot = rankedRows.map((r) => ({
        startup_name: r.startup,
        avg: r.avg,
        bonus: r.bonus,
        final_score: r.final_score,
        final_rank: r.final_rank,
        note: r.note || "",
        juror_count: r.n,
      }));
      await SessionConfig.updateBySessionId(sessionId, {
        final_ranking: snapshot,
        status: JURY_STATUS.PUBLISHED,
        published_at: new Date().toISOString(),
      });
      toast.success("Results published");
    } catch (err) {
      console.error(err);
      toast.error("Could not publish");
    } finally {
      setPublishing(false);
    }
  }

  function downloadCSV() {
    const header = [
      "rank",
      "startup",
      "avg_weighted",
      "bonus",
      "final_score",
      "juror_count",
      "admin_note",
    ];
    const csv =
      header.join(",") +
      "\n" +
      rankedRows
        .map((r) =>
          [
            r.final_rank,
            csvField(r.startup),
            r.avg?.toFixed(3) ?? "",
            r.bonus,
            r.final_score.toFixed(3),
            r.n,
            csvField(r.note || ""),
          ].join(",")
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rsa-${sessionId}-results.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (loading) {
    return <Loader2 className="w-5 h-5 animate-spin text-stone-400 mx-auto my-12" />;
  }

  const winner = rankedRows.find((r) => r.final_rank === 1);
  const podium = rankedRows.filter((r) => r.final_rank <= 3);

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl p-4 border flex items-center gap-3 flex-wrap"
        style={{ background: session.light, borderColor: session.border }}
      >
        <span className="text-2xl">{session.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-stone-800">{session.label}</h2>
            <StatusPill status={status} size="sm" />
          </div>
          <p className="text-xs text-stone-600 mt-0.5">{session.date}</p>
        </div>
      </div>

      {/* 🏆 Grand Final laureate reveal — shown when the finale is published. */}
      {session.isFinal && published && winner && (
        <div
          className="rounded-2xl border-2 p-6 md:p-8 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #fdf6e8 0%, #fbeec1 50%, #fdf6e8 100%)",
            borderColor: "#c9a84c",
            boxShadow: "0 10px 30px rgba(201,168,76,0.18)",
          }}
        >
          <div
            aria-hidden
            className="absolute -top-10 -right-10 opacity-10"
            style={{ fontSize: 200, lineHeight: 1 }}
          >
            🏆
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" style={{ color: "#9a6400" }} />
              <span
                className="text-[11px] uppercase tracking-[0.2em] font-medium"
                style={{ color: "#9a6400" }}
              >
                Lauréat — Rotary Startup Award 2026
              </span>
            </div>
            <h3
              className="text-3xl md:text-5xl leading-tight"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "#0f1f3d",
                fontWeight: 600,
              }}
            >
              {winner.startup}
            </h3>
            <div className="mt-3 flex items-center gap-4 flex-wrap text-sm">
              <span style={{ color: "#5a5a7a" }}>
                Score final{" "}
                <strong style={{ color: "#9a6400" }}>
                  {winner.final_score.toFixed(2)}/5
                </strong>
              </span>
              <span style={{ color: "#9090a8" }}>·</span>
              <span style={{ color: "#5a5a7a" }}>
                Moyenne jury {winner.avg.toFixed(2)} sur {winner.n} évaluations
              </span>
              {winner.bonus > 0 && (
                <>
                  <span style={{ color: "#9090a8" }}>·</span>
                  <span style={{ color: "#5a5a7a" }}>
                    Bonus admin <strong>+{winner.bonus}</strong>
                  </span>
                </>
              )}
            </div>
            {winner.note && (
              <p
                className="mt-3 text-sm italic"
                style={{ color: "#3a3a52", fontFamily: "'Playfair Display', serif" }}
              >
                « {winner.note} »
              </p>
            )}

            {podium.length > 1 && (
              <div className="mt-5 pt-4 border-t" style={{ borderColor: "rgba(201,168,76,0.3)" }}>
                <div
                  className="text-[10px] uppercase tracking-[0.18em] font-medium mb-2"
                  style={{ color: "#9a6400" }}
                >
                  Podium
                </div>
                <div className="flex flex-wrap gap-3">
                  {podium.map((r) => (
                    <div
                      key={r.startup}
                      className="flex items-center gap-2 px-3 py-1.5 rounded"
                      style={{
                        background: "white",
                        border: "1px solid rgba(201,168,76,0.4)",
                      }}
                    >
                      <Trophy
                        className="w-3.5 h-3.5"
                        style={{
                          color:
                            r.final_rank === 1
                              ? "#c9a84c"
                              : r.final_rank === 2
                              ? "#9090a8"
                              : "#a87a4a",
                        }}
                      />
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: "#9a6400" }}
                      >
                        #{r.final_rank}
                      </span>
                      <span
                        className="text-sm"
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          color: "#0f1f3d",
                          fontWeight: 500,
                        }}
                      >
                        {r.startup}
                      </span>
                      <span className="text-[11px] tabular-nums" style={{ color: "#5a5a7a" }}>
                        {r.final_score.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {status === JURY_STATUS.DRAFT || status === JURY_STATUS.LIVE ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong>Results are not available yet.</strong> Lock the session in the Live tab first
            to review aggregates and apply overrides.
          </div>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-stone-600">
              Adjust <strong>bonus</strong> or pin a <strong>final rank</strong> for tie-breaks.
              Final score = avg + bonus. Empty final_rank = auto-ranked by final score.
            </p>
            <div className="flex gap-2">
              {canEdit && (
                <button
                  onClick={saveOverrides}
                  disabled={!dirty || saving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border border-stone-300 bg-white hover:bg-stone-50 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {dirty ? "Save overrides" : "Saved"}
                </button>
              )}
              {canEdit && (
                <button
                  onClick={publish}
                  disabled={publishing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  Publish
                </button>
              )}
              {published && (
                <button
                  onClick={downloadCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border border-stone-300 bg-white hover:bg-stone-50"
                >
                  <Download className="w-4 h-4" /> CSV
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-stone-200 bg-white overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-stone-50 border-b border-stone-200 text-xs uppercase tracking-wider text-stone-600">
                <tr>
                  <th className="text-left p-3 w-14">Rank</th>
                  <th className="text-left p-3">Startup</th>
                  <th className="text-right p-3">Avg</th>
                  <th className="text-center p-3 w-24">Bonus</th>
                  <th className="text-right p-3">Final</th>
                  <th className="text-center p-3 w-24">Fix rank</th>
                  <th className="text-left p-3">Admin note</th>
                </tr>
              </thead>
              <tbody>
                {rankedRows.map((r) => (
                  <tr key={r.startup} className="border-b border-stone-100">
                    <td className="p-3 font-bold text-stone-800">#{r.final_rank}</td>
                    <td className="p-3 font-medium text-stone-800">
                      {r.startup}
                      <div className="text-xs text-stone-400">
                        {r.n} juror{r.n === 1 ? "" : "s"}
                      </div>
                    </td>
                    <td className="p-3 text-right tabular-nums text-stone-700">
                      {r.avg != null ? r.avg.toFixed(2) : "—"}
                    </td>
                    <td className="p-3 text-center">
                      {canEdit ? (
                        <input
                          type="number"
                          step="0.1"
                          value={overrides[r.startup]?.bonus ?? 0}
                          onChange={(e) =>
                            updateOverride(r.startup, { bonus: parseFloat(e.target.value) || 0 })
                          }
                          className="w-16 text-center text-sm border border-stone-300 rounded px-1 py-1"
                        />
                      ) : (
                        <span className="tabular-nums">{r.bonus.toFixed(1)}</span>
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums font-bold text-amber-700">
                      {r.final_score.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      {canEdit ? (
                        <input
                          type="number"
                          min="1"
                          value={overrides[r.startup]?.final_rank ?? ""}
                          onChange={(e) => {
                            const v = e.target.value ? parseInt(e.target.value, 10) : null;
                            updateOverride(r.startup, { final_rank: v });
                          }}
                          placeholder="auto"
                          className="w-16 text-center text-sm border border-stone-300 rounded px-1 py-1"
                        />
                      ) : (
                        <span className="text-stone-400 text-sm">
                          {overrides[r.startup]?.final_rank ? `#${overrides[r.startup].final_rank}` : "auto"}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {canEdit ? (
                        <input
                          type="text"
                          value={overrides[r.startup]?.note ?? ""}
                          onChange={(e) => updateOverride(r.startup, { note: e.target.value })}
                          placeholder="Tie-break rationale…"
                          className="w-full text-sm border border-stone-300 rounded px-2 py-1"
                        />
                      ) : (
                        <span className="text-xs text-stone-500">{overrides[r.startup]?.note || ""}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {published && sessionRow?.final_ranking?.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-900">
              Published {new Date(sessionRow.published_at).toLocaleString()} ·{" "}
              <strong>{sessionRow.final_ranking.length}</strong> startups in snapshot.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function csvField(s) {
  if (s == null) return "";
  const str = String(s);
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}
