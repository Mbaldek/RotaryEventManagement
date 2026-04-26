import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,400&family=Inter:wght@300;400;500&display=swap');
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulseDot{0%,100%{opacity:.4}50%{opacity:1}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:${CREAM};min-height:100vh}
.fade{animation:fadeUp .28s ease both}
.card{background:white;border:1px solid rgba(15,31,61,.08);border-radius:14px;transition:box-shadow .2s}
.btn{font-family:'Inter',sans-serif;cursor:pointer;transition:all .15s}
.btn:hover{filter:brightness(.91)}
.btn:active{transform:scale(.97)}
.live-dot{width:7px;height:7px;border-radius:50%;background:#1d6b4f;animation:pulseDot 1.6s ease-in-out infinite;display:inline-block}
@media (max-width:768px){
  .nav-row{padding:0 12px !important;height:52px !important}
  .nav-title{font-size:13px !important}
  .nav-sub{font-size:8.5px !important}
  .main-pad{padding:12px !important}
  .by-jury-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .by-jury-grid{min-width:640px}
}
@media (max-width:480px){
  .nav-sub{display:none !important}
}
`;

function copyEmails(jurors, label) {
  const emails = jurors.filter(j=>j.email).map(j=>j.email).join(", ");
  if (!emails) return;
  navigator.clipboard.writeText(emails);
  alert(`Emails ${label} copiés :\n${emails}`);
}

export default function RsaJuryView() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("bySession");
  const [detailJuror, setDetailJuror] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  async function loadProfiles() {
    const { data, error } = await supabase
      .from("jury_profiles")
      .select("id,prenom,nom,qualite,organisation,email,sessions,assigned_sessions,validated,grande_finale,photo_base64,lang,created_at")
      .order("created_at", { ascending: false });
    if (!error) {
      setProfiles(data || []);
      setLastUpdate(new Date());
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProfiles();
    const channel = supabase
      .channel("rsa_jury_view_" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "jury_profiles" }, () => {
        loadProfiles();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const validated = profiles.filter(p => p.validated);

  return (
    <div style={{fontFamily:"Inter,sans-serif",background:CREAM,minHeight:"100vh"}}>
      <style>{css}</style>

      {/* NAV */}
      <div style={{background:NAVY,position:"sticky",top:0,zIndex:100,borderBottom:"1px solid rgba(201,168,76,.18)"}}>
        <div className="nav-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1.5rem",height:58}}>
          <div style={{display:"flex",alignItems:"center",gap:11,minWidth:0}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},#a07828)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:NAVY,flexShrink:0}}>R</div>
            <div style={{minWidth:0}}>
              <div className="nav-title" style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:600,color:"white",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Rotary Startup Award 2026 — Jurys</div>
              <div className="nav-sub" style={{fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:".1em",textTransform:"uppercase"}}>Vue lecture seule · Mise à jour en direct</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:10.5,color:"rgba(255,255,255,.55)"}}>
              <span className="live-dot"/>LIVE
            </span>
          </div>
        </div>
      </div>

      <div className="main-pad" style={{padding:"22px 24px 60px",maxWidth:1200,margin:"0 auto"}}>

        {/* Bandeau d'info read-only */}
        <div style={{background:"#fdf6e8",border:"1px solid #e8d090",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#7a5a00",display:"flex",alignItems:"center",gap:9}}>
          <span style={{fontSize:14}}>👁</span>
          <div style={{flex:1}}>
            <strong>Vue consultation</strong> — affichage lecture seule de l'allocation des jurys aux sessions. Mise à jour automatique en temps réel quand l'organisateur modifie les affectations.
          </div>
        </div>

        {/* Compteur par session */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:16}}>
          {SK.map(sk=>{
            const s=SC[sk];
            const assigned=validated.filter(p=>(p.assigned_sessions||[]).some(as=>sessMatch(as,sk))).length;
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

        {/* View toggle */}
        <div style={{display:"flex",gap:6,marginBottom:14,background:"white",padding:"4px",borderRadius:10,border:"1px solid "+CREAM2,width:"fit-content"}}>
          {[["bySession","Vue par session"],["byJury","Vue par juré"]].map(([id,lbl])=>(
            <button key={id} className="btn" onClick={()=>setView(id)}
              style={{fontSize:11,padding:"6px 14px",borderRadius:7,background:view===id?NAVY:"transparent",color:view===id?"white":"#9090a8",border:"none",fontFamily:"Inter,sans-serif",fontWeight:view===id?500:400}}>
              {lbl}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{textAlign:"center",padding:"3rem",color:"#a0a0b8",fontSize:13}}>Chargement…</div>
        )}

        {!loading && validated.length === 0 && (
          <div style={{padding:"3rem",textAlign:"center",color:"#c0c0d0",fontStyle:"italic",fontSize:13,background:"white",borderRadius:12,border:"1px solid "+CREAM2}}>
            Aucun juré validé pour l'instant.
          </div>
        )}

        {/* VUE PAR SESSION */}
        {!loading && validated.length > 0 && view==="bySession" && (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {SK.map(sk=>{
              const s=SC[sk];
              const sessJurors=validated.filter(p=>(p.assigned_sessions||[]).some(as=>sessMatch(as,sk)));
              return(
                <div key={sk} className="card" style={{overflow:"hidden"}}>
                  <div style={{background:s.color,padding:"9px 14px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:600,color:"white"}}>{s.emoji} {sk}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,.6)"}}>{s.dateL}</div>
                    {sessJurors.filter(j=>j.email).length>0&&(
                      <button className="btn" onClick={()=>copyEmails(sessJurors, sk)}
                        style={{marginLeft:"auto",fontSize:10,padding:"3px 9px",borderRadius:7,background:"rgba(255,255,255,.18)",color:"white",border:"1px solid rgba(255,255,255,.28)",fontFamily:"Inter,sans-serif"}}>📋 Copier emails</button>
                    )}
                    <div style={{marginLeft:sessJurors.filter(j=>j.email).length>0?0:"auto",fontSize:11,color:"white",padding:"2px 9px",borderRadius:10,background:"rgba(255,255,255,.18)",fontWeight:500}}>{sessJurors.length} {sessJurors.length>1?"jurés":"juré"}{sessJurors.length<3?" ⚠ min 3":""}</div>
                  </div>
                  <div style={{padding:"10px 14px"}}>
                    {sessJurors.length===0&&<div style={{fontSize:11.5,color:"#c0c0d0",fontStyle:"italic",padding:"6px 0"}}>Aucun juré assigné pour l'instant.</div>}
                    {sessJurors.map(p=>(
                      <div key={p.id} style={{display:"flex",alignItems:"center",gap:9,padding:"6px 9px",background:s.light,border:"1px solid "+s.border,borderRadius:8,marginBottom:4,cursor:"pointer"}} onClick={()=>setDetailJuror(p)}>
                        {p.photo_base64
                          ?<img src={p.photo_base64} alt="" style={{width:28,height:28,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
                          :<div style={{width:28,height:28,borderRadius:"50%",background:NAVY,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9.5,fontWeight:600,color:GOLD,flexShrink:0}}>{(p.prenom||"?")[0]}{(p.nom||"?")[0]}</div>
                        }
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:500,color:NAVY,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.prenom} {p.nom}</div>
                          <div style={{fontSize:10,color:"#6a6a8a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.qualite}{p.organisation?" · "+p.organisation:""}</div>
                          {p.email&&<div style={{fontSize:9.5,color:"#8a8aa8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>✉ {p.email}</div>}
                        </div>
                        {p.grande_finale&&<span title="Grande Finale" style={{fontSize:11,flexShrink:0}}>🏆</span>}
                        <span style={{fontSize:11,color:NAVY,flexShrink:0,opacity:.4}}>ⓘ</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Carte Grande Finale */}
            {(()=>{
              const FINALE_LIGHT="#fdf6e8", FINALE_BORDER="#e8d090";
              const finaleJurors=validated.filter(p=>p.grande_finale);
              return(
                <div className="card" style={{overflow:"hidden"}}>
                  <div style={{background:GOLD,padding:"9px 14px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:600,color:"white"}}>🏆 Grande Finale</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,.75)"}}>Mardi 26 mai · 16h–19h · Cyrus Conseil</div>
                    {finaleJurors.filter(j=>j.email).length>0&&(
                      <button className="btn" onClick={()=>copyEmails(finaleJurors, "Grande Finale")}
                        style={{marginLeft:"auto",fontSize:10,padding:"3px 9px",borderRadius:7,background:"rgba(255,255,255,.22)",color:"white",border:"1px solid rgba(255,255,255,.35)",fontFamily:"Inter,sans-serif"}}>📋 Copier emails</button>
                    )}
                    <div style={{marginLeft:finaleJurors.filter(j=>j.email).length>0?0:"auto",fontSize:11,color:"white",padding:"2px 9px",borderRadius:10,background:"rgba(255,255,255,.22)",fontWeight:500}}>{finaleJurors.length} {finaleJurors.length>1?"jurés":"juré"}{finaleJurors.length<3?" ⚠ min 3":""}</div>
                  </div>
                  <div style={{padding:"10px 14px"}}>
                    {finaleJurors.length===0&&<div style={{fontSize:11.5,color:"#c0c0d0",fontStyle:"italic",padding:"6px 0"}}>Aucun juré pour la Grande Finale pour l'instant.</div>}
                    {finaleJurors.map(p=>(
                      <div key={p.id} style={{display:"flex",alignItems:"center",gap:9,padding:"6px 9px",background:FINALE_LIGHT,border:"1px solid "+FINALE_BORDER,borderRadius:8,marginBottom:4,cursor:"pointer"}} onClick={()=>setDetailJuror(p)}>
                        {p.photo_base64
                          ?<img src={p.photo_base64} alt="" style={{width:28,height:28,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
                          :<div style={{width:28,height:28,borderRadius:"50%",background:NAVY,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9.5,fontWeight:600,color:GOLD,flexShrink:0}}>{(p.prenom||"?")[0]}{(p.nom||"?")[0]}</div>
                        }
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:500,color:NAVY,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.prenom} {p.nom}</div>
                          <div style={{fontSize:10,color:"#6a6a8a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.qualite}{p.organisation?" · "+p.organisation:""}</div>
                          {p.email&&<div style={{fontSize:9.5,color:"#8a8aa8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>✉ {p.email}</div>}
                        </div>
                        <span style={{fontSize:11,color:NAVY,flexShrink:0,opacity:.4}}>ⓘ</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* VUE PAR JURÉ — tableau read-only */}
        {!loading && validated.length > 0 && view==="byJury" && (
          <div className="by-jury-wrap" style={{background:"white",border:"1px solid "+CREAM2,borderRadius:12,overflow:"auto",WebkitOverflowScrolling:"touch"}}>
            <div className="by-jury-grid">
              <div style={{display:"grid",gridTemplateColumns:"220px repeat(5,1fr) 50px 60px",background:NAVY,padding:"8px 14px",gap:4}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>Juré</div>
                {SK.map(sk=><div key={sk} style={{fontSize:9.5,color:"rgba(255,255,255,.5)",textAlign:"center"}}>{SC[sk].emoji} {SC[sk].short}</div>)}
                <div style={{fontSize:9.5,color:"rgba(255,255,255,.5)",textAlign:"center"}}>Total</div>
                <div style={{fontSize:9.5,color:"rgba(255,255,255,.4)",textAlign:"center"}}>Finale</div>
              </div>
              {validated.map((p,i)=>{
                const assignedSess = p.assigned_sessions||[];
                const sessCount=SK.filter(sk=>assignedSess.some(as=>sessMatch(as,sk))).length;
                return(
                  <div key={p.id} style={{display:"grid",gridTemplateColumns:"220px repeat(5,1fr) 50px 60px",padding:"8px 14px",gap:4,borderTop:"1px solid "+CREAM2,background:i%2===0?"white":CREAM,alignItems:"center"}}>
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
                          <div style={{width:28,height:28,borderRadius:6,border:"1.5px solid "+(on?s.color:CREAM2),background:on?s.light:"white",color:on?s.color:"#d0d0d0",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>
                            {on?"✓":""}
                          </div>
                        </div>
                      );
                    })}
                    <div style={{textAlign:"center",fontSize:13,fontWeight:600,color:sessCount===0?"#c0c0d0":NAVY,fontFamily:"'Playfair Display',serif"}}>{sessCount}</div>
                    <div style={{textAlign:"center"}}>
                      <div style={{width:28,height:28,borderRadius:6,border:"1.5px solid "+(p.grande_finale?"#c9a84c":CREAM2),background:p.grande_finale?"#fdf6e8":"white",color:p.grande_finale?"#9a6400":"#d0d0d0",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>
                        {p.grande_finale?"🏆":""}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Totals row */}
              {(()=>{
                const totSess=SK.map(sk=>validated.filter(p=>(p.assigned_sessions||[]).some(as=>sessMatch(as,sk))).length);
                const totAll=totSess.reduce((a,b)=>a+b,0);
                const totFin=validated.filter(p=>p.grande_finale).length;
                return(
                  <div style={{display:"grid",gridTemplateColumns:"220px repeat(5,1fr) 50px 60px",padding:"8px 14px",gap:4,borderTop:"2px solid "+NAVY,background:CREAM,alignItems:"center"}}>
                    <div style={{fontSize:10,color:NAVY,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase"}}>Total / session</div>
                    {totSess.map((n,k)=>{
                      const s=SC[SK[k]];
                      return(
                        <div key={k} style={{textAlign:"center",fontSize:13,fontWeight:600,color:n>=3?s.color:"#c03010",fontFamily:"'Playfair Display',serif"}}>{n}{n<3&&<span style={{fontSize:9,marginLeft:2}}>⚠</span>}</div>
                      );
                    })}
                    <div style={{textAlign:"center",fontSize:13,fontWeight:600,color:NAVY,fontFamily:"'Playfair Display',serif"}}>{totAll}</div>
                    <div style={{textAlign:"center",fontSize:13,fontWeight:600,color:totFin>=3?"#9a6400":"#c03010",fontFamily:"'Playfair Display',serif"}}>{totFin}{totFin<3&&<span style={{fontSize:9,marginLeft:2}}>⚠</span>}</div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <div style={{textAlign:"center",fontSize:10.5,color:"#a8a8c0",marginTop:18}}>
          {lastUpdate && `Dernière mise à jour : ${lastUpdate.toLocaleTimeString("fr-FR")}`}
        </div>
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
              <div style={{display:"flex",gap:8,marginTop:16,paddingTop:14,borderTop:"1px solid "+CREAM2}}>
                {detailJuror.email&&<a href={"mailto:"+detailJuror.email} className="btn" style={{fontSize:11.5,padding:"7px 14px",borderRadius:8,background:NAVY,color:GOLD,border:"none",fontFamily:"Inter,sans-serif",fontWeight:500,textDecoration:"none",flex:1,textAlign:"center"}}>✉ Envoyer un email</a>}
                <button onClick={()=>setDetailJuror(null)} className="btn" style={{fontSize:11.5,padding:"7px 14px",borderRadius:8,background:CREAM,color:"#6a6a8a",border:"1px solid "+CREAM2,fontFamily:"Inter,sans-serif"}}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer style={{background:NAVY,padding:"1.5rem 2rem",marginTop:"2rem",textAlign:"center"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:"white",marginBottom:4}}>Rotary Startup Award 2026</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>Vue lecture seule · Commission Paris</div>
      </footer>
    </div>
  );
}
