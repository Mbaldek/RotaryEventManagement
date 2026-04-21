import { useState, useRef } from "react";

const SB_URL = "https://uaoucznptxmvhhytapso.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhb3Vjem5wdHhtdmhoeXRhcHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTU5NzAsImV4cCI6MjA4OTQ5MTk3MH0.evOgZctRuIxGSnZLocea5cAKqKR5nc-5x32QDqBUt0U";
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json", "Prefer": "return=minimal" };

const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#f7f4ef";
const CREAM2 = "#ede9e1";

const SESSIONS = [
  {id:"foodtech",color:"#5a7a1a",light:"#eef5e0",border:"#c0d890",emoji:"🌾",
    label:{fr:"FoodTech & Économie circulaire",en:"FoodTech & Circular Economy",de:"FoodTech & Kreislaufwirtschaft"},
    date:{fr:"Jeudi 30 avril · 18h",en:"Thursday April 30 · 6pm",de:"Donnerstag, 30. April · 18 Uhr"}},
  {id:"social",color:"#8a2040",light:"#fbe8ee",border:"#e8a8bc",emoji:"🤝",
    label:{fr:"Impact social & Edtech",en:"Social Impact & Edtech",de:"Soziale Wirkung & Edtech"},
    date:{fr:"Mercredi 6 mai · 18h",en:"Wednesday May 6 · 6pm",de:"Mittwoch, 6. Mai · 18 Uhr"}},
  {id:"tech",color:"#4a2a7a",light:"#f0eaf8",border:"#c8b0e8",emoji:"💻",
    label:{fr:"Tech, AI, Fintech & Mobilité",en:"Tech, AI, Fintech & Mobility",de:"Tech, KI, Fintech & Mobilität"},
    date:{fr:"Mercredi 13 mai · 18h",en:"Wednesday May 13 · 6pm",de:"Mittwoch, 13. Mai · 18 Uhr"}},
  {id:"health",color:"#1a5fa8",light:"#e8f0fb",border:"#a8c8f0",emoji:"🏥",
    label:{fr:"Healthtech & Biotech",en:"Healthtech & Biotech",de:"Healthtech & Biotech"},
    date:{fr:"Mardi 19 mai · 18h",en:"Tuesday May 19 · 6pm",de:"Dienstag, 19. Mai · 18 Uhr"}},
  {id:"greentech",color:"#1d6b4f",light:"#e8f5ee",border:"#b0d8c4",emoji:"🌱",
    label:{fr:"Greentech & Environnement",en:"Greentech & Environment",de:"Greentech & Umwelt"},
    date:{fr:"Jeudi 21 mai · 18h",en:"Thursday May 21 · 6pm",de:"Donnerstag, 21. Mai · 18 Uhr"}},
];

const T = {
  fr:{navSub:"Formulaire juré · Profil & disponibilités",heroTitle:"Bienvenue au jury",heroDesc:"Merci d'accepter de rejoindre le jury du Rotary Startup Award Paris–Berlin. Renseignez votre profil ci-dessous — il servira à préparer les supports de présentation des sessions.",sId:"Identité",sPhoto:"Photo professionnelle",sSess:"Disponibilités",sessDesc:"Sélectionnez les sessions pour lesquelles vous êtes disponible (visio, ~2h, 2h30 max)",fFirst:"Prénom *",fLast:"Nom *",fTitle:"Titre / Qualité * (ex : Directeur Innovation, BNP Paribas)",fOrg:"Organisation / Entreprise (optionnel)",fEmail:"Email *",photoLabel:"Déposez votre photo ici",photoSub:"ou cliquez · JPG, PNG · max 5 Mo",photoHint:"Utilisée dans les slides de présentation",changePhoto:"Changer",sessSub:"visio · ~2h (2h30 max)",finaleLabel:"🏆 Grande Finale — mardi 26 mai, 16h–19h",finaleLoc:"En présentiel · Cyrus Conseil, 50 bd Haussmann, Paris 75009",finaleNote:"Sous réserve de validation par le comité d'organisation",submitBtn:"Confirmer ma participation →",submitting:"Envoi en cours…",legal:"Données utilisées exclusivement pour le Rotary Startup Award 2026.",okTitle:"Merci,",okDesc:"Votre profil a bien été enregistré. L'équipe vous contactera très prochainement.",recap:"Récapitulatif",eFirst:"Requis",eLast:"Requis",eTitle:"Requis",eEmail:"Email valide requis",eSess:"Sélectionnez au moins une session",eServer:"Erreur lors de l'envoi. Merci de réessayer.",finaleShort:"Grande Finale 26 mai"},
  en:{navSub:"Jury form · Profile & availability",heroTitle:"Welcome to the jury",heroDesc:"Thank you for joining the jury of the Rotary Startup Award Paris–Berlin. Please fill in your profile below — it will be used to prepare the session presentation materials.",sId:"Identity",sPhoto:"Professional photo",sSess:"Availability",sessDesc:"Select the sessions for which you are available (remote, ~2h, 2h30 max)",fFirst:"First name *",fLast:"Last name *",fTitle:"Title / Role * (e.g. Head of Innovation, BNP Paribas)",fOrg:"Organisation / Company (optional)",fEmail:"Email *",photoLabel:"Drop your photo here",photoSub:"or click · JPG, PNG · max 5 MB",photoHint:"Used in session presentation slides",changePhoto:"Change",sessSub:"remote · ~2h (2h30 max)",finaleLabel:"🏆 Grand Final — Tuesday May 26, 4–7pm",finaleLoc:"In person · Cyrus Conseil, 50 bd Haussmann, Paris 75009",finaleNote:"Subject to validation by the organising committee",submitBtn:"Confirm my participation →",submitting:"Sending…",legal:"Data used exclusively for the Rotary Startup Award 2026.",okTitle:"Thank you,",okDesc:"Your profile has been recorded. The team will contact you very soon.",recap:"Summary",eFirst:"Required",eLast:"Required",eTitle:"Required",eEmail:"A valid email is required",eSess:"Please select at least one session",eServer:"An error occurred. Please try again.",finaleShort:"Grand Final May 26"},
  de:{navSub:"Jurymitglied-Formular · Profil & Verfügbarkeit",heroTitle:"Willkommen in der Jury",heroDesc:"Vielen Dank, dass Sie der Jury des Rotary Startup Award Paris–Berlin beitreten. Bitte füllen Sie Ihr Profil aus — es dient zur Vorbereitung der Präsentationsunterlagen.",sId:"Identität",sPhoto:"Professionelles Foto",sSess:"Verfügbarkeit",sessDesc:"Wählen Sie die Sessions aus, für die Sie verfügbar sind (online, ~2 Std., max. 2,5 Std.)",fFirst:"Vorname *",fLast:"Nachname *",fTitle:"Titel / Funktion * (z.B. Innovationsleiter, BNP Paribas)",fOrg:"Organisation / Unternehmen (optional)",fEmail:"E-Mail *",photoLabel:"Foto hier ablegen",photoSub:"oder klicken · JPG, PNG · max. 5 MB",photoHint:"Wird in den Präsentationsfolien verwendet",changePhoto:"Ändern",sessSub:"Online · ~2 Std. (max. 2,5 Std.)",finaleLabel:"🏆 Großes Finale — Dienstag, 26. Mai, 16–19 Uhr",finaleLoc:"Vor Ort · Cyrus Conseil, 50 bd Haussmann, Paris 75009",finaleNote:"Vorbehaltlich der Bestätigung durch das Organisationskomitee",submitBtn:"Teilnahme bestätigen →",submitting:"Wird gesendet…",legal:"Daten werden ausschließlich für den Rotary Startup Award 2026 verwendet.",okTitle:"Vielen Dank,",okDesc:"Ihr Profil wurde gespeichert. Das Team wird sich in Kürze bei Ihnen melden.",recap:"Zusammenfassung",eFirst:"Pflichtfeld",eLast:"Pflichtfeld",eTitle:"Pflichtfeld",eEmail:"Gültige E-Mail erforderlich",eSess:"Bitte wählen Sie mindestens eine Session",eServer:"Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",finaleShort:"Großes Finale 26. Mai"},
};

async function compress(file) {
  return new Promise(function(resolve) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = function() {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      const max = 400;
      if (w > h && w > max) { h = Math.round(h*max/w); w = max; }
      else if (h > max) { w = Math.round(w*max/h); h = max; }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = function() { resolve(null); };
    img.src = url;
  });
}

async function saveProfile(payload) {
  const body = {
    prenom: payload.prenom,
    nom: payload.nom,
    qualite: payload.qualite,
    organisation: payload.organisation,
    email: payload.email,
    photo_base64: payload.photo,
    sessions: payload.sessions,
    grande_finale: payload.grande_finale,
    lang: payload.lang,
  };
  const res = await fetch(SB_URL + "/rest/v1/jury_profiles", {
    method: "POST",
    headers: SB_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error("insert_failed: " + res.status + " " + txt);
  }
}

const css = "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,400&family=Inter:wght@300;400;500&display=swap');\n@keyframes fadeUp{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}\n@keyframes spin{to{transform:rotate(360deg)}}\n*{box-sizing:border-box;margin:0;padding:0}\nbody{font-family:'Inter',sans-serif;background:#f7f4ef;min-height:100vh}\n.fade{animation:fadeUp .3s ease both}\n.inp{font-family:'Inter',sans-serif;outline:none;color:#0f1f3d;width:100%;font-size:14px;padding:11px 14px;border-radius:10px;border:1.5px solid #ede9e1;background:white;transition:border-color .2s,box-shadow .2s}\n.inp:focus{border-color:#c9a84c;box-shadow:0 0 0 4px rgba(201,168,76,.13)}\n.inp::placeholder{color:#b8b8c8}\n.btn{font-family:'Inter',sans-serif;cursor:pointer;transition:all .17s}\n.btn:hover{filter:brightness(.91)}\n.btn:active{transform:scale(.97)}\n.lb{font-family:'Inter',sans-serif;cursor:pointer;font-size:11px;font-weight:500;padding:5px 11px;border-radius:8px;border:1px solid;letter-spacing:.05em;transition:all .15s;text-transform:uppercase}";

function PhotoZone({onChange,t}) {
  const ref = useRef(null);
  const [preview, setPreview] = useState(null);
  const [drag, setDrag] = useState(false);
  function handle(file) {
    if (!file||!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = function(e){setPreview(e.target.result);};
    reader.readAsDataURL(file);
    onChange(file);
  }
  return (
    <div onClick={function(){ref.current.click();}} onDragOver={function(e){e.preventDefault();setDrag(true);}} onDragLeave={function(){setDrag(false);}} onDrop={function(e){e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0]);}}
      style={{border:"2px dashed "+(drag?"#c9a84c":preview?"#1d6b4f":"#ede9e1"),borderRadius:12,cursor:"pointer",transition:"all .2s",background:drag?"#fdf6e8":"white",overflow:"hidden"}}>
      {preview
        ? <div style={{position:"relative"}}><img src={preview} alt="" style={{width:"100%",maxHeight:170,objectFit:"cover",display:"block"}}/><div style={{position:"absolute",inset:0,background:"rgba(15,31,61,.55)",display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity .2s"}} onMouseEnter={function(e){e.currentTarget.style.opacity=1;}} onMouseLeave={function(e){e.currentTarget.style.opacity=0;}}><span style={{color:"white",fontSize:13,fontWeight:500}}>{t.changePhoto}</span></div></div>
        : <div style={{padding:"26px 20px",textAlign:"center"}}><div style={{width:44,height:44,borderRadius:"50%",background:"#f7f4ef",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",fontSize:20}}>📷</div><div style={{fontSize:13,fontWeight:500,color:"#0f1f3d",marginBottom:3}}>{t.photoLabel}</div><div style={{fontSize:11,color:"#a8a8c0"}}>{t.photoSub}</div></div>
      }
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={function(e){handle(e.target.files[0]);}}/>
    </div>
  );
}

export default function RsaJuryForm() {
  const [lang, setLang] = useState("fr");
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({prenom:"",nom:"",qualite:"",organisation:"",email:"",photo:null,sessions:[],finale:false});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const t = T[lang];

  function set(f,v) { setForm(function(p){return Object.assign({},p,{[f]:v});}); setErrors(function(e){return Object.assign({},e,{[f]:null});}); }
  function togSess(id) {
    const next = form.sessions.includes(id)?form.sessions.filter(function(x){return x!==id;}):form.sessions.concat([id]);
    setForm(function(p){return Object.assign({},p,{sessions:next});}); setErrors(function(e){return Object.assign({},e,{sessions:null});});
  }

  function validate() {
    const e = {};
    if (!form.prenom.trim()) e.prenom=t.eFirst;
    if (!form.nom.trim()) e.nom=t.eLast;
    if (!form.qualite.trim()) e.qualite=t.eTitle;
    if (!form.email.trim()||!form.email.includes("@")) e.email=t.eEmail;
    if (form.sessions.length===0&&!form.finale) e.sessions=t.eSess;
    return e;
  }

  async function submit() {
    const e = validate();
    if (Object.keys(e).length>0) { setErrors(e); return; }
    setLoading(true);
    try {
      let photo = null;
      if (form.photo) photo = await compress(form.photo);
      const sessLabels = form.sessions.map(function(id){const s=SESSIONS.find(function(x){return x.id===id;});return s?s.label.fr:id;});
      await saveProfile({prenom:form.prenom.trim(),nom:form.nom.trim(),qualite:form.qualite.trim(),organisation:form.organisation.trim()||null,email:form.email.trim(),photo:photo,sessions:sessLabels,grande_finale:form.finale,lang:lang});
      setStep("success");
    } catch(err) {
      setErrors({_global:t.eServer});
    }
    setLoading(false);
  }

  if (step==="success") return (
    <div style={{minHeight:"100vh",background:CREAM,fontFamily:"Inter,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
      <style>{css}</style>
      <div className="fade" style={{textAlign:"center",maxWidth:420}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:"#e8f5ee",border:"2px solid #b0d8c4",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:26}}>✓</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:600,color:NAVY,marginBottom:10}}>{t.okTitle} {form.prenom} !</div>
        <div style={{fontSize:13,color:"#6a6a8a",lineHeight:1.75,marginBottom:22}}>{t.okDesc}</div>
        <div style={{background:"white",borderRadius:12,padding:"15px 18px",textAlign:"left",border:"1px solid "+CREAM2}}>
          <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".1em",color:"#a0a0b8",marginBottom:9,fontWeight:500}}>{t.recap}</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:600,color:NAVY,marginBottom:2}}>{form.prenom} {form.nom}</div>
          <div style={{fontSize:12,color:"#6a6a8a",marginBottom:9}}>{form.qualite}{form.organisation?" · "+form.organisation:""}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {form.sessions.map(function(id){const s=SESSIONS.find(function(x){return x.id===id;});return s?<span key={id} style={{fontSize:10,padding:"3px 8px",borderRadius:12,background:s.light,color:s.color,fontWeight:500,border:"1px solid "+s.border}}>{s.emoji} {s.date[lang]}</span>:null;})}
            {form.finale && <span style={{fontSize:10,padding:"3px 8px",borderRadius:12,background:"#fdf6e8",color:"#9a6400",fontWeight:500,border:"1px solid #e8d090"}}>🏆 {t.finaleShort}</span>}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:"Inter,sans-serif",background:CREAM,minHeight:"100vh"}}>
      <style>{css}</style>
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
            {["fr","en","de"].map(function(l){const on=lang===l;return <button key={l} className="lb" onClick={function(){setLang(l);}} style={{background:on?GOLD:"transparent",color:on?NAVY:"rgba(255,255,255,.45)",borderColor:on?GOLD:"rgba(255,255,255,.2)"}}>{l}</button>;})}
          </div>
        </div>
      </div>

      <div style={{maxWidth:540,margin:"0 auto",padding:"2rem 1.5rem 5rem"}}>
        <div className="fade" style={{marginBottom:26}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:600,color:NAVY,lineHeight:1.2,marginBottom:10}}>{t.heroTitle}<br/><em style={{fontStyle:"italic",color:GOLD}}>2026</em></div>
          <div style={{fontSize:13,color:"#6a6a8a",lineHeight:1.75}}>{t.heroDesc}</div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:22}}>
          <div className="fade" style={{animationDelay:".05s"}}>
            <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".1em",color:"#a0a0b8",fontWeight:500,marginBottom:10}}>{t.sId}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}}>
              <div><input className="inp" placeholder={t.fFirst} value={form.prenom} onChange={function(e){set("prenom",e.target.value);}} style={{borderColor:errors.prenom?"#e8a0a0":undefined}}/>{errors.prenom&&<div style={{fontSize:11,color:"#c03010",marginTop:4}}>{errors.prenom}</div>}</div>
              <div><input className="inp" placeholder={t.fLast} value={form.nom} onChange={function(e){set("nom",e.target.value);}} style={{borderColor:errors.nom?"#e8a0a0":undefined}}/>{errors.nom&&<div style={{fontSize:11,color:"#c03010",marginTop:4}}>{errors.nom}</div>}</div>
            </div>
            <input className="inp" placeholder={t.fTitle} value={form.qualite} onChange={function(e){set("qualite",e.target.value);}} style={{marginBottom:9,borderColor:errors.qualite?"#e8a0a0":undefined}}/>
            {errors.qualite&&<div style={{fontSize:11,color:"#c03010",marginBottom:7}}>{errors.qualite}</div>}
            <input className="inp" placeholder={t.fOrg} value={form.organisation} onChange={function(e){set("organisation",e.target.value);}} style={{marginBottom:9}}/>
            <input className="inp" type="email" placeholder={t.fEmail} value={form.email} onChange={function(e){set("email",e.target.value);}} style={{borderColor:errors.email?"#e8a0a0":undefined}}/>
            {errors.email&&<div style={{fontSize:11,color:"#c03010",marginTop:4}}>{errors.email}</div>}
          </div>

          <div className="fade" style={{animationDelay:".09s"}}>
            <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".1em",color:"#a0a0b8",fontWeight:500,marginBottom:9}}>{t.sPhoto}</div>
            <PhotoZone onChange={function(f){set("photo",f);}} t={t}/>
            <div style={{fontSize:11,color:"#a8a8c0",marginTop:5}}>{t.photoHint}</div>
          </div>

          <div className="fade" style={{animationDelay:".13s"}}>
            <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:".1em",color:"#a0a0b8",fontWeight:500,marginBottom:5}}>{t.sSess}</div>
            <div style={{fontSize:12,color:"#8a8aaa",marginBottom:10}}>{t.sessDesc}</div>
            {errors.sessions&&<div style={{fontSize:11,color:"#c03010",marginBottom:8}}>{errors.sessions}</div>}
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {SESSIONS.map(function(s){
                const sel=form.sessions.includes(s.id);
                return (
                  <div key={s.id} className="btn" onClick={function(){togSess(s.id);}}
                    style={{display:"flex",alignItems:"center",gap:13,padding:"12px 15px",borderRadius:11,border:"1.5px solid "+(sel?s.color:CREAM2),background:sel?s.light:"white",transition:"all .18s"}}>
                    <div style={{width:19,height:19,borderRadius:4,flexShrink:0,border:sel?"none":"1.5px solid #d0d0e0",background:sel?s.color:"white",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                      {sel&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:sel?500:400,color:sel?s.color:NAVY}}>{s.emoji} {s.label[lang]}</div>
                      <div style={{fontSize:11,color:sel?s.color:"#9090a8",marginTop:1,opacity:.85}}>{s.date[lang]} · {t.sessSub}</div>
                    </div>
                  </div>
                );
              })}
              <div className="btn" onClick={function(){setForm(function(p){return Object.assign({},p,{finale:!p.finale});});setErrors(function(e){return Object.assign({},e,{sessions:null});});}}
                style={{display:"flex",alignItems:"flex-start",gap:13,padding:"13px 15px",borderRadius:11,border:"1.5px solid "+(form.finale?GOLD:CREAM2),background:form.finale?"#fdf6e8":"white",transition:"all .18s"}}>
                <div style={{width:19,height:19,borderRadius:4,flexShrink:0,marginTop:2,border:form.finale?"none":"1.5px solid #d0d0e0",background:form.finale?GOLD:"white",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                  {form.finale&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:form.finale?500:400,color:form.finale?"#9a6400":NAVY}}>{t.finaleLabel}</div>
                  <div style={{fontSize:11,color:form.finale?"#9a6400":"#9090a8",marginTop:3,lineHeight:1.55,opacity:.85}}>{t.finaleLoc}<br/><em style={{fontStyle:"italic"}}>{t.finaleNote}</em></div>
                </div>
              </div>
            </div>
          </div>

          {errors._global&&<div style={{padding:"11px 15px",borderRadius:10,background:"#fde8e8",color:"#8a1f1f",fontSize:13,border:"1px solid #f5c0c0"}}>{errors._global}</div>}

          <div className="fade" style={{animationDelay:".17s"}}>
            <button className="btn" onClick={submit} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:11,background:loading?"#7a8a9a":NAVY,color:"white",border:"none",fontSize:14,fontWeight:500,letterSpacing:".03em",display:"flex",alignItems:"center",justifyContent:"center",gap:9}}>
              {loading?<><div style={{width:15,height:15,border:"2px solid rgba(255,255,255,.25)",borderTopColor:"white",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>{t.submitting}</>:t.submitBtn}
            </button>
            <div style={{fontSize:11,color:"#a8a8c0",textAlign:"center",marginTop:9}}>{t.legal}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
