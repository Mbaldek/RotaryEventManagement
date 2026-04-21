import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Lock, Play, Rocket, Undo2, Copy, ExternalLink } from "lucide-react";
import { SESSION_BY_ID, CRITERIA, MAX_WEIGHTED, weightedScore, JURY_STATUS } from "@/lib/rsa/constants";
import { JuryProfile, JuryScore, SessionConfig, StartupConfirmation } from "@/lib/db";
import StatusPill, { NEXT_STATE, PREV_STATE } from "./StatusPill";
import ScoreCell from "./ScoreCell";

export default function LiveTab({ sessionId, onResultsReady }) {
  const session = SESSION_BY_ID[sessionId];
  const [sessionRow, setSessionRow] = useState(null);
  const [jurors, setJurors] = useState([]);
  const [startups, setStartups] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingTransition, setPendingTransition] = useState(null); // { to, label }
  const [working, setWorking] = useState(false);
  const [detail, setDetail] = useState(null); // score row for drawer

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [cfg, allJury, startupRows, sc] = await Promise.all([
          SessionConfig.filter({ session_id: sessionId }),
          JuryProfile.list("nom"),
          StartupConfirmation.filter({ session_id: sessionId }),
          JuryScore.filter({ session_id: sessionId }),
        ]);
        if (cancelled) return;
        const cfgRow = cfg[0] ?? null;
        setSessionRow(cfgRow);
        const validated = allJury.filter((j) => {
          if (!j.validated) return false;
          const a = j.assigned_sessions || [];
          return a.includes(session.label) || a.includes(session.id);
        });
        setJurors(validated);
        const order = cfgRow?.session_order;
        const orderedNames = Array.isArray(order) && order.length > 0
          ? order
          : startupRows.map((s) => s.startup_name).sort((a, b) => a.localeCompare(b));
        setStartups(orderedNames);
        setScores(sc);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    const unsubCfg = SessionConfig.subscribe((evt) => {
      if (evt.data?.session_id === sessionId) {
        setSessionRow((prev) => ({ ...(prev || {}), ...evt.data }));
      }
    });
    const unsubScores = JuryScore.subscribe((evt) => {
      const row = evt.data;
      if (!row || row.session_id !== sessionId) return;
      setScores((prev) => {
        if (evt.type === "delete") {
          return prev.filter((r) => r.id !== row.id);
        }
        const idx = prev.findIndex((r) => r.id === row.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = row;
          return next;
        }
        return [...prev, row];
      });
    });
    return () => {
      cancelled = true;
      unsubCfg?.();
      unsubScores?.();
    };
  }, [sessionId, session.label, session.id]);

  const status = sessionRow?.status || JURY_STATUS.DRAFT;

  // score lookup: (jury, startup) → row
  const byCell = useMemo(() => {
    const m = new Map();
    for (const r of scores) m.set(`${r.jury_name}::${r.startup_name}`, r);
    return m;
  }, [scores]);

  // Per-startup aggregates (weighted average across jurors who have a COMPLETE row)
  const aggregates = useMemo(() => {
    const out = {};
    for (const s of startups) {
      const juryWeights = [];
      for (const j of jurors) {
        const row = byCell.get(`${fullName(j)}::${s}`);
        const w = row ? weightedScore(row) : null;
        if (w != null) juryWeights.push(w);
      }
      out[s] = {
        n: juryWeights.length,
        avg: juryWeights.length ? juryWeights.reduce((a, b) => a + b, 0) / juryWeights.length : null,
      };
    }
    return out;
  }, [startups, jurors, byCell]);

  // Signal parent when session is lockable/publishable so Results tab becomes relevant
  useEffect(() => {
    onResultsReady?.(status === JURY_STATUS.LOCKED || status === JURY_STATUS.PUBLISHED);
  }, [status, onResultsReady]);

  async function applyTransition(target) {
    setWorking(true);
    try {
      const patch = { status: target };
      const now = new Date().toISOString();
      if (target === JURY_STATUS.LIVE) {
        patch.session_active = true;
        patch.activated_at = now;
        patch.locked_at = null;
        patch.published_at = null;
        patch.final_ranking = [];
      }
      if (target === JURY_STATUS.LOCKED) {
        patch.session_active = false;
        patch.locked_at = now;
      }
      if (target === JURY_STATUS.PUBLISHED) {
        patch.published_at = now;
        // final_ranking is written from Results tab (publish there), keep as-is
      }
      if (target === JURY_STATUS.DRAFT) {
        patch.session_active = false;
        patch.activated_at = null;
        patch.locked_at = null;
        patch.published_at = null;
        patch.final_ranking = [];
      }
      await SessionConfig.updateBySessionId(sessionId, patch);
      toast.success(`Session set to ${target.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      toast.error("Could not update session status");
    } finally {
      setWorking(false);
      setPendingTransition(null);
    }
  }

  function copyJurorLink() {
    const url = `${window.location.origin}/RsaScore?s=${sessionId}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Juror link copied to clipboard"),
      () => toast.error("Copy failed — link: " + url)
    );
  }

  if (loading) {
    return <Loader2 className="w-5 h-5 animate-spin text-stone-400 mx-auto my-12" />;
  }

  const next = NEXT_STATE[status];
  const prev = PREV_STATE[status];

  return (
    <div className="space-y-6">
      {/* Session header */}
      <div
        className="rounded-xl p-4 border"
        style={{ background: session.light, borderColor: session.border }}
      >
        <div className="flex items-start gap-3 flex-wrap">
          <div className="text-3xl">{session.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-stone-800">{session.label}</h2>
              <StatusPill status={status} size="sm" />
            </div>
            <p className="text-xs text-stone-600 mt-0.5">{session.date}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={copyJurorLink}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-stone-300 bg-white hover:bg-stone-50"
            >
              <Copy className="w-3.5 h-3.5" /> Juror link
            </button>
            <a
              href={`/RsaScore?s=${sessionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-stone-300 bg-white hover:bg-stone-50"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Preview
            </a>
          </div>
        </div>
      </div>

      {/* Transition controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {next && (
          <button
            onClick={() => setPendingTransition({ to: next.to, label: next.label })}
            disabled={working}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium text-white shadow-sm disabled:opacity-50 ${
              next.tone === "emerald"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : next.tone === "amber"
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {next.to === JURY_STATUS.LIVE && <Play className="w-4 h-4" />}
            {next.to === JURY_STATUS.LOCKED && <Lock className="w-4 h-4" />}
            {next.to === JURY_STATUS.PUBLISHED && <Rocket className="w-4 h-4" />}
            {next.label}
          </button>
        )}
        {prev && (
          <button
            onClick={() => setPendingTransition({ to: prev.to, label: prev.label })}
            disabled={working}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm text-stone-600 border border-stone-300 hover:bg-stone-50 disabled:opacity-50"
          >
            <Undo2 className="w-3.5 h-3.5" /> {prev.label}
          </button>
        )}
      </div>

      {/* Empty states */}
      {jurors.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
          No validated jurors assigned to this session. Go to the <strong>Setup</strong> tab to
          validate and assign jurors.
        </div>
      )}
      {startups.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
          No startups confirmed for this session.
        </div>
      )}

      {/* Live grid */}
      {startups.length > 0 && jurors.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="min-w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left text-xs font-semibold text-stone-600 uppercase tracking-wider p-3 sticky left-0 bg-stone-50">
                  Startup
                </th>
                {jurors.map((j) => (
                  <th
                    key={j.id}
                    className="text-center text-xs font-semibold text-stone-600 tracking-wider p-2 min-w-[80px]"
                    title={j.qualite}
                  >
                    <div className="truncate max-w-[80px]">{j.prenom}</div>
                    <div className="truncate max-w-[80px] text-[10px] font-normal text-stone-400">
                      {j.nom}
                    </div>
                  </th>
                ))}
                <th className="text-center text-xs font-semibold text-stone-600 uppercase tracking-wider p-3 bg-amber-50">
                  Avg
                </th>
                <th className="text-center text-xs font-semibold text-stone-600 uppercase tracking-wider p-3 bg-stone-100">
                  n
                </th>
              </tr>
            </thead>
            <tbody>
              {startups.map((s, i) => {
                const agg = aggregates[s];
                return (
                  <tr
                    key={s}
                    className={`border-b border-stone-100 hover:bg-stone-50/50 ${
                      i % 2 === 1 ? "bg-stone-50/40" : ""
                    }`}
                  >
                    <td className="p-3 text-sm font-medium text-stone-800 sticky left-0 bg-inherit">
                      <span className="text-stone-400 text-xs mr-2">{i + 1}.</span>
                      {s}
                    </td>
                    {jurors.map((j) => {
                      const row = byCell.get(`${fullName(j)}::${s}`);
                      return (
                        <td key={j.id} className="p-1 text-center">
                          <ScoreCell scoreRow={row} onClick={() => row && setDetail(row)} />
                        </td>
                      );
                    })}
                    <td className="p-3 text-center font-bold text-amber-700 bg-amber-50/40">
                      {agg.avg != null ? agg.avg.toFixed(2) : "—"}
                    </td>
                    <td className="p-3 text-center text-xs text-stone-500 bg-stone-50/60">
                      {agg.n}/{jurors.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {startups.length > 0 && jurors.length > 0 && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat
            label="Startups"
            value={startups.length}
            sub={`${Object.values(aggregates).filter((a) => a.n > 0).length} started`}
          />
          <Stat
            label="Jurors"
            value={jurors.length}
            sub={`${countJurorsSubmitted(scores, jurors, startups.length)} scoring`}
          />
          <Stat
            label="Total scored"
            value={scores.filter((s) => weightedScore(s) != null).length}
            sub={`/ ${jurors.length * startups.length}`}
          />
        </div>
      )}

      {/* Transition confirmation */}
      {pendingTransition && (
        <ConfirmDialog
          title={pendingTransition.label}
          body={confirmBody(pendingTransition.to)}
          onCancel={() => setPendingTransition(null)}
          onConfirm={() => applyTransition(pendingTransition.to)}
          working={working}
        />
      )}

      {/* Detail drawer */}
      {detail && <DetailDrawer row={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function fullName(j) {
  return `${j.prenom} ${j.nom}`.trim();
}

function countJurorsSubmitted(scores, jurors, startupCount) {
  const set = new Set();
  for (const s of scores) if (weightedScore(s) != null) set.add(s.jury_name);
  return set.size;
}

function confirmBody(target) {
  if (target === JURY_STATUS.LIVE)
    return "Jurors will be able to submit and edit their scores. Make sure the shared link has been sent.";
  if (target === JURY_STATUS.LOCKED)
    return "Jurors will no longer be able to edit their scores. You can still re-open if needed.";
  if (target === JURY_STATUS.PUBLISHED)
    return "The final ranking from the Results tab will be locked in. An 'unpublish' option stays available.";
  if (target === JURY_STATUS.DRAFT)
    return "Session goes back to pre-opening state. Existing scores are preserved in the database.";
  return "Please confirm this transition.";
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3">
      <div className="text-[11px] text-stone-500 uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold text-stone-800">{value}</div>
      {sub && <div className="text-xs text-stone-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function ConfirmDialog({ title, body, onCancel, onConfirm, working }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl">
        <h3 className="font-semibold text-stone-800 mb-2">{title}</h3>
        <p className="text-sm text-stone-600 mb-4">{body}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={working}
            className="px-4 py-2 rounded-md text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={working}
            className="px-4 py-2 rounded-md text-sm font-medium bg-stone-800 text-white hover:bg-stone-900 disabled:opacity-50 flex items-center gap-2"
          >
            {working && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailDrawer({ row, onClose }) {
  const w = weightedScore(row);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-xl">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs text-stone-500">{row.jury_name} → {row.startup_name}</div>
            <div className="text-lg font-semibold text-stone-800">
              Weighted total: {w != null ? w.toFixed(2) : "—"} / {MAX_WEIGHTED.toFixed(0)}
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xl leading-none">
            ×
          </button>
        </div>
        <div className="space-y-2">
          {CRITERIA.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <span className="text-stone-600">{c.label}</span>
              <span className="font-semibold text-stone-800">
                {row[c.id] != null ? `${row[c.id]}/5` : "—"}{" "}
                <span className="text-xs text-stone-400 font-normal">· {Math.round(c.weight * 100)}%</span>
              </span>
            </div>
          ))}
        </div>
        {row.comment && (
          <div className="mt-4 p-3 bg-stone-50 rounded text-sm text-stone-700">
            <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">Comment</div>
            {row.comment}
          </div>
        )}
      </div>
    </div>
  );
}
