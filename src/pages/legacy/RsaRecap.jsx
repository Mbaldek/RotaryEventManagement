import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Trophy, Printer, ArrowLeft, Users, ListOrdered } from "lucide-react";
import {
  SESSION_BY_ID,
  SESSIONS,
  CRITERIA,
  weightedScore,
  JURY_STATUS,
  getSessionLabel,
  getSessionDate,
  getCriterion,
} from "@/lib/rsa/constants";
import { JuryProfile, JuryScore, SessionConfig, StartupConfirmation } from "@/lib/db";
import { buildRanking } from "@/lib/rsa/ranking";

const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#f7f4ef";
const CREAM2 = "#ede9e1";

const LS_LANG = "rsa_recap_lang";

const T = {
  fr: {
    title: "Récap session",
    subtitle: "Rotary Startup Award 2026",
    viewStartups: "Vue startups",
    viewJury: "Vue jury",
    print: "Imprimer / PDF",
    back: "Retour admin",
    loading: "Chargement…",
    notReady: "Le récap est disponible une fois la session verrouillée ou publiée.",
    statusBanner: (s) =>
      s === "live"
        ? "Session encore en direct — résultats provisoires."
        : s === "draft"
        ? "Session pas encore ouverte."
        : s === "locked"
        ? "Session verrouillée — résultats consolidés."
        : s === "published"
        ? "Résultats publiés."
        : "",
    rank: "Rang",
    startup: "Startup",
    score: "Score final",
    avg: "Moyenne",
    bonus: "Bonus",
    nJurors: "Jurés",
    note: "Commentaire admin",
    podium: "Podium",
    laureate: "Lauréat",
    finalScore: "Score final",
    juryAvg: "Moyenne jury",
    on: "sur",
    evaluations: "évaluations",
    adminBonus: "Bonus admin",
    grandeFinale: "Grande Finale",
    juror: "Juré",
    weighted: "Pondéré",
    avgRow: "Moyenne",
    nRow: "n",
    noScores: "Aucune note saisie pour cette session.",
    noStartups: "Aucune startup confirmée pour cette session.",
    noJurors: "Aucun juré validé pour cette session.",
    summaryStartups:
      "Classement final consolidé. Les notes individuelles des jurés ne sont pas affichées.",
    summaryJury:
      "Détails des notes par juré et par startup, pondérées selon les critères du concours.",
    juryDetailHeader: "Notes par juré (échelle pondérée 0–5)",
    criteriaBreakdown: "Détail par critère",
    comment: "Commentaire",
    noComment: "—",
    sessionLine: "Session",
    publishedAt: "Publié le",
    lockedAt: "Verrouillé le",
    generatedAt: "Récap généré le",
    confidential: "Document interne — Commission Paris Rotary",
  },
  en: {
    title: "Session recap",
    subtitle: "Rotary Startup Award 2026",
    viewStartups: "Startups view",
    viewJury: "Jury view",
    print: "Print / PDF",
    back: "Back to admin",
    loading: "Loading…",
    notReady: "Recap is available once the session is locked or published.",
    statusBanner: (s) =>
      s === "live"
        ? "Session still live — provisional results."
        : s === "draft"
        ? "Session not yet opened."
        : s === "locked"
        ? "Session locked — consolidated results."
        : s === "published"
        ? "Results published."
        : "",
    rank: "Rank",
    startup: "Startup",
    score: "Final score",
    avg: "Average",
    bonus: "Bonus",
    nJurors: "Jurors",
    note: "Admin note",
    podium: "Podium",
    laureate: "Laureate",
    finalScore: "Final score",
    juryAvg: "Jury average",
    on: "across",
    evaluations: "evaluations",
    adminBonus: "Admin bonus",
    grandeFinale: "Grand Final",
    juror: "Juror",
    weighted: "Weighted",
    avgRow: "Average",
    nRow: "n",
    noScores: "No scores submitted for this session.",
    noStartups: "No startup confirmed for this session.",
    noJurors: "No validated juror for this session.",
    summaryStartups:
      "Consolidated final ranking. Individual juror scores are not shown.",
    summaryJury:
      "Per-juror, per-startup weighted scores using the competition criteria.",
    juryDetailHeader: "Scores per juror (weighted 0–5 scale)",
    criteriaBreakdown: "Per-criterion breakdown",
    comment: "Comment",
    noComment: "—",
    sessionLine: "Session",
    publishedAt: "Published on",
    lockedAt: "Locked on",
    generatedAt: "Recap generated on",
    confidential: "Internal document — Paris Rotary Commission",
  },
  de: {
    title: "Session-Zusammenfassung",
    subtitle: "Rotary Startup Award 2026",
    viewStartups: "Startup-Ansicht",
    viewJury: "Jury-Ansicht",
    print: "Drucken / PDF",
    back: "Zurück zur Admin",
    loading: "Lädt…",
    notReady:
      "Die Zusammenfassung ist verfügbar, sobald die Session gesperrt oder veröffentlicht ist.",
    statusBanner: (s) =>
      s === "live"
        ? "Session noch live — vorläufige Ergebnisse."
        : s === "draft"
        ? "Session noch nicht geöffnet."
        : s === "locked"
        ? "Session gesperrt — konsolidierte Ergebnisse."
        : s === "published"
        ? "Ergebnisse veröffentlicht."
        : "",
    rank: "Rang",
    startup: "Startup",
    score: "Endpunktzahl",
    avg: "Durchschnitt",
    bonus: "Bonus",
    nJurors: "Juroren",
    note: "Admin-Notiz",
    podium: "Podium",
    laureate: "Preisträger",
    finalScore: "Endpunktzahl",
    juryAvg: "Jury-Durchschnitt",
    on: "über",
    evaluations: "Bewertungen",
    adminBonus: "Admin-Bonus",
    grandeFinale: "Großes Finale",
    juror: "Juror",
    weighted: "Gewichtet",
    avgRow: "Durchschnitt",
    nRow: "n",
    noScores: "Keine Bewertungen für diese Session abgegeben.",
    noStartups: "Keine Startup für diese Session bestätigt.",
    noJurors: "Kein validierter Juror für diese Session.",
    summaryStartups:
      "Konsolidiertes Endklassement. Einzelne Jurorenbewertungen werden nicht angezeigt.",
    summaryJury:
      "Bewertungen pro Juror und Startup, gewichtet nach den Wettbewerbskriterien.",
    juryDetailHeader: "Bewertungen pro Juror (gewichtete Skala 0–5)",
    criteriaBreakdown: "Aufschlüsselung pro Kriterium",
    comment: "Kommentar",
    noComment: "—",
    sessionLine: "Session",
    publishedAt: "Veröffentlicht am",
    lockedAt: "Gesperrt am",
    generatedAt: "Zusammenfassung erstellt am",
    confidential: "Internes Dokument — Pariser Rotary-Kommission",
  },
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');
*{box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:${CREAM}}
.recap-root{font-family:'Inter',sans-serif;background:${CREAM};min-height:100vh;color:${NAVY}}
.recap-card{background:white;border:1px solid ${CREAM2};border-radius:12px}
.recap-h1{font-family:'Playfair Display',serif;font-weight:600;color:${NAVY}}
.recap-pill{display:inline-flex;align-items:center;gap:5px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;padding:3px 10px;border-radius:999px;font-weight:600;border:1px solid}
.recap-btn{font-family:'Inter',sans-serif;cursor:pointer;transition:all .15s;border:none}
.recap-btn:hover{filter:brightness(.95)}
.recap-btn:active{transform:scale(.98)}
.recap-th{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6a6a8a}
.recap-td{font-size:13px;color:${NAVY}}
.recap-toolbar{position:sticky;top:0;z-index:30;background:${NAVY};padding:10px 22px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-bottom:1px solid rgba(201,168,76,.18)}
.lb{font-family:'Inter',sans-serif;cursor:pointer;font-size:10.5px;font-weight:500;padding:4px 10px;border-radius:7px;border:1px solid;letter-spacing:.05em;transition:all .15s;text-transform:uppercase}
.tab-btn{font-size:11.5px;padding:7px 14px;border-radius:8px;font-weight:500;border:1px solid;letter-spacing:.04em;text-transform:uppercase}
.print-btn{font-size:11.5px;padding:7px 14px;border-radius:8px;background:${GOLD};color:${NAVY};font-weight:600;display:inline-flex;align-items:center;gap:6px}
.back-btn{font-size:11px;color:rgba(255,255,255,.55);text-decoration:none;display:inline-flex;align-items:center;gap:4px}
.back-btn:hover{color:white}
@media (max-width:720px){
  .recap-toolbar{padding:9px 12px;gap:8px}
  .tab-btn{font-size:10.5px;padding:6px 10px}
  .print-btn{font-size:10.5px;padding:6px 10px}
  .recap-grid{font-size:11px !important}
  .recap-grid th,.recap-grid td{padding:6px 4px !important}
  .laureate-name{font-size:28px !important}
}
@media print {
  .no-print{display:none !important}
  .recap-root{background:white !important;min-height:0 !important}
  .recap-card{border:1px solid #d0d0d0 !important;box-shadow:none !important;break-inside:avoid;page-break-inside:avoid}
  .recap-toolbar{display:none !important}
  body{background:white !important}
  .recap-section{page-break-inside:auto}
  table{font-size:11px !important}
  th,td{padding:5px 6px !important}
}
`;

function fmtDate(iso, lang) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(lang === "fr" ? "fr-FR" : lang === "de" ? "de-DE" : "en-GB");
}

function fullName(j) {
  return `${j.prenom || ""} ${j.nom || ""}`.trim();
}

export default function RsaRecap() {
  const [params, setParams] = useSearchParams();
  const sessionId = params.get("s") || SESSIONS[0].id;
  const initialView = params.get("view") === "jury" ? "jury" : "startups";

  const session = SESSION_BY_ID[sessionId] || SESSIONS[0];

  const [view, setView] = useState(initialView);
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_LANG);
      if (saved && T[saved]) return saved;
    } catch {}
    const nav = (typeof navigator !== "undefined" && navigator.language) || "fr";
    const code = nav.slice(0, 2).toLowerCase();
    return T[code] ? code : "fr";
  });
  const t = T[lang];

  useEffect(() => {
    try {
      localStorage.setItem(LS_LANG, lang);
    } catch {}
  }, [lang]);

  // Keep ?view= in sync (so the link stays shareable)
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (next.get("view") !== view) {
      next.set("view", view);
      setParams(next, { replace: true });
    }
     
  }, [view]);

  const [loading, setLoading] = useState(true);
  const [sessionRow, setSessionRow] = useState(null);
  const [scores, setScores] = useState([]);
  const [jurors, setJurors] = useState([]);
  const [startupNames, setStartupNames] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [cfgList, sc, allJury, startupRows] = await Promise.all([
          SessionConfig.filter({ session_id: sessionId }),
          JuryScore.filter({ session_id: sessionId }),
          JuryProfile.list("nom"),
          StartupConfirmation.filter({ session_id: sessionId }),
        ]);
        if (cancelled) return;
        const cfgRow = cfgList[0] ?? null;
        setSessionRow(cfgRow);
        setScores(sc || []);
        const validated = (allJury || []).filter((j) => {
          if (!j.validated) return false;
          if (session.isFinal) return j.grande_finale === true;
          const a = j.assigned_sessions || [];
          return a.includes(session.label) || a.includes(session.id);
        });
        setJurors(validated);
        const order = cfgRow?.session_order;
        const ordered =
          Array.isArray(order) && order.length > 0
            ? order
            : (startupRows || [])
                .map((s) => s.startup_name)
                .sort((a, b) => a.localeCompare(b));
        setStartupNames(ordered);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, session.label, session.id, session.isFinal]);

  const status = sessionRow?.status || JURY_STATUS.DRAFT;
  const overrides = sessionRow?.admin_overrides || {};
  const ranked = useMemo(() => buildRanking(scores, overrides), [scores, overrides]);

  // (jury_name, startup_name) → score row
  const byCell = useMemo(() => {
    const m = new Map();
    for (const r of scores) m.set(`${r.jury_name}::${r.startup_name}`, r);
    return m;
  }, [scores]);

  const podium = ranked.filter((r) => r.final_rank <= 3);
  const winner = podium.find((r) => r.final_rank === 1);

  if (loading) {
    return (
      <div className="recap-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <style>{css}</style>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
        <span style={{ marginLeft: 8, color: "#6a6a8a", fontSize: 13 }}>{t.loading}</span>
      </div>
    );
  }

  return (
    <div className="recap-root">
      <style>{css}</style>

      {/* Toolbar (hidden on print) */}
      <div className="recap-toolbar no-print">
        <a href="/RsaAdmin" className="back-btn">
          <ArrowLeft className="w-3.5 h-3.5" /> {t.back}
        </a>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4 }}>
          {["fr", "en", "de"].map((l) => {
            const on = lang === l;
            return (
              <button
                key={l}
                className="lb"
                onClick={() => setLang(l)}
                style={{
                  background: on ? GOLD : "transparent",
                  color: on ? NAVY : "rgba(255,255,255,.55)",
                  borderColor: on ? GOLD : "rgba(255,255,255,.2)",
                }}
              >
                {l}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="recap-btn tab-btn"
            onClick={() => setView("startups")}
            style={{
              background: view === "startups" ? GOLD : "transparent",
              color: view === "startups" ? NAVY : "rgba(255,255,255,.65)",
              borderColor: view === "startups" ? GOLD : "rgba(255,255,255,.22)",
            }}
          >
            <ListOrdered className="w-3.5 h-3.5" style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} />
            {t.viewStartups}
          </button>
          <button
            className="recap-btn tab-btn"
            onClick={() => setView("jury")}
            style={{
              background: view === "jury" ? GOLD : "transparent",
              color: view === "jury" ? NAVY : "rgba(255,255,255,.65)",
              borderColor: view === "jury" ? GOLD : "rgba(255,255,255,.22)",
            }}
          >
            <Users className="w-3.5 h-3.5" style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} />
            {t.viewJury}
          </button>
        </div>
        <button
          className="recap-btn print-btn"
          onClick={() => window.print()}
          title={t.print}
        >
          <Printer className="w-3.5 h-3.5" /> {t.print}
        </button>
      </div>

      {/* Page */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "22px 22px 60px" }}>
        {/* Header card */}
        <div
          className="recap-card recap-section"
          style={{
            padding: "18px 22px",
            marginBottom: 16,
            background: session.light,
            borderColor: session.border,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 38, lineHeight: 1 }}>{session.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10.5, color: "#6a6a8a", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600 }}>
                {t.subtitle} · {t.title}
              </div>
              <div className="recap-h1" style={{ fontSize: 24, marginTop: 2 }}>
                {getSessionLabel(session, lang)}
              </div>
              <div style={{ fontSize: 12, color: "#6a6a8a", marginTop: 3 }}>
                {getSessionDate(session, lang)}
              </div>
            </div>
            <StatusBadge status={status} />
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 11.5,
              color: "#6a6a8a",
              borderTop: "1px solid rgba(15,31,61,.08)",
              paddingTop: 8,
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <span>{t.statusBanner(status)}</span>
            {sessionRow?.locked_at && (
              <span>
                {t.lockedAt} <strong>{fmtDate(sessionRow.locked_at, lang)}</strong>
              </span>
            )}
            {sessionRow?.published_at && (
              <span>
                {t.publishedAt} <strong>{fmtDate(sessionRow.published_at, lang)}</strong>
              </span>
            )}
            <span style={{ marginLeft: "auto" }}>
              {t.generatedAt} <strong>{new Date().toLocaleString(lang === "fr" ? "fr-FR" : lang === "de" ? "de-DE" : "en-GB")}</strong>
            </span>
          </div>
        </div>

        {/* Not-ready banner: scoring still draft/live */}
        {(status === JURY_STATUS.DRAFT || status === JURY_STATUS.LIVE) && (
          <div
            className="recap-card no-print"
            style={{
              padding: "14px 18px",
              marginBottom: 16,
              background: "#fff8e1",
              borderColor: "#f0d780",
              color: "#7a5a00",
              fontSize: 12.5,
            }}
          >
            ⚠ {t.notReady}
          </div>
        )}

        {ranked.length === 0 && (
          <div className="recap-card" style={{ padding: 22, textAlign: "center", color: "#9a9aa8", fontStyle: "italic" }}>
            {t.noScores}
          </div>
        )}

        {/* STARTUP VIEW */}
        {ranked.length > 0 && view === "startups" && (
          <StartupsView
            t={t}
            session={session}
            ranked={ranked}
            podium={podium}
            winner={winner}
            lang={lang}
          />
        )}

        {/* JURY VIEW */}
        {ranked.length > 0 && view === "jury" && (
          <JuryView
            t={t}
            session={session}
            jurors={jurors}
            startups={startupNames}
            byCell={byCell}
            ranked={ranked}
            lang={lang}
          />
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 28,
            textAlign: "center",
            fontSize: 10,
            color: "#a0a0b8",
            letterSpacing: ".06em",
          }}
        >
          {t.confidential}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft: { lbl: "DRAFT", bg: "#e6e6ee", fg: "#6a6a8a", bd: "#d0d0dc" },
    live: { lbl: "● LIVE", bg: "#dff5e6", fg: "#1d6b4f", bd: "#b0d8c4" },
    locked: { lbl: "LOCKED", bg: "#fff1d0", fg: "#9a6400", bd: "#f0d780" },
    published: { lbl: "PUBLISHED", bg: "#e4dfff", fg: "#4a2a7a", bd: "#c8b0e8" },
  };
  const m = map[status] || map.draft;
  return (
    <span
      className="recap-pill"
      style={{ background: m.bg, color: m.fg, borderColor: m.bd }}
    >
      {m.lbl}
    </span>
  );
}

function StartupsView({ t, session, ranked, podium, winner, lang }) {
  return (
    <div className="recap-section" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Laureate hero */}
      {winner && (
        <div
          className="recap-card"
          style={{
            padding: "22px 26px",
            background: "linear-gradient(135deg,#fdf6e8 0%,#fbeec1 50%,#fdf6e8 100%)",
            borderColor: "#c9a84c",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -30,
              right: -20,
              fontSize: 180,
              opacity: 0.08,
              lineHeight: 1,
            }}
          >
            🏆
          </div>
          <div style={{ position: "relative" }}>
            <div
              style={{
                fontSize: 10,
                color: "#9a6400",
                letterSpacing: ".18em",
                textTransform: "uppercase",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {session.isFinal ? t.grandeFinale + " — " : ""}{t.laureate}
            </div>
            <h2 className="recap-h1 laureate-name" style={{ fontSize: 38, lineHeight: 1.1 }}>
              {winner.startup}
            </h2>
            <div style={{ marginTop: 8, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "#5a5a7a" }}>
              <span>
                {t.finalScore}{" "}
                <strong style={{ color: "#9a6400" }}>{winner.final_score.toFixed(2)}/5</strong>
              </span>
              <span>·</span>
              <span>
                {t.juryAvg} <strong>{winner.avg.toFixed(2)}</strong> {t.on} {winner.n} {t.evaluations}
              </span>
              {winner.bonus > 0 && (
                <>
                  <span>·</span>
                  <span>
                    {t.adminBonus} <strong>+{winner.bonus}</strong>
                  </span>
                </>
              )}
            </div>
            {winner.note && (
              <p
                style={{
                  marginTop: 10,
                  fontStyle: "italic",
                  fontFamily: "'Playfair Display',serif",
                  color: "#3a3a52",
                  fontSize: 14,
                }}
              >
                « {winner.note} »
              </p>
            )}
          </div>
        </div>
      )}

      {/* Podium */}
      {podium.length > 0 && (
        <div className="recap-card" style={{ padding: "16px 18px" }}>
          <div className="recap-th" style={{ marginBottom: 10 }}>{t.podium}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {podium.map((r) => {
              const medal =
                r.final_rank === 1 ? "#c9a84c" : r.final_rank === 2 ? "#9090a8" : "#a87a4a";
              return (
                <div
                  key={r.startup}
                  style={{
                    flex: "1 1 200px",
                    border: `1.5px solid ${medal}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    background: r.final_rank === 1 ? "#fdf6e8" : "white",
                    minWidth: 180,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Trophy style={{ width: 14, height: 14, color: medal }} />
                    <span style={{ fontSize: 11, color: medal, fontWeight: 600, letterSpacing: ".08em" }}>
                      #{r.final_rank}
                    </span>
                  </div>
                  <div className="recap-h1" style={{ fontSize: 17 }}>
                    {r.startup}
                  </div>
                  <div style={{ fontSize: 12, color: "#6a6a8a", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
                    {r.final_score.toFixed(2)} / 5 · {r.n} {t.nJurors.toLowerCase()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full ranking */}
      <div className="recap-card recap-section" style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${CREAM2}` }}>
          <div className="recap-th">{t.summaryStartups}</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="recap-grid" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: CREAM, borderBottom: `1px solid ${CREAM2}` }}>
                <th className="recap-th" style={{ textAlign: "left", padding: "10px 14px", width: 70 }}>
                  {t.rank}
                </th>
                <th className="recap-th" style={{ textAlign: "left", padding: "10px 14px" }}>
                  {t.startup}
                </th>
                <th className="recap-th" style={{ textAlign: "right", padding: "10px 14px", width: 90 }}>
                  {t.avg}
                </th>
                <th className="recap-th" style={{ textAlign: "right", padding: "10px 14px", width: 80 }}>
                  {t.bonus}
                </th>
                <th className="recap-th" style={{ textAlign: "right", padding: "10px 14px", width: 100 }}>
                  {t.score}
                </th>
                <th className="recap-th" style={{ textAlign: "center", padding: "10px 14px", width: 70 }}>
                  {t.nJurors}
                </th>
                <th className="recap-th" style={{ textAlign: "left", padding: "10px 14px" }}>
                  {t.note}
                </th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => (
                <tr
                  key={r.startup}
                  style={{
                    borderBottom: `1px solid ${CREAM2}`,
                    background: i % 2 === 1 ? CREAM : "white",
                  }}
                >
                  <td className="recap-td" style={{ padding: "9px 14px", fontWeight: 700 }}>
                    #{r.final_rank}
                  </td>
                  <td className="recap-td" style={{ padding: "9px 14px", fontWeight: 500 }}>
                    {r.startup}
                  </td>
                  <td className="recap-td" style={{ padding: "9px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {r.avg != null ? r.avg.toFixed(2) : "—"}
                  </td>
                  <td className="recap-td" style={{ padding: "9px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.bonus !== 0 ? "#9a6400" : "#9090a8" }}>
                    {r.bonus !== 0 ? (r.bonus > 0 ? "+" : "") + r.bonus.toFixed(1) : "—"}
                  </td>
                  <td
                    className="recap-td"
                    style={{
                      padding: "9px 14px",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 700,
                      color: "#9a6400",
                    }}
                  >
                    {r.final_score.toFixed(2)}
                  </td>
                  <td className="recap-td" style={{ padding: "9px 14px", textAlign: "center", color: "#6a6a8a", fontSize: 11.5 }}>
                    {r.n}
                  </td>
                  <td className="recap-td" style={{ padding: "9px 14px", color: "#6a6a8a", fontSize: 11.5, fontStyle: r.note ? "italic" : "normal" }}>
                    {r.note || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function JuryView({ t, session, jurors, startups, byCell, ranked, lang }) {
  // Map startup → ranking row for quick lookup
  const rankByStartup = useMemo(() => {
    const m = new Map();
    for (const r of ranked) m.set(r.startup, r);
    return m;
  }, [ranked]);

  // Sort startups by final ranking, fallback to original startups order
  const orderedStartups = useMemo(() => {
    const known = new Set(ranked.map((r) => r.startup));
    const ordered = [...ranked].sort((a, b) => a.final_rank - b.final_rank).map((r) => r.startup);
    const extras = startups.filter((s) => !known.has(s));
    return [...ordered, ...extras];
  }, [ranked, startups]);

  if (jurors.length === 0) {
    return (
      <div className="recap-card" style={{ padding: 22, textAlign: "center", color: "#9a9aa8", fontStyle: "italic" }}>
        {t.noJurors}
      </div>
    );
  }

  return (
    <div className="recap-section" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="recap-card" style={{ padding: "12px 18px" }}>
        <div className="recap-th">{t.summaryJury}</div>
        <p style={{ fontSize: 12, color: "#6a6a8a", marginTop: 6 }}>
          {t.juryDetailHeader}
        </p>
      </div>

      {/* Grand grid: jurors columns × startups rows */}
      <div className="recap-card recap-section" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="recap-grid" style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr style={{ background: CREAM, borderBottom: `1px solid ${CREAM2}` }}>
                <th className="recap-th" style={{ textAlign: "left", padding: "10px 12px", position: "sticky", left: 0, background: CREAM, minWidth: 180 }}>
                  {t.startup}
                </th>
                {jurors.map((j) => (
                  <th
                    key={j.id}
                    className="recap-th"
                    style={{ textAlign: "center", padding: "10px 8px", minWidth: 70 }}
                    title={j.qualite || ""}
                  >
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 11.5, fontWeight: 600, color: NAVY }}>
                      {j.prenom}
                    </div>
                    <div style={{ fontSize: 9.5, color: "#9090a8", fontWeight: 400 }}>
                      {j.nom}
                    </div>
                  </th>
                ))}
                <th
                  className="recap-th"
                  style={{ textAlign: "center", padding: "10px 12px", background: "#fdf6e8", color: "#9a6400", borderLeft: `1px solid ${CREAM2}` }}
                >
                  {t.avgRow}
                </th>
                <th
                  className="recap-th"
                  style={{ textAlign: "center", padding: "10px 12px", background: CREAM }}
                >
                  {t.nRow}
                </th>
                <th
                  className="recap-th"
                  style={{ textAlign: "center", padding: "10px 12px", background: "#fdf6e8", color: "#9a6400", borderLeft: `1px solid ${CREAM2}` }}
                >
                  {t.score}
                </th>
                <th
                  className="recap-th"
                  style={{ textAlign: "center", padding: "10px 12px", background: CREAM, width: 70 }}
                >
                  {t.rank}
                </th>
              </tr>
            </thead>
            <tbody>
              {orderedStartups.map((s, i) => {
                const rk = rankByStartup.get(s);
                return (
                  <tr
                    key={s}
                    style={{
                      borderBottom: `1px solid ${CREAM2}`,
                      background: i % 2 === 1 ? CREAM : "white",
                    }}
                  >
                    <td className="recap-td" style={{ padding: "8px 12px", fontWeight: 500, position: "sticky", left: 0, background: i % 2 === 1 ? CREAM : "white" }}>
                      {s}
                    </td>
                    {jurors.map((j) => {
                      const row = byCell.get(`${fullName(j)}::${s}`);
                      const w = row ? weightedScore(row) : null;
                      return (
                        <td
                          key={j.id}
                          className="recap-td"
                          style={{
                            padding: "8px 8px",
                            textAlign: "center",
                            fontVariantNumeric: "tabular-nums",
                            color: w == null ? "#c8c8d4" : NAVY,
                            fontWeight: w != null ? 500 : 400,
                          }}
                          title={row?.comment || ""}
                        >
                          {w != null ? w.toFixed(2) : "—"}
                        </td>
                      );
                    })}
                    <td
                      className="recap-td"
                      style={{
                        padding: "8px 12px",
                        textAlign: "center",
                        background: "#fdf6e8",
                        color: "#9a6400",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        borderLeft: `1px solid ${CREAM2}`,
                      }}
                    >
                      {rk?.avg != null ? rk.avg.toFixed(2) : "—"}
                    </td>
                    <td
                      className="recap-td"
                      style={{
                        padding: "8px 12px",
                        textAlign: "center",
                        color: "#6a6a8a",
                        fontSize: 11,
                      }}
                    >
                      {rk?.n ?? 0}
                    </td>
                    <td
                      className="recap-td"
                      style={{
                        padding: "8px 12px",
                        textAlign: "center",
                        background: "#fdf6e8",
                        color: "#9a6400",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        borderLeft: `1px solid ${CREAM2}`,
                      }}
                    >
                      {rk ? rk.final_score.toFixed(2) : "—"}
                    </td>
                    <td
                      className="recap-td"
                      style={{
                        padding: "8px 12px",
                        textAlign: "center",
                        color: rk ? NAVY : "#c8c8d4",
                        fontWeight: 700,
                      }}
                    >
                      {rk ? `#${rk.final_rank}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-startup criteria breakdown (compact, prints across pages) */}
      <CriteriaBreakdown
        t={t}
        jurors={jurors}
        startups={orderedStartups}
        byCell={byCell}
        rankByStartup={rankByStartup}
        lang={lang}
      />
    </div>
  );
}

function CriteriaBreakdown({ t, jurors, startups, byCell, rankByStartup, lang }) {
  // For each startup → for each criterion → average across jurors who scored
  return (
    <div className="recap-card recap-section">
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${CREAM2}` }}>
        <div className="recap-th">{t.criteriaBreakdown}</div>
      </div>
      <div style={{ padding: "10px 18px 14px" }}>
        {startups.map((s) => {
          const rk = rankByStartup.get(s);
          const perCriterion = CRITERIA.map((c) => {
            const localized = getCriterion(c, lang);
            const vs = jurors
              .map((j) => byCell.get(`${fullName(j)}::${s}`)?.[c.id])
              .filter((v) => v != null);
            const avg = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
            return { id: c.id, label: localized.label, weight: c.weight, avg, n: vs.length };
          });
          // jury comments
          const comments = jurors
            .map((j) => {
              const row = byCell.get(`${fullName(j)}::${s}`);
              if (!row?.comment) return null;
              return { jury: fullName(j), comment: row.comment };
            })
            .filter(Boolean);
          return (
            <div
              key={s}
              style={{
                padding: "12px 0",
                borderBottom: `1px dashed ${CREAM2}`,
                breakInside: "avoid",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 600, color: NAVY }}>
                  {rk ? `#${rk.final_rank} ` : ""}{s}
                </span>
                {rk && (
                  <span style={{ fontSize: 11.5, color: "#9a6400", fontWeight: 600 }}>
                    {rk.final_score.toFixed(2)}/5
                  </span>
                )}
                {rk && (
                  <span style={{ fontSize: 11, color: "#9090a8" }}>
                    · {rk.n} {t.nJurors.toLowerCase()}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                  gap: 6,
                  marginBottom: comments.length ? 8 : 0,
                }}
              >
                {perCriterion.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: CREAM,
                      borderRadius: 7,
                      padding: "6px 10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11.5,
                      gap: 8,
                    }}
                  >
                    <span style={{ color: "#6a6a8a" }}>
                      {c.label}{" "}
                      <span style={{ color: "#a8a8c0", fontSize: 9.5 }}>
                        · {Math.round(c.weight * 100)}%
                      </span>
                    </span>
                    <span style={{ fontWeight: 700, color: NAVY, fontVariantNumeric: "tabular-nums" }}>
                      {c.avg != null ? c.avg.toFixed(2) : "—"}
                    </span>
                  </div>
                ))}
              </div>
              {comments.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {comments.map((c, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: 11,
                        color: "#5a5a7a",
                        marginTop: 3,
                        paddingLeft: 8,
                        borderLeft: `2px solid ${GOLD}`,
                      }}
                    >
                      <strong style={{ color: NAVY }}>{c.jury}</strong> — <em>{c.comment}</em>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
