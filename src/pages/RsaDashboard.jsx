import { useState, useEffect, useRef } from "react";

const SB_URL = "https://uaoucznptxmvhhytapso.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhb3Vjem5wdHhtdmhoeXRhcHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTU5NzAsImV4cCI6MjA4OTQ5MTk3MH0.evOgZctRuIxGSnZLocea5cAKqKR5nc-5x32QDqBUt0U";
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json", "Prefer": "return=representation" };

const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#f7f4ef";
const CREAM2 = "#ede9e1";

const SC = {
  "Foodtech & économie circulaire": { id:"s1_foodtech", color:"#5a7a1a", light:"#eef5e0", border:"#c0d890", emoji:"🌾", short:"FoodTech", dateL:"Jeudi 30 avril · 18h",
    startups:["DATUS","GREEN OFF GRID SAS","KIDIPOWER","KUZOG FRANCE","Kyol","Midow"]},
  "Impact social & Edtech": { id:"s2_social", color:"#8a2040", light:"#fbe8ee", border:"#e8a8bc", emoji:"🤝", short:"Social", dateL:"Mercredi 6 mai · 18h",
    startups:["Buddy","Clover","Hormur","Krewzer","SightKick"]},
  "Tech, AI, Fintech & Mobilité": { id:"s3_tech", color:"#4a2a7a", light:"#f0eaf8", border:"#c8b0e8", emoji:"💻", short:"Tech", dateL:"Mercredi 13 mai · 18h",
    startups:["Boonty","DealMatrix","EVIMO","ex9","FollowTech"]},
  "Healthtech & Biotech": { id:"s4_health", color:"#1a5fa8", light:"#e8f0fb", border:"#a8c8f0", emoji:"🏥", short:"Health", dateL:"Mardi 19 mai · 18h",
    startups:["Femnov","InFocus Therapeutics","IPCURE","PEGMATISS BIOTECH","VAir","Virtuosis Health SAS","wilo"]},
  "Greentech & Environnement": { id:"s5_greentech", color:"#1d6b4f", light:"#e8f5ee", border:"#b0d8c4", emoji:"🌱", short:"Greentech", dateL:"Jeudi 21 mai · 18h",
    startups:["Maa Biodiversity","reLi Energy","SafyPower","Sycon","Vergora"]}
};
const SK = Object.keys(SC);

function sessMatch(as, sk) {
  const asL = (as||"").toLowerCase().trim();
  const skL = sk.toLowerCase();
  const shL = SC[sk].short.toLowerCase();
  if (asL === skL || asL === shL) return true;
  if (asL.startsWith(shL)) {
    const nextChar = asL.charAt(shL.length);
    return nextChar === "" || !/[a-zà-ÿ]/i.test(nextChar);
  }
  return asL.startsWith(skL);
}

const SESSION_CHECKS = [
  {id:"teams_ok",label:"Réunion Teams créée + lien récupéré",phase:"J-5"},
  {id:"jurys_3",label:"Min. 3 jurés confirmés",phase:"J-5"},
  {id:"airtable_ok",label:"Lien scoring envoyé aux jurés",phase:"J-5"},
  {id:"fiches_ok",label:"Fiches startups préparées",phase:"J-5"},
  {id:"link_startups",label:"Lien Teams envoyé aux startups",phase:"J-2"},
  {id:"brief_jury",label:"Brief jury envoyé (lien + Airtable + fiches)",phase:"J-2"},
  {id:"confs_checked",label:"Confirmations startups vérifiées",phase:"J-2"},
  {id:"ordre_tirage",label:"Ordre de passage tiré au sort",phase:"J-1"},
  {id:"rappel_jury",label:"Rappel jurés envoyé",phase:"J-1"},
  {id:"setup_ok",label:"Setup double écran prêt",phase:"J-1"},
  {id:"teams_open",label:"Réunion ouverte à 17h30",phase:"J+0"},
  {id:"jury_admitted",label:"Jurés admis 17h45",phase:"J+0"},
  {id:"session_go",label:"Session lancée à 18h00",phase:"J+0"},
  {id:"finalist_notif",label:"Finaliste notifié (dans les 48h)",phase:"J+0"},
];

const TIMELINE = [
  {date:"30 avril",day:"Jeu",label:"Session 1 — FoodTech",color:"#5a7a1a"},
  {date:"6 mai",day:"Mer",label:"Session 2 — Impact social & Edtech",color:"#8a2040"},
  {date:"13 mai",day:"Mer",label:"Session 3 — Tech, AI, Fintech",color:"#4a2a7a"},
  {date:"19 mai",day:"Mar",label:"Session 4 — Healthtech & Biotech",color:"#1a5fa8"},
  {date:"21 mai",day:"Jeu",label:"Session 5 — Greentech",color:"#1d6b4f"},
  {date:"26 mai",day:"Mar",label:"Grande Finale — Cyrus Conseil 16h–19h",color:GOLD,type:"finale",note:"50 bd Haussmann, Paris 75009"},
  {date:"3 juin",day:"Mer",label:"Remise des prix — Cercle Interalliée",color:NAVY,type:"ceremony",note:"Déjeuner statutaire du Rotary Club de Paris"}
];

const TABS = [
  {id:"calendar",label:"Calendrier"},
  {id:"sessions",label:"Organisation sessions"},
  {id:"jury",label:"Jury"},
  {id:"profiles",label:"Profils jury"},
];

// Direct Supabase REST calls
async function sbGet(table, params = "") {
  const r = await fetch(`${SB_URL}/rest/v1/${table}${params}`, { headers: SB_HEADERS });
  return r.json();
}

async function sbUpsert(table, data) {
  await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...SB_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(data)
  });
}

async function sbRpc(sql) {
  await fetch(`${SB_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST", headers: SB_HEADERS, body: JSON.stringify({ sql })
  });
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,400&family=Inter:wght@300;400;500&display=swap');
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:${CREAM};min-height:100vh}
.fade{animation:fadeUp .28s ease both}
.card{background:white;border:1px solid rgba(15,31,61,.08);border-radius:14px;transition:box-shadow .2s}
.card:hover{box-shadow:0 4px 18px rgba(15,31,61,.06)}
.btn{font-family:'Inter',sans-serif;cursor:pointer;transition:all .15s}
.btn:hover{filter:brightness(.91)}
.btn:active{transform:scale(.97)}
.inp{font-family:'Inter',sans-serif;outline:none;color:${NAVY};border:1px solid ${CREAM2};border-radius:8px;padding:7px 10px;font-size:12px;background:${CREAM};transition:border-color .2s}
.inp:focus{border-color:${GOLD};box-shadow:0 0 0 3px rgba(201,168,76,.13)}
.inp::placeholder{color:#b8b8c8}
.spinner{width:12px;height:12px;border:1.5px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:spin .8s linear infinite;display:inline-block}
`;


function LiveScoresHub({sessionId, sessionLabel, color, light, border, startups}) {
  const [scores, setScores] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchScores() {
    setLoading(true);
    try {
      const r = await fetch(`${SB_URL}/rest/v1/jury_scores?select=jury_name,startup_name,score_value_prop,score_market,score_business_model,score_team,score_pitch_quality,score_societal_impact&session_id=eq.${sessionId}`, {headers: SB_HEADERS});
      const data = await r.json();
      setScores(data||[]);
      setLastRefresh(new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    } catch(e) {}
    setLoading(false);
  }

  useEffect(()=>{
    fetchScores();
    const t = setInterval(fetchScores, 30000);
    return ()=>clearInterval(t);
  }, [sessionId]);

  if (scores.length === 0 && !loading) return (
    <div style={{marginTop:10,padding:"10px 12px",background:CREAM,borderRadius:10,border:"1px solid "+CREAM2}}>
      <div style={{fontSize:10,color:"#a0a0b8",textAlign:"center"}}>Aucun score encore soumis</div>
    </div>
  );

  // Compute averages per startup
  const CRIT_KEYS = ["score_value_prop","score_market","score_business_model","score_team","score_pitch_quality","score_societal_impact"];
  const jurySet = [...new Set(scores.map(s=>s.jury_name))];
  const avgByStartup = startups.map(name=>{
    const stScores = scores.filter(s=>s.startup_name===name);
    if(stScores.length===0) return {name,avg:null,count:0};
    const allVals = stScores.flatMap(s=>CRIT_KEYS.map(k=>s[k]).filter(v=>v!==null&&v!==undefined));
    const avg = allVals.length>0?(allVals.reduce((a,b)=>a+b,0)/allVals.length):null;
    return {name,avg:avg?parseFloat(avg.toFixed(2)):null,count:stScores.length};
  }).sort((a,b)=>(b.avg||0)-(a.avg||0));

  return (
    <div style={{marginTop:12}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".1em",color:"#a0a0b8",fontWeight:500}}>
          🔴 Scores live · {jurySet.length} juré{jurySet.length>1?"s":""} · auto-refresh 30s
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {lastRefresh&&<span style={{fontSize:9,color:"#b0b0c0"}}>{lastRefresh}</span>}
          <button className="btn" onClick={fetchScores} disabled={loading} style={{fontSize:9.5,padding:"3px 8px",borderRadius:6,background:CREAM,color:"#9090a8",border:"1px solid "+CREAM2,fontFamily:"Inter,sans-serif"}}>
            {loading?"...":"↺"}
          </button>
        </div>
      </div>
      {avgByStartup.map((st,i)=>{
        const pct = st.avg?(st.avg/5*100):0;
        return (
          <div key={st.name} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 8px",borderRadius:8,background:i===0&&st.avg?light:"white",border:"1px solid "+(i===0&&st.avg?border:CREAM2),marginBottom:4}}>
            <div style={{fontSize:11,fontWeight:600,color:"#9090a8",width:16,textAlign:"center",flexShrink:0}}>{st.avg?i+1:"–"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:11.5,fontWeight:500,color:NAVY}}>{st.name}</div>
              {st.avg&&<div style={{height:3,background:CREAM2,borderRadius:2,marginTop:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:pct+"%",background:color,borderRadius:2,transition:"width .4s"}}/>
              </div>}
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              {st.avg
                ?<><span style={{fontSize:14,fontWeight:600,color:color,fontFamily:"'Playfair Display',serif"}}>{st.avg}</span><span style={{fontSize:9.5,color:"#a0a0b8"}}>/5</span></>
                :<span style={{fontSize:10,color:"#c0c0d0"}}>—</span>
              }
              <div style={{fontSize:9,color:"#b0b0c0"}}>{st.count} score{st.count>1?"s":""}</div>
            </div>
          </div>
        );
      })}
      {jurySet.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
          {jurySet.map(j=><span key={j} style={{fontSize:9.5,padding:"2px 8px",borderRadius:8,background:"#e8f5ee",color:"#1d6b4f",border:"1px solid #b0d8c4"}}>✓ {j}</span>)}
        </div>
      )}
    </div>
  );
}

export default function RsaDashboard() {
  const [tab, setTab] = useState("calendar");
  const [sessConf, setSessConf] = useState({});
  const [confs, setConfs] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [juryView, setJuryView] = useState("pool");
  const [assignView, setAssignView] = useState("byJury");
  const [jurys, setJurys] = useState([]);
  const [addJuror, setAddJuror] = useState(null);
  const [detailJuror, setDetailJuror] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nj, setNj] = useState({name:"",type:"Rotary",role:"",email:"",sessions:[]});
  const saveTm = useRef(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [cfgRows, confRows, profRows] = await Promise.all([
        sbGet("session_config", "?select=session_id,teams_link,airtable_link,notes,checklist"),
        sbGet("startup_confirmations", "?select=startup_name,session_id,status,note"),
        sbGet("jury_profiles", "?select=id,prenom,nom,qualite,organisation,email,sessions,assigned_sessions,validated,grande_finale,photo_base64,lang,created_at&order=created_at.desc")
      ]);
      const cfg = {};
      (cfgRows||[]).forEach(r => { cfg[r.session_id] = {teams_link:r.teams_link||"",airtable_link:r.airtable_link||"",notes:r.notes||"",checklist:r.checklist||{}}; });
      setSessConf(cfg);
      const cf = {};
      (confRows||[]).forEach(r => { cf[r.startup_name+"__"+r.session_id] = {status:r.status,note:r.note||""}; });
      setConfs(cf);
      setProfiles(profRows||[]);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function saveConf(sid, field, value) {
    const cur = sessConf[sid]||{};
    const updated = {...cur, [field]:value};
    setSessConf(p => ({...p, [sid]:updated}));
    setSaving(true);
    try {
      await sbUpsert("session_config", {
        session_id: sid,
        teams_link: field==="teams_link"?value:(cur.teams_link||""),
        airtable_link: field==="airtable_link"?value:(cur.airtable_link||""),
        notes: field==="notes"?value:(cur.notes||""),
        checklist: field==="checklist"?value:(cur.checklist||{})
      });
    } catch(e) {}
    setSaving(false);
  }

  async function toggleSessCheck(sid, checkId) {
    const cur = sessConf[sid]||{};
    const cl = {...(cur.checklist||{}), [checkId]:!(cur.checklist||{})[checkId]};
    await saveConf(sid, "checklist", cl);
  }

  async function cycleConf(name, sid) {
    const key = name+"__"+sid;
    const cur = (confs[key]||{}).status||"pending";
    const next = cur==="pending"?"confirmed":cur==="confirmed"?"declined":"pending";
    setConfs(p => ({...p, [key]:{...(p[key]||{}),status:next}}));
    setSaving(true);
    try {
      await sbUpsert("startup_confirmations", {startup_name:name, session_id:sid, status:next, note:(confs[key]||{}).note||""});
    } catch(e) {}
    setSaving(false);
  }

  function saveNoteDebounced(name, sid, note) {
    const key = name+"__"+sid;
    setConfs(p => ({...p, [key]:{...(p[key]||{}),note}}));
    if(saveTm.current) clearTimeout(saveTm.current);
    saveTm.current = setTimeout(async () => {
      setSaving(true);
      try {
        await sbUpsert("startup_confirmations", {startup_name:name, session_id:sid, status:(confs[key]||{}).status||"pending", note});
      } catch(e) {}
      setSaving(false);
    }, 800);
  }

  function addJury() {
    if(!nj.name.trim()) return;
    setJurys(p => [...p, {...nj, id:Date.now(), confirmed:false}]);
    setNj({name:"",type:"Rotary",role:"",email:"",sessions:[]});
  }

  const totalSt = Object.values(SC).reduce((a,s)=>a+s.startups.length,0);
  const totalConf = Object.values(confs).filter(c=>c.status==="confirmed").length;
  const totalDecl = Object.values(confs).filter(c=>c.status==="declined").length;
  const phaseColors = {"J-5":"#9a6400","J-2":"#1a5fa8","J-1":"#4a2a7a","J+0":"#1d6b4f"};
  const phaseBgs = {"J-5":"#fdf6e8","J-2":"#e8f0fb","J-1":"#f0eaf8","J+0":"#e8f5ee"};

  return (
    <div style={{fontFamily:"Inter,sans-serif",background:CREAM,minHeight:"100vh"}}>
      <style>{css}</style>

      {/* NAV */}
      <div style={{background:NAVY,position:"sticky",top:0,zIndex:100,borderBottom:"1px solid rgba(201,168,76,.18)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1.5rem",height:58}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},#a07828)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:NAVY}}>R</div>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:600,color:"white"}}>Rotary Startup Award 2026</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:".1em",textTransform:"uppercase"}}>Dashboard · Commission Paris</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {loading && <span style={{fontSize:11,color:"rgba(255,255,255,.4)",display:"flex",alignItems:"center",gap:6}}><span className="spinner"/>Chargement…</span>}
            {saving && <span style={{fontSize:11,color:GOLD}}>Sauvegarde…</span>}
            <a href="/RsaJuryForm" target="_blank" rel="noopener noreferrer" className="btn" style={{fontSize:11,padding:"5px 12px",borderRadius:8,background:"rgba(201,168,76,.15)",color:GOLD,border:"1px solid rgba(201,168,76,.35)",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:5}}>✎ Formulaire jury</a>
            <button className="btn" onClick={loadAll} style={{fontSize:11,padding:"5px 12px",borderRadius:8,background:"rgba(255,255,255,.08)",color:"rgba(255,255,255,.5)",border:"1px solid rgba(255,255,255,.1)"}}>↺</button>
          </div>
        </div>
        <div style={{display:"flex",padding:"0 1.5rem",overflowX:"auto"}}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{fontFamily:"Inter,sans-serif",fontSize:11.5,padding:"8px 14px",background:"none",border:"none",cursor:"pointer",color:tab===t.id?GOLD:"rgba(255,255,255,.4)",fontWeight:tab===t.id?500:400,borderBottom:"2px solid "+(tab===t.id?GOLD:"transparent"),marginBottom:-1,whiteSpace:"nowrap",transition:"color .2s"}}>
              {t.label}
              {t.id==="sessions"&&totalConf>0&&<span style={{marginLeft:5,fontSize:9,background:"#1d6b4f",color:"white",padding:"1px 5px",borderRadius:8}}>{totalConf}</span>}
              {t.id==="profiles"&&profiles.length>0&&<span style={{marginLeft:5,fontSize:9,background:"rgba(255,255,255,.15)",color:"white",padding:"1px 5px",borderRadius:8}}>{profiles.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div style={{background:"white",borderBottom:"1px solid "+CREAM2,padding:"12px 1.5rem"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,maxWidth:700}}>
          {[
            [totalSt+"/64","startups sélectionnées"],
            [totalConf+"/"+totalSt,"confirmations reçues"],
            [totalDecl||"0","désistements"],
            [profiles.length,"profils jury reçus"]
          ].map((item,i) => (
            <div key={i} style={{background:CREAM,borderRadius:10,padding:"9px 12px",textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:500,color:i===1&&totalConf>0?"#1d6b4f":i===2&&totalDecl>0?"#8a2040":NAVY,fontFamily:"'Playfair Display',serif"}}>{item[0]}</div>
              <div style={{fontSize:9.5,color:"#9090a8",marginTop:2,letterSpacing:".04em"}}>{item[1]}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:"1.25rem 1.5rem"}}>

        {/* CALENDAR */}
        {tab==="calendar" && (
          <div className="card fade" style={{padding:"20px 22px"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:600,color:NAVY,marginBottom:20}}>Calendrier de la compétition</div>
            <div style={{position:"relative",paddingLeft:80}}>
              <div style={{position:"absolute",left:62,top:14,bottom:14,width:2,background:CREAM2,borderRadius:1}}/>
              {TIMELINE.map((item,i) => {
                const isF=item.type==="finale"; const isC=item.type==="ceremony";
                return (
                  <div key={i} className="fade" style={{display:"flex",alignItems:"flex-start",gap:18,marginBottom:18,animationDelay:i*.05+"s"}}>
                    <div style={{width:80,flexShrink:0,textAlign:"right",paddingRight:18,position:"relative"}}>
                      <div style={{fontSize:13,fontWeight:500,color:NAVY}}>{item.date}</div>
                      <div style={{fontSize:10,color:"#9090a8"}}>{item.day}</div>
                      <div style={{position:"absolute",right:-6,top:"50%",transform:"translateY(-50%)",width:isF||isC?14:10,height:isF||isC?14:10,borderRadius:"50%",background:item.color,border:"2px solid white",boxShadow:`0 0 0 2px ${item.color}40`}}/>
                    </div>
                    <div style={{flex:1,padding:"9px 13px",borderRadius:10,border:"1px solid "+(isF?GOLD+"50":isC?NAVY+"20":"rgba(15,31,61,.07)"),background:isF?"#fdf6e8":isC?"#f0f2f8":"white"}}>
                      <div style={{fontSize:13,fontWeight:isF||isC?600:400,color:NAVY,fontFamily:isF||isC?"'Playfair Display',serif":"Inter,sans-serif"}}>{item.label}</div>
                      {item.note&&<div style={{fontSize:10.5,color:isF?"#9a6400":"#4a5a7a",marginTop:2}}>{item.note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUIVI SESSIONS */}
        {tab==="sessions" && (
          <div>
            {SK.map((sk,si) => {
              const s = SC[sk]; const sid = s.id;
              const cfg = sessConf[sid]||{};
              const cl = cfg.checklist||{};
              const stConfs = s.startups.map(name => ({
                name,
                status: (confs[name+"__"+sid]||{}).status||"pending",
                note: (confs[name+"__"+sid]||{}).note||""
              }));
              const nConf = stConfs.filter(x=>x.status==="confirmed").length;
              const nDecl = stConfs.filter(x=>x.status==="declined").length;
              const clDone = SESSION_CHECKS.filter(c=>cl[c.id]).length;
              const phases = ["J-5","J-2","J-1","J+0"];

              return (
                <div key={sk} className="card fade" style={{marginBottom:14,overflow:"hidden",animationDelay:si*.05+"s"}}>
                  <div style={{background:NAVY,padding:"12px 18px",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:4,height:36,borderRadius:2,background:s.color,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:600,color:"white"}}>{s.emoji} {sk}</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,.4)",marginTop:2}}>{s.dateL} · {s.startups.length} startups</div>
                    </div>
                    <div style={{display:"flex",gap:14,alignItems:"center"}}>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:18,fontWeight:600,color:nConf===s.startups.length?"#4caf80":nConf>0?GOLD:"rgba(255,255,255,.3)",fontFamily:"'Playfair Display',serif"}}>{nConf}/{s.startups.length}</div>
                        <div style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>confirmés</div>
                      </div>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:18,fontWeight:600,color:"rgba(255,255,255,.4)",fontFamily:"'Playfair Display',serif"}}>{clDone}/{SESSION_CHECKS.length}</div>
                        <div style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>actions</div>
                      </div>
                    </div>
                  </div>

                  <div style={{padding:"14px 18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                    {/* Left */}
                    <div>
                      {/* Links */}
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".1em",color:"#a0a0b8",fontWeight:500,marginBottom:7}}>Liens</div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                          <span style={{fontSize:10,color:"#6a6a8a",width:60,flexShrink:0}}>🎥 Teams</span>
                          <input className="inp" value={cfg.teams_link||""} onChange={e=>setSessConf(p=>({...p,[sid]:{...(p[sid]||{}),teams_link:e.target.value}}))} onBlur={e=>saveConf(sid,"teams_link",e.target.value)} placeholder="Lien réunion Teams…" style={{flex:1,fontSize:11}}/>
                          {cfg.teams_link&&<a href={cfg.teams_link} target="_blank" rel="noreferrer" style={{fontSize:11,color:GOLD,textDecoration:"none",flexShrink:0}}>↗</a>}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                          <span style={{fontSize:10,color:"#6a6a8a",width:60,flexShrink:0}}>📊 Scoring</span>
                          <div style={{flex:1,fontSize:11,padding:"7px 10px",background:"#e8f5ee",borderRadius:8,border:"1px solid #b0d8c4",color:"#1d6b4f",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {window.location.origin}/RsaScore?s={sid}
                          </div>
                          <button className="btn" onClick={()=>{
                            const link = window.location.origin + "/RsaScore?s=" + sid;
                            navigator.clipboard.writeText(link).catch(()=>{});
                          }} style={{fontSize:10,padding:"5px 10px",borderRadius:8,background:"#1d6b4f",color:"white",border:"none",flexShrink:0}}>📋</button>
                          <a href={"/RsaScore?s="+sid} target="_blank" rel="noreferrer" style={{fontSize:11,color:GOLD,textDecoration:"none",flexShrink:0}}>↗</a>
                        </div>
                      </div>
                      {/* Activate session */}
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".1em",color:"#a0a0b8",fontWeight:500,marginBottom:7}}>Statut session</div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{flex:1,padding:"8px 12px",borderRadius:9,background:cfg.session_active?"#e8f5ee":"#fff8f6",border:"1px solid "+(cfg.session_active?"#b0d8c4":"#f0c0b0")}}>
                            <div style={{fontSize:12,fontWeight:500,color:cfg.session_active?"#1d6b4f":"#8a2040"}}>
                              {cfg.session_active?"🟢 Active — jurés peuvent scorer":"🔴 Inactive — scoring bloqué"}
                            </div>
                          </div>
                          <button className="btn" onClick={async()=>{await saveConf(sid,"session_active",!cfg.session_active);}}
                            style={{fontSize:11,padding:"8px 14px",borderRadius:9,background:cfg.session_active?"#8a2040":NAVY,color:"white",border:"none",fontFamily:"Inter,sans-serif",fontWeight:500,flexShrink:0}}>
                            {cfg.session_active?"Désactiver":"Activer"}
                          </button>
                        </div>
                      </div>

                      {/* Startup order */}
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".1em",color:"#a0a0b8",fontWeight:500,marginBottom:7}}>Ordre de passage ↑↓</div>
                        {(()=>{
                          const order=(cfg.session_order&&cfg.session_order.length>0)?cfg.session_order:s.startups;
                          return order.map((name,i)=>(
                            <div key={name} style={{display:"flex",alignItems:"center",gap:7,padding:"4px 7px",background:"white",border:"1px solid "+CREAM2,borderRadius:7,marginBottom:2}}>
                              <span style={{fontSize:10,color:"#b0b0c0",width:14,textAlign:"center",flexShrink:0}}>{i+1}</span>
                              <span style={{flex:1,fontSize:11.5,color:NAVY}}>{name}</span>
                              <div style={{display:"flex",gap:2,flexShrink:0}}>
                                <button className="btn" disabled={i===0} onClick={async()=>{const o=[...order];[o[i-1],o[i]]=[o[i],o[i-1]];await saveConf(sid,"session_order",o);}}
                                  style={{fontSize:10,padding:"1px 6px",borderRadius:5,background:CREAM,border:"1px solid "+CREAM2,color:i===0?"#d0d0d0":NAVY,fontFamily:"Inter,sans-serif"}}>↑</button>
                                <button className="btn" disabled={i===order.length-1} onClick={async()=>{const o=[...order];[o[i+1],o[i]]=[o[i],o[i+1]];await saveConf(sid,"session_order",o);}}
                                  style={{fontSize:10,padding:"1px 6px",borderRadius:5,background:CREAM,border:"1px solid "+CREAM2,color:i===order.length-1?"#d0d0d0":NAVY,fontFamily:"Inter,sans-serif"}}>↓</button>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>

                      {/* Confirmations */}
                      <div>
                        <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".1em",color:"#a0a0b8",fontWeight:500,marginBottom:7}}>Confirmations startups</div>
                        {stConfs.map(st => {
                          const color = st.status==="confirmed"?"#1d6b4f":st.status==="declined"?"#8a2040":"#9090a8";
                          const bg = st.status==="confirmed"?"#e8f5ee":st.status==="declined"?"#fbe8ee":CREAM;
                          const border = st.status==="confirmed"?"#b0d8c4":st.status==="declined"?"#e8a8bc":CREAM2;
                          const lbl = st.status==="confirmed"?"✓ Confirmé":st.status==="declined"?"✕ Désisté":"⏳ Attente";
                          return (
                            <div key={st.name} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 8px",borderRadius:8,background:bg,border:"1px solid "+border,marginBottom:3}}>
                              <button className="btn" onClick={()=>cycleConf(st.name,sid)} style={{fontSize:9.5,padding:"2px 8px",borderRadius:8,background:color,color:"white",border:"none",fontFamily:"Inter,sans-serif",fontWeight:500,flexShrink:0,minWidth:70}}>
                                {lbl}
                              </button>
                              <div style={{flex:1,fontSize:11.5,fontWeight:500,color:NAVY}}>{st.name}</div>
                              <input className="inp" value={st.note} onChange={e=>saveNoteDebounced(st.name,sid,e.target.value)} placeholder="Note…" style={{width:90,fontSize:10,padding:"3px 7px"}}/>
                            </div>
                          );
                        })}
                        {nDecl>0&&<div style={{fontSize:10.5,color:"#8a2040",marginTop:5}}>⚠️ {nDecl} désistement{nDecl>1?"s":""}</div>}
                      </div>
                    </div>

                    {/* Right: Checklist */}
                    <div>
                      <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".1em",color:"#a0a0b8",fontWeight:500,marginBottom:8}}>Checklist opérationnelle</div>
                      {phases.map(phase => {
                        const phChecks = SESSION_CHECKS.filter(c=>c.phase===phase);
                        const phDone = phChecks.filter(c=>cl[c.id]).length;
                        return (
                          <div key={phase} style={{marginBottom:10}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                              <span style={{fontSize:9.5,padding:"1px 8px",borderRadius:8,background:phaseBgs[phase],color:phaseColors[phase],fontWeight:600}}>{phase}</span>
                              <span style={{fontSize:10,color:phDone===phChecks.length?"#1d6b4f":"#9090a8"}}>{phDone}/{phChecks.length}</span>
                            </div>
                            {phChecks.map(c => {
                              const done = !!cl[c.id];
                              return (
                                <div key={c.id} className="btn" onClick={()=>toggleSessCheck(sid,c.id)}
                                  style={{display:"flex",alignItems:"center",gap:8,padding:"5px 6px",borderRadius:7,marginBottom:2,opacity:done?.5:1,background:done?"#f8f8f5":"transparent"}}>
                                  <div style={{width:13,height:13,borderRadius:3,flexShrink:0,border:done?"none":"1.5px solid #d0d0e0",background:done?"#1d6b4f":"white",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                    {done&&<svg width="7" height="5" viewBox="0 0 7 5" fill="none"><path d="M1 2.5L2.5 4L6 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                  </div>
                                  <span style={{fontSize:11,color:done?"#9090a8":NAVY,textDecoration:done?"line-through":"none"}}>{c.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                    {/* Live Scores Hub */}
                    <LiveScoresHub sessionId={sid} sessionLabel={sk} color={s.color} light={s.light} border={s.border} startups={s.startups} />

                    {/* Jurés de la session */}
                    {(()=>{
                      const sessJurors = profiles.filter(p=>p.validated && (p.assigned_sessions||[]).some(as=>sessMatch(as,sk)));
                      return (
                        <div>
                          <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".1em",color:"#a0a0b8",fontWeight:500,marginBottom:8}}>Jurés de la session <span style={{color:sessJurors.length>=3?"#1d6b4f":"#c03010",marginLeft:4}}>({sessJurors.length})</span></div>
                          {sessJurors.length===0&&<div style={{fontSize:11,color:"#c0c0d0",fontStyle:"italic",padding:"10px 0"}}>Aucun juré assigné — aller dans l'onglet Jury</div>}
                          {sessJurors.map(j=>(
                            <div key={j.id} style={{display:"flex",alignItems:"center",gap:9,padding:"6px 9px",background:"white",border:"1px solid "+CREAM2,borderRadius:8,marginBottom:3}}>
                              {j.photo_base64
                                ?<img src={j.photo_base64} alt="" style={{width:26,height:26,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
                                :<div style={{width:26,height:26,borderRadius:"50%",background:NAVY,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:600,color:GOLD,flexShrink:0}}>{(j.prenom||"?")[0]}{(j.nom||"?")[0]}</div>
                              }
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:11.5,fontWeight:500,color:NAVY,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{j.prenom} {j.nom}</div>
                                <div style={{fontSize:10,color:"#9090a8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{j.qualite}{j.organisation?" · "+j.organisation:""}</div>
                              </div>
                              {j.grande_finale&&<span title="Grande Finale" style={{fontSize:11,flexShrink:0}}>🏆</span>}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* JURY */}
        {tab==="jury" && (
          <div>
            {/* Sub-nav */}
            <div style={{display:"flex",gap:6,marginBottom:16,background:"white",padding:"4px",borderRadius:12,border:"1px solid "+CREAM2,width:"fit-content"}}>
              {[["pool","Pool entrant"],["validated","Panel validé"],["assign","Allocation sessions"]].map(([id,lbl])=>(
                <button key={id} className="btn" onClick={()=>setJuryView(id)}
                  style={{fontSize:12,padding:"7px 16px",borderRadius:9,background:juryView===id?NAVY:"transparent",color:juryView===id?"white":"#9090a8",border:"none",fontFamily:"Inter,sans-serif",fontWeight:juryView===id?500:400}}>
                  {lbl}
                  {id==="pool"&&profiles.filter(p=>!p.validated).length>0&&<span style={{marginLeft:6,fontSize:9,background:"#c9a84c",color:NAVY,padding:"1px 5px",borderRadius:8}}>{profiles.filter(p=>!p.validated).length}</span>}
                  {id==="validated"&&profiles.filter(p=>p.validated).length>0&&<span style={{marginLeft:6,fontSize:9,background:"#1d6b4f",color:"white",padding:"1px 5px",borderRadius:8}}>{profiles.filter(p=>p.validated).length}</span>}
                </button>
              ))}
            </div>

            {/* POOL — jurés en attente de validation */}
            {juryView==="pool"&&(
              <div>
                <div style={{fontSize:12,color:"#9090a8",marginBottom:10}}>Jurés inscrits via le formulaire — à valider avant de les affecter aux sessions.</div>
                {profiles.filter(p=>!p.validated).length===0&&<div style={{padding:"2rem",textAlign:"center",color:"#c0c0d0",fontStyle:"italic",fontSize:13}}>Aucun profil en attente</div>}
                {profiles.filter(p=>!p.validated).map((p,i)=>{
                  const name=p.prenom+" "+p.nom;
                  return(
                    <div key={p.id} className="card fade" style={{padding:"13px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:14}}>
                      <div style={{width:38,height:38,borderRadius:"50%",background:NAVY,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,color:GOLD,flexShrink:0}}>{(p.prenom||"?")[0]}{(p.nom||"?")[0]}</div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:600,color:NAVY}}>{name}</div>
                        <div style={{fontSize:11,color:"#6a6a8a"}}>{p.qualite}{p.organisation?" · "+p.organisation:""}</div>
                        <div style={{fontSize:10,color:"#a0a0b8",marginTop:2}}>{p.email}</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:5}}>
                          {(p.sessions||[]).map(s=>{
                            const fk=SK.find(k=>sessMatch(s,k));const f=fk?SC[fk]:null;
                            return <span key={s} style={{fontSize:9.5,padding:"2px 7px",borderRadius:8,background:f?f.light:CREAM,color:f?f.color:"#888",border:"1px solid "+(f?f.border:CREAM2)}}>{f?f.emoji:""} {s.split("&")[0].trim()}</span>;
                          })}
                          {p.grande_finale&&<span style={{fontSize:9.5,padding:"2px 7px",borderRadius:8,background:"#fdf6e8",color:"#9a6400",border:"1px solid #e8d090"}}>🏆 Finale</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,flexShrink:0}}>
                        <button className="btn" onClick={async()=>{
                          await fetch(`${SB_URL}/rest/v1/jury_profiles?id=eq.${p.id}`,{method:"PATCH",headers:{...SB_HEADERS,"Prefer":"return=minimal"},body:JSON.stringify({validated:true,assigned_sessions:p.sessions||[]})});
                          await loadAll();
                        }} style={{fontSize:11,padding:"7px 14px",borderRadius:9,background:"#1d6b4f",color:"white",border:"none",fontFamily:"Inter,sans-serif",fontWeight:500}}>✓ Valider</button>
                        <button className="btn" onClick={async()=>{
                          if(!confirm("Supprimer ce profil ?")) return;
                          await fetch(`${SB_URL}/rest/v1/jury_profiles?id=eq.${p.id}`,{method:"DELETE",headers:{...SB_HEADERS,"Prefer":"return=minimal"}});
                          await loadAll();
                        }} style={{fontSize:11,padding:"7px 10px",borderRadius:9,background:"#fbe8ee",color:"#8a2040",border:"1px solid #e8a8bc",fontFamily:"Inter,sans-serif"}}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VALIDATED — jurés validés */}
            {juryView==="validated"&&(
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,gap:10,flexWrap:"wrap"}}>
                  <div style={{fontSize:12,color:"#9090a8"}}>Jurés validés — disponibles pour l'allocation aux sessions.</div>
                  <button className="btn" onClick={()=>setAddJuror(addJuror?null:{prenom:"",nom:"",qualite:"",organisation:"",email:"",assigned_sessions:[],grande_finale:false})}
                    style={{fontSize:11,padding:"6px 13px",borderRadius:8,background:addJuror?CREAM:NAVY,color:addJuror?"#6a6a8a":GOLD,border:"1px solid "+(addJuror?CREAM2:NAVY),fontFamily:"Inter,sans-serif",fontWeight:500}}>
                    {addJuror?"✕ Annuler":"+ Ajouter juré externe"}
                  </button>
                </div>

                {addJuror&&(
                  <div className="card fade" style={{padding:"14px 16px",marginBottom:12,border:"1px dashed "+GOLD,background:"#fffdf6"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:600,color:NAVY,marginBottom:10}}>Nouveau juré externe</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                      <input placeholder="Prénom *" value={addJuror.prenom} onChange={e=>setAddJuror({...addJuror,prenom:e.target.value})} style={{padding:"7px 10px",fontSize:12,borderRadius:7,border:"1px solid "+CREAM2,fontFamily:"Inter,sans-serif"}}/>
                      <input placeholder="Nom *" value={addJuror.nom} onChange={e=>setAddJuror({...addJuror,nom:e.target.value})} style={{padding:"7px 10px",fontSize:12,borderRadius:7,border:"1px solid "+CREAM2,fontFamily:"Inter,sans-serif"}}/>
                      <input placeholder="Qualité (ex. Expert AI)" value={addJuror.qualite} onChange={e=>setAddJuror({...addJuror,qualite:e.target.value})} style={{padding:"7px 10px",fontSize:12,borderRadius:7,border:"1px solid "+CREAM2,fontFamily:"Inter,sans-serif"}}/>
                      <input placeholder="Organisation" value={addJuror.organisation} onChange={e=>setAddJuror({...addJuror,organisation:e.target.value})} style={{padding:"7px 10px",fontSize:12,borderRadius:7,border:"1px solid "+CREAM2,fontFamily:"Inter,sans-serif"}}/>
                      <input placeholder="Email" value={addJuror.email} onChange={e=>setAddJuror({...addJuror,email:e.target.value})} style={{gridColumn:"1/3",padding:"7px 10px",fontSize:12,borderRadius:7,border:"1px solid "+CREAM2,fontFamily:"Inter,sans-serif"}}/>
                    </div>
                    <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:".08em",color:"#a0a0b8",fontWeight:500,marginBottom:6,marginTop:4}}>Sessions assignées</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                      {SK.map(sk=>{
                        const s=SC[sk];
                        const sel=addJuror.assigned_sessions.includes(sk);
                        return(
                          <button key={sk} className="btn" onClick={()=>setAddJuror({...addJuror,assigned_sessions:sel?addJuror.assigned_sessions.filter(x=>x!==sk):[...addJuror.assigned_sessions,sk]})}
                            style={{fontSize:11,padding:"5px 10px",borderRadius:7,background:sel?s.light:"white",color:sel?s.color:"#9090a8",border:"1px solid "+(sel?s.border:CREAM2),fontFamily:"Inter,sans-serif",fontWeight:sel?500:400}}>
                            {s.emoji} {s.short}
                          </button>
                        );
                      })}
                    </div>
                    <label style={{display:"flex",alignItems:"center",gap:7,fontSize:11.5,color:NAVY,cursor:"pointer",marginBottom:12}}>
                      <input type="checkbox" checked={addJuror.grande_finale} onChange={e=>setAddJuror({...addJuror,grande_finale:e.target.checked})} style={{width:14,height:14}}/>
                      🏆 Grande Finale
                    </label>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <button className="btn" onClick={()=>setAddJuror(null)} style={{fontSize:11,padding:"6px 13px",borderRadius:8,background:CREAM,color:"#6a6a8a",border:"1px solid "+CREAM2,fontFamily:"Inter,sans-serif"}}>Annuler</button>
                      <button className="btn" disabled={!addJuror.prenom.trim()||!addJuror.nom.trim()} onClick={async()=>{
                        const body={prenom:addJuror.prenom.trim(),nom:addJuror.nom.trim(),qualite:addJuror.qualite.trim(),organisation:addJuror.organisation.trim(),email:addJuror.email.trim(),sessions:addJuror.assigned_sessions,assigned_sessions:addJuror.assigned_sessions,validated:true,grande_finale:addJuror.grande_finale,lang:"fr"};
                        const r=await fetch(`${SB_URL}/rest/v1/jury_profiles`,{method:"POST",headers:{...SB_HEADERS,"Prefer":"return=minimal"},body:JSON.stringify(body)});
                        if(!r.ok){alert("Erreur: "+(await r.text()));return;}
                        setAddJuror(null);
                        await loadAll();
                      }} style={{fontSize:11,padding:"6px 13px",borderRadius:8,background:"#1d6b4f",color:"white",border:"none",fontFamily:"Inter,sans-serif",fontWeight:500,opacity:(!addJuror.prenom.trim()||!addJuror.nom.trim())?0.4:1}}>✓ Ajouter</button>
                    </div>
                  </div>
                )}

                {profiles.filter(p=>p.validated).length===0&&<div style={{padding:"2rem",textAlign:"center",color:"#c0c0d0",fontStyle:"italic",fontSize:13}}>Aucun juré validé</div>}
                {profiles.filter(p=>p.validated).map((p,i)=>{
                  const name=p.prenom+" "+p.nom;
                  return(
                    <div key={p.id} className="card fade" style={{padding:"13px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:14}}>
                      <div style={{width:38,height:38,borderRadius:"50%",background:"#e8f5ee",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,color:"#1d6b4f",flexShrink:0}}>{(p.prenom||"?")[0]}{(p.nom||"?")[0]}</div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:600,color:NAVY}}>{name}</div>
                        <div style={{fontSize:11,color:"#6a6a8a"}}>{p.qualite}{p.organisation?" · "+p.organisation:""}</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:5}}>
                          {(p.assigned_sessions||[]).map(s=>{
                            const fk=SK.find(k=>sessMatch(s,k));const f=fk?SC[fk]:null;
                            return <span key={s} style={{fontSize:9.5,padding:"2px 7px",borderRadius:8,background:f?f.light:CREAM,color:f?f.color:"#888",border:"1px solid "+(f?f.border:CREAM2)}}>{f?f.emoji:""} {s.split("&")[0].trim()}</span>;
                          })}
                          {p.grande_finale&&<span style={{fontSize:9.5,padding:"2px 7px",borderRadius:8,background:"#fdf6e8",color:"#9a6400",border:"1px solid #e8d090"}}>🏆 Finale</span>}
                        </div>
                      </div>
                      <button className="btn" onClick={async()=>{
                        await fetch(`${SB_URL}/rest/v1/jury_profiles?id=eq.${p.id}`,{method:"PATCH",headers:{...SB_HEADERS,"Prefer":"return=minimal"},body:JSON.stringify({validated:false})});
                        await loadAll();
                      }} style={{fontSize:10,padding:"5px 10px",borderRadius:8,background:CREAM,color:"#9090a8",border:"1px solid "+CREAM2,fontFamily:"Inter,sans-serif",flexShrink:0}}>Retirer</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ASSIGN — allocation par session */}
            {juryView==="assign"&&(
              <div>
                {/* View toggle */}
                <div style={{display:"flex",gap:6,marginBottom:14,background:"white",padding:"4px",borderRadius:10,border:"1px solid "+CREAM2,width:"fit-content"}}>
                  {[["byJury","Vue par juré"],["bySession","Vue par session"]].map(([id,lbl])=>(
                    <button key={id} className="btn" onClick={()=>setAssignView(id)}
                      style={{fontSize:11,padding:"6px 14px",borderRadius:7,background:assignView===id?NAVY:"transparent",color:assignView===id?"white":"#9090a8",border:"none",fontFamily:"Inter,sans-serif",fontWeight:assignView===id?500:400}}>
                      {lbl}
                    </button>
                  ))}
                </div>

                {/* Compteur par session */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:16}}>
                  {SK.map(sk=>{
                    const s=SC[sk];
                    const assigned=profiles.filter(p=>p.validated&&(p.assigned_sessions||[]).some(as=>sessMatch(as,sk))).length;
                    return(
                      <div key={sk} style={{background:assigned>=3?s.light:CREAM,border:"1px solid "+(assigned>=3?s.border:CREAM2),borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                        <div style={{fontSize:12,marginBottom:3}}>{s.emoji}</div>
                        <div style={{fontSize:22,fontWeight:600,color:assigned>=3?s.color:"#9090a8",fontFamily:"'Playfair Display',serif"}}>{assigned}</div>
                        <div style={{fontSize:9,color:assigned>=3?s.color:"#9090a8",marginTop:2}}>{s.dateL}</div>
                        {assigned<3&&<div style={{fontSize:9,color:"#c03010",marginTop:1}}>⚠ min. 3</div>}
                      </div>
                    );
                  })}
                </div>

                {/* Vue par session */}
                {assignView==="bySession"&&(
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {profiles.filter(p=>p.validated).length===0&&(
                      <div style={{padding:"2rem",textAlign:"center",color:"#c0c0d0",fontStyle:"italic",fontSize:13,background:"white",borderRadius:12,border:"1px solid "+CREAM2}}>Aucun juré validé — aller dans "Panel validé" d'abord</div>
                    )}
                    {SK.map(sk=>{
                      const s=SC[sk];
                      const sessJurors=profiles.filter(p=>p.validated&&(p.assigned_sessions||[]).some(as=>sessMatch(as,sk)));
                      async function toggleJuror(p){
                        const cur=p.assigned_sessions||[];
                        const has=cur.some(as=>sessMatch(as,sk));
                        const next=has?cur.filter(as=>!sessMatch(as,sk)):[...cur,sk];
                        await fetch(`${SB_URL}/rest/v1/jury_profiles?id=eq.${p.id}`,{method:"PATCH",headers:{...SB_HEADERS,"Prefer":"return=minimal"},body:JSON.stringify({assigned_sessions:next})});
                        await loadAll();
                      }
                      return(
                        <div key={sk} className="card" style={{overflow:"hidden"}}>
                          <div style={{background:s.color,padding:"9px 14px",display:"flex",alignItems:"center",gap:10}}>
                            <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:600,color:"white"}}>{s.emoji} {sk}</div>
                            <div style={{fontSize:10,color:"rgba(255,255,255,.6)"}}>{s.dateL}</div>
                            {sessJurors.filter(j=>j.email).length>0&&(
                              <button className="btn" onClick={()=>{const emails=sessJurors.filter(j=>j.email).map(j=>j.email).join(", ");navigator.clipboard.writeText(emails);alert("Emails copiés :\n"+emails);}}
                                style={{marginLeft:"auto",fontSize:10,padding:"3px 9px",borderRadius:7,background:"rgba(255,255,255,.18)",color:"white",border:"1px solid rgba(255,255,255,.28)",fontFamily:"Inter,sans-serif"}}>📋 Copier emails</button>
                            )}
                            <div style={{marginLeft:sessJurors.filter(j=>j.email).length>0?0:"auto",fontSize:11,color:"white",padding:"2px 9px",borderRadius:10,background:"rgba(255,255,255,.18)",fontWeight:500}}>{sessJurors.length} {sessJurors.length>1?"jurés":"juré"}{sessJurors.length<3?" ⚠ min 3":""}</div>
                          </div>
                          <div style={{padding:"10px 14px"}}>
                            {sessJurors.length===0&&<div style={{fontSize:11.5,color:"#c0c0d0",fontStyle:"italic",padding:"6px 0"}}>Aucun juré pour l'instant. Ajouter ci-dessous depuis le panel validé.</div>}
                            {sessJurors.map(p=>(
                              <div key={p.id} style={{display:"flex",alignItems:"center",gap:9,padding:"6px 9px",background:s.light,border:"1px solid "+s.border,borderRadius:8,marginBottom:4}}>
                                {p.photo_base64
                                  ?<img src={p.photo_base64} alt="" style={{width:28,height:28,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
                                  :<div style={{width:28,height:28,borderRadius:"50%",background:NAVY,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9.5,fontWeight:600,color:GOLD,flexShrink:0}}>{(p.prenom||"?")[0]}{(p.nom||"?")[0]}</div>
                                }
                                <div onClick={()=>setDetailJuror(p)} style={{flex:1,minWidth:0,cursor:"pointer"}}>
                                  <div style={{fontSize:12,fontWeight:500,color:NAVY,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.prenom} {p.nom}</div>
                                  <div style={{fontSize:10,color:"#6a6a8a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.qualite}{p.organisation?" · "+p.organisation:""}</div>
                                  {p.email&&<div style={{fontSize:9.5,color:"#8a8aa8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>✉ {p.email}</div>}
                                </div>
                                {p.grande_finale&&<span title="Grande Finale" style={{fontSize:11,flexShrink:0}}>🏆</span>}
                                <button className="btn" onClick={()=>setDetailJuror(p)} title="Détails" style={{fontSize:11,width:24,height:24,borderRadius:6,background:"white",color:NAVY,border:"1px solid "+CREAM2,fontFamily:"Inter,sans-serif",flexShrink:0,padding:0}}>ⓘ</button>
                                <button className="btn" onClick={()=>toggleJuror(p)} style={{fontSize:10,padding:"4px 9px",borderRadius:7,background:"white",color:"#8a2040",border:"1px solid #e8a8bc",fontFamily:"Inter,sans-serif",flexShrink:0}}>Retirer</button>
                              </div>
                            ))}
                            {(()=>{
                              const avail=profiles.filter(p=>p.validated&&!(p.assigned_sessions||[]).some(as=>sessMatch(as,sk)));
                              if(avail.length===0) return null;
                              return(
                                <div style={{marginTop:8,paddingTop:8,borderTop:"1px dashed "+CREAM2}}>
                                  <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".08em",color:"#a0a0b8",fontWeight:500,marginBottom:5}}>Ajouter un juré</div>
                                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                    {avail.map(p=>(
                                      <button key={p.id} className="btn" onClick={()=>toggleJuror(p)} style={{fontSize:11,padding:"4px 9px",borderRadius:7,background:"white",color:NAVY,border:"1px solid "+CREAM2,fontFamily:"Inter,sans-serif"}}>+ {p.prenom} {p.nom}</button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Vue par juré (tableau existant) */}
                {assignView==="byJury"&&(
                <div style={{background:"white",border:"1px solid "+CREAM2,borderRadius:12,overflow:"hidden"}}>
                  {/* Header sessions */}
                  <div style={{display:"grid",gridTemplateColumns:"200px repeat(5,1fr) 60px",background:NAVY,padding:"8px 14px",gap:4}}>
                    <div style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>Juré</div>
                    {SK.map(sk=><div key={sk} style={{fontSize:9.5,color:"rgba(255,255,255,.5)",textAlign:"center"}}>{SC[sk].emoji} {SC[sk].short}</div>)}
                    <div style={{fontSize:9.5,color:"rgba(255,255,255,.4)",textAlign:"center"}}>Finale</div>
                  </div>
                  {profiles.filter(p=>p.validated).length===0&&(
                    <div style={{padding:"2rem",textAlign:"center",color:"#c0c0d0",fontStyle:"italic",fontSize:13}}>Aucun juré validé — aller dans "Panel validé" d'abord</div>
                  )}
                  {profiles.filter(p=>p.validated).map((p,i)=>{
                    const assignedSess = p.assigned_sessions||[];
                    async function toggleSession(sk){
                      const has=assignedSess.some(as=>sessMatch(as,sk));
                      const cur=has?assignedSess.filter(as=>!sessMatch(as,sk)):[...assignedSess,sk];
                      await fetch(`${SB_URL}/rest/v1/jury_profiles?id=eq.${p.id}`,{method:"PATCH",headers:{...SB_HEADERS,"Prefer":"return=minimal"},body:JSON.stringify({assigned_sessions:cur})});
                      await loadAll();
                    }
                    async function toggleFinale(){
                      await fetch(`${SB_URL}/rest/v1/jury_profiles?id=eq.${p.id}`,{method:"PATCH",headers:{...SB_HEADERS,"Prefer":"return=minimal"},body:JSON.stringify({grande_finale:!p.grande_finale})});
                      await loadAll();
                    }
                    return(
                      <div key={p.id} style={{display:"grid",gridTemplateColumns:"200px repeat(5,1fr) 60px",padding:"8px 14px",gap:4,borderTop:"1px solid "+CREAM2,background:i%2===0?"white":CREAM,alignItems:"center"}}>
                        <div onClick={()=>setDetailJuror(p)} style={{cursor:"pointer"}} title="Voir détails">
                          <div style={{fontSize:12,fontWeight:500,color:NAVY,fontFamily:"'Playfair Display',serif",textDecoration:"underline",textDecorationColor:CREAM2,textDecorationThickness:1,textUnderlineOffset:2}}>{p.prenom} {p.nom} <span style={{color:"#c0c0d0",fontSize:10,fontWeight:400}}>ⓘ</span></div>
                          <div style={{fontSize:10,color:"#9090a8"}}>{p.qualite}{p.organisation?" · "+p.organisation:""}</div>
                          {p.email&&<div style={{fontSize:9.5,color:"#a8a8c0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>✉ {p.email}</div>}
                        </div>
                        {SK.map(sk=>{
                          const s=SC[sk];
                          const on=assignedSess.some(as=>sessMatch(as,sk));
                          return(
                            <div key={sk} style={{textAlign:"center"}}>
                              <button className="btn" onClick={()=>toggleSession(sk)}
                                style={{width:28,height:28,borderRadius:6,border:"1.5px solid "+(on?s.color:CREAM2),background:on?s.light:"white",color:on?s.color:"#d0d0d0",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto",padding:0}}>
                                {on?"✓":""}
                              </button>
                            </div>
                          );
                        })}
                        <div style={{textAlign:"center"}}>
                          <button className="btn" onClick={toggleFinale}
                            style={{width:28,height:28,borderRadius:6,border:"1.5px solid "+(p.grande_finale?"#c9a84c":CREAM2),background:p.grande_finale?"#fdf6e8":"white",color:p.grande_finale?"#9a6400":"#d0d0d0",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto",padding:0}}>
                            {p.grande_finale?"🏆":""}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PROFILES */}
        {tab==="profiles" && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:10}}>
            {profiles.length===0&&<div style={{padding:"3rem",color:"#c0c0d0",fontStyle:"italic",fontSize:13}}>Aucun profil reçu</div>}
            {profiles.map(p => {
              const initials = (p.prenom||"?")[0].toUpperCase()+(p.nom||"?")[0].toUpperCase();
              return (
                <div key={p.id} className="card fade" style={{padding:0,overflow:"hidden"}}>
                  {p.photo_base64
                    ?<img src={p.photo_base64} alt="" style={{width:"100%",height:150,objectFit:"cover",display:"block"}}/>
                    :<div style={{width:"100%",height:110,background:`linear-gradient(135deg,${NAVY},#1a3260)`,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:50,height:50,borderRadius:"50%",background:"rgba(201,168,76,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:600,color:GOLD,fontFamily:"'Playfair Display',serif"}}>{initials}</div></div>
                  }
                  <div style={{padding:"11px 13px"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:600,color:NAVY,marginBottom:2}}>{p.prenom} {p.nom}</div>
                    <div style={{fontSize:11,color:"#5a5a7a",marginBottom:3,lineHeight:1.4}}>{p.qualite}</div>
                    {p.organisation&&<div style={{fontSize:10.5,color:"#9090a8",marginBottom:7}}>{p.organisation}</div>}
                    <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:5}}>
                      {(p.sessions||[]).map(sl => {
                        const fk=SK.find(k=>sessMatch(sl,k));const f=fk?SC[fk]:null;
                        return <span key={sl} style={{fontSize:9.5,padding:"2px 7px",borderRadius:10,background:f?f.light:CREAM,color:f?f.color:"#888",fontWeight:500}}>{sl.split("&")[0].trim()}</span>;
                      })}
                      {p.grande_finale&&<span style={{fontSize:9.5,padding:"2px 7px",borderRadius:10,background:"#fdf6e8",color:"#9a6400",fontWeight:500}}>🏆</span>}
                    </div>
                    <div style={{fontSize:9.5,color:"#a8a8c0"}}>{p.email}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Modal détail juré */}
      {detailJuror&&(
        <div onClick={()=>setDetailJuror(null)} style={{position:"fixed",inset:0,background:"rgba(10,15,30,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:14,maxWidth:460,width:"100%",maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
            <div style={{padding:"18px 22px",borderBottom:"1px solid "+CREAM2,display:"flex",alignItems:"center",gap:14}}>
              {detailJuror.photo_base64
                ?<img src={detailJuror.photo_base64} alt="" style={{width:54,height:54,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
                :<div style={{width:54,height:54,borderRadius:"50%",background:NAVY,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:600,color:GOLD,flexShrink:0}}>{(detailJuror.prenom||"?")[0]}{(detailJuror.nom||"?")[0]}</div>
              }
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:600,color:NAVY}}>{detailJuror.prenom} {detailJuror.nom}</div>
                <div style={{fontSize:12,color:"#6a6a8a",marginTop:2}}>{detailJuror.qualite||"—"}</div>
                {detailJuror.organisation&&<div style={{fontSize:11,color:"#9090a8",marginTop:1}}>{detailJuror.organisation}</div>}
              </div>
              <button onClick={()=>setDetailJuror(null)} className="btn" style={{width:30,height:30,borderRadius:8,background:CREAM,color:"#9090a8",border:"1px solid "+CREAM2,fontSize:14,padding:0,flexShrink:0}}>✕</button>
            </div>
            <div style={{padding:"16px 22px"}}>
              {detailJuror.email&&(
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".08em",color:"#a0a0b8",fontWeight:500,marginBottom:4}}>Email</div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <a href={"mailto:"+detailJuror.email} style={{fontSize:12.5,color:NAVY,textDecoration:"none",flex:1,wordBreak:"break-all"}}>{detailJuror.email}</a>
                    <button onClick={()=>{navigator.clipboard.writeText(detailJuror.email);}} className="btn" style={{fontSize:10,padding:"4px 9px",borderRadius:7,background:CREAM,color:"#6a6a8a",border:"1px solid "+CREAM2,fontFamily:"Inter,sans-serif",flexShrink:0}}>📋 Copier</button>
                  </div>
                </div>
              )}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".08em",color:"#a0a0b8",fontWeight:500,marginBottom:4}}>Sessions assignées</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {(detailJuror.assigned_sessions||[]).length===0&&<span style={{fontSize:11,color:"#c0c0d0",fontStyle:"italic"}}>Aucune</span>}
                  {(detailJuror.assigned_sessions||[]).map(as=>{
                    const fk=SK.find(k=>sessMatch(as,k));const f=fk?SC[fk]:null;
                    return <span key={as} style={{fontSize:11,padding:"3px 9px",borderRadius:8,background:f?f.light:CREAM,color:f?f.color:"#888",border:"1px solid "+(f?f.border:CREAM2)}}>{f?f.emoji:""} {as.split("&")[0].trim()}</span>;
                  })}
                  {detailJuror.grande_finale&&<span style={{fontSize:11,padding:"3px 9px",borderRadius:8,background:"#fdf6e8",color:"#9a6400",border:"1px solid #e8d090"}}>🏆 Grande Finale</span>}
                </div>
              </div>
              {(detailJuror.sessions||[]).length>0&&JSON.stringify(detailJuror.sessions)!==JSON.stringify(detailJuror.assigned_sessions)&&(
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".08em",color:"#a0a0b8",fontWeight:500,marginBottom:4}}>Sessions souhaitées (formulaire)</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {detailJuror.sessions.map(s=><span key={s} style={{fontSize:11,padding:"3px 9px",borderRadius:8,background:CREAM,color:"#6a6a8a",border:"1px solid "+CREAM2}}>{s.split("&")[0].trim()}</span>)}
                  </div>
                </div>
              )}
              <div style={{display:"flex",gap:8,marginTop:16,paddingTop:14,borderTop:"1px solid "+CREAM2}}>
                {detailJuror.email&&<a href={"mailto:"+detailJuror.email} className="btn" style={{fontSize:11.5,padding:"7px 14px",borderRadius:8,background:NAVY,color:GOLD,border:"none",fontFamily:"Inter,sans-serif",fontWeight:500,textDecoration:"none",flex:1,textAlign:"center"}}>✉ Envoyer un email</a>}
                <button onClick={()=>setDetailJuror(null)} className="btn" style={{fontSize:11.5,padding:"7px 14px",borderRadius:8,background:CREAM,color:"#6a6a8a",border:"1px solid "+CREAM2,fontFamily:"Inter,sans-serif"}}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer style={{background:NAVY,padding:"1.5rem 2rem",marginTop:"3rem",textAlign:"center"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:"white",marginBottom:4}}>Rotary Startup Award 2026</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>Dashboard interne · Commission Paris · <a href="https://rotary-startup.org" style={{color:GOLD,textDecoration:"none"}}>rotary-startup.org</a></div>
      </footer>
    </div>
  );
}
