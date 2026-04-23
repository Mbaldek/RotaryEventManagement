import { useState, useEffect, useRef } from "react";

const SB_URL = "https://uaoucznptxmvhhytapso.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhb3Vjem5wdHhtdmhoeXRhcHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTU5NzAsImV4cCI6MjA4OTQ5MTk3MH0.evOgZctRuIxGSnZLocea5cAKqKR5nc-5x32QDqBUt0U";
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json" };

const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#f7f4ef";
const CREAM2 = "#ede9e1";

const SESSIONS = {
  s1_foodtech:   {emoji:"🌾", color:"#5a7a1a", light:"#eef5e0", border:"#c0d890",
    label:{fr:"FoodTech & Économie circulaire", en:"FoodTech & Circular Economy"},
    date: {fr:"jeudi 30 avril 2026, 18h", en:"Thursday 30 April 2026, 6pm"},
    deadline:{fr:"lundi 27 avril 2026", en:"Monday 27 April 2026"}},
  s2_social:     {emoji:"🤝", color:"#8a2040", light:"#fbe8ee", border:"#e8a8bc",
    label:{fr:"Impact social & Edtech", en:"Social Impact & Edtech"},
    date: {fr:"mercredi 6 mai 2026, 18h", en:"Wednesday 6 May 2026, 6pm"},
    deadline:{fr:"dimanche 3 mai 2026", en:"Sunday 3 May 2026"}},
  s3_tech:       {emoji:"💻", color:"#4a2a7a", light:"#f0eaf8", border:"#c8b0e8",
    label:{fr:"Tech, AI, Fintech & Mobilité", en:"Tech, AI, Fintech & Mobility"},
    date: {fr:"mercredi 13 mai 2026, 18h", en:"Wednesday 13 May 2026, 6pm"},
    deadline:{fr:"dimanche 10 mai 2026", en:"Sunday 10 May 2026"}},
  s4_health:     {emoji:"🏥", color:"#1a5fa8", light:"#e8f0fb", border:"#a8c8f0",
    label:{fr:"Healthtech & Biotech", en:"Healthtech & Biotech"},
    date: {fr:"mardi 19 mai 2026, 18h", en:"Tuesday 19 May 2026, 6pm"},
    deadline:{fr:"samedi 16 mai 2026", en:"Saturday 16 May 2026"}},
  s5_greentech:  {emoji:"🌱", color:"#1d6b4f", light:"#e8f5ee", border:"#b0d8c4",
    label:{fr:"Greentech & Environnement", en:"Greentech & Environment"},
    date: {fr:"jeudi 21 mai 2026, 18h", en:"Thursday 21 May 2026, 6pm"},
    deadline:{fr:"lundi 18 mai 2026", en:"Monday 18 May 2026"}},
};

const T = {
  fr: {
    navSub:"Dépôt du deck final",
    errInvalid:"Lien invalide. Merci de contacter l'organisateur.",
    errNoToken:"Lien incomplet. Vérifiez l'URL de votre email.",
    errUpload:"Une erreur est survenue pendant l'upload. Veuillez réessayer.",
    errFormat:"Format non supporté. Merci d'utiliser un fichier PowerPoint (.pptx, .ppt) ou PDF.",
    errSize:"Fichier trop volumineux (max 50 Mo).",
    errSave:"Erreur lors de l'enregistrement. Merci de réessayer.",
    loading:"Chargement...",
    hello:"Bonjour",
    sessionCtx:"Votre pitch",
    on:"le",
    deadline:"Deadline pour le deck final : ",
    formatInfo:"Format : visio Teams, ~2h. Chaque startup : 5 min de présentation + 5 min de Q&A avec le jury.",
    ownPres:"Présentation autonome",
    ownPresDesc:"Vous partagerez votre écran vous-même pendant votre pitch, pour garder la main sur le rythme et les animations. Merci de tester le partage Teams en amont.",
    deckSection:"Votre deck",
    applicationDeck:"Deck de candidature actuellement utilisé",
    downloadCurrent:"Télécharger pour relecture",
    chooseTitle:"Deux options",
    optKeepTitle:"Conserver ce deck",
    optKeepDesc:"Vous êtes satisfait(e) du deck soumis à la candidature. 1 clic pour confirmer.",
    optKeepBtn:"Confirmer ce deck",
    optUploadTitle:"Uploader une nouvelle version",
    optUploadDesc:"Votre deck a évolué. Déposez la version finale ci-dessous.",
    optUploadHint:"PowerPoint recommandé (.pptx) pour une présentation fidèle. PDF accepté. Max 50 Mo.",
    dropLabel:"Glissez votre deck ici",
    dropSub:"ou cliquez — .pptx, .ppt, .pdf · max 50 Mo",
    uploading:"Upload en cours...",
    confirmedTitle:"Votre choix est enregistré",
    confirmedKeep:"Vous avez choisi de conserver le deck soumis à la candidature.",
    confirmedUpload:"Votre deck final a été reçu : ",
    confirmedAt:"Confirmé le ",
    modifyBtn:"Modifier mon choix",
    thanks:"Merci. Le jury recevra le pack de briefing 2 jours avant la session.",
    legal:"Rotary Startup Award 2026 — les documents restent strictement confidentiels au jury et à l'organisateur.",
  },
  en: {
    navSub:"Final deck upload",
    errInvalid:"Invalid link. Please contact the organiser.",
    errNoToken:"Incomplete link. Please check the URL in your email.",
    errUpload:"Upload error. Please try again.",
    errFormat:"Unsupported format. Please use a PowerPoint file (.pptx, .ppt) or PDF.",
    errSize:"File too large (max 50 MB).",
    errSave:"Save error. Please try again.",
    loading:"Loading...",
    hello:"Hello",
    sessionCtx:"Your pitch",
    on:"on",
    deadline:"Deadline for the final deck: ",
    formatInfo:"Format: Teams call, ~2h. Each startup: 5 min pitch + 5 min Q&A with the jury.",
    ownPres:"Self-presentation",
    ownPresDesc:"You will share your own screen during your pitch to control pacing and animations. Please test Teams screen-sharing beforehand.",
    deckSection:"Your deck",
    applicationDeck:"Application deck currently in use",
    downloadCurrent:"Download to review",
    chooseTitle:"Two options",
    optKeepTitle:"Keep this deck",
    optKeepDesc:"You are happy with the deck submitted with the application. 1 click to confirm.",
    optKeepBtn:"Confirm this deck",
    optUploadTitle:"Upload an updated version",
    optUploadDesc:"Your deck has evolved. Drop the final version below.",
    optUploadHint:"PowerPoint recommended (.pptx) for faithful presentation. PDF accepted. Max 50 MB.",
    dropLabel:"Drop your deck here",
    dropSub:"or click — .pptx, .ppt, .pdf · max 50 MB",
    uploading:"Uploading...",
    confirmedTitle:"Your choice is recorded",
    confirmedKeep:"You chose to keep the deck submitted with the application.",
    confirmedUpload:"Your final deck has been received: ",
    confirmedAt:"Confirmed on ",
    modifyBtn:"Change my choice",
    thanks:"Thank you. The jury will receive the briefing pack 2 days before the session.",
    legal:"Rotary Startup Award 2026 — documents remain strictly confidential to the jury and organiser.",
  },
};

const ACCEPT_MIME = ".pptx,.ppt,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/pdf";
const MAX_SIZE = 50 * 1024 * 1024;

function extOf(name) {
  const m = (name||"").toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}
function isAllowed(ext) {
  return ext === "pptx" || ext === "ppt" || ext === "pdf";
}
function safeFilename(name) {
  return (name||"deck").replace(/[^\w.\-]+/g, "_").slice(-100);
}
function formatDate(iso, lang) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", {day:"numeric", month:"long", year:"numeric"});
  } catch { return iso; }
}

const css = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,400&family=Inter:wght@300;400;500&display=swap');
@keyframes fadeUp{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#f7f4ef;min-height:100vh}
.fade{animation:fadeUp .3s ease both}
.btn{font-family:'Inter',sans-serif;cursor:pointer;transition:all .17s}
.btn:hover{filter:brightness(.93)}
.btn:active{transform:scale(.98)}
.lb{font-family:'Inter',sans-serif;cursor:pointer;font-size:11px;font-weight:500;padding:5px 11px;border-radius:8px;border:1px solid;letter-spacing:.05em;transition:all .15s;text-transform:uppercase}`;

export default function StartupUpload() {
  const [lang, setLang] = useState("fr");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [row, setRow] = useState(null);
  const [mode, setMode] = useState("review"); // "review" | "uploading" | "saving"
  const [forceChoose, setForceChoose] = useState(false);
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const t = T[lang];

  const params = new URLSearchParams(window.location.search);
  const token = params.get("t") || "";

  // Initial fetch
  useEffect(function(){
    if (!token) { setError(t.errNoToken); setLoading(false); return; }
    async function load() {
      try {
        const res = await fetch(
          SB_URL + "/rest/v1/startup_confirmations?deck_upload_token=eq." + encodeURIComponent(token) +
          "&select=id,startup_name,session_id,startup_contact_prenom,application_deck_path,application_deck_filename,deck_confirmed_at,final_deck_path,final_deck_uploaded_at,final_deck_original_filename",
          { headers: SB_HEADERS }
        );
        if (!res.ok) throw new Error("fetch_failed");
        const rows = await res.json();
        if (!rows || rows.length === 0) { setError(t.errInvalid); setLoading(false); return; }
        setRow(rows[0]);
      } catch (e) {
        setError(t.errInvalid);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function patchRow(patch) {
    const res = await fetch(
      SB_URL + "/rest/v1/startup_confirmations?deck_upload_token=eq." + encodeURIComponent(token),
      {
        method: "PATCH",
        headers: { ...SB_HEADERS, "Prefer": "return=representation" },
        body: JSON.stringify(patch)
      }
    );
    if (!res.ok) throw new Error("save_failed_" + res.status);
    const rows = await res.json();
    if (rows && rows.length) setRow(rows[0]);
    return rows;
  }

  async function confirmKeep() {
    setMode("saving");
    try {
      await patchRow({
        deck_confirmed_at: new Date().toISOString(),
        final_deck_path: null,
        final_deck_uploaded_at: null,
        final_deck_original_filename: null
      });
      setForceChoose(false);
    } catch (e) {
      alert(t.errSave);
    }
    setMode("review");
  }

  async function handleFile(file) {
    if (!file) return;
    const ext = extOf(file.name);
    if (!isAllowed(ext)) { alert(t.errFormat); return; }
    if (file.size > MAX_SIZE) { alert(t.errSize); return; }

    setMode("uploading");
    setUploadPct(0);
    const token12 = token.replace(/-/g, "").slice(0, 12);
    const path = "session_decks/" + token12 + "/" + Date.now() + "_" + safeFilename(file.name);

    // Upload via fetch with progress tracking (XHR for upload progress)
    try {
      await new Promise(function(resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", SB_URL + "/storage/v1/object/uploads/" + path);
        xhr.setRequestHeader("apikey", SB_KEY);
        xhr.setRequestHeader("Authorization", "Bearer " + SB_KEY);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.setRequestHeader("x-upsert", "true");
        xhr.upload.onprogress = function(e) {
          if (e.lengthComputable) setUploadPct(Math.round(100 * e.loaded / e.total));
        };
        xhr.onload = function() { xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("status_"+xhr.status)); };
        xhr.onerror = function() { reject(new Error("network")); };
        xhr.send(file);
      });

      await patchRow({
        deck_confirmed_at: new Date().toISOString(),
        final_deck_path: path,
        final_deck_uploaded_at: new Date().toISOString(),
        final_deck_original_filename: file.name
      });
      setForceChoose(false);
    } catch (e) {
      alert(t.errUpload);
    }
    setMode("review");
    setUploadPct(0);
  }

  // Render helpers
  function Header() {
    return (
      <div style={{background:NAVY,position:"sticky",top:0,zIndex:10,borderBottom:"1px solid rgba(201,168,76,.18)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1.5rem",height:55}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,"+GOLD+",#a07828)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:NAVY,flexShrink:0}}>R</div>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:13.5,fontWeight:600,color:"white"}}>Rotary Startup Award 2026</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:".1em",textTransform:"uppercase"}}>{t.navSub}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:4}}>
            {["fr","en"].map(function(l){
              const on = lang === l;
              return <button key={l} className="lb" onClick={function(){setLang(l);}}
                style={{background:on?GOLD:"transparent",color:on?NAVY:"rgba(255,255,255,.45)",borderColor:on?GOLD:"rgba(255,255,255,.2)"}}>{l}</button>;
            })}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{minHeight:"100vh",background:CREAM,fontFamily:"Inter,sans-serif",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <style>{css}</style>
        <div style={{fontSize:13,color:"#6a6a8a"}}>{t.loading}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{fontFamily:"Inter,sans-serif",background:CREAM,minHeight:"100vh"}}>
        <style>{css}</style>
        <Header/>
        <div style={{maxWidth:540,margin:"0 auto",padding:"4rem 1.5rem",textAlign:"center"}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:"#fde8e8",border:"2px solid #f5c0c0",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:26}}>⚠</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:600,color:NAVY,marginBottom:14}}>Oups</div>
          <div style={{fontSize:13,color:"#6a6a8a",lineHeight:1.75}}>{error}</div>
        </div>
      </div>
    );
  }

  const sess = SESSIONS[row.session_id] || {emoji:"📎",color:NAVY,light:CREAM,border:CREAM2,label:{fr:row.session_id,en:row.session_id},date:{fr:"",en:""},deadline:{fr:"",en:""}};
  const hasApplicationDeck = !!row.application_deck_path;
  const applicationDeckUrl = hasApplicationDeck
    ? SB_URL + "/storage/v1/object/public/uploads/" + row.application_deck_path
    : null;
  const alreadyChose = !!row.deck_confirmed_at && !forceChoose;

  // Confirmed view
  if (alreadyChose && mode === "review") {
    const uploaded = !!row.final_deck_path;
    return (
      <div style={{fontFamily:"Inter,sans-serif",background:CREAM,minHeight:"100vh"}}>
        <style>{css}</style>
        <Header/>
        <div style={{maxWidth:560,margin:"0 auto",padding:"2rem 1.5rem 5rem"}}>
          <div className="fade" style={{marginBottom:22}}>
            <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:".1em",color:sess.color,fontWeight:500,marginBottom:6}}>{sess.emoji} {sess.label[lang]}</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:600,color:NAVY,lineHeight:1.15,marginBottom:8}}>{row.startup_name}</div>
            <div style={{fontSize:13,color:"#6a6a8a"}}>{t.sessionCtx} {t.on} <strong style={{color:NAVY}}>{sess.date[lang]}</strong></div>
          </div>

          <div className="fade" style={{background:"white",border:"1px solid "+sess.border,borderRadius:14,padding:"22px 22px",marginBottom:16,animationDelay:".05s"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:"#e8f5ee",border:"1.5px solid #b0d8c4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>✓</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:600,color:NAVY}}>{t.confirmedTitle}</div>
            </div>
            {uploaded ? (
              <div>
                <div style={{fontSize:13,color:"#4a4a68",lineHeight:1.65,marginBottom:8}}>{t.confirmedUpload}<strong>{row.final_deck_original_filename}</strong></div>
                <div style={{fontSize:11,color:"#a0a0b8"}}>{t.confirmedAt}{formatDate(row.final_deck_uploaded_at, lang)}</div>
              </div>
            ) : (
              <div>
                <div style={{fontSize:13,color:"#4a4a68",lineHeight:1.65,marginBottom:8}}>{t.confirmedKeep}</div>
                {hasApplicationDeck && <div style={{fontSize:11,color:"#a0a0b8"}}>{row.application_deck_filename}</div>}
                <div style={{fontSize:11,color:"#a0a0b8",marginTop:6}}>{t.confirmedAt}{formatDate(row.deck_confirmed_at, lang)}</div>
              </div>
            )}
          </div>

          <div className="fade" style={{background:sess.light,borderRadius:12,padding:"14px 18px",marginBottom:16,border:"1px solid "+sess.border,animationDelay:".08s"}}>
            <div style={{fontSize:12,color:sess.color,lineHeight:1.65}}>{t.thanks}</div>
          </div>

          <div className="fade" style={{textAlign:"center",animationDelay:".11s"}}>
            <button className="btn" onClick={function(){setForceChoose(true);}}
              style={{padding:"10px 22px",borderRadius:10,background:"white",color:NAVY,border:"1.5px solid "+CREAM2,fontSize:13,fontWeight:500}}>
              {t.modifyBtn}
            </button>
          </div>

          <div style={{fontSize:10.5,color:"#a8a8c0",textAlign:"center",marginTop:32,lineHeight:1.6}}>{t.legal}</div>
        </div>
      </div>
    );
  }

  // Choice view
  const busy = mode !== "review";
  return (
    <div style={{fontFamily:"Inter,sans-serif",background:CREAM,minHeight:"100vh"}}>
      <style>{css}</style>
      <Header/>
      <div style={{maxWidth:620,margin:"0 auto",padding:"2rem 1.5rem 5rem"}}>
        {/* Title */}
        <div className="fade" style={{marginBottom:22}}>
          <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:".1em",color:sess.color,fontWeight:500,marginBottom:6}}>{sess.emoji} {sess.label[lang]}</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:600,color:NAVY,lineHeight:1.15,marginBottom:8}}>
            {t.hello}{row.startup_contact_prenom ? " " + row.startup_contact_prenom : ""} —
          </div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:500,fontStyle:"italic",color:GOLD,marginBottom:10}}>{row.startup_name}</div>
          <div style={{fontSize:13,color:"#6a6a8a",lineHeight:1.7}}>{t.sessionCtx} {t.on} <strong style={{color:NAVY}}>{sess.date[lang]}</strong>.</div>
        </div>

        {/* Session brief */}
        <div className="fade" style={{background:"white",borderRadius:12,padding:"16px 18px",marginBottom:14,border:"1px solid "+CREAM2,animationDelay:".04s"}}>
          <div style={{fontSize:11,color:"#8a8aaa",letterSpacing:".05em",textTransform:"uppercase",fontWeight:500,marginBottom:8}}>{t.ownPres}</div>
          <div style={{fontSize:13,color:"#4a4a68",lineHeight:1.7,marginBottom:10}}>{t.formatInfo}</div>
          <div style={{fontSize:13,color:"#4a4a68",lineHeight:1.7}}>{t.ownPresDesc}</div>
        </div>

        {/* Deadline */}
        <div className="fade" style={{background:sess.light,borderRadius:10,padding:"10px 15px",marginBottom:24,border:"1px solid "+sess.border,animationDelay:".06s"}}>
          <div style={{fontSize:12,color:sess.color,fontWeight:500}}>⏰ {t.deadline}<strong>{sess.deadline[lang]}</strong></div>
        </div>

        {/* Section title */}
        <div className="fade" style={{fontSize:10,textTransform:"uppercase",letterSpacing:".1em",color:"#a0a0b8",fontWeight:500,marginBottom:10,animationDelay:".08s"}}>{t.deckSection}</div>

        {/* Application deck */}
        {hasApplicationDeck && (
          <div className="fade" style={{background:"white",borderRadius:11,padding:"14px 16px",marginBottom:14,border:"1px solid "+CREAM2,display:"flex",alignItems:"center",gap:14,animationDelay:".1s"}}>
            <div style={{width:36,height:46,borderRadius:5,background:"#fbe8ee",color:"#8a2040",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:600,flexShrink:0}}>PDF</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10.5,color:"#a0a0b8",textTransform:"uppercase",letterSpacing:".05em",marginBottom:2}}>{t.applicationDeck}</div>
              <div style={{fontSize:13,color:NAVY,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{row.application_deck_filename || "deck.pdf"}</div>
            </div>
            <a href={applicationDeckUrl} target="_blank" rel="noreferrer"
              style={{fontSize:12,fontWeight:500,padding:"7px 12px",borderRadius:8,background:CREAM,color:NAVY,textDecoration:"none",border:"1px solid "+CREAM2,whiteSpace:"nowrap"}}>
              ↓ {t.downloadCurrent}
            </a>
          </div>
        )}

        {/* Choice */}
        <div className="fade" style={{fontSize:10,textTransform:"uppercase",letterSpacing:".1em",color:"#a0a0b8",fontWeight:500,marginTop:24,marginBottom:10,animationDelay:".13s"}}>{t.chooseTitle}</div>

        {/* Option A: keep */}
        {hasApplicationDeck && (
          <div className="fade" style={{background:"white",borderRadius:13,padding:"18px 20px",marginBottom:12,border:"1.5px solid "+CREAM2,animationDelay:".15s"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:"#e8f5ee",color:"#1d6b4f",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>A</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:600,color:NAVY}}>{t.optKeepTitle}</div>
            </div>
            <div style={{fontSize:12.5,color:"#6a6a8a",lineHeight:1.65,marginBottom:12}}>{t.optKeepDesc}</div>
            <button className="btn" onClick={confirmKeep} disabled={busy}
              style={{width:"100%",padding:"11px",borderRadius:10,background:busy?"#7a8a9a":NAVY,color:"white",border:"none",fontSize:13.5,fontWeight:500,letterSpacing:".02em"}}>
              {busy && mode === "saving" ? t.uploading : t.optKeepBtn}
            </button>
          </div>
        )}

        {/* Option B: upload */}
        <div className="fade" style={{background:"white",borderRadius:13,padding:"18px 20px",border:"1.5px solid "+CREAM2,animationDelay:".18s"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:"#fdf6e8",color:"#9a6400",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>B</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:600,color:NAVY}}>{t.optUploadTitle}</div>
          </div>
          <div style={{fontSize:12.5,color:"#6a6a8a",lineHeight:1.65,marginBottom:6}}>{t.optUploadDesc}</div>
          <div style={{fontSize:11,color:"#a0a0b8",marginBottom:14,lineHeight:1.55}}>{t.optUploadHint}</div>

          <div onClick={function(){if(!busy)fileRef.current.click();}}
               onDragOver={function(e){e.preventDefault();if(!busy)setDrag(true);}}
               onDragLeave={function(){setDrag(false);}}
               onDrop={function(e){e.preventDefault();setDrag(false);if(!busy)handleFile(e.dataTransfer.files[0]);}}
               style={{border:"2px dashed "+(drag?GOLD:CREAM2),borderRadius:12,padding:"28px 20px",textAlign:"center",cursor:busy?"wait":"pointer",background:drag?"#fdf6e8":CREAM,transition:"all .2s"}}>
            {mode === "uploading" ? (
              <div>
                <div style={{width:36,height:36,borderRadius:"50%",border:"3px solid "+CREAM2,borderTopColor:GOLD,margin:"0 auto 10px",animation:"spin .8s linear infinite"}}/>
                <div style={{fontSize:13,color:NAVY,fontWeight:500,marginBottom:5}}>{t.uploading}</div>
                <div style={{fontSize:11,color:"#a0a0b8"}}>{uploadPct}%</div>
              </div>
            ) : (
              <div>
                <div style={{width:44,height:44,borderRadius:"50%",background:"white",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",fontSize:20,border:"1px solid "+CREAM2}}>📎</div>
                <div style={{fontSize:13,fontWeight:500,color:NAVY,marginBottom:3}}>{t.dropLabel}</div>
                <div style={{fontSize:11,color:"#a8a8c0"}}>{t.dropSub}</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept={ACCEPT_MIME} style={{display:"none"}}
              onChange={function(e){handleFile(e.target.files[0]);}}/>
          </div>
        </div>

        <div style={{fontSize:10.5,color:"#a8a8c0",textAlign:"center",marginTop:32,lineHeight:1.6}}>{t.legal}</div>
      </div>
    </div>
  );
}
