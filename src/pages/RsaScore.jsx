import { useState, useEffect } from "react";

const SB_URL = "https://uaoucznptxmvhhytapso.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhb3Vjem5wdHhtdmhoeXRhcHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTU5NzAsImV4cCI6MjA4OTQ5MTk3MH0.evOgZctRuIxGSnZLocea5cAKqKR5nc-5x32QDqBUt0U";
const H = { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json", "Prefer": "return=representation" };

const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#f7f4ef";
const CREAM2 = "#ede9e1";

const SESSIONS = {
  s1_foodtech: {
    label: "FoodTech & Économie circulaire", emoji: "🌾", date: "Jeudi 30 avril",
    color: "#5a7a1a", light: "#eef5e0", border: "#c0d890",
    startups: ["DATUS","GREEN OFF GRID SAS","KIDIPOWER","KUZOG FRANCE","Kyol","Midow"]
  },
  s2_social: {
    label: "Impact social & Edtech", emoji: "🤝", date: "Mardi 6 mai",
    color: "#8a2040", light: "#fbe8ee", border: "#e8a8bc",
    startups: ["Buddy","Clover","Hormur","Krewzer","SightKick"]
  },
  s3_tech: {
    label: "Tech, AI, Fintech & Mobilité", emoji: "💻", date: "Mardi 13 mai",
    color: "#4a2a7a", light: "#f0eaf8", border: "#c8b0e8",
    startups: ["Boonty","DealMatrix","EVIMO","ex9","FollowTech"]
  },
  s4_health: {
    label: "Healthtech & Biotech", emoji: "🏥", date: "Mardi 19 mai",
    color: "#1a5fa8", light: "#e8f0fb", border: "#a8c8f0",
    startups: ["Femnov","InFocus Therapeutics","IPCURE","PEGMATISS BIOTECH","VAir","Virtuosis Health SAS","wilo"]
  },
  s5_greentech: {
    label: "Greentech & Environnement", emoji: "🌱", date: "Jeudi 21 mai",
    color: "#1d6b4f", light: "#e8f5ee", border: "#b0d8c4",
    startups: ["Maa Biodiversity","reLi Energy","SafyPower","Sycon","Vergora"]
  }
};

const CRITERIA = [
  { id: "score_value_prop", label: "Value Proposition",
    desc: "Clarity of the problem, customer pain, uniqueness of the solution",
    anchors: { 0: "Unclear or non-existent problem", 3: "Real problem, weak differentiation", 5: "Critical problem with a clear, differentiated value proposition" }
  },
  { id: "score_market", label: "Market & Scalability",
    desc: "Market size, accessibility, growth potential",
    anchors: { 0: "Market not defined", 3: "Market identified but weakly quantified", 5: "Large, quantified, scalable market" }
  },
  { id: "score_business_model", label: "Business Model",
    desc: "Revenue logic, pricing, economic sustainability",
    anchors: { 0: "No business model", 3: "Existing but fragile model", 5: "Clear, coherent, and credible business model" }
  },
  { id: "score_team", label: "Team Execution & Capability",
    desc: "Key skills, complementarity, ability to execute",
    anchors: { 0: "Incomplete team", 3: "Relevant team with critical gaps", 5: "Strong team aligned with project ambition" }
  },
  { id: "score_pitch_quality", label: "Pitch Quality",
    desc: "Structure, clarity, storytelling, time management",
    anchors: { 0: "Confusing / off timing", 3: "Understandable but improvable", 5: "Clear, compelling, convincing" }
  },
  { id: "score_societal_impact", label: "Societal Impact",
    desc: "Positive externalities beyond financial performance — social value, environmental contribution, ethical alignment",
    anchors: { 0: "No identifiable societal impact", 3: "Indirect or limited positive impact", 5: "Clear, measurable, and scalable positive societal impact" }
  }
];

const EMPTY_SCORES = () => Object.fromEntries(CRITERIA.map(c => [c.id, null]));

async function sbGet(path) {
  const r = await fetch(SB_URL + path, { headers: H });
  return r.json();
}
async function sbUpsert(table, data) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...H, "Prefer": "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(data)
  });
  return r.ok;
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500&display=swap');
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:${CREAM};min-height:100vh}
.fade{animation:fadeUp .3s ease both}
.btn{font-family:'Inter',sans-serif;cursor:pointer;transition:all .15s}
.btn:hover{filter:brightness(.91)}
.btn:active{transform:scale(.97)}
select,textarea{font-family:'Inter',sans-serif;outline:none;color:${NAVY};border:1.5px solid ${CREAM2};border-radius:10px;padding:10px 14px;font-size:14px;background:white;transition:border-color .2s,box-shadow .2s;width:100%}
select:focus,textarea:focus{border-color:${GOLD};box-shadow:0 0 0 4px rgba(201,168,76,.12)}
`;

function ScoreSlider({ criterion, value, onChange }) {
  const anchor = criterion.anchors[value];
  return (
    <div style={{ background: "white", border: "1px solid " + CREAM2, borderRadius: 14, padding: "18px 20px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: NAVY, marginBottom: 2 }}>{criterion.label}</div>
          <div style={{ fontSize: 11.5, color: "#8a8aaa", lineHeight: 1.5 }}>{criterion.desc}</div>
        </div>
        <div style={{ flexShrink: 0, marginLeft: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 600, fontFamily: "'Playfair Display', serif", color: value === null ? "#d0d0e0" : value >= 4 ? "#1d6b4f" : value >= 2 ? "#9a6400" : "#8a2040", lineHeight: 1 }}>
            {value === null ? "–" : value}
          </div>
          <div style={{ fontSize: 9.5, color: "#a0a0b8", letterSpacing: ".06em", textTransform: "uppercase" }}>/ 5</div>
        </div>
      </div>

      {/* Score buttons 0-5 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {[0,1,2,3,4,5].map(n => {
          const active = value === n;
          const col = n >= 4 ? "#1d6b4f" : n >= 2 ? "#9a6400" : "#8a2040";
          const bg = n >= 4 ? "#e8f5ee" : n >= 2 ? "#fdf6e8" : "#fbe8ee";
          return (
            <button key={n} className="btn" onClick={() => onChange(n)}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1.5px solid " + (active ? col : CREAM2), background: active ? bg : "white", color: active ? col : "#9090a8", fontSize: 14, fontWeight: active ? 600 : 400, fontFamily: "'Playfair Display', serif" }}>
              {n}
            </button>
          );
        })}
      </div>

      {/* Anchor text */}
      {anchor && (
        <div style={{ fontSize: 11, color: "#6a6a8a", fontStyle: "italic", padding: "6px 10px", background: CREAM, borderRadius: 7 }}>
          {anchor}
        </div>
      )}
    </div>
  );
}

function RecapView({ sessionId, juryName, scores, session }) {
  const startups = session.startups;
  const totals = startups.map(name => {
    const s = scores.find(x => x.startup_name === name);
    if (!s) return { name, total: null, scored: false };
    const vals = CRITERIA.map(c => s[c.id]).filter(v => v !== null && v !== undefined);
    const total = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
    return { name, total: parseFloat(total), scored: true, data: s };
  });

  const sorted = [...totals].filter(x => x.scored).sort((a, b) => b.total - a.total);

  return (
    <div className="fade">
      <div style={{ background: NAVY, borderRadius: 14, padding: "20px 24px", marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🎉</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: "white", marginBottom: 4 }}>Évaluation terminée</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>{juryName} · {session.label}</div>
      </div>

      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: NAVY, marginBottom: 12 }}>Votre classement</div>

      {sorted.map((st, i) => (
        <div key={st.name} style={{ background: "white", border: "1px solid " + CREAM2, borderRadius: 12, padding: "14px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: i === 0 ? GOLD : i === 1 ? CREAM2 : CREAM, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: i === 0 ? NAVY : "#9090a8", flexShrink: 0, fontFamily: "'Playfair Display', serif" }}>
            {i + 1}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: NAVY, fontFamily: "'Playfair Display', serif" }}>{st.name}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              {CRITERIA.map(c => {
                const v = st.data[c.id];
                const col = v >= 4 ? "#1d6b4f" : v >= 2 ? "#9a6400" : "#8a2040";
                return (
                  <span key={c.id} style={{ fontSize: 10, padding: "1px 7px", borderRadius: 8, background: CREAM, color: col, fontWeight: 500 }}>
                    {c.label.split(" ")[0]}: {v}
                  </span>
                );
              })}
            </div>
            {st.data.comment && <div style={{ fontSize: 11, color: "#9090a8", marginTop: 4, fontStyle: "italic" }}>"{st.data.comment}"</div>}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: NAVY, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{st.total}</div>
            <div style={{ fontSize: 9.5, color: "#a0a0b8" }}>/ 5</div>
          </div>
        </div>
      ))}

      {totals.filter(x => !x.scored).length > 0 && (
        <div style={{ background: "#fff8f6", border: "1px solid #f0c0b0", borderRadius: 10, padding: "12px 16px", marginTop: 10 }}>
          <div style={{ fontSize: 12, color: "#8a2040", fontWeight: 500 }}>Startups non notées :</div>
          {totals.filter(x => !x.scored).map(st => (
            <div key={st.name} style={{ fontSize: 12, color: "#8a2040" }}>• {st.name}</div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 20, padding: "14px 16px", background: "#e8f5ee", borderRadius: 12, border: "1px solid #b0d8c4", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "#1d6b4f" }}>Vos scores ont été enregistrés. Merci pour votre participation au jury du Rotary Startup Award 2026.</div>
      </div>
    </div>
  );
}

export default function RsaScore() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("s") || params.get("session");

  const [step, setStep] = useState("identify"); // identify | score | done
  const [juryName, setJuryName] = useState("");
  const [juryList, setJuryList] = useState([]);
  const [startupIdx, setStartupIdx] = useState(0);
  const [scores, setScores] = useState(EMPTY_SCORES());
  const [comment, setComment] = useState("");
  const [allScores, setAllScores] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingScores, setExistingScores] = useState([]);

  const session = SESSIONS[sessionId];

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    async function init() {
      // Load jury members for this session
      const profiles = await sbGet(`/rest/v1/jury_profiles?select=prenom,nom,sessions,grande_finale&order=nom.asc`);
      const shortKey = session.label.split("&")[0].trim().toLowerCase();
      const relevant = (profiles || []).filter(p =>
        (p.sessions || []).some(s => s.toLowerCase().includes(shortKey)) || p.grande_finale
      );
      setJuryList(relevant);
      setLoading(false);
    }
    init();
  }, []);

  async function loadExistingScores(name) {
    const rows = await sbGet(`/rest/v1/jury_scores?select=*&session_id=eq.${sessionId}&jury_name=eq.${encodeURIComponent(name)}`);
    setExistingScores(rows || []);
    setAllScores(rows || []);
    // Find first unscored startup
    const scored = (rows || []).map(r => r.startup_name);
    const firstUnscored = session.startups.findIndex(s => !scored.includes(s));
    if (firstUnscored === -1) {
      setStep("done");
    } else {
      setStartupIdx(firstUnscored);
      setStep("score");
    }
  }

  function confirmIdentity() {
    if (!juryName.trim()) return;
    loadExistingScores(juryName);
  }

  async function submitScore() {
    const startup = session.startups[startupIdx];
    const allFilled = CRITERIA.every(c => scores[c.id] !== null);
    if (!allFilled) return;

    setSubmitting(true);
    const ok = await sbUpsert("jury_scores", {
      session_id: sessionId,
      jury_name: juryName,
      startup_name: startup,
      ...scores,
      comment: comment || null
    });

    if (ok) {
      const updated = [...allScores.filter(s => s.startup_name !== startup), { session_id: sessionId, jury_name: juryName, startup_name: startup, ...scores, comment }];
      setAllScores(updated);
      // Next unscored
      const scored = updated.map(r => r.startup_name);
      const next = session.startups.findIndex((s, i) => i > startupIdx && !scored.includes(s));
      if (next === -1) {
        setStep("done");
      } else {
        setStartupIdx(next);
        setScores(EMPTY_SCORES());
        setComment("");
      }
    }
    setSubmitting(false);
  }

  if (!sessionId || !session) {
    return (
      <div style={{ fontFamily: "Inter, sans-serif", background: CREAM, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <style>{css}</style>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: NAVY, marginBottom: 8 }}>Lien invalide</div>
          <div style={{ fontSize: 13, color: "#6a6a8a" }}>Ce lien de scoring n'est pas valide. Contactez le comité d'organisation.</div>
          <div style={{ fontSize: 12, color: "#a0a0b8", marginTop: 8 }}>prixstartuprotary@proton.me</div>
        </div>
      </div>
    );
  }

  const startup = session.startups[startupIdx];
  const totalStartups = session.startups.length;
  const scoredCount = allScores.length;
  const allFilled = CRITERIA.every(c => scores[c.id] !== null);

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: CREAM, minHeight: "100vh" }}>
      <style>{css}</style>

      {/* NAV */}
      <div style={{ background: NAVY, padding: "0 2rem", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid rgba(201,168,76,.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${GOLD},#a07828)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: NAVY }}>R</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 13.5, fontWeight: 600, color: "white" }}>Rotary Startup Award 2026</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: ".1em", textTransform: "uppercase" }}>Pitch Evaluation · {session.emoji} {session.label.split("&")[0].trim()}</div>
          </div>
        </div>
        {step === "score" && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>
            {scoredCount}/{totalStartups} scored
          </div>
        )}
      </div>

      <div style={{ maxWidth: 580, margin: "0 auto", padding: "2rem 1.5rem 5rem" }}>

        {/* Session badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, padding: "10px 14px", borderRadius: 10, background: session.light, border: "1px solid " + session.border }}>
          <span style={{ fontSize: 18 }}>{session.emoji}</span>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: session.color }}>{session.label}</div>
            <div style={{ fontSize: 11, color: session.color, opacity: .7 }}>{session.date}</div>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "3rem", color: "#a0a0b8" }}>
            <div style={{ width: 20, height: 20, border: "2px solid " + CREAM2, borderTopColor: NAVY, borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 12px" }} />
            Loading…
          </div>
        )}

        {/* STEP: IDENTIFY */}
        {!loading && step === "identify" && (
          <div className="fade">
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: NAVY, marginBottom: 8 }}>Welcome to the jury</div>
            <div style={{ fontSize: 13, color: "#6a6a8a", marginBottom: 24, lineHeight: 1.7 }}>
              Please select your name to start the evaluation. You will score each startup separately — one form per startup.
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#a0a0b8", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8, fontWeight: 500 }}>Your name</div>
              {juryList.length > 0 ? (
                <select value={juryName} onChange={e => setJuryName(e.target.value)} style={{ fontSize: 14 }}>
                  <option value="">— Select your profile —</option>
                  {juryList.map(p => (
                    <option key={p.prenom + p.nom} value={p.prenom + " " + p.nom}>{p.prenom} {p.nom}</option>
                  ))}
                  <option value="__other__">Other / Not in list</option>
                </select>
              ) : (
                <input value={juryName} onChange={e => setJuryName(e.target.value)} placeholder="Enter your full name" style={{ fontFamily: "Inter, sans-serif", outline: "none", color: NAVY, border: "1.5px solid " + CREAM2, borderRadius: 10, padding: "10px 14px", fontSize: 14, background: "white", width: "100%" }} />
              )}
            </div>

            {juryName === "__other__" && (
              <div style={{ marginBottom: 16 }}>
                <input value="" onChange={e => setJuryName(e.target.value)} placeholder="Enter your full name" style={{ fontFamily: "Inter, sans-serif", outline: "none", color: NAVY, border: "1.5px solid " + CREAM2, borderRadius: 10, padding: "10px 14px", fontSize: 14, background: "white", width: "100%" }} />
              </div>
            )}

            <button className="btn" onClick={confirmIdentity} disabled={!juryName || juryName === "__other__"}
              style={{ width: "100%", padding: "13px", borderRadius: 11, background: juryName && juryName !== "__other__" ? NAVY : "#b0b0c0", color: "white", border: "none", fontSize: 14, fontWeight: 500 }}>
              Start evaluation →
            </button>

            <div style={{ fontSize: 11, color: "#a8a8c0", textAlign: "center", marginTop: 10 }}>
              You will evaluate {totalStartups} startups · ~15 minutes
            </div>
          </div>
        )}

        {/* STEP: SCORE */}
        {!loading && step === "score" && (
          <div className="fade">
            {/* Progress */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: "#9090a8" }}>
                  Startup <strong style={{ color: NAVY }}>{scoredCount + 1}</strong> of {totalStartups}
                </div>
                <div style={{ fontSize: 11, color: "#9090a8" }}>{juryName}</div>
              </div>
              <div style={{ height: 4, background: CREAM2, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: (scoredCount / totalStartups * 100) + "%", background: session.color, borderRadius: 2, transition: "width .4s" }} />
              </div>
            </div>

            {/* Startup name */}
            <div style={{ background: NAVY, borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: session.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{session.emoji}</div>
              <div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 2 }}>Now evaluating</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: "white" }}>{startup}</div>
              </div>
            </div>

            {/* Criteria */}
            {CRITERIA.map(c => (
              <ScoreSlider key={c.id} criterion={c} value={scores[c.id]} onChange={v => setScores(p => ({ ...p, [c.id]: v }))} />
            ))}

            {/* Comment */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#a0a0b8", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8, fontWeight: 500 }}>Comments (optional)</div>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Any other remarks you would like to be taken into account…" rows={3} style={{ resize: "vertical" }} />
            </div>

            {!allFilled && (
              <div style={{ fontSize: 12, color: "#8a2040", background: "#fbe8ee", padding: "10px 14px", borderRadius: 10, marginBottom: 12, border: "1px solid #e8a8bc" }}>
                Please score all 6 criteria before submitting.
              </div>
            )}

            <button className="btn" onClick={submitScore} disabled={!allFilled || submitting}
              style={{ width: "100%", padding: "13px", borderRadius: 11, background: allFilled && !submitting ? NAVY : "#b0b0c0", color: "white", border: "none", fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
              {submitting
                ? <><div style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .8s linear infinite" }} /> Submitting…</>
                : scoredCount + 1 === totalStartups ? "Submit & see recap →" : `Submit & next startup →`
              }
            </button>

            {/* Already scored startups */}
            {scoredCount > 0 && (
              <div style={{ marginTop: 16, padding: "12px 14px", background: "#e8f5ee", borderRadius: 10 }}>
                <div style={{ fontSize: 10.5, color: "#1d6b4f", fontWeight: 500, marginBottom: 4 }}>✓ Already scored:</div>
                {allScores.map(s => (
                  <div key={s.startup_name} style={{ fontSize: 11.5, color: "#1d6b4f" }}>
                    {s.startup_name} — avg {(CRITERIA.map(c => s[c.id]).reduce((a, b) => a + b, 0) / CRITERIA.length).toFixed(1)}/5
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP: DONE */}
        {!loading && step === "done" && (
          <RecapView sessionId={sessionId} juryName={juryName} scores={allScores} session={session} />
        )}

      </div>
    </div>
  );
}
