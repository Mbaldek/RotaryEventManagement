import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Lock, AlertTriangle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { SESSIONS, SESSION_BY_ID, SCORE_FIELDS, CRITERIA, JURY_STATUS } from "@/lib/rsa/constants";
import { JuryProfile, JuryScore, JuryScoringSession, SessionConfig, StartupConfirmation } from "@/lib/db";
import { DRAFT_FIELDS } from "@/components/rsa/StartupScoreCard";
import StartupScoreCard from "@/components/rsa/StartupScoreCard";

const LS_KEY = (sessionId, juryName) => `rsa_jury_draft::${sessionId}::${juryName}`;
const LS_IDENTITY = "rsa_jury_identity";

export default function RsaScore() {
  const [params] = useSearchParams();
  const sessionId = params.get("s") || "";
  const session = SESSION_BY_ID[sessionId] || null;
  const sessionLabel = session?.label ?? "";
  const sessionInternalId = session?.id ?? "";

  const [sessionRow, setSessionRow] = useState(null);
  const [jurors, setJurors] = useState([]);
  const [startups, setStartups] = useState([]);
  const [scores, setScores] = useState([]); // my submitted rows
  const [juryName, setJuryName] = useState("");
  const [drafts, setDrafts] = useState({}); // { [startup]: { score_*, comment } }
  const [expandedStartup, setExpandedStartup] = useState(null);
  const [submittingFor, setSubmittingFor] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Initial + realtime load (skipped when session id is invalid) ---
  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [cfgRow, allJury, allStartups] = await Promise.all([
          SessionConfig.filter({ session_id: sessionId }),
          JuryProfile.list("nom"),
          StartupConfirmation.filter({ session_id: sessionId }),
        ]);
        if (cancelled) return;
        setSessionRow(cfgRow[0] ?? null);

        // Jurors assigned to this session (match by label or id), validated only
        const validated = allJury.filter((j) => {
          if (!j.validated) return false;
          const assigned = j.assigned_sessions || [];
          return assigned.includes(sessionLabel) || assigned.includes(sessionInternalId);
        });
        setJurors(validated);

        // Startups: prefer session_order, else sort by name
        const order = cfgRow[0]?.session_order;
        const orderedNames = Array.isArray(order) && order.length > 0
          ? order
          : allStartups.map((s) => s.startup_name).sort((a, b) => a.localeCompare(b));
        setStartups(orderedNames);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    // Restore juror identity from localStorage if same session
    try {
      const saved = JSON.parse(localStorage.getItem(LS_IDENTITY) || "null");
      if (saved && saved.sessionId === sessionId && saved.juryName) {
        setJuryName(saved.juryName);
      }
    } catch {
      // ignore
    }

    // Realtime: session status changes
    const unsub = SessionConfig.subscribe((evt) => {
      if (evt.data?.session_id === sessionId) {
        setSessionRow((prev) => ({ ...(prev || {}), ...evt.data }));
      }
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [sessionId, sessionLabel, sessionInternalId, session]);

  // --- Once we know the juror, load their submitted scores ---
  useEffect(() => {
    if (!juryName) return;
    let cancelled = false;
    async function loadScores() {
      const mine = await JuryScore.filter({ session_id: sessionId, jury_name: juryName });
      if (cancelled) return;
      setScores(mine);
      // Seed drafts from submitted rows + localStorage fallback
      const seeded = {};
      for (const s of startups) {
        const submitted = mine.find((m) => m.startup_name === s);
        const local = safeLocal(LS_KEY(sessionId, juryName), s);
        seeded[s] = local || submitted || blankDraft();
      }
      setDrafts(seeded);
    }
    loadScores();

    // Start a scoring session row (fire and forget)
    JuryScoringSession.create({
      session_id: sessionId,
      jury_name: juryName,
      completed: false,
    }).catch(() => {});

    // Realtime: my own scores (in case I score from another tab)
    const unsub = JuryScore.subscribe((evt) => {
      const row = evt.data;
      if (!row || row.session_id !== sessionId || row.jury_name !== juryName) return;
      setScores((prev) => {
        const idx = prev.findIndex((p) => p.id === row.id || p.startup_name === row.startup_name);
        if (evt.type === "delete") return prev.filter((_, i) => i !== idx);
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
      unsub?.();
    };
  }, [juryName, sessionId, startups.length]);

  // --- Draft persistence ---
  function updateDraft(startup, patch) {
    setDrafts((prev) => {
      const next = { ...prev, [startup]: { ...(prev[startup] || blankDraft()), ...patch } };
      try {
        const key = LS_KEY(sessionId, juryName);
        const all = JSON.parse(localStorage.getItem(key) || "{}");
        all[startup] = next[startup];
        localStorage.setItem(key, JSON.stringify(all));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  }

  async function submitFor(startup) {
    if (!juryName) return;
    const d = drafts[startup];
    if (!d) return;
    // All 6 required
    for (const f of SCORE_FIELDS) {
      if (d[f] == null) {
        toast.error("Please rate all 6 criteria before submitting");
        return;
      }
    }
    setSubmittingFor(startup);
    try {
      const payload = {
        session_id: sessionId,
        jury_name: juryName,
        startup_name: startup,
        comment: d.comment || null,
      };
      for (const f of SCORE_FIELDS) payload[f] = d[f];
      await JuryScore.upsert(payload);
      toast.success(`Scores submitted for ${startup}`);
      // advance to next un-submitted startup
      const currentIdx = startups.indexOf(startup);
      const nextIdx = startups.findIndex(
        (s, i) => i > currentIdx && !isSubmitted(s, scores)
      );
      setExpandedStartup(nextIdx >= 0 ? startups[nextIdx] : null);
    } catch (err) {
      console.error(err);
      toast.error("Could not submit — please retry");
    } finally {
      setSubmittingFor(null);
    }
  }

  function pickJuror(name) {
    setJuryName(name);
    try {
      localStorage.setItem(LS_IDENTITY, JSON.stringify({ sessionId, juryName: name }));
    } catch {
      // ignore
    }
  }

  function signOut() {
    setJuryName("");
    try {
      localStorage.removeItem(LS_IDENTITY);
    } catch {
      // ignore
    }
  }

  // --- Progress ---
  const submittedCount = useMemo(() => scores.length, [scores]);

  // --- Invalid session guard (after all hooks) ---
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
        <div className="max-w-md text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-xl font-semibold text-stone-800">Unknown session</h1>
          <p className="text-sm text-stone-600">
            The link you opened does not point to a valid Rotary Startup Award session.
            Expected session IDs: {SESSIONS.map((s) => s.id).join(", ")}.
          </p>
        </div>
      </div>
    );
  }

  const status = sessionRow?.status || JURY_STATUS.DRAFT;
  const scoringOpen = status === JURY_STATUS.LIVE;

  // --- Render ---
  if (loading) {
    return <FullPageSpinner />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`body{background:#fafaf8}`}</style>

      {/* Header */}
      <header
        className="px-4 py-5"
        style={{ background: session.light, borderBottom: `2px solid ${session.border}` }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ background: "white", border: `1px solid ${session.border}` }}
            >
              {session.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-stone-800 leading-tight truncate">
                {session.label}
              </h1>
              <p className="text-xs text-stone-600">{session.date} · Rotary Startup Award 2026</p>
            </div>
            <StatusBadge status={status} />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Welcome / instructions — always visible but collapsible */}
        <WelcomeBlock juryAlreadyPicked={!!juryName} />

        {/* Session not live warnings */}
        {status === JURY_STATUS.DRAFT && (
          <Banner
            tone="info"
            title="Session not yet open"
            body="Scoring will open at the start of the session. You can come back to this link at any time."
          />
        )}
        {status === JURY_STATUS.LOCKED && (
          <Banner
            tone="warn"
            title="Scoring closed"
            body="The admin has locked this session. Your submitted scores are saved."
          />
        )}
        {status === JURY_STATUS.PUBLISHED && (
          <Banner
            tone="success"
            title="Results published"
            body="Thank you for scoring this session. The final ranking has been published."
          />
        )}

        {/* Identity picker */}
        {!juryName && (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-stone-700 uppercase tracking-wider">
              Who are you?
            </h2>
            {jurors.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-lg p-4 text-sm text-stone-600">
                No validated jurors are assigned to this session yet. Please contact the admin.
              </div>
            ) : (
              <div className="grid gap-2">
                {jurors.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => pickJuror(`${j.prenom} ${j.nom}`.trim())}
                    className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-lg hover:border-amber-400 hover:bg-amber-50/30 transition-all text-left"
                  >
                    {j.photo_base64 ? (
                      <img
                        src={j.photo_base64}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 font-medium flex-shrink-0">
                        {j.prenom?.[0]}
                        {j.nom?.[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-stone-800 truncate">
                        {j.prenom} {j.nom}
                      </div>
                      <div className="text-xs text-stone-500 truncate">{j.qualite}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Scoring */}
        {juryName && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-stone-500 uppercase tracking-wider">Scoring as</div>
                <div className="font-semibold text-stone-800">{juryName}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-stone-500">Progress</div>
                <div className="font-medium text-stone-800">
                  {submittedCount}/{startups.length}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {startups.map((s, i) => (
                <StartupScoreCard
                  key={s}
                  startup={s}
                  index={i}
                  draft={drafts[s]}
                  submittedAt={scores.find((r) => r.startup_name === s)?.submitted_at}
                  expanded={expandedStartup === s}
                  disabled={!scoringOpen}
                  submitting={submittingFor === s}
                  onToggle={() => setExpandedStartup((prev) => (prev === s ? null : s))}
                  onChangeField={(field, v) => updateDraft(s, { [field]: v })}
                  onChangeComment={(v) => updateDraft(s, { comment: v })}
                  onSubmit={() => submitFor(s)}
                />
              ))}
            </div>

            <div className="pt-4 flex items-center justify-between text-xs text-stone-400">
              <button onClick={signOut} className="hover:text-stone-700 underline">
                Not you? Switch juror
              </button>
              <span>Data is saved to this device as you score.</span>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// --- helpers ---
function blankDraft() {
  const d = { comment: "" };
  for (const f of SCORE_FIELDS) d[f] = null;
  return d;
}

function safeLocal(key, startup) {
  try {
    const all = JSON.parse(localStorage.getItem(key) || "{}");
    const entry = all?.[startup];
    if (!entry) return null;
    // trust but validate shape
    const out = blankDraft();
    for (const f of DRAFT_FIELDS) if (entry[f] != null) out[f] = entry[f];
    return out;
  } catch {
    return null;
  }
}

function isSubmitted(startup, scores) {
  return scores.some((s) => s.startup_name === startup);
}

function StatusBadge({ status }) {
  const map = {
    draft: { label: "Not yet open", cls: "bg-stone-200 text-stone-700" },
    live: { label: "● Live", cls: "bg-emerald-100 text-emerald-800" },
    locked: { label: "Locked", cls: "bg-amber-100 text-amber-800" },
    published: { label: "Published", cls: "bg-indigo-100 text-indigo-800" },
  };
  const m = map[status] || map.draft;
  return (
    <span
      className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

function Banner({ tone, title, body }) {
  const classes = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    warn: "bg-amber-50 border-amber-200 text-amber-900",
    success: "bg-emerald-50 border-emerald-200 text-emerald-900",
  }[tone];
  const Icon = tone === "warn" ? Lock : AlertTriangle;
  return (
    <div className={`rounded-lg border p-3 mb-4 flex gap-3 ${classes}`}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs mt-0.5">{body}</div>
      </div>
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
    </div>
  );
}

const WELCOME_LS_KEY = "rsa_welcome_seen";

function WelcomeBlock({ juryAlreadyPicked }) {
  // Default expanded if never seen, otherwise collapsed. User can always re-open.
  const [open, setOpen] = useState(() => {
    try {
      return !localStorage.getItem(WELCOME_LS_KEY);
    } catch {
      return true;
    }
  });

  function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) {
      try {
        localStorage.setItem(WELCOME_LS_KEY, "1");
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-stone-800 text-sm sm:text-base">
            Welcome to the Rotary Startup Award scoring
          </div>
          <div className="text-xs text-stone-600 mt-0.5">
            {open ? "Tap to collapse" : "Tap to read how scoring works"}
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-amber-100 pt-3 text-sm text-stone-700 leading-relaxed">
          <p>
            As a jury member, you will score each startup on <strong>6 categories</strong>, on
            a <strong>0 to 5 scale</strong> (0 = lowest, 5 = highest).
          </p>
          <p>
            <strong>Complete and submit scores for each startup separately.</strong>{" "}
            {juryAlreadyPicked
              ? "Tap a startup below to expand it, rate the 6 criteria, add an optional comment, and submit. You can come back and edit any submission until the session is locked."
              : "Start by picking your name below, then you'll see the startups to score."}
          </p>

          <details className="group" open>
            <summary className="cursor-pointer select-none text-amber-800 font-medium text-xs uppercase tracking-wider py-1 hover:text-amber-900">
              ▸ Criteria (tap to hide)
            </summary>
            <ol className="mt-2 space-y-3">
              {CRITERIA.map((c, i) => (
                <li key={c.id} className="pl-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-stone-800">
                      {i + 1}. {c.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5">
                      {Math.round(c.weight * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">{c.desc}</p>
                  <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                    <span className="text-[11px] font-semibold text-stone-400">0</span>
                    <span className="text-[11px] text-stone-500">{c.anchors[0]}</span>
                    <span className="text-[11px] font-semibold text-stone-400">3</span>
                    <span className="text-[11px] text-stone-500">{c.anchors[3]}</span>
                    <span className="text-[11px] font-semibold text-stone-400">5</span>
                    <span className="text-[11px] text-stone-500">{c.anchors[5]}</span>
                  </div>
                </li>
              ))}
            </ol>
          </details>

          <p className="text-xs text-stone-500 border-t border-amber-100 pt-3">
            Scores are saved to your device as you enter them, so you won't lose data if your
            connection drops. Tap <strong>Submit</strong> to send each startup to the organizer.
          </p>
        </div>
      )}
    </div>
  );
}
