import React, { useEffect, useMemo, useState } from "react";
import {
  SESSION_BY_ID,
  FINAL_SESSION_ID,
  CRITERIA,
  JURY_STATUS,
  getSessionLabel,
  getSessionDate,
  getCriterion,
} from "@/lib/rsa/constants";
import { JuryScore, SessionConfig } from "@/lib/db";
import { buildRanking } from "@/lib/rsa/ranking";

// Public, share-with-everyone reveal of the Grande Finale results — same read-only,
// live "rsaview" chrome as RsaJuryView, but showing the final scoring instead of the
// jury allocation. Unlike RsaRecap (internal/confidential printable), this page is
// celebratory and meant to be sent to anyone.

const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#f7f4ef";
const CREAM2 = "#ede9e1";

const session = SESSION_BY_ID[FINAL_SESSION_ID];

const LS_LANG = "rsa_finale_results_lang";

const T = {
  fr: {
    navTitle: "Rotary Startup Award 2026 — Grande Finale",
    navSub: "Palmarès officiel · Mise à jour en direct",
    live: "EN DIRECT",
    subtitle: "Rotary Startup Award 2026",
    title: "Palmarès de la Grande Finale",
    venueNote: "Cocktail dînatoire à l'issue, ouvert à tous",
    share: "Partager",
    linkCopied: "Lien copié dans le presse-papiers",
    loading: "Chargement…",
    awaitingTitle: "Résultats en attente",
    awaitingBody:
      "Le palmarès s'affichera ici dès que le jury aura rendu son verdict. Cette page se met à jour automatiquement — gardez-la ouverte.",
    provisional:
      "Délibération en cours — classement provisoire, susceptible d'évoluer.",
    official: "Résultats officiels et définitifs.",
    laureateLabel: "Lauréat — Grande Finale",
    finalScore: "Score final",
    juryAvg: "Moyenne jury",
    on: "sur",
    evaluations: "évaluations",
    podium: "Le podium",
    fullRanking: "Classement complet",
    rank: "Rang",
    startup: "Startup",
    avg: "Moy. jury",
    score: "Score final",
    nJurors: "Jurés",
    juror: "juré",
    jurors: "jurés",
    methodTitle: "Critères d'évaluation",
    methodIntro:
      "Chaque startup est notée de 0 à 5 sur six critères pondérés. Le score final est la moyenne des notes du jury (sur 5).",
    weight: "Pondération",
    publishedAt: "Publié le",
    footerLine: "Rotary Startup Award 2026 · Commission Paris",
    lastUpdate: (t) => `Dernière mise à jour : ${t}`,
  },
  en: {
    navTitle: "Rotary Startup Award 2026 — Grand Final",
    navSub: "Official results · Live updates",
    live: "LIVE",
    subtitle: "Rotary Startup Award 2026",
    title: "Grand Final Results",
    venueNote: "Cocktail reception afterwards, open to all",
    share: "Share",
    linkCopied: "Link copied to clipboard",
    loading: "Loading…",
    awaitingTitle: "Results awaited",
    awaitingBody:
      "The results will appear here as soon as the jury reaches its verdict. This page updates automatically — keep it open.",
    provisional:
      "Deliberation in progress — provisional ranking, subject to change.",
    official: "Official and final results.",
    laureateLabel: "Laureate — Grand Final",
    finalScore: "Final score",
    juryAvg: "Jury average",
    on: "across",
    evaluations: "evaluations",
    podium: "The podium",
    fullRanking: "Full ranking",
    rank: "Rank",
    startup: "Startup",
    avg: "Jury avg",
    score: "Final score",
    nJurors: "Jurors",
    juror: "juror",
    jurors: "jurors",
    methodTitle: "Scoring criteria",
    methodIntro:
      "Each startup is scored 0–5 on six weighted criteria. The final score is the jury's average (out of 5).",
    weight: "Weight",
    publishedAt: "Published on",
    footerLine: "Rotary Startup Award 2026 · Paris Commission",
    lastUpdate: (t) => `Last update: ${t}`,
  },
  de: {
    navTitle: "Rotary Startup Award 2026 — Großes Finale",
    navSub: "Offizielles Ergebnis · Live-Aktualisierung",
    live: "LIVE",
    subtitle: "Rotary Startup Award 2026",
    title: "Ergebnisse des Großen Finales",
    venueNote: "Anschließend Cocktailempfang, für alle offen",
    share: "Teilen",
    linkCopied: "Link in die Zwischenablage kopiert",
    loading: "Lädt…",
    awaitingTitle: "Ergebnisse ausstehend",
    awaitingBody:
      "Die Ergebnisse erscheinen hier, sobald die Jury ihr Urteil gefällt hat. Diese Seite aktualisiert sich automatisch — lassen Sie sie geöffnet.",
    provisional:
      "Beratung läuft — vorläufiges Klassement, Änderungen möglich.",
    official: "Offizielles und endgültiges Ergebnis.",
    laureateLabel: "Preisträger — Großes Finale",
    finalScore: "Endpunktzahl",
    juryAvg: "Jury-Durchschnitt",
    on: "über",
    evaluations: "Bewertungen",
    podium: "Das Podium",
    fullRanking: "Gesamtklassement",
    rank: "Rang",
    startup: "Startup",
    avg: "Jury-Ø",
    score: "Endpunktzahl",
    nJurors: "Juroren",
    juror: "Juror",
    jurors: "Juroren",
    methodTitle: "Bewertungskriterien",
    methodIntro:
      "Jedes Startup wird auf einer Skala von 0–5 anhand von sechs gewichteten Kriterien bewertet. Die Endpunktzahl ist der Durchschnitt der Jury (von 5).",
    weight: "Gewichtung",
    publishedAt: "Veröffentlicht am",
    footerLine: "Rotary Startup Award 2026 · Pariser Kommission",
    lastUpdate: (t) => `Letzte Aktualisierung: ${t}`,
  },
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulseDot{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:${CREAM};min-height:100vh}
.fade{animation:fadeUp .32s ease both}
.card{background:white;border:1px solid rgba(15,31,61,.08);border-radius:14px}
.btn{font-family:'Inter',sans-serif;cursor:pointer;transition:all .15s}
.btn:hover{filter:brightness(.92)}
.btn:active{transform:scale(.97)}
.live-dot{width:7px;height:7px;border-radius:50%;background:#1d6b4f;animation:pulseDot 1.6s ease-in-out infinite;display:inline-block}
.lb{font-family:'Inter',sans-serif;cursor:pointer;font-size:10.5px;font-weight:500;padding:4px 10px;border-radius:7px;border:1px solid;letter-spacing:.05em;transition:all .15s;text-transform:uppercase}
.h-serif{font-family:'Playfair Display',serif}
.rk-th{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6a6a8a}
.rk-td{font-size:13px;color:${NAVY}}
@media (max-width:768px){
  .nav-row{padding:0 12px !important;height:52px !important;gap:8px !important}
  .nav-title{font-size:12px !important}
  .nav-sub{font-size:8.5px !important}
  .nav-actions{gap:6px !important}
  .lb{padding:3px 7px !important;font-size:9.5px !important}
  .main-pad{padding:14px !important}
  .laureate-name{font-size:30px !important}
  .rk-grid th,.rk-grid td{padding:8px 8px !important}
  .footer-pad{padding:1.2rem 1rem !important}
  .share-label{display:none !important}
}
@media (max-width:480px){
  .nav-sub{display:none !important}
  .live-label{display:none !important}
  .laureate-name{font-size:26px !important}
}
`;

function fmtDate(iso, lang) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(
    lang === "fr" ? "fr-FR" : lang === "de" ? "de-DE" : "en-GB"
  );
}

// Normalise either a live buildRanking() row or a published final_ranking snapshot
// row into one shape: { startup, avg, n, bonus, final_score, final_rank, note }.
function normalizeSnapshot(snap) {
  return (snap || [])
    .map((r) => ({
      startup: r.startup_name,
      avg: r.avg,
      n: r.juror_count ?? 0,
      bonus: r.bonus ?? 0,
      final_score: r.final_score,
      final_rank: r.final_rank,
      note: r.note || "",
    }))
    .sort((a, b) => a.final_rank - b.final_rank);
}

export default function RsaFinaleResults() {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_LANG);
      if (saved && T[saved]) return saved;
    } catch {}
    const nav = ((typeof navigator !== "undefined" && navigator.language) || "fr")
      .slice(0, 2)
      .toLowerCase();
    return T[nav] ? nav : "fr";
  });
  const t = T[lang];
  useEffect(() => {
    try {
      localStorage.setItem(LS_LANG, lang);
    } catch {}
  }, [lang]);

  const [loading, setLoading] = useState(true);
  const [sessionRow, setSessionRow] = useState(null);
  const [scores, setScores] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [cfg, sc] = await Promise.all([
          SessionConfig.filter({ session_id: FINAL_SESSION_ID }),
          JuryScore.filter({ session_id: FINAL_SESSION_ID }),
        ]);
        if (cancelled) return;
        setSessionRow(cfg[0] ?? null);
        setScores(sc || []);
        setLastUpdate(new Date());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    // Live: refresh when finale scores or the finale config row changes.
    const unsubScores = JuryScore.subscribe((evt) => {
      if (!evt.data || evt.data.session_id === FINAL_SESSION_ID) load();
    });
    const unsubCfg = SessionConfig.subscribe((evt) => {
      if (!evt.data || evt.data.session_id === FINAL_SESSION_ID) load();
    });
    return () => {
      cancelled = true;
      unsubScores?.();
      unsubCfg?.();
    };
  }, []);

  const status = sessionRow?.status || JURY_STATUS.DRAFT;
  const published = status === JURY_STATUS.PUBLISHED;
  const overrides = sessionRow?.admin_overrides || {};
  const snapshot = sessionRow?.final_ranking;

  // Prefer the frozen, published snapshot; otherwise compute live from raw scores.
  const ranked = useMemo(() => {
    if (published && Array.isArray(snapshot) && snapshot.length > 0) {
      return normalizeSnapshot(snapshot);
    }
    return buildRanking(scores, overrides);
  }, [published, snapshot, scores, overrides]);

  const winner = ranked.find((r) => r.final_rank === 1) || null;
  const podium = ranked.filter((r) => r.final_rank <= 3);
  const totalJurors = useMemo(
    () => new Set(scores.map((s) => s.jury_name)).size,
    [scores]
  );

  function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: t.title, url }).catch(() => {});
      return;
    }
    try {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {}
  }

  return (
    <div style={{ fontFamily: "Inter,sans-serif", background: CREAM, minHeight: "100vh" }}>
      <style>{css}</style>

      {/* NAV — same chrome as RsaJuryView */}
      <div style={{ background: NAVY, position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid rgba(201,168,76,.18)" }}>
        <div className="nav-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.5rem", height: 58 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${GOLD},#a07828)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: NAVY, flexShrink: 0 }}>R</div>
            <div style={{ minWidth: 0 }}>
              <div className="nav-title h-serif" style={{ fontSize: 14, fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.navTitle}</div>
              <div className="nav-sub" style={{ fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: ".1em", textTransform: "uppercase" }}>{t.navSub}</div>
            </div>
          </div>
          <div className="nav-actions" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {["fr", "en", "de"].map((l) => {
                const on = lang === l;
                return (
                  <button key={l} className="lb" onClick={() => setLang(l)}
                    style={{ background: on ? GOLD : "transparent", color: on ? NAVY : "rgba(255,255,255,.45)", borderColor: on ? GOLD : "rgba(255,255,255,.2)" }}>{l}</button>
                );
              })}
            </div>
            <button className="btn" onClick={share} title={t.share}
              style={{ fontSize: 10.5, fontWeight: 500, padding: "5px 11px", borderRadius: 7, background: "rgba(255,255,255,.1)", color: "white", border: "1px solid rgba(255,255,255,.2)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 12 }}>{copied ? "✓" : "🔗"}</span>
              <span className="share-label">{copied ? t.linkCopied : t.share}</span>
            </button>
            {!published && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "rgba(255,255,255,.55)" }}>
                <span className="live-dot" /><span className="live-label">{t.live}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="main-pad" style={{ padding: "22px 24px 40px", maxWidth: 1000, margin: "0 auto" }}>

        {/* Header card */}
        <div className="card fade" style={{ padding: "18px 22px", marginBottom: 16, background: session.light, borderColor: session.border }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 40, lineHeight: 1 }}>{session.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10.5, color: "#9a6400", letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 600 }}>{t.subtitle}</div>
              <div className="h-serif" style={{ fontSize: 25, marginTop: 2, color: NAVY, fontWeight: 600 }}>{t.title}</div>
              <div style={{ fontSize: 12, color: "#6a6a8a", marginTop: 4 }}>
                {getSessionDate(session, lang)}{session.venue ? ` · ${session.venue}` : ""}
              </div>
            </div>
          </div>
          {(published || ranked.length > 0) && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(15,31,61,.08)", fontSize: 11.5, color: published ? "#1d6b4f" : "#9a6400", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>{published ? `✓ ${t.official}` : `● ${t.provisional}`}</span>
              {published && sessionRow?.published_at && (
                <span style={{ color: "#6a6a8a" }}>{t.publishedAt} {fmtDate(sessionRow.published_at, lang)}</span>
              )}
              {totalJurors > 0 && (
                <span style={{ color: "#6a6a8a", marginLeft: "auto" }}>{totalJurors} {totalJurors > 1 ? t.jurors : t.juror}</span>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "3rem", color: "#a0a0b8", fontSize: 13 }}>{t.loading}</div>
        )}

        {/* Awaiting state */}
        {!loading && ranked.length === 0 && (
          <div className="card fade" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: 46, marginBottom: 10, opacity: 0.5 }}>🏆</div>
            <div className="h-serif" style={{ fontSize: 20, color: NAVY, fontWeight: 600, marginBottom: 8 }}>{t.awaitingTitle}</div>
            <p style={{ fontSize: 13, color: "#6a6a8a", maxWidth: 440, margin: "0 auto", lineHeight: 1.55 }}>{t.awaitingBody}</p>
            <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, color: "#1d6b4f" }}>
              <span className="live-dot" /> {t.live}
            </div>
          </div>
        )}

        {/* Laureate hero */}
        {!loading && winner && (
          <div className="card fade" style={{ padding: "24px 26px", marginBottom: 16, background: "linear-gradient(135deg,#fdf6e8 0%,#fbeec1 50%,#fdf6e8 100%)", borderColor: GOLD, position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: -34, right: -22, fontSize: 190, opacity: 0.08, lineHeight: 1 }}>🏆</div>
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 10, color: "#9a6400", letterSpacing: ".18em", textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>✦ {t.laureateLabel}</div>
              <h2 className="h-serif laureate-name" style={{ fontSize: 40, lineHeight: 1.08, color: NAVY, fontWeight: 600 }}>{winner.startup}</h2>
              <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "#5a5a7a", alignItems: "center" }}>
                <span>{t.finalScore} <strong style={{ color: "#9a6400", fontSize: 15 }}>{winner.final_score.toFixed(2)}/5</strong></span>
                {winner.avg != null && (
                  <>
                    <span style={{ color: "#c9b88a" }}>·</span>
                    <span>{t.juryAvg} <strong>{winner.avg.toFixed(2)}</strong> {t.on} {winner.n} {t.evaluations}</span>
                  </>
                )}
              </div>
              {winner.note && (
                <p className="h-serif" style={{ marginTop: 12, fontStyle: "italic", color: "#3a3a52", fontSize: 14.5 }}>« {winner.note} »</p>
              )}
            </div>
          </div>
        )}

        {/* Podium */}
        {!loading && podium.length > 0 && (
          <div className="card fade" style={{ padding: "16px 18px", marginBottom: 16 }}>
            <div className="rk-th" style={{ marginBottom: 12 }}>{t.podium}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {podium.map((r) => {
                const medal = r.final_rank === 1 ? GOLD : r.final_rank === 2 ? "#9090a8" : "#a87a4a";
                const emoji = r.final_rank === 1 ? "🥇" : r.final_rank === 2 ? "🥈" : "🥉";
                return (
                  <div key={r.startup} style={{ flex: "1 1 200px", minWidth: 180, border: `1.5px solid ${medal}`, borderRadius: 11, padding: "14px 16px", background: r.final_rank === 1 ? "#fdf6e8" : "white" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                      <span style={{ fontSize: 17 }}>{emoji}</span>
                      <span style={{ fontSize: 11, color: medal, fontWeight: 700, letterSpacing: ".08em" }}>#{r.final_rank}</span>
                    </div>
                    <div className="h-serif" style={{ fontSize: 17, color: NAVY, fontWeight: 600, lineHeight: 1.2 }}>{r.startup}</div>
                    <div style={{ fontSize: 12, color: "#6a6a8a", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                      <strong style={{ color: "#9a6400" }}>{r.final_score.toFixed(2)}</strong> / 5 · {r.n} {r.n > 1 ? t.jurors.toLowerCase() : t.juror.toLowerCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full ranking */}
        {!loading && ranked.length > 0 && (
          <div className="card fade" style={{ overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${CREAM2}` }}>
              <div className="rk-th">{t.fullRanking}</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="rk-grid" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: CREAM, borderBottom: `1px solid ${CREAM2}` }}>
                    <th className="rk-th" style={{ textAlign: "left", padding: "10px 14px", width: 64 }}>{t.rank}</th>
                    <th className="rk-th" style={{ textAlign: "left", padding: "10px 14px" }}>{t.startup}</th>
                    <th className="rk-th" style={{ textAlign: "right", padding: "10px 14px", width: 90 }}>{t.avg}</th>
                    <th className="rk-th" style={{ textAlign: "right", padding: "10px 14px", width: 100 }}>{t.score}</th>
                    <th className="rk-th" style={{ textAlign: "center", padding: "10px 14px", width: 70 }}>{t.nJurors}</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((r, i) => (
                    <tr key={r.startup} style={{ borderBottom: `1px solid ${CREAM2}`, background: r.final_rank === 1 ? "#fdf6e8" : i % 2 === 1 ? CREAM : "white" }}>
                      <td className="rk-td" style={{ padding: "10px 14px", fontWeight: 700, color: r.final_rank <= 3 ? "#9a6400" : NAVY }}>#{r.final_rank}</td>
                      <td className="rk-td" style={{ padding: "10px 14px", fontWeight: 500 }}>
                        {r.startup}
                        {r.note && <div style={{ fontSize: 11, color: "#9090a8", fontStyle: "italic", marginTop: 2 }}>{r.note}</div>}
                      </td>
                      <td className="rk-td" style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#6a6a8a" }}>{r.avg != null ? r.avg.toFixed(2) : "—"}</td>
                      <td className="rk-td" style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "#9a6400" }}>{r.final_score.toFixed(2)}</td>
                      <td className="rk-td" style={{ padding: "10px 14px", textAlign: "center", color: "#6a6a8a", fontSize: 11.5 }}>{r.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Scoring criteria — public transparency on the methodology */}
        {!loading && ranked.length > 0 && (
          <div className="card fade" style={{ padding: "16px 18px", marginBottom: 8 }}>
            <div className="rk-th" style={{ marginBottom: 6 }}>{t.methodTitle}</div>
            <p style={{ fontSize: 12, color: "#6a6a8a", marginBottom: 12, lineHeight: 1.5 }}>{t.methodIntro}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
              {CRITERIA.map((c) => {
                const loc = getCriterion(c, lang);
                return (
                  <div key={c.id} style={{ background: CREAM, borderRadius: 9, padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: NAVY }}>{loc.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#9a6400", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{Math.round(c.weight * 100)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && lastUpdate && !published && (
          <div style={{ textAlign: "center", fontSize: 10.5, color: "#a8a8c0", marginTop: 14 }}>
            {t.lastUpdate(lastUpdate.toLocaleTimeString(lang === "fr" ? "fr-FR" : lang === "de" ? "de-DE" : "en-GB"))}
          </div>
        )}
      </div>

      <footer className="footer-pad" style={{ background: NAVY, padding: "1.5rem 2rem", marginTop: "1rem", textAlign: "center" }}>
        <div className="h-serif" style={{ fontSize: 14, color: "white", marginBottom: 4 }}>{session.emoji} {getSessionLabel(session, lang)}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{t.footerLine}</div>
      </footer>
    </div>
  );
}
