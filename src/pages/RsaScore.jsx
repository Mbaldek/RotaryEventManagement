import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Lock, AlertTriangle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import {
  SESSIONS,
  SESSION_BY_ID,
  SCORE_FIELDS,
  CRITERIA,
  JURY_STATUS,
  getCriterion,
  getSessionLabel,
  getSessionDate,
} from "@/lib/rsa/constants";
import { JuryProfile, JuryScore, JuryScoreDraft, JuryScoringSession, SessionConfig, StartupConfirmation } from "@/lib/db";
import { DRAFT_FIELDS } from "@/components/rsa/StartupScoreCard";
import StartupScoreCard from "@/components/rsa/StartupScoreCard";

const DRAFT_DEBOUNCE_MS = 600;

const LS_KEY = (sessionId, juryName) => `rsa_jury_draft::${sessionId}::${juryName}`;
const LS_IDENTITY = "rsa_jury_identity";
const LS_LANG = "rsa_score_lang";

const LANGS = ["fr", "en", "de"];

const T = {
  fr: {
    rateAll: "Veuillez noter les 6 critères avant de soumettre",
    submittedFor: (s) => `Notes envoyées pour ${s}`,
    submitErr: "Échec de l'envoi — merci de réessayer",
    unknownTitle: "Session inconnue",
    unknownBody: (ids) => `Le lien que vous avez ouvert ne correspond à aucune session du Rotary Startup Award. IDs attendus : ${ids}.`,
    statusDraft: "Pas encore ouverte",
    statusLive: "● En direct",
    statusLocked: "Verrouillée",
    statusPublished: "Publié",
    bDraftT: "Session pas encore ouverte",
    bDraftB: "Le scoring s'ouvrira au début de la session. Vous pouvez revenir sur ce lien à tout moment.",
    bLockedT: "Scoring fermé",
    bLockedB: "L'administrateur a verrouillé cette session. Vos notes soumises sont enregistrées.",
    bPublishedT: "Résultats publiés",
    bPublishedB: "Merci d'avoir noté cette session. Le classement final a été publié.",
    whoAreYou: "Qui êtes-vous ?",
    noJurors: "Aucun juré validé n'est assigné à cette session. Merci de contacter l'administrateur.",
    scoringAs: "Connecté en tant que juré",
    progress: "Progression",
    switchJuror: "Ce n'est pas vous ? Changer de juré",
    wrongPersonCta: "Pas vous ?",
    wrongPersonLong: "Changer de juré",
    autoSaved: "Enregistrement auto — fermez l'onglet et reprenez sur n'importe quel appareil.",
    wTitle: "Bienvenue sur le scoring Rotary Startup Award",
    wCollapse: "Toucher pour réduire",
    wExpand: "Toucher pour lire le fonctionnement",
    wCritHide: "▸ Critères (toucher pour masquer)",
    wPara1: (
      <>
        En tant que juré, vous allez noter chaque startup sur <strong>6 catégories</strong>, sur une{" "}
        <strong>échelle de 0 à 5</strong> (0 = plus bas, 5 = plus haut).
      </>
    ),
    wPara2Picked: (
      <>
        <strong>Complétez et envoyez les notes pour chaque startup séparément.</strong>{" "}
        Touchez une startup ci-dessous pour l'ouvrir, notez les 6 critères, ajoutez un commentaire
        optionnel et envoyez. Vous pouvez revenir modifier vos envois jusqu'au verrouillage de la
        session.
      </>
    ),
    wPara2NotPicked: (
      <>
        <strong>Complétez et envoyez les notes pour chaque startup séparément.</strong>{" "}
        Commencez par sélectionner votre nom ci-dessous, puis vous verrez les startups à noter.
      </>
    ),
    wFooter: (
      <>
        Les notes sont sauvegardées sur votre appareil au fur et à mesure, vous ne perdrez rien en
        cas de coupure. Touchez <strong>Envoyer</strong> pour envoyer chaque startup à l'organisateur.
      </>
    ),
  },
  en: {
    rateAll: "Please rate all 6 criteria before submitting",
    submittedFor: (s) => `Scores submitted for ${s}`,
    submitErr: "Could not submit — please retry",
    unknownTitle: "Unknown session",
    unknownBody: (ids) => `The link you opened does not point to a valid Rotary Startup Award session. Expected session IDs: ${ids}.`,
    statusDraft: "Not yet open",
    statusLive: "● Live",
    statusLocked: "Locked",
    statusPublished: "Published",
    bDraftT: "Session not yet open",
    bDraftB: "Scoring will open at the start of the session. You can come back to this link at any time.",
    bLockedT: "Scoring closed",
    bLockedB: "The admin has locked this session. Your submitted scores are saved.",
    bPublishedT: "Results published",
    bPublishedB: "Thank you for scoring this session. The final ranking has been published.",
    whoAreYou: "Who are you?",
    noJurors: "No validated jurors are assigned to this session yet. Please contact the admin.",
    scoringAs: "Signed in as",
    wrongPersonCta: "Not you?",
    wrongPersonLong: "Switch juror",
    progress: "Progress",
    switchJuror: "Not you? Switch juror",
    autoSaved: "Auto-saved — close the tab and resume on any device.",
    wTitle: "Welcome to the Rotary Startup Award scoring",
    wCollapse: "Tap to collapse",
    wExpand: "Tap to read how scoring works",
    wCritHide: "▸ Criteria (tap to hide)",
    wPara1: (
      <>
        As a jury member, you will score each startup on <strong>6 categories</strong>, on a{" "}
        <strong>0 to 5 scale</strong> (0 = lowest, 5 = highest).
      </>
    ),
    wPara2Picked: (
      <>
        <strong>Complete and submit scores for each startup separately.</strong>{" "}
        Tap a startup below to expand it, rate the 6 criteria, add an optional comment, and submit.
        You can come back and edit any submission until the session is locked.
      </>
    ),
    wPara2NotPicked: (
      <>
        <strong>Complete and submit scores for each startup separately.</strong>{" "}
        Start by picking your name below, then you'll see the startups to score.
      </>
    ),
    wFooter: (
      <>
        Scores are saved to your device as you enter them, so you won't lose data if your
        connection drops. Tap <strong>Submit</strong> to send each startup to the organizer.
      </>
    ),
  },
  de: {
    rateAll: "Bitte bewerten Sie alle 6 Kriterien, bevor Sie einreichen",
    submittedFor: (s) => `Bewertungen für ${s} eingereicht`,
    submitErr: "Einreichen fehlgeschlagen — bitte erneut versuchen",
    unknownTitle: "Unbekannte Session",
    unknownBody: (ids) => `Der geöffnete Link verweist auf keine gültige Rotary Startup Award Session. Erwartete Session-IDs: ${ids}.`,
    statusDraft: "Noch nicht geöffnet",
    statusLive: "● Live",
    statusLocked: "Gesperrt",
    statusPublished: "Veröffentlicht",
    bDraftT: "Session noch nicht geöffnet",
    bDraftB: "Die Bewertung öffnet sich zu Beginn der Session. Sie können diesen Link jederzeit erneut aufrufen.",
    bLockedT: "Bewertung geschlossen",
    bLockedB: "Der Admin hat diese Session gesperrt. Ihre eingereichten Bewertungen sind gespeichert.",
    bPublishedT: "Ergebnisse veröffentlicht",
    bPublishedB: "Vielen Dank für Ihre Bewertung dieser Session. Das Endergebnis wurde veröffentlicht.",
    whoAreYou: "Wer sind Sie?",
    noJurors: "Dieser Session sind noch keine validierten Juroren zugewiesen. Bitte wenden Sie sich an den Admin.",
    scoringAs: "Angemeldet als Juror",
    progress: "Fortschritt",
    switchJuror: "Nicht Sie? Juror wechseln",
    wrongPersonCta: "Nicht Sie?",
    wrongPersonLong: "Juror wechseln",
    autoSaved: "Automatisch gespeichert — schließen Sie den Tab und setzen Sie auf einem beliebigen Gerät fort.",
    wTitle: "Willkommen zum Scoring des Rotary Startup Award",
    wCollapse: "Tippen zum Einklappen",
    wExpand: "Tippen, um zu lesen, wie die Bewertung funktioniert",
    wCritHide: "▸ Kriterien (tippen zum Ausblenden)",
    wPara1: (
      <>
        Als Jurymitglied bewerten Sie jedes Startup in <strong>6 Kategorien</strong> auf einer{" "}
        <strong>Skala von 0 bis 5</strong> (0 = niedrigste, 5 = höchste).
      </>
    ),
    wPara2Picked: (
      <>
        <strong>Bewerten und reichen Sie jedes Startup separat ein.</strong>{" "}
        Tippen Sie unten auf ein Startup, um es zu öffnen, bewerten Sie die 6 Kriterien, fügen Sie
        einen optionalen Kommentar hinzu und reichen Sie ein. Sie können Ihre Einreichungen
        bearbeiten, bis die Session gesperrt wird.
      </>
    ),
    wPara2NotPicked: (
      <>
        <strong>Bewerten und reichen Sie jedes Startup separat ein.</strong>{" "}
        Wählen Sie zunächst Ihren Namen unten aus, danach sehen Sie die zu bewertenden Startups.
      </>
    ),
    wFooter: (
      <>
        Bewertungen werden während der Eingabe auf Ihrem Gerät gespeichert, sodass bei einem
        Verbindungsabbruch nichts verloren geht. Tippen Sie auf <strong>Einreichen</strong>, um
        jedes Startup an den Veranstalter zu senden.
      </>
    ),
  },
};

function readStoredLang() {
  try {
    const saved = localStorage.getItem(LS_LANG);
    if (saved && LANGS.includes(saved)) return saved;
  } catch {
    // ignore
  }
  return "fr";
}

export default function RsaScore() {
  const [params] = useSearchParams();
  const sessionId = params.get("s") || "";
  const session = SESSION_BY_ID[sessionId] || null;
  const sessionLabel = session?.label ?? "";
  const sessionInternalId = session?.id ?? "";

  const [lang, setLang] = useState(readStoredLang);
  const t = T[lang];

  const [sessionRow, setSessionRow] = useState(null);
  const [jurors, setJurors] = useState([]);
  const [startups, setStartups] = useState([]);
  const [scores, setScores] = useState([]); // my submitted rows
  const [juryName, setJuryName] = useState("");
  const [drafts, setDrafts] = useState({}); // { [startup]: { score_*, comment } }
  const [expandedStartup, setExpandedStartup] = useState(null);
  const [submittingFor, setSubmittingFor] = useState(null);
  const [loading, setLoading] = useState(true);
  const draftSaveTimers = useRef({}); // { [startup]: timeoutId }

  function changeLang(next) {
    setLang(next);
    try {
      localStorage.setItem(LS_LANG, next);
    } catch {
      // ignore
    }
  }

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
      const [mine, remoteDrafts] = await Promise.all([
        JuryScore.filter({ session_id: sessionId, jury_name: juryName }),
        JuryScoreDraft.filter({ session_id: sessionId, jury_name: juryName }).catch(() => []),
      ]);
      if (cancelled) return;
      setScores(mine);
      const remoteByStartup = {};
      for (const d of remoteDrafts || []) remoteByStartup[d.startup_name] = pickDraft(d);
      // Seed: submitted jurors are locked; otherwise prefer local (fastest, most recent), then remote (cross-device), then blank
      const seeded = {};
      for (const s of startups) {
        const submitted = mine.find((m) => m.startup_name === s);
        if (submitted) { seeded[s] = submitted; continue; }
        const local = safeLocal(LS_KEY(sessionId, juryName), s);
        seeded[s] = local || remoteByStartup[s] || blankDraft();
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
      // Debounced server sync so jurors can resume on another device
      if (juryName && sessionId) {
        if (draftSaveTimers.current[startup]) clearTimeout(draftSaveTimers.current[startup]);
        const snapshot = next[startup];
        draftSaveTimers.current[startup] = setTimeout(() => {
          const payload = { session_id: sessionId, jury_name: juryName, startup_name: startup };
          for (const f of DRAFT_FIELDS) payload[f] = snapshot[f] ?? null;
          JuryScoreDraft.upsert(payload).catch(() => {});
        }, DRAFT_DEBOUNCE_MS);
      }
      return next;
    });
  }

  // Flush pending saves before unload (best-effort: uses fetch keepalive via Supabase client when possible)
  useEffect(() => {
    return () => {
      for (const t of Object.values(draftSaveTimers.current)) clearTimeout(t);
      draftSaveTimers.current = {};
    };
  }, []);

  async function submitFor(startup) {
    if (!juryName) return;
    const d = drafts[startup];
    if (!d) return;
    // All 6 required
    for (const f of SCORE_FIELDS) {
      if (d[f] == null) {
        toast.error(t.rateAll);
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
      // Clear the draft both locally and on the server — it's now a submitted score
      if (draftSaveTimers.current[startup]) {
        clearTimeout(draftSaveTimers.current[startup]);
        delete draftSaveTimers.current[startup];
      }
      JuryScoreDraft.deleteOne(sessionId, juryName, startup).catch(() => {});
      try {
        const key = LS_KEY(sessionId, juryName);
        const all = JSON.parse(localStorage.getItem(key) || "{}");
        delete all[startup];
        localStorage.setItem(key, JSON.stringify(all));
      } catch {
        // ignore
      }
      toast.success(t.submittedFor(startup));
      // advance to next un-submitted startup
      const currentIdx = startups.indexOf(startup);
      const nextIdx = startups.findIndex(
        (s, i) => i > currentIdx && !isSubmitted(s, scores)
      );
      setExpandedStartup(nextIdx >= 0 ? startups[nextIdx] : null);
    } catch (err) {
      console.error(err);
      toast.error(t.submitErr);
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
          <h1 className="text-xl font-semibold text-stone-800">{t.unknownTitle}</h1>
          <p className="text-sm text-stone-600">{t.unknownBody(SESSIONS.map((s) => s.id).join(", "))}</p>
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
                {getSessionLabel(session, lang)}
              </h1>
              <p className="text-xs text-stone-600">
                {getSessionDate(session, lang)} · Rotary Startup Award 2026
              </p>
            </div>
            <StatusBadge status={status} t={t} />
          </div>
          <div className="mt-3 flex justify-end">
            <LangSwitcher lang={lang} onChange={changeLang} />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Welcome / instructions — always visible but collapsible */}
        <WelcomeBlock juryAlreadyPicked={!!juryName} lang={lang} t={t} />

        {/* Session not live warnings */}
        {status === JURY_STATUS.DRAFT && (
          <Banner tone="info" title={t.bDraftT} body={t.bDraftB} />
        )}
        {status === JURY_STATUS.LOCKED && (
          <Banner tone="warn" title={t.bLockedT} body={t.bLockedB} />
        )}
        {status === JURY_STATUS.PUBLISHED && (
          <Banner tone="success" title={t.bPublishedT} body={t.bPublishedB} />
        )}

        {/* Identity picker */}
        {!juryName && (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-stone-700 uppercase tracking-wider">
              {t.whoAreYou}
            </h2>
            {jurors.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-lg p-4 text-sm text-stone-600">
                {t.noJurors}
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
            {/* Prominent identity bar — visible at the top so a juror who sees
                the wrong name can immediately switch back to the picker */}
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 shadow-sm p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {juryName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-amber-800 font-medium">
                    {t.scoringAs}
                  </div>
                  <div className="font-semibold text-stone-900 text-base sm:text-lg truncate">
                    {juryName}
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="flex-shrink-0 inline-flex flex-col sm:flex-row items-end sm:items-center gap-0 sm:gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium bg-white border border-amber-400 text-amber-800 hover:bg-amber-100 active:scale-95 transition-all"
                >
                  <span className="font-semibold">{t.wrongPersonCta}</span>
                  <span className="text-[11px] sm:text-xs text-amber-700 whitespace-nowrap">
                    {t.wrongPersonLong}
                  </span>
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-amber-200 flex items-center justify-between gap-3 text-xs">
                <span className="text-stone-600">
                  {t.progress}:{" "}
                  <strong className="text-stone-900">
                    {submittedCount}/{startups.length}
                  </strong>
                </span>
                <span className="text-stone-500 text-right truncate">{t.autoSaved}</span>
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
                  lang={lang}
                  onToggle={() => setExpandedStartup((prev) => (prev === s ? null : s))}
                  onChangeField={(field, v) => updateDraft(s, { [field]: v })}
                  onChangeComment={(v) => updateDraft(s, { comment: v })}
                  onSubmit={() => submitFor(s)}
                />
              ))}
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

function pickDraft(row) {
  const out = blankDraft();
  for (const f of DRAFT_FIELDS) if (row?.[f] != null) out[f] = row[f];
  return out;
}

function isSubmitted(startup, scores) {
  return scores.some((s) => s.startup_name === startup);
}

function LangSwitcher({ lang, onChange }) {
  return (
    <div className="inline-flex rounded-full bg-white/70 border border-stone-200 p-0.5 text-[11px]">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`px-2.5 py-0.5 rounded-full uppercase tracking-wider font-medium transition-colors ${
            lang === l ? "bg-stone-800 text-white" : "text-stone-500 hover:text-stone-800"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status, t }) {
  const map = {
    draft: { label: t.statusDraft, cls: "bg-stone-200 text-stone-700" },
    live: { label: t.statusLive, cls: "bg-emerald-100 text-emerald-800" },
    locked: { label: t.statusLocked, cls: "bg-amber-100 text-amber-800" },
    published: { label: t.statusPublished, cls: "bg-indigo-100 text-indigo-800" },
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

function WelcomeBlock({ juryAlreadyPicked, lang, t }) {
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
          <div className="font-semibold text-stone-800 text-sm sm:text-base">{t.wTitle}</div>
          <div className="text-xs text-stone-600 mt-0.5">
            {open ? t.wCollapse : t.wExpand}
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
          <p>{t.wPara1}</p>
          <p>{juryAlreadyPicked ? t.wPara2Picked : t.wPara2NotPicked}</p>

          <details className="group" open>
            <summary className="cursor-pointer select-none text-amber-800 font-medium text-xs uppercase tracking-wider py-1 hover:text-amber-900">
              {t.wCritHide}
            </summary>
            <ol className="mt-2 space-y-3">
              {CRITERIA.map((raw, i) => {
                const c = getCriterion(raw, lang);
                return (
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
                );
              })}
            </ol>
          </details>

          <p className="text-xs text-stone-500 border-t border-amber-100 pt-3">{t.wFooter}</p>
        </div>
      )}
    </div>
  );
}
