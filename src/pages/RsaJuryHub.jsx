import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  Loader2, Copy, Check, ExternalLink, Download, FileText,
  Sparkles, X, Calendar, Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  SESSIONS, SESSION_BY_ID, FINAL_SESSION_ID, QUALIFYING_SESSIONS, JURY_STATUS,
} from "@/lib/rsa/constants";
import { StartupConfirmation, SessionConfig, JuryProfile } from "@/lib/db";
import { createPageUrl } from "@/utils";

const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#faf7f2";
const CREAM2 = "#e8e3d9";
const INK = "#3a3a52";
const MUTED = "#9090a8";

// Source of truth for session start times — mirrors RsaJuryForm so the
// J-7 reveal window stays in sync with the registration lock window.
const SESSION_ISO = {
  s1_foodtech:  "2026-04-30T18:00:00+02:00",
  s2_social:    "2026-05-06T18:00:00+02:00",
  s3_tech:      "2026-05-13T18:00:00+02:00",
  s4_health:    "2026-05-19T18:00:00+02:00",
  s5_greentech: "2026-05-21T18:00:00+02:00",
  final_grande: "2026-05-26T16:00:00+02:00",
};
const REVEAL_DAYS = 7;
const LS_DISMISS_KEY = "rsa_jury_hub_register_dismissed";

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function publicUrl(path) {
  if (!path) return null;
  return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
}

function deckUrlFor(row) {
  return publicUrl(row.final_deck_path || row.application_deck_path);
}

function copy(text, msg = "Copié") {
  navigator.clipboard.writeText(text).then(
    () => toast.success(msg),
    () => toast.error("Copie impossible")
  );
}

export default function RsaJuryHub() {
  const [sessionConfigs, setSessionConfigs] = useState([]);
  const [startupsBySession, setStartupsBySession] = useState({});
  const [jurorsBySession, setJurorsBySession] = useState({});
  const [finalistsBySource, setFinalistsBySource] = useState({});
  const [allValidatedJurors, setAllValidatedJurors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registerDismissed, setRegisterDismissed] = useState(() => {
    try { return localStorage.getItem(LS_DISMISS_KEY) === "1"; } catch { return false; }
  });

  async function loadAll() {
    try {
      const [configs, allConfs, jurors] = await Promise.all([
        SessionConfig.list("session_id"),
        StartupConfirmation.list(),
        JuryProfile.filter({ validated: true }),
      ]);
      setSessionConfigs(configs);
      setAllValidatedJurors(jurors);

      const startupMap = {};
      const finalistMap = {};
      for (const r of allConfs) {
        if (r.session_id === FINAL_SESSION_ID && r.source_session_id) {
          finalistMap[r.source_session_id] = r;
        }
        if (!startupMap[r.session_id]) startupMap[r.session_id] = [];
        startupMap[r.session_id].push(r);
      }

      // Order each session's startups using session_order if present, else alpha
      // (mirrors SetupTab/LiveTab fallback).
      for (const cfg of configs) {
        const sid = cfg.session_id;
        if (!startupMap[sid]) continue;
        const order = Array.isArray(cfg.session_order) && cfg.session_order.length > 0
          ? cfg.session_order : null;
        if (order) {
          const byName = new Map(startupMap[sid].map((r) => [r.startup_name, r]));
          const ordered = [];
          for (const n of order) if (byName.has(n)) ordered.push(byName.get(n));
          for (const r of startupMap[sid]) if (!ordered.includes(r)) ordered.push(r);
          startupMap[sid] = ordered;
        } else {
          startupMap[sid] = [...startupMap[sid]].sort((a, b) =>
            (a.startup_name || "").localeCompare(b.startup_name || "")
          );
        }
      }
      setStartupsBySession(startupMap);
      setFinalistsBySource(finalistMap);

      // jury_profiles.assigned_sessions stores FR labels — match by session.label.
      const jurorMap = {};
      for (const s of SESSIONS) {
        jurorMap[s.id] = jurors.filter((j) =>
          Array.isArray(j.assigned_sessions) && j.assigned_sessions.includes(s.label)
        );
      }
      setJurorsBySession(jurorMap);
    } catch (e) {
      console.warn("[RsaJuryHub] load", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const ch = supabase
      .channel("rsa_jury_hub_" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "session_config" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "startup_confirmations" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "jury_profiles" }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const cfgById = useMemo(() => {
    const m = {};
    for (const c of sessionConfigs) m[c.session_id] = c;
    return m;
  }, [sessionConfigs]);

  const overview = useMemo(() => {
    const now = Date.now();
    const passed = QUALIFYING_SESSIONS.filter((s) => {
      const iso = SESSION_ISO[s.id];
      return iso && new Date(iso).getTime() < now;
    });
    const next = QUALIFYING_SESSIONS
      .map((s) => ({ s, d: daysUntil(SESSION_ISO[s.id]) }))
      .filter((x) => x.d != null && x.d >= 0)
      .sort((a, b) => a.d - b.d)[0];
    return {
      total: QUALIFYING_SESSIONS.length,
      passedCount: passed.length,
      next: next ? next.s : null,
      nextInDays: next ? next.d : null,
      finalistCount: Object.keys(finalistsBySource).length,
    };
  }, [finalistsBySource]);

  function dismissRegister() {
    try { localStorage.setItem(LS_DISMISS_KEY, "1"); } catch { /* localStorage may be disabled */ }
    setRegisterDismissed(true);
  }

  return (
    <div style={{ background: CREAM, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @keyframes rsaJuryHubPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>

      <div style={{
        background: NAVY, position: "sticky", top: 0, zIndex: 100,
        borderBottom: "1px solid rgba(201,168,76,.18)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 1.5rem", height: 58, maxWidth: 1100, margin: "0 auto",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: `linear-gradient(135deg,${GOLD},#a07828)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 600, color: NAVY, flexShrink: 0,
            }}>R</div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600,
                color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>Rotary Startup Award 2026 — Hub jury</div>
              <div style={{
                fontSize: 9, color: "rgba(255,255,255,.3)",
                letterSpacing: ".1em", textTransform: "uppercase",
              }}>Decks · Scoring · Récap</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "22px 24px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <Hero overview={overview}/>
        {!registerDismissed && <RegisterCta onDismiss={dismissRegister}/>}

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, gap: 8, color: MUTED }}>
            <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} />
            Chargement…
          </div>
        ) : (
          <>
            {QUALIFYING_SESSIONS.map((session) => {
              const cfg = cfgById[session.id];
              const status = cfg?.status || JURY_STATUS.DRAFT;
              const startups = startupsBySession[session.id] || [];
              const jurors = jurorsBySession[session.id] || [];
              const finalist = finalistsBySource[session.id] || null;
              const days = daysUntil(SESSION_ISO[session.id]);
              const isLive = status === JURY_STATUS.LIVE;
              const isPast = days != null && days < 0;
              const isFar = !isLive && !isPast && days != null && days > REVEAL_DAYS;

              if (isFar) return <FarSessionCard key={session.id} session={session} days={days}/>;
              return (
                <SessionCard
                  key={session.id}
                  session={session}
                  cfg={cfg}
                  status={status}
                  startups={startups}
                  jurors={jurors}
                  finalist={finalist}
                  isLive={isLive}
                  isPast={isPast}
                  days={days}
                />
              );
            })}

            <FinaleCard
              days={daysUntil(SESSION_ISO[FINAL_SESSION_ID])}
              finalists={Object.values(finalistsBySource)}
              allFinaleStartups={startupsBySession[FINAL_SESSION_ID] || []}
            />

            <Footer/>
          </>
        )}
      </div>
    </div>
  );
}

function Hero({ overview }) {
  return (
    <div style={{
      background: "white", border: `1px solid ${CREAM2}`, borderRadius: 12,
      padding: "20px 22px", marginBottom: 18,
    }}>
      <div style={{
        fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em",
        color: GOLD, fontWeight: 600, marginBottom: 6,
      }}>Rotary Startup Award 2026</div>
      <h1 style={{
        fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 600,
        color: NAVY, margin: 0, lineHeight: 1.15,
      }}>Hub jury — toutes les sessions, en un seul lien</h1>
      <div style={{
        display: "flex", gap: 24, marginTop: 14, flexWrap: "wrap",
        fontSize: 13, color: INK,
      }}>
        <Stat label="Sessions terminées" value={`${overview.passedCount} / ${overview.total}`}/>
        <Stat label="Finalistes annoncés" value={`${overview.finalistCount} / 5`}/>
        {overview.next && (
          <Stat
            label="Prochaine session"
            value={overview.nextInDays === 0
              ? `${overview.next.emoji} ${overview.next.label} · aujourd'hui`
              : overview.nextInDays === 1
                ? `${overview.next.emoji} ${overview.next.label} · demain`
                : `${overview.next.emoji} ${overview.next.label} · J-${overview.nextInDays}`}
          />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: MUTED, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: NAVY }}>{value}</div>
    </div>
  );
}

function RegisterCta({ onDismiss }) {
  return (
    <div style={{
      background: "rgba(201,168,76,0.08)", border: `1px solid ${GOLD}55`,
      borderRadius: 10, padding: "12px 16px", marginBottom: 18,
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    }}>
      <Sparkles style={{ width: 18, height: 18, color: GOLD, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 200, fontSize: 13, color: INK }}>
        <strong style={{ color: NAVY }}>Pas encore juré ?</strong>{" "}
        Vous pouvez rejoindre le jury — l'inscription prend 2 minutes.
      </div>
      <Link to={createPageUrl("RsaJuryForm")} style={{
        background: NAVY, color: "white", padding: "8px 14px", borderRadius: 6,
        fontSize: 12, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap",
      }}>S'inscrire au jury →</Link>
      <button onClick={onDismiss} aria-label="Masquer"
        style={{ background: "transparent", border: 0, cursor: "pointer", padding: 4, color: MUTED, display: "flex" }}>
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

function FarSessionCard({ session, days }) {
  return (
    <div style={{
      background: "white", border: `1px solid ${CREAM2}`, borderRadius: 12,
      padding: "16px 20px", marginBottom: 14, opacity: 0.55,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 22 }}>{session.emoji}</div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{session.label}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{session.date} · J-{days}</div>
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 10, color: MUTED, padding: "4px 8px",
          background: CREAM2, borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          <Lock style={{ width: 11, height: 11 }} />
          Disponible J-{REVEAL_DAYS}
        </div>
      </div>
    </div>
  );
}

function SessionCard({ session, cfg, status, startups, jurors, finalist, isLive, isPast, days }) {
  const scoringUrl = `${window.location.origin}/RsaScore?s=${session.id}`;
  const juryPackUrl = publicUrl(cfg?.jury_pack_path);
  const recapUrl = `/RsaRecap?s=${session.id}`;

  return (
    <div style={{
      background: "white",
      border: `1px solid ${session.border}`,
      borderRadius: 12,
      marginBottom: 18,
      overflow: "hidden",
    }}>
      <div style={{
        background: session.light, padding: "14px 20px",
        borderBottom: `1px solid ${session.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24 }}>{session.emoji}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: session.color }}>{session.label}</div>
            <div style={{ fontSize: 11, color: INK, marginTop: 2 }}>{session.date}</div>
          </div>
        </div>
        <SessionStatusBadge isLive={isLive} isPast={isPast} days={days}/>
      </div>

      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
        <JuryAccessBlock scoringUrl={scoringUrl} juryPackUrl={juryPackUrl}/>
        {startups.length > 0 && <StartupsTable startups={startups}/>}
        {jurors.length > 0 && <JurorsList jurors={jurors}/>}
        {isPast && <FinalistFooter finalist={finalist} recapUrl={recapUrl}/>}
      </div>
    </div>
  );
}

function SessionStatusBadge({ isLive, isPast, days }) {
  if (isLive) {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)",
        color: "#dc2626", padding: "4px 10px", borderRadius: 4,
        fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
      }}>
        <span style={{
          width: 7, height: 7, background: "#dc2626", borderRadius: "50%",
          animation: "rsaJuryHubPulse 1.5s infinite",
        }}/>
        Live
      </div>
    );
  }
  if (isPast) {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)",
        color: "#059669", padding: "4px 10px", borderRadius: 4,
        fontSize: 10.5, fontWeight: 500,
      }}>
        <Check style={{ width: 11, height: 11 }} />
        Terminée
      </div>
    );
  }
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: "white", border: `1px solid ${CREAM2}`, color: INK,
      padding: "4px 10px", borderRadius: 4, fontSize: 10.5, fontWeight: 500,
    }}>
      <Calendar style={{ width: 11, height: 11 }} />
      {days === 0 ? "Aujourd'hui" : `J-${days}`}
    </div>
  );
}

function JuryAccessBlock({ scoringUrl, juryPackUrl }) {
  return (
    <div style={{
      background: CREAM, border: `1px solid ${CREAM2}`, borderRadius: 8,
      padding: 16, display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap",
    }}>
      <div style={{
        background: "white", padding: 10, borderRadius: 6,
        border: `1px solid ${CREAM2}`, flexShrink: 0,
      }}>
        <QRCodeSVG
          value={scoringUrl}
          size={140}
          level="M"
          fgColor={NAVY}
          bgColor="white"
          marginSize={0}
        />
      </div>

      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{
          fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em",
          color: GOLD, fontWeight: 600, marginBottom: 4,
        }}>Lien scoring jury</div>
        <div style={{
          display: "flex", gap: 6, alignItems: "center",
          background: "white", border: `1px solid ${CREAM2}`, borderRadius: 4,
          padding: "8px 10px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
          color: NAVY, marginBottom: 8,
        }}>
          <code style={{
            flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{scoringUrl}</code>
          <button onClick={() => copy(scoringUrl, "Lien scoring copié")}
            title="Copier"
            style={{
              background: "transparent", border: 0, cursor: "pointer", padding: 2,
              color: GOLD, display: "flex", alignItems: "center",
            }}>
            <Copy style={{ width: 13, height: 13 }} />
          </button>
          <a href={scoringUrl} target="_blank" rel="noopener noreferrer"
            title="Ouvrir le scoring"
            style={{ color: GOLD, display: "flex", alignItems: "center" }}>
            <ExternalLink style={{ width: 13, height: 13 }} />
          </a>
        </div>

        <div style={{ fontSize: 11, color: INK, marginBottom: 10, lineHeight: 1.45 }}>
          Scannez le QR avec votre téléphone, ou ouvrez le lien sur n'importe quel
          appareil. À l'arrivée, sélectionnez votre nom dans la liste.
        </div>

        {juryPackUrl ? (
          <a href={juryPackUrl} target="_blank" rel="noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12,
              padding: "6px 12px", borderRadius: 4,
              background: NAVY, color: "white", textDecoration: "none", fontWeight: 500,
            }}>
            <Download style={{ width: 13, height: 13 }} />
            Pack jury pre-read (PDF)
          </a>
        ) : (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11,
            color: MUTED, fontStyle: "italic",
          }}>
            <FileText style={{ width: 13, height: 13 }} />
            Pack jury pre-read en préparation
          </div>
        )}
      </div>
    </div>
  );
}

function StartupsTable({ startups }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: NAVY, marginBottom: 8,
        textTransform: "uppercase", letterSpacing: "0.1em",
      }}>Startups · {startups.length}</div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: CREAM, borderBottom: `1px solid ${CREAM2}`, textAlign: "left" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Startup</th>
              <th style={thStyle}>Deck</th>
              <th style={thStyle}>Executive summary</th>
            </tr>
          </thead>
          <tbody>
            {startups.map((s, idx) => {
              const deckUrl = deckUrlFor(s);
              const execs = Array.isArray(s.executive_summary_files) ? s.executive_summary_files : [];
              return (
                <tr key={s.id} style={{ borderBottom: `1px solid ${CREAM2}` }}>
                  <td style={{ ...tdStyle, color: MUTED, width: 30 }}>{idx + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 500, color: NAVY }}>{s.startup_name}</td>
                  <td style={tdStyle}>
                    {deckUrl ? (
                      <a href={deckUrl} target="_blank" rel="noreferrer" style={linkStyle}>
                        <Download style={{ width: 12, height: 12 }} />
                        Deck
                      </a>
                    ) : <span style={mutedStyle}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    {execs.length === 0 ? (
                      <span style={mutedStyle}>—</span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {execs.map((ef, i) => {
                          const url = publicUrl(ef.path);
                          if (!url) return null;
                          const label = ef.filename
                            ? (ef.filename.length > 22 ? ef.filename.slice(0, 20) + "…" : ef.filename)
                            : `Fichier ${i + 1}`;
                          return (
                            <a key={i} href={url} target="_blank" rel="noreferrer"
                              title={ef.filename || ef.path} style={linkStyle}>
                              <FileText style={{ width: 11, height: 11 }} />
                              {label}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JurorsList({ jurors }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: NAVY, marginBottom: 8,
        textTransform: "uppercase", letterSpacing: "0.1em",
      }}>Jurés confirmés · {jurors.length}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {jurors.map((j) => (
          <div key={j.id} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: CREAM, border: `1px solid ${CREAM2}`, borderRadius: 999,
            padding: "4px 10px 4px 4px", fontSize: 12, color: INK,
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: j.photo_base64 ? `url(${j.photo_base64}) center/cover` : NAVY,
              color: "white", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 600, flexShrink: 0,
            }}>
              {!j.photo_base64 && ((j.prenom?.[0] || "") + (j.nom?.[0] || "")).toUpperCase()}
            </div>
            <span>{j.prenom} {j.nom}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalistFooter({ finalist, recapUrl }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.04))",
      border: `1px solid ${GOLD}55`, borderRadius: 8,
      padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    }}>
      {finalist ? (
        <>
          <div style={{ fontSize: 22 }}>🏆</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 10, color: "#9a6400", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Finaliste retenu
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: NAVY, marginTop: 2 }}>
              {finalist.startup_name}
            </div>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, fontSize: 12, color: MUTED, fontStyle: "italic" }}>
          Finaliste pas encore désigné
        </div>
      )}
      <a href={recapUrl} target="_blank" rel="noreferrer" style={{
        display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12,
        padding: "7px 14px", borderRadius: 4, background: NAVY, color: "white",
        textDecoration: "none", fontWeight: 500,
      }}>
        Voir le récap →
      </a>
    </div>
  );
}

function FinaleCard({ days, finalists, allFinaleStartups }) {
  const finaleSession = SESSION_BY_ID[FINAL_SESSION_ID];
  const namesFromFinaleConfs = (allFinaleStartups || []).map((r) => r.startup_name);
  const finalistNames = finalists.map((f) => f.startup_name);
  const visibleNames = namesFromFinaleConfs.length > 0 ? namesFromFinaleConfs : finalistNames;
  const rsvpUrl = createPageUrl("RsaFinaleRsvp");

  return (
    <div style={{
      background: "linear-gradient(135deg, #fff8e8, #fbeebd)",
      border: `2px solid ${GOLD}`, borderRadius: 12,
      padding: "20px 24px", marginBottom: 18, marginTop: 32,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ fontSize: 36 }}>🏆</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#9a6400", textTransform: "uppercase", letterSpacing: "0.16em" }}>
            Grande Finale
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: NAVY, marginTop: 2 }}>
            {finaleSession.label} · 26 mai
          </div>
          <div style={{ fontSize: 12, color: INK, marginTop: 4 }}>
            Cyrus Conseil — 50 bd Haussmann, Paris 75009 · 16h–19h
          </div>
        </div>
        {days != null && days >= 0 && (
          <div style={{
            background: "white", border: `1px solid ${GOLD}55`, padding: "6px 12px",
            borderRadius: 4, fontSize: 11, color: "#9a6400", fontWeight: 600,
          }}>
            {days === 0 ? "Aujourd'hui" : days === 1 ? "Demain" : `Dans ${days} jours`}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: NAVY, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Finalistes annoncés · {finalists.length} / 5
        </div>
        {visibleNames.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {visibleNames.map((n) => (
              <span key={n} style={{
                display: "inline-flex", alignItems: "center", padding: "4px 10px",
                background: "white", border: `1px solid ${GOLD}55`, borderRadius: 999,
                fontSize: 12, color: NAVY, fontWeight: 500,
              }}>{n}</span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic" }}>
            En cours de désignation au fil des sessions.
          </div>
        )}
      </div>

      <Link to={rsvpUrl} style={{
        display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13,
        padding: "10px 18px", borderRadius: 6, background: NAVY, color: "white",
        textDecoration: "none", fontWeight: 500,
      }}>
        Confirmer ma présence à la finale →
      </Link>
    </div>
  );
}

function Footer() {
  return (
    <div style={{
      marginTop: 30, paddingTop: 20, borderTop: `1px solid ${CREAM2}`,
      fontSize: 11, color: MUTED, lineHeight: 1.6,
    }}>
      <div>
        Hub jury — Rotary Startup Award 2026.{" "}
        Pour toute question :{" "}
        <a href="mailto:mat.balleron@proton.me" style={{ color: NAVY, textDecoration: "underline" }}>
          mat.balleron@proton.me
        </a>
      </div>
    </div>
  );
}

const thStyle = {
  padding: "8px 10px", fontWeight: 500, fontSize: 10.5,
  textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED,
};
const tdStyle = {
  padding: "8px 10px", fontSize: 13, verticalAlign: "middle",
};
const linkStyle = {
  display: "inline-flex", alignItems: "center", gap: 4,
  fontSize: 11.5, color: NAVY, textDecoration: "none",
  background: CREAM, border: `1px solid ${CREAM2}`,
  padding: "3px 8px", borderRadius: 4,
};
const mutedStyle = { color: MUTED, fontSize: 11 };
