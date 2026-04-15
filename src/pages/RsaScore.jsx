import { useState, useEffect } from "react";

const SB = "https://uaoucznptxmvhhytapso.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhb3Vjem5wdHhtdmhoeXRhcHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTU5NzAsImV4cCI6MjA4OTQ5MTk3MH0.evOgZctRuIxGSnZLocea5cAKqKR5nc-5x32QDqBUt0U";
const H = { "apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json", "Prefer": "return=representation" };

const NAVY = "#0f1f3d", GOLD = "#c9a84c", CREAM = "#f7f4ef", CREAM2 = "#ede9e1";

const SESSIONS = {
  s1_foodtech: { label:"FoodTech & Économie circulaire", emoji:"🌾", date:"Jeudi 30 avril", color:"#5a7a1a", light:"#eef5e0", border:"#c0d890",
    startups:["DATUS","GREEN OFF GRID SAS","KIDIPOWER","KUZOG FRANCE","Kyol","Midow"] },
  s2_social: { label:"Impact social & Edtech", emoji:"🤝", date:"Mardi 6 mai", color:"#8a2040", light:"#fbe8ee", border:"#e8a8bc",
    startups:["Buddy","Clover","Hormur","Krewzer","SightKick"] },
  s3_tech: { label:"Tech, AI, Fintech & Mobilité", emoji:"💻", date:"Mardi 13 mai", color:"#4a2a7a", light:"#f0eaf8", border:"#c8b0e8",
    startups:["Boonty","DealMatrix","EVIMO","ex9","FollowTech"] },
  s4_health: { label:"Healthtech & Biotech", emoji:"🏥", date:"Mardi 19 mai", color:"#1a5fa8", light:"#e8f0fb", border:"#a8c8f0",
    startups:["Femnov","InFocus Therapeutics","IPCURE","PEGMATISS BIOTECH","VAir","Virtuosis Health SAS","wilo"] },
  s5_greentech: { label:"Greentech & Environnement", emoji:"🌱", date:"Jeudi 21 mai", color:"#1d6b4f", light:"#e8f5ee", border:"#b0d8c4",
    startups:["Maa Biodiversity","reLi Energy","SafyPower","Sycon","Vergora"] }
};

const CRITERIA = [
  { id:"score_value_prop", label:"Value Proposition", weight:"20%",
    desc:"Clarity of the problem addressed, strength of the customer pain, uniqueness and relevance of the solution.",
    anchors:{0:"No clear problem or value proposition",1:"Problem identified but solution unclear",2:"Real problem, generic solution",3:"Clear problem + differentiated solution",4:"Strong differentiation, validated by early customers",5:"Critical pain point + uniquely positioned solution with proven traction"} },
  { id:"score_market", label:"Market & Scalability", weight:"20%",
    desc:"Market size (TAM/SAM/SOM), accessibility, growth dynamics, and potential for geographic or sector expansion.",
    anchors:{0:"Market not defined",1:"Vague market reference",2:"Market identified but not quantified",3:"Quantified market with realistic segmentation",4:"Large credible market with clear go-to-market",5:"Large, quantified, high-growth market with scalable expansion plan"} },
  { id:"score_business_model", label:"Business Model", weight:"20%",
    desc:"Revenue logic, pricing model, unit economics, path to profitability.",
    anchors:{0:"No business model",1:"Revenue idea with no structure",2:"Model defined but fragile economics",3:"Clear model with some validated metrics",4:"Solid model, good unit economics, path to break-even visible",5:"Proven model, strong economics, clear scaling path"} },
  { id:"score_team", label:"Team Execution & Capability", weight:"20%",
    desc:"Founders' backgrounds, complementarity, relevant expertise, ability to execute and adapt.",
    anchors:{0:"Incomplete or irrelevant team",1:"Team lacks critical skills",2:"Relevant team with notable gaps",3:"Credible team with most key skills",4:"Strong complementary team with relevant track record",5:"Exceptional team — domain experts, proven executors, strong cohesion"} },
  { id:"score_pitch_quality", label:"Pitch Quality", weight:"10%",
    desc:"Structure, clarity, storytelling, handling of Q&A, time discipline.",
    anchors:{0:"Confusing, off-time, no narrative",1:"Basic structure, poor delivery",2:"Understandable but lacks conviction",3:"Clear and structured, decent delivery",4:"Compelling narrative, good Q&A",5:"Outstanding — clear, memorable, confident, excellent Q&A"} },
  { id:"score_societal_impact", label:"Societal & Environmental Impact", weight:"10%",
    desc:"Positive externalities beyond financial performance — social value, environmental contribution, alignment with Rotary values (service, ethics, community).",
    anchors:{0:"No identifiable positive impact",1:"Indirect or incidental impact",2:"Limited positive contribution",3:"Real impact, not yet measured",4:"Clear measurable impact with tracking",5:"Transformative, measurable, scalable positive impact aligned with Rotary values"} }
];

const EMPTY = () => Object.fromEntries(CRITERIA.map(c => [c.id, null]));

async function sbGet(path) {
  const r = await fetch(SB + path, { headers: H });
  return r.json();
}
async function sbPost(table, data, prefer = "resolution=merge-duplicates,return=minimal") {
  return fetch(`${SB}/rest/v1/${table}`, { method:"POST", headers:{...H, Prefer:prefer}, body:JSON.stringify(data) });
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500&display=swap');
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:${CREAM};min-height:100vh}
.fade{animation:fadeUp .28s ease both}
.btn{font-family:'Inter',sans-serif;cursor:pointer;transition:all .15s}
.btn:hover{filter:brightness(.91)}
.btn:active{transform:scale(.97)}
select,textarea,input[type=text]{font-family:'Inter',sans-serif;outline:none;color:${NAVY};border:1.5px solid ${CREAM2};border-radius:10px;padding:10px 14px;font-size:14px;background:white;transition:border-color .2s,box-shadow .2s;width:100%}
select:focus,textarea:focus,input[type=text]:focus{border-color:${GOLD};box-shadow:0 0 0 4px rgba(201,168,76,.12)}
`;

function PedaBlock({ collapsed, onToggle, color }) {
  return (
    <div style={{marginBottom:20,borderRadius:14,border:"1px solid "+CREAM2,overflow:"hidden",background:"white"}}>
      <button className="btn" onClick={onToggle}
        style={{width:"100%",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",background:collapsed?"white":NAVY,border:"none",color:collapsed?NAVY:"white",textAlign:"left"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>📋</span>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:600}}>Scoring Guide & Evaluation Framework</div>
            {collapsed&&<div style={{fontSize:11,color:"#9090a8",marginTop:1}}>Click to expand — scoring criteria, scale, and instructions</div>}
          </div>
        </div>
        <span style={{fontSize:12,opacity:.6}}>{collapsed?"▼ Show":"▲ Hide"}</span>
      </button>
      {!collapsed&&(
        <div style={{padding:"18px 20px"}}>
          {/* Scale */}
          <div style={{marginBottom:18}}>
            <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:".1em",color:"#a0a0b8",fontWeight:500,marginBottom:10}}>Scoring Scale — 0 to 5</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>
              {[
                {n:0,label:"Absent / Non-existent",color:"#8a2040",bg:"#fbe8ee"},
                {n:1,label:"Very weak",color:"#b04010",bg:"#fde8d8"},
                {n:2,label:"Below average",color:"#9a6400",bg:"#fdf6e8"},
                {n:3,label:"Average / Satisfactory",color:"#5a7a1a",bg:"#eef5e0"},
                {n:4,label:"Strong",color:"#1a5fa8",bg:"#e8f0fb"},
                {n:5,label:"Excellent / Outstanding",color:"#1d6b4f",bg:"#e8f5ee"},
              ].map(s=>(
                <div key={s.n} style={{background:s.bg,borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                  <div style={{fontSize:20,fontWeight:700,color:s.color,fontFamily:"'Playfair Display',serif"}}>{s.n}</div>
                  <div style={{fontSize:9,color:s.color,marginTop:2,lineHeight:1.3}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Criteria */}
          <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:".1em",color:"#a0a0b8",fontWeight:500,marginBottom:10}}>The 6 Criteria</div>
          {CRITERIA.map((c,i)=>(
            <div key={c.id} style={{marginBottom:10,padding:"12px 14px",background:CREAM,borderRadius:10,border:"1px solid "+CREAM2}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontSize:13,fontWeight:500,color:NAVY}}>{i+1}. {c.label}</div>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:"white",color:"#6a6a8a",border:"1px solid "+CREAM2,fontWeight:500}}>{c.weight}</span>
              </div>
              <div style={{fontSize:12,color:"#6a6a8a",marginBottom:8,lineHeight:1.6}}>{c.desc}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
                {[0,2,4,5].map(n=>(
                  <div key={n} style={{fontSize:10,color:"#6a6a8a",lineHeight:1.4}}>
                    <span style={{fontWeight:600,color:NAVY}}>{n}: </span>{c.anchors[n]}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* Rules */}
          <div style={{marginTop:10,padding:"12px 14px",background:"#fdf6e8",borderRadius:10,border:"1px solid #e8d090"}}>
            <div style={{fontSize:12,fontWeight:500,color:"#9a6400",marginBottom:6}}>⚖️ Important rules</div>
            <div style={{fontSize:12,color:"#7a5a00",lineHeight:1.8}}>
              • Score each startup independently — do not compare startups to each other while scoring<br/>
              • Base your score strictly on what was presented during the pitch<br/>
              • Comments are optional but encouraged — they help the final deliberation<br/>
              • Once submitted, a score cannot be modified<br/>
              • Your scores are confidential and aggregated automatically
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreRow({ criterion, value, onChange }) {
  const anchor = criterion.anchors[value];
  const col = value===null?"#c0c0d0":value>=4?"#1d6b4f":value>=2?"#9a6400":"#8a2040";
  return (
    <div style={{background:"white",border:"1px solid "+CREAM2,borderRadius:12,padding:"16px 18px",marginBottom:8}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
        <div style={{flex:1,paddingRight:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
            <span style={{fontSize:12,fontWeight:500,color:NAVY}}>{criterion.label}</span>
            <span style={{fontSize:10,padding:"1px 7px",borderRadius:6,background:CREAM,color:"#6a6a8a",border:"1px solid "+CREAM2}}>{criterion.weight}</span>
          </div>
          <div style={{fontSize:11,color:"#8a8aaa",lineHeight:1.5}}>{criterion.desc}</div>
        </div>
        <div style={{flexShrink:0,textAlign:"center",minWidth:42}}>
          <div style={{fontSize:28,fontWeight:700,color:col,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{value===null?"–":value}</div>
          <div style={{fontSize:9,color:"#a0a0b8"}}>/5</div>
        </div>
      </div>
      <div style={{display:"flex",gap:5,marginBottom:anchor?8:0}}>
        {[0,1,2,3,4,5].map(n=>{
          const active = value===n;
          const c = n>=4?"#1d6b4f":n>=2?"#9a6400":"#8a2040";
          const bg = n>=4?"#e8f5ee":n>=2?"#fdf6e8":"#fbe8ee";
          return (
            <button key={n} className="btn" onClick={()=>onChange(n)}
              style={{flex:1,padding:"10px 0",borderRadius:8,border:"1.5px solid "+(active?c:CREAM2),background:active?bg:"white",color:active?c:"#9090a8",fontSize:15,fontWeight:active?700:400,fontFamily:"'Playfair Display',serif"}}>
              {n}
            </button>
          );
        })}
      </div>
      {anchor&&<div style={{fontSize:11,color:"#6a6a8a",fontStyle:"italic",padding:"6px 10px",background:CREAM,borderRadius:7,borderLeft:"3px solid "+col}}>{anchor}</div>}
    </div>
  );
}

function RecapView({ juryName, allScores, session, orderedStartups }) {
  const CRIT_KEYS = CRITERIA.map(c=>c.id);
  const ranked = orderedStartups.map(name=>{
    const s = allScores.find(x=>x.startup_name===name);
    if(!s) return {name,avg:null,scored:false};
    const vals = CRIT_KEYS.map(k=>s[k]).filter(v=>v!==null&&v!==undefined);
    const avg = vals.length?parseFloat((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)):null;
    return {name,avg,scored:true,data:s};
  }).sort((a,b)=>(b.avg||0)-(a.avg||0));

  return (
    <div className="fade">
      <div style={{background:NAVY,borderRadius:14,padding:"20px",marginBottom:20,textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:8}}>🎉</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:600,color:"white",marginBottom:4}}>Evaluation complete</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>{juryName} · {session.label}</div>
      </div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:600,color:NAVY,marginBottom:12}}>Your ranking</div>
      {ranked.map((st,i)=>(
        <div key={st.name} style={{background:"white",border:"1px solid "+(i===0&&st.avg?session.border:CREAM2),borderRadius:12,padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:28,height:28,borderRadius:"50%",background:i===0&&st.avg?GOLD:CREAM2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,color:i===0&&st.avg?NAVY:"#9090a8",flexShrink:0,fontFamily:"'Playfair Display',serif"}}>{i+1}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500,color:NAVY,fontFamily:"'Playfair Display',serif"}}>{st.name}</div>
            {st.scored&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
                {CRITERIA.map(c=>{
                  const v=st.data[c.id];
                  const col=v>=4?"#1d6b4f":v>=2?"#9a6400":"#8a2040";
                  return <span key={c.id} style={{fontSize:9.5,padding:"2px 7px",borderRadius:8,background:CREAM,color:col,fontWeight:500}}>{c.label.split(" ")[0]}: {v}</span>;
                })}
              </div>
            )}
            {st.data?.comment&&<div style={{fontSize:11,color:"#9090a8",marginTop:4,fontStyle:"italic"}}>"{st.data.comment}"</div>}
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            {st.avg!=null?<><span style={{fontSize:20,fontWeight:700,color:session.color,fontFamily:"'Playfair Display',serif"}}>{st.avg}</span><span style={{fontSize:10,color:"#a0a0b8"}}>/5</span></>
              :<span style={{fontSize:11,color:"#c0c0d0"}}>not scored</span>}
          </div>
        </div>
      ))}
      <div style={{marginTop:16,padding:"14px 16px",background:"#e8f5ee",borderRadius:12,border:"1px solid #b0d8c4",textAlign:"center"}}>
        <div style={{fontSize:12,color:"#1d6b4f",fontWeight:500}}>✓ All scores submitted. Thank you for participating in the Rotary Startup Award 2026 jury.</div>
      </div>
    </div>
  );
}

export default function RsaScore() {
  const params = new URLSearchParams(window.location.search);
  const sid = params.get("s") || params.get("session");
  const session = SESSIONS[sid];

  const [step, setStep] = useState("loading"); // loading | inactive | identify | guide | score | done
  const [juryList, setJuryList] = useState([]);
  const [activeScorerNames, setActiveScorerNames] = useState([]);
  const [juryName, setJuryName] = useState("");
  const [orderedStartups, setOrderedStartups] = useState([]);
  const [startupIdx, setStartupIdx] = useState(0);
  const [scores, setScores] = useState(EMPTY());
  const [comment, setComment] = useState("");
  const [allScores, setAllScores] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [guideCollapsed, setGuideCollapsed] = useState(true);
  const [error, setError] = useState(null);

  useEffect(()=>{
    if(!session) { setStep("invalid"); return; }
    loadSession();
  },[]);

  async function loadSession() {
    try {
      // Load session config (active flag + custom order)
      const [cfgRows, profiles] = await Promise.all([
        sbGet(`/rest/v1/session_config?select=session_active,session_order&session_id=eq.${sid}`),
        sbGet(`/rest/v1/jury_profiles?select=prenom,nom,sessions,grande_finale&order=nom.asc`)
      ]);

      const cfg = cfgRows?.[0] || {};
      if(!cfg.session_active) { setStep("inactive"); return; }

      // Build ordered startup list
      const customOrder = cfg.session_order || [];
      const ordered = customOrder.length > 0 ? customOrder : session.startups;
      setOrderedStartups(ordered);

      // Filter jury for this session
      const shortKey = session.label.split("&")[0].trim().toLowerCase().split(" ").slice(0,2).join(" ");
      const relevant = (profiles||[]).filter(p=>
        (p.sessions||[]).some(s=>s.toLowerCase().includes(shortKey.toLowerCase())) || p.grande_finale
      );
      setJuryList(relevant);

      // Load active scorers (those who started but haven't finished)
      const scoringSessions = await sbGet(`/rest/v1/jury_scoring_sessions?select=jury_name,completed&session_id=eq.${sid}`);
      const active = (scoringSessions||[]).filter(s=>!s.completed).map(s=>s.jury_name);
      setActiveScorerNames(active);

      setStep("identify");
    } catch(e) {
      setError("Connection error. Please refresh."); setStep("error");
    }
  }

  async function startScoring() {
    if(!juryName) return;
    // Register scorer session
    try {
      await sbPost("jury_scoring_sessions", {session_id:sid, jury_name:juryName, completed:false});
    } catch(e) {}
    // Load any existing scores
    const existing = await sbGet(`/rest/v1/jury_scores?select=*&session_id=eq.${sid}&jury_name=eq.${encodeURIComponent(juryName)}`);
    const scored = existing||[];
    setAllScores(scored);
    const scoredNames = scored.map(s=>s.startup_name);
    const firstUnscored = orderedStartups.findIndex(n=>!scoredNames.includes(n));
    if(firstUnscored===-1) { setStep("done"); return; }
    setStartupIdx(firstUnscored);
    setStep("guide"); // show guide first
  }

  async function submitScore() {
    const startup = orderedStartups[startupIdx];
    if(CRITERIA.some(c=>scores[c.id]===null)) return;
    setSubmitting(true);
    try {
      await sbPost("jury_scores", {session_id:sid,jury_name:juryName,startup_name:startup,...scores,comment:comment||null});
      const updated = [...allScores.filter(s=>s.startup_name!==startup), {session_id:sid,jury_name:juryName,startup_name:startup,...scores,comment}];
      setAllScores(updated);
      const scoredNames = updated.map(s=>s.startup_name);
      const next = orderedStartups.findIndex((n,i)=>i>startupIdx&&!scoredNames.includes(n));
      if(next===-1) {
        // Mark scorer as completed
        await fetch(`${SB}/rest/v1/jury_scoring_sessions?session_id=eq.${sid}&jury_name=eq.${encodeURIComponent(juryName)}`,
          {method:"PATCH",headers:{...H,Prefer:"return=minimal"},body:JSON.stringify({completed:true})});
        setStep("done");
      } else {
        setStartupIdx(next); setScores(EMPTY()); setComment("");
      }
    } catch(e) { setError("Save error. Try again."); }
    setSubmitting(false);
  }

  if(!session || step==="invalid") return (
    <div style={{fontFamily:"Inter,sans-serif",background:CREAM,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
      <style>{css}</style>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:12}}>🔗</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:NAVY,marginBottom:6}}>Invalid link</div>
        <div style={{fontSize:12,color:"#6a6a8a"}}>Contact the organizer · prixstartuprotary@proton.me</div>
      </div>
    </div>
  );

  const startup = orderedStartups[startupIdx];
  const scoredCount = allScores.length;
  const allFilled = CRITERIA.every(c=>scores[c.id]!==null);

  return (
    <div style={{fontFamily:"Inter,sans-serif",background:CREAM,minHeight:"100vh"}}>
      <style>{css}</style>
      {/* NAV */}
      <div style={{background:NAVY,padding:"0 2rem",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10,borderBottom:"1px solid rgba(201,168,76,.18)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},#a07828)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:NAVY}}>R</div>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:13.5,fontWeight:600,color:"white"}}>Rotary Startup Award 2026</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".1em"}}>Pitch Evaluation · {session.emoji} {session.label.split("&")[0].trim()}</div>
          </div>
        </div>
        {step==="score"&&<div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>{scoredCount}/{orderedStartups.length} scored</div>}
      </div>

      <div style={{maxWidth:600,margin:"0 auto",padding:"2rem 1.5rem 5rem"}}>
        {/* Session badge */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,padding:"10px 14px",borderRadius:10,background:session.light,border:"1px solid "+session.border}}>
          <span style={{fontSize:18}}>{session.emoji}</span>
          <div>
            <div style={{fontSize:12.5,fontWeight:500,color:session.color}}>{session.label}</div>
            <div style={{fontSize:11,color:session.color,opacity:.7}}>{session.date}</div>
          </div>
        </div>

        {/* LOADING */}
        {step==="loading"&&(
          <div style={{textAlign:"center",padding:"3rem",color:"#a0a0b8"}}>
            <div style={{width:20,height:20,border:"2px solid "+CREAM2,borderTopColor:NAVY,borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 12px"}}/>
            Loading session…
          </div>
        )}

        {/* INACTIVE */}
        {step==="inactive"&&(
          <div className="fade" style={{textAlign:"center",padding:"2rem"}}>
            <div style={{fontSize:40,marginBottom:12}}>⏳</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:600,color:NAVY,marginBottom:8}}>Session not yet open</div>
            <div style={{fontSize:13,color:"#6a6a8a",lineHeight:1.7}}>The organizer has not yet activated this scoring session.<br/>You will receive an email or message when it's your turn.</div>
            <div style={{marginTop:16,fontSize:12,color:"#a0a0b8"}}>Contact: prixstartuprotary@proton.me</div>
          </div>
        )}

        {/* ERROR */}
        {step==="error"&&(
          <div style={{padding:"16px",background:"#fbe8ee",borderRadius:10,color:"#8a2040",fontSize:13}}>{error}</div>
        )}

        {/* IDENTIFY */}
        {step==="identify"&&(
          <div className="fade">
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:600,color:NAVY,marginBottom:6}}>Welcome to the jury</div>
            <div style={{fontSize:13,color:"#6a6a8a",marginBottom:20,lineHeight:1.7}}>
              Select your name to start. You will score each startup in the session order — one at a time.
            </div>

            {/* Pedagogical guide — collapsed by default on identify step */}
            <PedaBlock collapsed={guideCollapsed} onToggle={()=>setGuideCollapsed(!guideCollapsed)} color={session.color} />

            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:"#a0a0b8",textTransform:"uppercase",letterSpacing:".1em",marginBottom:8,fontWeight:500}}>Select your name</div>
              {juryList.length > 0 ? (
                <select value={juryName} onChange={e=>setJuryName(e.target.value)}>
                  <option value="">— Select your profile —</option>
                  {juryList.map(p=>{
                    const name = p.prenom+" "+p.nom;
                    const isActive = activeScorerNames.includes(name);
                    return (
                      <option key={name} value={name} disabled={isActive}>
                        {name}{isActive?" (already scoring — session in progress)":""}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div style={{padding:"12px",background:"#fdf6e8",borderRadius:10,border:"1px solid #e8d090",fontSize:12,color:"#9a6400"}}>
                  No jury profiles registered yet for this session. Contact the organizer.
                </div>
              )}
              {juryName&&activeScorerNames.includes(juryName)&&(
                <div style={{marginTop:8,fontSize:12,color:"#8a2040",padding:"10px 12px",background:"#fbe8ee",borderRadius:8}}>
                  ⚠️ A scoring session is already in progress under your name. Each jury member can only score once. Contact the organizer if this is an error.
                </div>
              )}
            </div>

            <button className="btn" onClick={startScoring}
              disabled={!juryName||activeScorerNames.includes(juryName)}
              style={{width:"100%",padding:"13px",borderRadius:11,background:(juryName&&!activeScorerNames.includes(juryName))?NAVY:"#b0b0c0",color:"white",border:"none",fontSize:14,fontWeight:500}}>
              Start evaluation →
            </button>
            <div style={{fontSize:11,color:"#a8a8c0",textAlign:"center",marginTop:8}}>
              {orderedStartups.length} startups · ~{Math.ceil(orderedStartups.length*3.5)} minutes
            </div>
          </div>
        )}

        {/* GUIDE — shown once before first score */}
        {step==="guide"&&(
          <div className="fade">
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:600,color:NAVY,marginBottom:6}}>Before you start</div>
            <div style={{fontSize:13,color:"#6a6a8a",marginBottom:16,lineHeight:1.7}}>
              Please read the evaluation framework carefully. You can always access it during scoring via the guide button at the top.
            </div>
            <PedaBlock collapsed={false} onToggle={()=>{}} color={session.color} />
            <div style={{marginTop:12,padding:"12px 16px",background:session.light,borderRadius:10,border:"1px solid "+session.border,marginBottom:16}}>
              <div style={{fontSize:12,color:session.color,fontWeight:500,marginBottom:4}}>Session order — {orderedStartups.length} startups</div>
              {orderedStartups.map((n,i)=><div key={n} style={{fontSize:12,color:session.color}}>  {i+1}. {n}</div>)}
            </div>
            <button className="btn" onClick={()=>setStep("score")}
              style={{width:"100%",padding:"13px",borderRadius:11,background:NAVY,color:"white",border:"none",fontSize:14,fontWeight:500}}>
              I'm ready — start scoring →
            </button>
          </div>
        )}

        {/* SCORE */}
        {step==="score"&&startup&&(
          <div className="fade">
            {/* Guide toggle */}
            <button className="btn" onClick={()=>setGuideCollapsed(!guideCollapsed)}
              style={{fontSize:11,padding:"5px 12px",borderRadius:8,background:CREAM,color:"#6a6a8a",border:"1px solid "+CREAM2,marginBottom:12,fontFamily:"Inter,sans-serif"}}>
              📋 {guideCollapsed?"Show scoring guide":"Hide scoring guide"}
            </button>
            {!guideCollapsed&&<PedaBlock collapsed={false} onToggle={()=>setGuideCollapsed(true)} color={session.color}/>}

            {/* Progress */}
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:11,color:"#9090a8"}}>Startup <strong style={{color:NAVY}}>{scoredCount+1}</strong> of {orderedStartups.length}</span>
                <span style={{fontSize:11,color:"#9090a8"}}>{juryName}</span>
              </div>
              <div style={{height:4,background:CREAM2,borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:(scoredCount/orderedStartups.length*100)+"%",background:session.color,borderRadius:2,transition:"width .4s"}}/>
              </div>
            </div>

            {/* Startup header */}
            <div style={{background:NAVY,borderRadius:12,padding:"16px 20px",marginBottom:16,display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:42,height:42,borderRadius:"50%",background:session.light,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{session.emoji}</div>
              <div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:2}}>Now evaluating</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,fontWeight:600,color:"white"}}>{startup}</div>
              </div>
              <div style={{marginLeft:"auto",textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,.3)"}}>#{scoredCount+1}/{orderedStartups.length}</div>
              </div>
            </div>

            {/* Criteria */}
            {CRITERIA.map(c=>(
              <ScoreRow key={c.id} criterion={c} value={scores[c.id]} onChange={v=>setScores(p=>({...p,[c.id]:v}))}/>
            ))}

            {/* Comment */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:"#a0a0b8",textTransform:"uppercase",letterSpacing:".1em",marginBottom:8,fontWeight:500}}>Comments (optional)</div>
              <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Additional remarks for the deliberation…" rows={3} style={{resize:"vertical"}}/>
            </div>

            {!allFilled&&<div style={{fontSize:12,color:"#8a2040",background:"#fbe8ee",padding:"10px 14px",borderRadius:10,marginBottom:12,border:"1px solid #e8a8bc"}}>Score all 6 criteria before submitting.</div>}

            <button className="btn" onClick={submitScore} disabled={!allFilled||submitting}
              style={{width:"100%",padding:"14px",borderRadius:11,background:allFilled&&!submitting?NAVY:"#b0b0c0",color:"white",border:"none",fontSize:14,fontWeight:500,display:"flex",alignItems:"center",justifyContent:"center",gap:9}}>
              {submitting
                ?<><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"white",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>Saving…</>
                :scoredCount+1===orderedStartups.length?"Submit & view recap →":"Submit & next startup →"
              }
            </button>

            {scoredCount>0&&(
              <div style={{marginTop:12,padding:"10px 12px",background:"#e8f5ee",borderRadius:10}}>
                <div style={{fontSize:10.5,color:"#1d6b4f",fontWeight:500,marginBottom:3}}>✓ Already scored:</div>
                {allScores.map(s=>{
                  const vals=CRITERIA.map(c=>s[c.id]).filter(v=>v!==null&&v!==undefined);
                  const avg=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):"-";
                  return <div key={s.startup_name} style={{fontSize:11.5,color:"#1d6b4f"}}>{s.startup_name} — {avg}/5</div>;
                })}
              </div>
            )}
          </div>
        )}

        {/* DONE */}
        {step==="done"&&(
          <RecapView juryName={juryName} allScores={allScores} session={session} orderedStartups={orderedStartups}/>
        )}
      </div>
    </div>
  );
}
