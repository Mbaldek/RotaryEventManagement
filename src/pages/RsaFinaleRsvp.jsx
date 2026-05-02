import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Check, Mic2, Users, Trophy, MapPin, Calendar, AlertCircle } from "lucide-react";
import { FinaleRsvp } from "@/lib/db";
import { SESSION_BY_ID } from "@/lib/rsa/constants";

const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#f7f4ef";
const CREAM2 = "#ede9e1";

const LS_LANG = "rsa_rsvp_lang";

const ROLES = [
  {
    id: "pitcher",
    Icon: Mic2,
    color: "#9a6400",
    bg: "#fdf6e8",
    border: "#e8d090",
    label: { fr: "Pitcher (finaliste)", en: "Pitcher (finalist)", de: "Pitcher (Finalist)" },
    desc: {
      fr: "Vous représentez votre startup à la Grande Finale.",
      en: "You will pitch on behalf of your startup at the Grand Final.",
      de: "Sie pitchen für Ihr Startup beim Großen Finale.",
    },
  },
  {
    id: "visitor",
    Icon: Users,
    color: "#4a2a7a",
    bg: "#f0eaf8",
    border: "#c8b0e8",
    label: { fr: "Visiteur", en: "Visitor", de: "Besucher" },
    desc: {
      fr: "Vous assistez à la Grande Finale comme invité.",
      en: "You attend the Grand Final as an invited guest.",
      de: "Sie nehmen als geladener Gast am Finale teil.",
    },
  },
  {
    id: "jury",
    Icon: Trophy,
    color: "#1a5fa8",
    bg: "#e8f0fb",
    border: "#a8c8f0",
    label: { fr: "Juré Grande Finale", en: "Grand Final juror", de: "Juror Großes Finale" },
    desc: {
      fr: "Vous évaluez les pitchs lors de la finale.",
      en: "You evaluate the pitches during the final.",
      de: "Sie bewerten die Pitches im Finale.",
    },
  },
];

const T = {
  fr: {
    navTitle: "Rotary Startup Award 2026",
    navSub: "Grande Finale · Confirmation de présence",
    finaleTitle: "🏆 Grande Finale",
    finaleDate: "Mardi 26 mai 2026 · 16h–19h",
    finaleLoc: "Cyrus Conseil · 50 bd Haussmann · Paris 75009",
    intro:
      "Merci de confirmer votre présence afin que nous puissions préparer l'accueil dans les meilleures conditions.",
    roleQ: "Vous venez en tant que :",
    pickRole: "Sélectionner",
    iAmAttending: "Je serai présent(e)",
    iAmNotAttending: "Je ne pourrai pas être présent(e)",
    sectionIdentity: "Identité",
    sectionContext: "Contexte",
    sectionAttending: "Présence",
    sectionMessage: "Message (optionnel)",
    fFirst: "Prénom *",
    fLast: "Nom *",
    fOrg: { pitcher: "Société / Startup *", visitor: "Société (optionnel)", jury: "Organisation (optionnel)" },
    fEmail: "Email *",
    fPhone: "Téléphone (optionnel)",
    fStartup: "Startup représentée *",
    fSession: "Session d'origine",
    fParty: "Nombre de personnes (vous inclus·e)",
    fMsg: "Allergies, accessibilité, remarques pour l'organisation…",
    submitYes: "Confirmer ma présence",
    submitNo: "Envoyer ma réponse",
    submitting: "Envoi…",
    okTitleYes: "Présence confirmée",
    okTitleNo: "Réponse enregistrée",
    okBodyYes:
      "Merci ! Vous recevrez un dernier rappel quelques jours avant. Nous avons hâte de vous accueillir.",
    okBodyNo:
      "Merci de nous avoir prévenus. Toute l'équipe regrette de ne pas vous voir cette fois — au plaisir de vous retrouver lors d'une prochaine session.",
    backHome: "Retour au site",
    eRequired: "Champ requis",
    eEmail: "Email valide requis",
    eRole: "Sélectionnez votre rôle",
    eServer: "Erreur lors de l'envoi. Merci de réessayer.",
    legal: "Vos données sont utilisées uniquement pour l'organisation de la Grande Finale.",
    fromSession: "Issu de la session",
  },
  en: {
    navTitle: "Rotary Startup Award 2026",
    navSub: "Grand Final · RSVP",
    finaleTitle: "🏆 Grand Final",
    finaleDate: "Tuesday May 26, 2026 · 4–7pm",
    finaleLoc: "Cyrus Conseil · 50 bd Haussmann · Paris 75009",
    intro:
      "Please confirm your attendance so we can prepare the welcome accordingly.",
    roleQ: "You are joining as:",
    pickRole: "Select",
    iAmAttending: "I will attend",
    iAmNotAttending: "I cannot attend",
    sectionIdentity: "Identity",
    sectionContext: "Context",
    sectionAttending: "Attendance",
    sectionMessage: "Message (optional)",
    fFirst: "First name *",
    fLast: "Last name *",
    fOrg: { pitcher: "Company / Startup *", visitor: "Company (optional)", jury: "Organisation (optional)" },
    fEmail: "Email *",
    fPhone: "Phone (optional)",
    fStartup: "Startup represented *",
    fSession: "Session of origin",
    fParty: "Number of guests (including you)",
    fMsg: "Allergies, accessibility, notes for the organisers…",
    submitYes: "Confirm attendance",
    submitNo: "Send my reply",
    submitting: "Sending…",
    okTitleYes: "Attendance confirmed",
    okTitleNo: "Reply recorded",
    okBodyYes:
      "Thank you! You will receive a final reminder a few days before. We can't wait to welcome you.",
    okBodyNo:
      "Thank you for letting us know. We're sorry to miss you this time — looking forward to meeting at a future session.",
    backHome: "Back to site",
    eRequired: "Required",
    eEmail: "Valid email required",
    eRole: "Pick your role",
    eServer: "An error occurred. Please try again.",
    legal: "Your data is used only to organise the Grand Final.",
    fromSession: "From session",
  },
  de: {
    navTitle: "Rotary Startup Award 2026",
    navSub: "Großes Finale · Anmeldung",
    finaleTitle: "🏆 Großes Finale",
    finaleDate: "Dienstag, 26. Mai 2026 · 16–19 Uhr",
    finaleLoc: "Cyrus Conseil · 50 bd Haussmann · Paris 75009",
    intro:
      "Bitte bestätigen Sie Ihre Teilnahme, damit wir den Empfang entsprechend vorbereiten können.",
    roleQ: "Sie kommen als:",
    pickRole: "Auswählen",
    iAmAttending: "Ich werde teilnehmen",
    iAmNotAttending: "Ich kann nicht teilnehmen",
    sectionIdentity: "Identität",
    sectionContext: "Kontext",
    sectionAttending: "Teilnahme",
    sectionMessage: "Nachricht (optional)",
    fFirst: "Vorname *",
    fLast: "Nachname *",
    fOrg: { pitcher: "Firma / Startup *", visitor: "Firma (optional)", jury: "Organisation (optional)" },
    fEmail: "E-Mail *",
    fPhone: "Telefon (optional)",
    fStartup: "Vertretenes Startup *",
    fSession: "Ursprungs-Session",
    fParty: "Anzahl Personen (inkl. Ihnen)",
    fMsg: "Allergien, Barrierefreiheit, Hinweise…",
    submitYes: "Teilnahme bestätigen",
    submitNo: "Antwort senden",
    submitting: "Wird gesendet…",
    okTitleYes: "Teilnahme bestätigt",
    okTitleNo: "Antwort erfasst",
    okBodyYes:
      "Danke! Sie erhalten einige Tage vorher eine letzte Erinnerung. Wir freuen uns auf Sie.",
    okBodyNo:
      "Danke für die Rückmeldung. Schade, dass wir uns dieses Mal verpassen — wir freuen uns auf eine spätere Gelegenheit.",
    backHome: "Zur Website",
    eRequired: "Pflichtfeld",
    eEmail: "Gültige E-Mail erforderlich",
    eRole: "Bitte Rolle wählen",
    eServer: "Ein Fehler ist aufgetreten. Bitte erneut versuchen.",
    legal: "Ihre Daten werden ausschließlich für die Organisation des Großen Finales verwendet.",
    fromSession: "Aus Session",
  },
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
*{box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:${CREAM};min-height:100vh}
.fade{animation:fadeUp .3s ease both}
.inp{font-family:'Inter',sans-serif;outline:none;color:${NAVY};width:100%;font-size:14px;padding:10px 13px;border-radius:9px;border:1.5px solid ${CREAM2};background:white;transition:border-color .15s,box-shadow .15s}
.inp:focus{border-color:${GOLD};box-shadow:0 0 0 4px rgba(201,168,76,.13)}
.inp::placeholder{color:#b8b8c8}
.inp[aria-invalid="true"]{border-color:#c03010;background:#fff5f3}
.btn{font-family:'Inter',sans-serif;cursor:pointer;transition:all .15s;border:none}
.btn:hover{filter:brightness(.92)}
.btn:active{transform:scale(.98)}
.btn:disabled{opacity:.55;cursor:not-allowed}
.lb{font-family:'Inter',sans-serif;cursor:pointer;font-size:11px;font-weight:500;padding:5px 11px;border-radius:7px;border:1px solid;letter-spacing:.05em;transition:all .15s;text-transform:uppercase}
.section-title{font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:#9090a8;font-weight:600;margin-bottom:8px}
.label{display:block;font-size:11.5px;color:#6a6a8a;font-weight:500;margin-bottom:5px}
.role-card{cursor:pointer;border:1.5px solid;border-radius:12px;padding:14px 14px;display:flex;gap:12px;align-items:flex-start;transition:all .15s}
.role-card:hover{filter:brightness(.97)}
.role-card.on{box-shadow:0 4px 14px rgba(15,31,61,.08)}
.attend-btn{padding:14px 18px;border-radius:12px;border:1.5px solid;font-size:14px;font-weight:500;cursor:pointer;display:flex;gap:10px;align-items:center;transition:all .15s;flex:1;justify-content:center}
.attend-btn:hover{filter:brightness(.96)}
.err{color:#c03010;font-size:11px;margin-top:4px}
@media (max-width:640px){
  .form-grid{grid-template-columns:1fr !important}
  .role-grid{grid-template-columns:1fr !important}
  .attend-row{flex-direction:column !important}
  .header-pad{padding:18px 16px !important}
}
`;

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");
}

export default function RsaFinaleRsvp() {
  const [params] = useSearchParams();

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

  // "jury" is NOT a public role on this form. Being a juror for a session
  // doesn't mean someone is also a juror for the Grande Finale (that's a
  // separate vetted list, jury_profiles.grande_finale === true), so even a
  // ?role=jury deep-link must not pre-select. Keep "jury" in the data model
  // (the FinaleRsvp table tolerates it) but hide it from the picker entirely
  // and ignore the URL param.
  const initialRole = useMemo(() => {
    const r = params.get("role");
    if (r === "jury") return null;
    return ROLES.some((x) => x.id === r) ? r : null;
  }, [params]);

  const visibleRoles = useMemo(() => ROLES.filter((r) => r.id !== "jury"), []);

  const [role, setRole] = useState(initialRole);
  const [attending, setAttending] = useState(null); // null | true | false

  const [form, setForm] = useState(() => ({
    prenom: params.get("prenom") || "",
    nom: params.get("nom") || "",
    organisation: params.get("organisation") || params.get("startup") || "",
    email: params.get("email") || "",
    telephone: params.get("telephone") || "",
    startup_name: params.get("startup") || "",
    source_session_id: params.get("from") || "",
    party_size: 1,
    message: "",
  }));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // null | { attending: boolean }
  const [serverErr, setServerErr] = useState("");

  const sourceSession = SESSION_BY_ID[form.source_session_id];

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function validate() {
    const e = {};
    if (!role) e.role = t.eRole;
    if (!form.prenom.trim()) e.prenom = t.eRequired;
    if (!form.nom.trim()) e.nom = t.eRequired;
    if (!isValidEmail(form.email)) e.email = t.eEmail;
    if (role === "pitcher" && !form.organisation.trim()) e.organisation = t.eRequired;
    if (role === "pitcher" && !form.startup_name.trim()) e.startup_name = t.eRequired;
    if (attending == null) e.attending = t.eRequired;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e?.preventDefault();
    setServerErr("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      await FinaleRsvp.create({
        role,
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        organisation: form.organisation.trim() || null,
        email: form.email.trim(),
        telephone: form.telephone.trim() || null,
        startup_name: form.startup_name.trim() || null,
        source_session_id: form.source_session_id || null,
        attending,
        party_size: attending ? Math.max(1, Math.min(20, parseInt(form.party_size, 10) || 1)) : 1,
        message: form.message.trim() || null,
      });
      setDone({ attending });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setServerErr(t.eServer);
    } finally {
      setSubmitting(false);
    }
  }

  // -------- success state --------
  if (done) {
    return (
      <div style={{ background: CREAM, minHeight: "100vh" }}>
        <style>{css}</style>
        <Header lang={lang} setLang={setLang} t={t} />
        <div className="fade" style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}>
          <div
            style={{
              background: "white",
              border: `1px solid ${CREAM2}`,
              borderRadius: 14,
              padding: "32px 28px",
              textAlign: "center",
              boxShadow: "0 4px 14px rgba(15,31,61,.04)",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: done.attending ? "#dff5e6" : CREAM,
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check className="w-7 h-7" style={{ color: done.attending ? "#1d6b4f" : "#9090a8" }} />
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 22,
                color: NAVY,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {done.attending ? t.okTitleYes : t.okTitleNo}, {form.prenom}
            </h2>
            <p style={{ fontSize: 13.5, color: "#6a6a8a", lineHeight: 1.6, marginBottom: 20 }}>
              {done.attending ? t.okBodyYes : t.okBodyNo}
            </p>
            <div
              style={{
                marginTop: 20,
                paddingTop: 18,
                borderTop: `1px solid ${CREAM2}`,
                fontSize: 12,
                color: "#9090a8",
                display: "flex",
                gap: 8,
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t.finaleDate}</span>
              <span style={{ color: "#d0d0dc" }}>·</span>
              <MapPin className="w-3.5 h-3.5" />
              <span>{t.finaleLoc}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------- form --------
  const selectedRole = ROLES.find((r) => r.id === role);

  return (
    <div style={{ background: CREAM, minHeight: "100vh" }}>
      <style>{css}</style>
      <Header lang={lang} setLang={setLang} t={t} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "26px 20px 60px" }}>
        {/* Hero card */}
        <div
          className="fade header-pad"
          style={{
            background: "linear-gradient(135deg,#fdf6e8 0%,#fbeec1 50%,#fdf6e8 100%)",
            border: "1.5px solid #e8d090",
            borderRadius: 14,
            padding: "22px 26px",
            marginBottom: 18,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -22,
              right: -16,
              fontSize: 130,
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
                marginBottom: 5,
              }}
            >
              Rotary Startup Award 2026
            </div>
            <h1
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 26,
                color: NAVY,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {t.finaleTitle}
            </h1>
            <div style={{ fontSize: 13, color: "#6a6a8a", display: "flex", flexWrap: "wrap", gap: 12 }}>
              <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
                <Calendar className="w-3.5 h-3.5" /> {t.finaleDate}
              </span>
              <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
                <MapPin className="w-3.5 h-3.5" /> {t.finaleLoc}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#5a5a7a", marginTop: 12, lineHeight: 1.55 }}>
              {t.intro}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="fade" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Role picker */}
          <Card>
            <div className="section-title">{t.roleQ}</div>
            <div
              className="role-grid"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${visibleRoles.length},1fr)`,
                gap: 10,
              }}
            >
              {visibleRoles.map((r) => {
                const on = role === r.id;
                const Icon = r.Icon;
                return (
                  <div
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={"role-card" + (on ? " on" : "")}
                    style={{
                      borderColor: on ? r.color : CREAM2,
                      background: on ? r.bg : "white",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: on ? "white" : CREAM,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: r.color }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: on ? r.color : NAVY,
                          marginBottom: 2,
                        }}
                      >
                        {r.label[lang]}
                      </div>
                      <div style={{ fontSize: 11, color: "#6a6a8a", lineHeight: 1.4 }}>
                        {r.desc[lang]}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {errors.role && <div className="err">{errors.role}</div>}
          </Card>

          {role && (
            <>
              {/* Identity */}
              <Card>
                <div className="section-title">{t.sectionIdentity}</div>
                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label={t.fFirst} error={errors.prenom}>
                    <input
                      className="inp"
                      value={form.prenom}
                      onChange={(e) => update({ prenom: e.target.value })}
                      aria-invalid={!!errors.prenom}
                    />
                  </Field>
                  <Field label={t.fLast} error={errors.nom}>
                    <input
                      className="inp"
                      value={form.nom}
                      onChange={(e) => update({ nom: e.target.value })}
                      aria-invalid={!!errors.nom}
                    />
                  </Field>
                  <Field label={t.fOrg[role]} error={errors.organisation}>
                    <input
                      className="inp"
                      value={form.organisation}
                      onChange={(e) => update({ organisation: e.target.value })}
                      aria-invalid={!!errors.organisation}
                    />
                  </Field>
                  <Field label={t.fEmail} error={errors.email}>
                    <input
                      className="inp"
                      type="email"
                      value={form.email}
                      onChange={(e) => update({ email: e.target.value })}
                      aria-invalid={!!errors.email}
                    />
                  </Field>
                  <Field label={t.fPhone}>
                    <input
                      className="inp"
                      type="tel"
                      value={form.telephone}
                      onChange={(e) => update({ telephone: e.target.value })}
                      placeholder="+33 6 12 34 56 78"
                    />
                  </Field>
                </div>
              </Card>

              {/* Pitcher / visitor context */}
              {(role === "pitcher" || role === "visitor") && (
                <Card>
                  <div className="section-title">{t.sectionContext}</div>
                  <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field
                      label={role === "pitcher" ? t.fStartup : t.fStartup.replace("*", "").trim()}
                      error={errors.startup_name}
                    >
                      <input
                        className="inp"
                        value={form.startup_name}
                        onChange={(e) => update({ startup_name: e.target.value })}
                        aria-invalid={!!errors.startup_name}
                      />
                    </Field>
                    {sourceSession && (
                      <Field label={t.fromSession}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 13px",
                            borderRadius: 9,
                            background: sourceSession.light,
                            border: `1.5px solid ${sourceSession.border}`,
                            fontSize: 13,
                            color: sourceSession.color,
                            fontWeight: 500,
                          }}
                        >
                          <span style={{ fontSize: 16 }}>{sourceSession.emoji}</span>
                          <span>
                            {lang === "en"
                              ? sourceSession.labelEn
                              : lang === "de"
                              ? sourceSession.labelDe
                              : sourceSession.label}
                          </span>
                        </div>
                      </Field>
                    )}
                  </div>
                </Card>
              )}

              {/* Attending */}
              <Card>
                <div className="section-title">{t.sectionAttending}</div>
                <div className="attend-row" style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="attend-btn"
                    onClick={() => setAttending(true)}
                    style={{
                      background: attending === true ? "#dff5e6" : "white",
                      borderColor: attending === true ? "#1d6b4f" : CREAM2,
                      color: attending === true ? "#1d6b4f" : NAVY,
                    }}
                  >
                    <Check className="w-4 h-4" />
                    {t.iAmAttending}
                  </button>
                  <button
                    type="button"
                    className="attend-btn"
                    onClick={() => setAttending(false)}
                    style={{
                      background: attending === false ? "#fff5f3" : "white",
                      borderColor: attending === false ? "#c03010" : CREAM2,
                      color: attending === false ? "#c03010" : NAVY,
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>×</span>
                    {t.iAmNotAttending}
                  </button>
                </div>
                {errors.attending && <div className="err">{errors.attending}</div>}

                {attending === true && (
                  <div style={{ marginTop: 12 }}>
                    <Field label={t.fParty}>
                      <input
                        className="inp"
                        type="number"
                        min={1}
                        max={20}
                        value={form.party_size}
                        onChange={(e) => update({ party_size: e.target.value })}
                        style={{ maxWidth: 120 }}
                      />
                    </Field>
                  </div>
                )}
              </Card>

              {/* Message */}
              <Card>
                <div className="section-title">{t.sectionMessage}</div>
                <Field label="" >
                  <textarea
                    className="inp"
                    rows={3}
                    value={form.message}
                    onChange={(e) => update({ message: e.target.value })}
                    placeholder={t.fMsg}
                    style={{ resize: "vertical", fontFamily: "Inter,sans-serif" }}
                  />
                </Field>
              </Card>

              {/* Submit */}
              {serverErr && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#fff5f3",
                    border: "1px solid #f0c0b0",
                    borderRadius: 10,
                    color: "#c03010",
                    fontSize: 12,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <AlertCircle className="w-4 h-4" /> {serverErr}
                </div>
              )}

              <button
                type="submit"
                className="btn"
                disabled={submitting || attending == null}
                style={{
                  padding: "14px 22px",
                  background: NAVY,
                  color: GOLD,
                  borderRadius: 11,
                  fontSize: 14,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                }}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? t.submitting : attending === false ? t.submitNo : t.submitYes}
              </button>

              <p style={{ fontSize: 10.5, color: "#a8a8c0", textAlign: "center", marginTop: -6 }}>
                {t.legal}
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

function Header({ lang, setLang, t }) {
  return (
    <div
      style={{
        background: NAVY,
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid rgba(201,168,76,.18)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 18px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: `linear-gradient(135deg,${GOLD},#a07828)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 600,
              color: NAVY,
              flexShrink: 0,
            }}
          >
            R
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 13,
                fontWeight: 600,
                color: "white",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {t.navTitle}
            </div>
            <div
              style={{
                fontSize: 9.5,
                color: "rgba(255,255,255,.45)",
                letterSpacing: ".1em",
                textTransform: "uppercase",
              }}
            >
              {t.navSub}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {["fr", "en", "de"].map((l) => {
            const on = lang === l;
            return (
              <button
                key={l}
                className="lb"
                onClick={() => setLang(l)}
                style={{
                  background: on ? GOLD : "transparent",
                  color: on ? NAVY : "rgba(255,255,255,.5)",
                  borderColor: on ? GOLD : "rgba(255,255,255,.2)",
                }}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Card({ children }) {
  return (
    <div
      style={{
        background: "white",
        border: `1px solid ${CREAM2}`,
        borderRadius: 12,
        padding: "16px 18px",
        boxShadow: "0 1px 3px rgba(15,31,61,.03)",
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {children}
      {error && <div className="err">{error}</div>}
    </div>
  );
}
