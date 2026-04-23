import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, RotateCcw, ExternalLink, Check, Mail, Download, Users } from "lucide-react";
import { SESSION_BY_ID, CRITERIA, getCriterion, getSessionLabel } from "@/lib/rsa/constants";
import { StartupConfirmation, SessionConfig, JuryProfile } from "@/lib/db";
import { supabase } from "@/lib/supabase";

// J-3 deadlines (matches RsaDashboard.SESSION_DEADLINES)
const SESSION_DEADLINES = {
  s1_foodtech:  {iso:"2026-04-27", label:"27 avril",  labelEn:"27 April"},
  s2_social:    {iso:"2026-05-03", label:"3 mai",     labelEn:"3 May"},
  s3_tech:      {iso:"2026-05-10", label:"10 mai",    labelEn:"10 May"},
  s4_health:    {iso:"2026-05-16", label:"16 mai",    labelEn:"16 May"},
  s5_greentech: {iso:"2026-05-18", label:"18 mai",    labelEn:"18 May"},
};
const SESSION_DATES_LONG = {
  s1_foodtech:  {fr:"jeudi 30 avril 2026, 18h",  en:"Thursday 30 April 2026, 6pm",    de:"Donnerstag, 30. April 2026, 18 Uhr"},
  s2_social:    {fr:"mercredi 6 mai 2026, 18h",  en:"Wednesday 6 May 2026, 6pm",      de:"Mittwoch, 6. Mai 2026, 18 Uhr"},
  s3_tech:      {fr:"mercredi 13 mai 2026, 18h", en:"Wednesday 13 May 2026, 6pm",     de:"Mittwoch, 13. Mai 2026, 18 Uhr"},
  s4_health:    {fr:"mardi 19 mai 2026, 18h",    en:"Tuesday 19 May 2026, 6pm",       de:"Dienstag, 19. Mai 2026, 18 Uhr"},
  s5_greentech: {fr:"jeudi 21 mai 2026, 18h",    en:"Thursday 21 May 2026, 6pm",      de:"Donnerstag, 21. Mai 2026, 18 Uhr"},
};
const SESSION_LABELS_EN = {
  s1_foodtech: "FoodTech & Circular Economy",
  s2_social: "Social Impact & Edtech",
  s3_tech: "Tech, AI, Fintech & Mobility",
  s4_health: "Healthtech & Biotech",
  s5_greentech: "Greentech & Environment",
};

const FR_COUNTRIES = new Set([
  "France", "Belgique", "Belgium", "Suisse", "Switzerland", "Luxembourg", "Québec", "Quebec", "Canada", "Monaco",
]);

const DEFAULT_TEMPLATE_FR = `Sujet : Rotary Startup Award — préparation pitch du {DATE_LONGUE} · {STARTUP}

Bonjour {CONTACT_PRENOM},

Votre pitch pour la session « {SESSION_LABEL} » aura lieu le {DATE_LONGUE} (visio Teams, ~2h30). Vous faites partie des {N} startups retenues.

Déroulé de la session :
  • 18h00 — accueil et introduction (5 min)
  • 18h05 — début des pitchs
  • Chaque startup : 10 à 12 min de pitch + 8 à 10 min de Q&A avec le jury
  • Votre passage : créneau #{RANK} vers {HEURE_PASSAGE}
  • Fin des pitchs, puis délibération du jury

Langue : le pitch et le Q&A se déroulent en anglais (jury international). Merci de préparer votre deck et votre présentation orale en anglais.

Comment le jury vous évalue (6 critères, note pondérée sur 5) :
  • Proposition de valeur (20%) — clarté du problème, unicité de la solution
  • Marché & scalabilité (20%) — taille, accessibilité, potentiel d'expansion
  • Business model (20%) — logique de revenus, unit economics, rentabilité
  • Équipe — exécution & capacité (20%) — parcours, complémentarité, capacité à exécuter
  • Qualité du pitch (10%) — structure, storytelling, gestion du Q&A, respect du temps
  • Impact sociétal & environnemental (10%) — valeur créée au-delà du financier, alignement avec les valeurs Rotary

Présentation autonome :
Vous partagerez votre écran vous-même pendant votre pitch pour garder la main sur le rythme et les animations. Merci de tester le partage Teams en amont (menu « Partager » → fenêtre PowerPoint).

Deck final :
Merci de déposer la version finale de votre deck (PowerPoint recommandé ou PDF, max 50 Mo) ici avant le {DEADLINE} :
{UPLOAD_URL}

Si votre deck de candidature est la bonne version, vous pouvez le confirmer en un clic sur la même page.

Lien Teams :
Le lien de connexion sera envoyé au maximum 48h avant la session.

Contact :
Pour cette session, je suis directement votre point de contact. Vous pouvez me joindre par email, téléphone ou WhatsApp — n'hésitez pas, même en dernière minute.

Bien cordialement,
Mathieu`;

const DEFAULT_TEMPLATE_EN = `Subject: Rotary Startup Award — pitch preparation on {DATE_LONGUE} · {STARTUP}

Hello {CONTACT_PRENOM},

Your pitch for the « {SESSION_LABEL} » session will take place on {DATE_LONGUE} (Teams call, ~2h30). You are one of the {N} selected startups.

Session schedule:
  • 6:00pm — welcome and introduction (5 min)
  • 6:05pm — pitches start
  • Each startup: 10 to 12 min pitch + 8 to 10 min Q&A with the jury
  • Your slot: #{RANK} around {HEURE_PASSAGE}
  • End of pitches, then jury deliberation

Language: pitch and Q&A are in English (international jury). Please prepare both your deck and your spoken presentation in English.

How the jury scores you (6 criteria, weighted out of 5):
  • Value Proposition (20%) — clarity of the problem, uniqueness of the solution
  • Market & Scalability (20%) — size, accessibility, expansion potential
  • Business Model (20%) — revenue logic, unit economics, path to profitability
  • Team — Execution & Capability (20%) — background, complementarity, ability to execute
  • Pitch Quality (10%) — structure, storytelling, Q&A handling, time discipline
  • Societal & Environmental Impact (10%) — value beyond financials, alignment with Rotary values

Self-presentation:
You will share your own screen during your pitch to keep control over pacing and animations. Please test Teams screen-sharing beforehand (Share menu → PowerPoint window).

Final deck:
Please upload the final version of your deck (PowerPoint recommended, or PDF, max 50 MB) here before {DEADLINE}:
{UPLOAD_URL}

If your application deck is the right version, you can confirm it in one click on the same page.

Teams link:
The connection link will be sent at the latest 48h before the session.

Contact:
For this session, I am your direct point of contact. Feel free to reach me by email, phone or WhatsApp — don't hesitate, even last-minute.

Best regards,
Mathieu`;

const DEFAULT_JURY_TEMPLATE_FR = `Sujet : Rotary Startup Award — session {DATE_LONGUE} · dossier jury

Bonjour {JURY_PRENOM},

Merci d'avoir accepté de faire partie du jury pour la session « {SESSION_LABEL} » du {DATE_LONGUE} (visio Teams, ~2h30). Voici votre dossier de préparation.

Déroulé de la session :
  • 18h00 — accueil et introduction (5 min)
  • 18h05 — début des pitchs
  • Chaque startup : 10 à 12 min de pitch + 8 à 10 min de Q&A
  • Fin des pitchs, puis délibération du jury

Langue : les pitchs et les Q&A se déroulent en anglais (jury international). Vous pouvez poser vos questions dans la langue de votre choix si elle est partagée avec la startup.

Startups retenues ({N}) :
{STARTUPS_BLOCK}

Pre-read :
Merci de parcourir les decks et les executive summaries (FR/DE) avant la session. Les liens sont ci-dessus, startup par startup.

Scoring en direct :
Pendant la session, votez en direct sur :
{SCORING_URL}

Fonctionnement du scoring :
  • 6 critères pondérés, note de 0 à 5 par critère
  • Sauvegarde automatique à chaque clic, reprise possible sur tout appareil
  • Commentaire libre optionnel par startup (visible uniquement par l'organisateur)
  • Vous pouvez modifier vos notes tant que la session n'est pas verrouillée

Grille d'évaluation (6 critères) :
{CRITERIA_BLOCK}

Lien Teams :
Le lien de connexion sera envoyé au maximum 48h avant la session.

Contact :
Je suis votre point de contact pour cette session. Vous pouvez me joindre par email, téléphone ou WhatsApp en cas de besoin.

Bien cordialement,
{ORGANISER_NAME}`;

const DEFAULT_JURY_TEMPLATE_EN = `Subject: Rotary Startup Award — {DATE_LONGUE} session · jury pack

Hello {JURY_PRENOM},

Thank you for agreeing to join the jury for the « {SESSION_LABEL} » session on {DATE_LONGUE} (Teams call, ~2h30). Here is your preparation pack.

Session schedule:
  • 6:00pm — welcome and introduction (5 min)
  • 6:05pm — pitches start
  • Each startup: 10 to 12 min pitch + 8 to 10 min Q&A
  • End of pitches, then jury deliberation

Language: pitches and Q&A are held in English (international jury). You may ask questions in any language you share with the startup.

Selected startups ({N}):
{STARTUPS_BLOCK}

Pre-read:
Please go through the decks and executive summaries (FR/DE) before the session. Links are above, startup by startup.

Live scoring:
During the session, score live at:
{SCORING_URL}

How scoring works:
  • 6 weighted criteria, 0 to 5 per criterion
  • Auto-save on every click, resume on any device
  • Optional free-form comment per startup (visible only to the organiser)
  • You can edit your scores until the session is locked

Scoring grid (6 criteria):
{CRITERIA_BLOCK}

Teams link:
The connection link will be sent at the latest 48h before the session.

Contact:
I am your point of contact for this session. Feel free to reach me by email, phone or WhatsApp whenever needed.

Best regards,
{ORGANISER_NAME}`;

const DEFAULT_JURY_TEMPLATE_DE = `Betreff: Rotary Startup Award — Session {DATE_LONGUE} · Jury-Unterlagen

Guten Tag {JURY_PRENOM},

vielen Dank, dass Sie Teil der Jury für die Session „{SESSION_LABEL}" am {DATE_LONGUE} (Teams-Videokonferenz, ~2h30) sind. Anbei Ihre Vorbereitungsunterlagen.

Ablauf der Session:
  • 18:00 Uhr — Begrüßung und Einführung (5 Min)
  • 18:05 Uhr — Beginn der Pitches
  • Pro Startup: 10 bis 12 Min Pitch + 8 bis 10 Min Q&A
  • Ende der Pitches, anschließend Jury-Beratung

Sprache: Pitches und Q&A finden auf Englisch statt (internationale Jury). Fragen dürfen Sie in jeder Sprache stellen, die Sie mit dem Startup teilen.

Ausgewählte Startups ({N}):
{STARTUPS_BLOCK}

Vorab-Lektüre:
Bitte gehen Sie die Decks und Executive Summaries (FR/DE) vor der Session durch. Die Links finden Sie oben, Startup für Startup.

Live-Scoring:
Während der Session bewerten Sie live unter:
{SCORING_URL}

Funktionsweise des Scorings:
  • 6 gewichtete Kriterien, Bewertung 0 bis 5 pro Kriterium
  • Automatisches Speichern bei jedem Klick, Fortsetzung auf jedem Gerät möglich
  • Optionaler Freitextkommentar pro Startup (nur für den Organisator sichtbar)
  • Änderungen möglich, solange die Session nicht gesperrt ist

Bewertungsraster (6 Kriterien):
{CRITERIA_BLOCK}

Teams-Link:
Der Verbindungslink wird spätestens 48h vor der Session versandt.

Kontakt:
Ich bin Ihr Ansprechpartner für diese Session. Sie erreichen mich bei Bedarf per E-Mail, Telefon oder WhatsApp.

Mit freundlichen Grüßen,
{ORGANISER_NAME}`;

// --- Helpers for jury template rendering ---
const STARTUP_BLOCK_LABELS = {
  fr: { deck: "Deck", preread: "Pre-read FR/DE", notProvided: "non fourni" },
  en: { deck: "Deck", preread: "Pre-read FR/DE", notProvided: "not provided" },
  de: { deck: "Deck", preread: "Vorab-Lektüre FR/DE", notProvided: "nicht bereitgestellt" },
};
function buildStartupsBlock(rows, lang) {
  const L = STARTUP_BLOCK_LABELS[lang] || STARTUP_BLOCK_LABELS.en;
  if (!rows.length) return "—";
  return rows.map((row, i) => {
    const deckPath = row.final_deck_path || row.application_deck_path;
    const deckUrl = deckPath
      ? supabase.storage.from("uploads").getPublicUrl(deckPath).data.publicUrl
      : null;
    const execs = Array.isArray(row.executive_summary_files) ? row.executive_summary_files : [];
    const execUrls = execs
      .map((ef) => (ef?.path ? supabase.storage.from("uploads").getPublicUrl(ef.path).data.publicUrl : null))
      .filter(Boolean);
    const lines = [`${i + 1}. ${row.startup_name}`];
    lines.push(`   ${L.deck} : ${deckUrl || L.notProvided}`);
    lines.push(`   ${L.preread} : ${execUrls.length ? execUrls.join(" · ") : L.notProvided}`);
    return lines.join("\n");
  }).join("\n\n");
}
function buildCriteriaBlock(lang) {
  return CRITERIA.map((c) => {
    const tr = getCriterion(c, lang);
    const pct = Math.round(c.weight * 100);
    return `  • ${tr.label} (${pct}%) — ${tr.desc}`;
  }).join("\n");
}

function detectLang(country) {
  return FR_COUNTRIES.has((country || "").trim()) ? "fr" : "en";
}

// Pitches start 18h05, 20 min slots (10-12 min pitch + 8-10 min Q&A)
const SLOT_MIN = 20;
function rankToHour(rank) {
  const startMin = 18 * 60 + 5;
  const t = startMin + (rank - 1) * SLOT_MIN;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}
function rankToHourEn(rank) {
  const startMin = 18 * 60 + 5;
  const t = startMin + (rank - 1) * SLOT_MIN;
  const h12 = ((Math.floor(t / 60) - 1) % 12) + 1;
  const m = t % 60;
  return `${h12}:${m.toString().padStart(2, "0")}pm`;
}

function renderTemplate(tpl, vars) {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v ?? "");
  }
  return out;
}
function splitSubjectBody(rendered) {
  const lines = rendered.split("\n");
  const first = (lines[0] || "").trim();
  let subject = "";
  let body = rendered;
  const m = first.match(/^(?:sujet|subject)\s*:\s*(.*)$/i);
  if (m) {
    subject = m[1].trim();
    body = lines.slice(1).join("\n").replace(/^\n+/, "");
  }
  return { subject, body };
}

function daysUntil(iso) {
  const d = new Date(iso + "T23:59:59");
  return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
}

function StatusPill({ row }) {
  if (row.final_deck_path) {
    const ext = (row.final_deck_original_filename || "").toLowerCase().match(/\.(pptx?|pdf)$/);
    const fmt = ext ? ext[1].toUpperCase() : "";
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        ✓ uploadé {fmt && <span className="px-1 rounded bg-emerald-100 text-[9px]">{fmt}</span>}
      </span>
    );
  }
  if (row.deck_confirmed_at) {
    return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">✓ garde candidature</span>;
  }
  return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">⏳ en attente</span>;
}

export default function DecksTab({ sessionId }) {
  const session = SESSION_BY_ID[sessionId];
  const [rows, setRows] = useState([]);
  const [jurors, setJurors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null); // row id currently being mutated
  const [showEmails, setShowEmails] = useState(false);
  const [showJuryEmails, setShowJuryEmails] = useState(false);
  const [templateFr, setTemplateFr] = useState(() => localStorage.getItem(`rsa_tpl_fr_${sessionId}`) || DEFAULT_TEMPLATE_FR);
  const [templateEn, setTemplateEn] = useState(() => localStorage.getItem(`rsa_tpl_en_${sessionId}`) || DEFAULT_TEMPLATE_EN);
  const [juryTemplateFr, setJuryTemplateFr] = useState(() => localStorage.getItem(`rsa_jury_tpl_fr_${sessionId}`) || DEFAULT_JURY_TEMPLATE_FR);
  const [juryTemplateEn, setJuryTemplateEn] = useState(() => localStorage.getItem(`rsa_jury_tpl_en_${sessionId}`) || DEFAULT_JURY_TEMPLATE_EN);
  const [juryTemplateDe, setJuryTemplateDe] = useState(() => localStorage.getItem(`rsa_jury_tpl_de_${sessionId}`) || DEFAULT_JURY_TEMPLATE_DE);

  useEffect(() => {
    setTemplateFr(localStorage.getItem(`rsa_tpl_fr_${sessionId}`) || DEFAULT_TEMPLATE_FR);
    setTemplateEn(localStorage.getItem(`rsa_tpl_en_${sessionId}`) || DEFAULT_TEMPLATE_EN);
    setJuryTemplateFr(localStorage.getItem(`rsa_jury_tpl_fr_${sessionId}`) || DEFAULT_JURY_TEMPLATE_FR);
    setJuryTemplateEn(localStorage.getItem(`rsa_jury_tpl_en_${sessionId}`) || DEFAULT_JURY_TEMPLATE_EN);
    setJuryTemplateDe(localStorage.getItem(`rsa_jury_tpl_de_${sessionId}`) || DEFAULT_JURY_TEMPLATE_DE);
  }, [sessionId]);
  useEffect(() => { localStorage.setItem(`rsa_tpl_fr_${sessionId}`, templateFr); }, [sessionId, templateFr]);
  useEffect(() => { localStorage.setItem(`rsa_tpl_en_${sessionId}`, templateEn); }, [sessionId, templateEn]);
  useEffect(() => { localStorage.setItem(`rsa_jury_tpl_fr_${sessionId}`, juryTemplateFr); }, [sessionId, juryTemplateFr]);
  useEffect(() => { localStorage.setItem(`rsa_jury_tpl_en_${sessionId}`, juryTemplateEn); }, [sessionId, juryTemplateEn]);
  useEffect(() => { localStorage.setItem(`rsa_jury_tpl_de_${sessionId}`, juryTemplateDe); }, [sessionId, juryTemplateDe]);

  async function load() {
    setLoading(true);
    try {
      const [confs, cfg, juryAll] = await Promise.all([
        StartupConfirmation.filter({ session_id: sessionId }),
        SessionConfig.filter({ session_id: sessionId }),
        JuryProfile.filter({ validated: true }),
      ]);
      const savedOrder = Array.isArray(cfg[0]?.session_order) ? cfg[0].session_order : [];
      const byName = new Map(confs.map((r) => [r.startup_name, r]));
      const ordered = [];
      for (const n of savedOrder) if (byName.has(n)) ordered.push(n);
      for (const r of confs) if (!ordered.includes(r.startup_name)) ordered.push(r.startup_name);
      setRows(ordered.map((n) => byName.get(n)).filter(Boolean));

      // Jurés : assigned_sessions stocke le label FR de la session (voir SetupTab)
      const sessionLabelFr = session?.label;
      const sessionJurors = (Array.isArray(juryAll) ? juryAll : []).filter(
        (j) => Array.isArray(j.assigned_sessions) && j.assigned_sessions.includes(sessionLabelFr)
      );
      setJurors(sessionJurors);
    } catch (e) {
      toast.error("Impossible de charger les decks");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function markSent(row) {
    setWorking(row.id);
    try {
      await StartupConfirmation.update(row.id, { instructions_sent_at: new Date().toISOString() });
      toast.success("Marqué comme envoyé");
      await load();
    } catch (e) {
      toast.error("Erreur");
    }
    setWorking(null);
  }

  async function unmarkSent(row) {
    setWorking(row.id);
    try {
      await StartupConfirmation.update(row.id, { instructions_sent_at: null });
      await load();
    } catch (e) {}
    setWorking(null);
  }

  async function markJurySent(j) {
    setWorking(j.id);
    try {
      const current = (j.instructions_sent_at && typeof j.instructions_sent_at === "object") ? j.instructions_sent_at : {};
      await JuryProfile.update(j.id, { instructions_sent_at: { ...current, [sessionId]: new Date().toISOString() } });
      toast.success("Invitation jury marquée envoyée");
      await load();
    } catch (e) {
      toast.error("Erreur");
    }
    setWorking(null);
  }

  async function unmarkJurySent(j) {
    setWorking(j.id);
    try {
      const current = (j.instructions_sent_at && typeof j.instructions_sent_at === "object") ? j.instructions_sent_at : {};
      const { [sessionId]: _, ...rest } = current;
      await JuryProfile.update(j.id, { instructions_sent_at: rest });
      await load();
    } catch (e) {}
    setWorking(null);
  }

  function jurySentAt(j) {
    const m = j?.instructions_sent_at;
    if (!m || typeof m !== "object") return null;
    return m[sessionId] || null;
  }

  async function resetToken(row) {
    if (!window.confirm(`Régénérer le lien d'upload pour ${row.startup_name} ? L'ancien lien ne fonctionnera plus.`)) return;
    setWorking(row.id);
    try {
      const { error } = await supabase
        .from("startup_confirmations")
        .update({ deck_upload_token: crypto.randomUUID() })
        .eq("id", row.id);
      if (error) throw error;
      toast.success("Token régénéré");
      await load();
    } catch (e) {
      toast.error("Erreur");
    }
    setWorking(null);
  }

  function uploadUrlFor(row) {
    return `${window.location.origin}/StartupUpload?t=${row.deck_upload_token}`;
  }
  function deckUrlFor(row) {
    const path = row.final_deck_path || row.application_deck_path;
    if (!path) return null;
    return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
  }
  function execUrl(path) {
    if (!path) return null;
    return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
  }

  async function copy(text, msg = "Copié") {
    try { await navigator.clipboard.writeText(text); toast.success(msg); }
    catch { toast.error("Impossible de copier"); }
  }

  // --- Email rendering ---
  const emails = useMemo(() => {
    if (!rows.length) return [];
    return rows.map((row, idx) => {
      const rank = idx + 1;
      const lang = detectLang(row.startup_country);
      const tpl = lang === "fr" ? templateFr : templateEn;
      const label = lang === "fr" ? session.label : (SESSION_LABELS_EN[sessionId] || session.label);
      const dateLong = (SESSION_DATES_LONG[sessionId] || {})[lang] || "";
      const deadline = (SESSION_DEADLINES[sessionId] || {})[lang === "fr" ? "label" : "labelEn"] || "";
      const vars = {
        STARTUP: row.startup_name,
        CONTACT_PRENOM: row.startup_contact_prenom || (lang === "fr" ? "à compléter" : "there"),
        SESSION_LABEL: label,
        DATE_LONGUE: dateLong,
        N: rows.length,
        RANK: rank,
        HEURE_PASSAGE: lang === "fr" ? rankToHour(rank) : rankToHourEn(rank),
        DEADLINE: deadline,
        UPLOAD_URL: uploadUrlFor(row),
      };
      const rendered = renderTemplate(tpl, vars);
      const { subject, body } = splitSubjectBody(rendered);
      return { row, lang, subject, body, to: row.startup_contact_email || "" };
    });
  }, [rows, templateFr, templateEn, sessionId, session]);

  // --- Jury email rendering ---
  const juryEmails = useMemo(() => {
    if (!jurors.length) return [];
    const scoringUrl = `${window.location.origin}/RsaScore?s=${sessionId}`;
    return jurors.map((j) => {
      const lang = (j.lang === "fr" || j.lang === "en" || j.lang === "de") ? j.lang : "en";
      const tpl = lang === "fr" ? juryTemplateFr : lang === "de" ? juryTemplateDe : juryTemplateEn;
      const label = session ? getSessionLabel(session, lang) : "";
      const dateLong = (SESSION_DATES_LONG[sessionId] || {})[lang] || "";
      const vars = {
        JURY_PRENOM: j.prenom || (lang === "fr" ? "à compléter" : lang === "de" ? "zu ergänzen" : "there"),
        SESSION_LABEL: label,
        DATE_LONGUE: dateLong,
        N: rows.length,
        SCORING_URL: scoringUrl,
        STARTUPS_BLOCK: buildStartupsBlock(rows, lang),
        CRITERIA_BLOCK: buildCriteriaBlock(lang),
        ORGANISER_NAME: "Mathieu",
      };
      const rendered = renderTemplate(tpl, vars);
      const { subject, body } = splitSubjectBody(rendered);
      return { jury: j, lang, subject, body, to: j.email || "" };
    });
  }, [jurors, rows, juryTemplateFr, juryTemplateEn, juryTemplateDe, sessionId, session]);

  function gmailLink(e) {
    const u = new URL("https://mail.google.com/mail/");
    u.searchParams.set("view", "cm");
    u.searchParams.set("fs", "1");
    if (e.to) u.searchParams.set("to", e.to);
    u.searchParams.set("su", e.subject);
    u.searchParams.set("body", e.body);
    return u.toString();
  }
  function mailtoLink(e) {
    // mailto: requires RFC 3986 percent-encoding (spaces → %20), NOT
    // URLSearchParams form-encoding (spaces → +, which Proton renders literally).
    const parts = [];
    if (e.subject) parts.push(`subject=${encodeURIComponent(e.subject)}`);
    if (e.body) parts.push(`body=${encodeURIComponent(e.body)}`);
    return `mailto:${e.to || ""}${parts.length ? "?" + parts.join("&") : ""}`;
  }
  function fullEmailText(e) {
    return `To: ${e.to}\nSubject: ${e.subject}\n\n${e.body}`;
  }

  const dl = SESSION_DEADLINES[sessionId];
  const daysLeft = dl ? daysUntil(dl.iso) : null;
  const nConfirmed = rows.filter((r) => !!r.deck_confirmed_at).length;
  const nUploaded = rows.filter((r) => !!r.final_deck_path).length;
  const nSent = rows.filter((r) => !!r.instructions_sent_at).length;
  const nExec = rows.filter((r) => Array.isArray(r.executive_summary_files) && r.executive_summary_files.length > 0).length;
  const nJurySent = jurors.filter((j) => !!jurySentAt(j)).length;
  const scoringUrl = `${window.location.origin}/RsaScore?s=${sessionId}`;

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-stone-500 p-4"><Loader2 className="w-4 h-4 animate-spin"/>Chargement…</div>;
  }

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI label="Startups" value={rows.length}/>
        <KPI label="Décks confirmés" value={`${nConfirmed}/${rows.length}`} accent={nConfirmed === rows.length ? "emerald" : "amber"}/>
        <KPI label="Nouvelles versions uploadées" value={nUploaded}/>
        <KPI label="Exec. summaries (pre-read)" value={`${nExec}/${rows.length}`}/>
        <KPI label="Emails J-7 marqués envoyés" value={`${nSent}/${rows.length}`}/>
        <KPI label="Invitations jury envoyées" value={`${nJurySent}/${jurors.length}`} accent={jurors.length && nJurySent === jurors.length ? "emerald" : undefined}/>
      </div>

      {/* Section A: tracking table */}
      <section>
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-stone-800">Suivi des uploads</h2>
          {dl && (
            <span className={`text-xs px-2 py-0.5 rounded border ${
              daysLeft < 0 ? "bg-rose-50 text-rose-700 border-rose-200"
              : daysLeft <= 3 ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-stone-50 text-stone-600 border-stone-200"
            }`}>
              Deadline J-3 : {dl.label}{daysLeft != null && (daysLeft < 0 ? ` · dépassée de ${Math.abs(daysLeft)}j` : daysLeft === 0 ? " · aujourd'hui" : ` · J-${daysLeft}`)}
            </span>
          )}
        </div>
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-3 py-2 text-left w-6">#</th>
                <th className="px-3 py-2 text-left">Startup</th>
                <th className="px-3 py-2 text-left">Contact</th>
                <th className="px-3 py-2 text-left">Statut deck</th>
                <th className="px-3 py-2 text-left">Pre-read (FR/DE)</th>
                <th className="px-3 py-2 text-left">J-7 email</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const deckUrl = deckUrlFor(row);
                const busy = working === row.id;
                const sentAt = row.instructions_sent_at;
                return (
                  <tr key={row.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                    <td className="px-3 py-2 text-stone-400 text-xs">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-stone-800">{row.startup_name}</td>
                    <td className="px-3 py-2 text-stone-600 text-xs">
                      <div>{row.startup_contact_prenom || "—"}</div>
                      <div className="text-stone-400">{row.startup_contact_email || "—"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill row={row}/>
                      {row.final_deck_uploaded_at && (
                        <div className="text-[10px] text-stone-400 mt-0.5">{new Date(row.final_deck_uploaded_at).toLocaleDateString("fr-FR", {day:"2-digit", month:"short"})}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {Array.isArray(row.executive_summary_files) && row.executive_summary_files.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 self-start">
                            ✓ {row.executive_summary_files.length} fichier{row.executive_summary_files.length > 1 ? "s" : ""}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {row.executive_summary_files.map((ef, i) => (
                              <a key={i} href={execUrl(ef.path)} target="_blank" rel="noreferrer"
                                title={ef.filename || ef.path}
                                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-100">
                                <Download className="w-2.5 h-2.5"/>{ef.filename ? ef.filename.length > 22 ? ef.filename.slice(0, 20) + "…" : ef.filename : `fichier ${i + 1}`}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-500 border border-stone-200">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {sentAt
                        ? <button onClick={() => unmarkSent(row)} disabled={busy}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                            <Check className="w-3 h-3"/>envoyé {new Date(sentAt).toLocaleDateString("fr-FR", {day:"2-digit", month:"short"})}
                          </button>
                        : <span className="text-[10px] text-stone-400">—</span>
                      }
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end flex-wrap">
                        <button onClick={() => copy(uploadUrlFor(row), "Lien upload copié")} disabled={busy}
                          title="Copier le lien d'upload personnel" className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-stone-200 hover:bg-stone-100">
                          <Copy className="w-3 h-3"/>lien
                        </button>
                        {deckUrl && (
                          <a href={deckUrl} target="_blank" rel="noreferrer"
                            title="Télécharger le deck courant" className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-stone-200 hover:bg-stone-100">
                            <Download className="w-3 h-3"/>deck
                          </a>
                        )}
                        <button onClick={() => resetToken(row)} disabled={busy}
                          title="Régénérer le lien (invalide l'ancien)" className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-stone-200 hover:bg-stone-100 text-stone-500">
                          <RotateCcw className="w-3 h-3"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-stone-400 text-sm italic">Aucune startup pour cette session.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section B: emails J-7 */}
      <section>
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-stone-800">Brouillons d'emails J-7</h2>
          <div className="text-xs text-stone-500">Variables : <code className="text-[10px] bg-stone-100 px-1 rounded">{"{STARTUP}"} {"{CONTACT_PRENOM}"} {"{DATE_LONGUE}"} {"{SESSION_LABEL}"} {"{N}"} {"{RANK}"} {"{HEURE_PASSAGE}"} {"{DEADLINE}"} {"{UPLOAD_URL}"}</code></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-stone-500 block mb-1">Template FR</label>
            <textarea className="w-full font-mono text-xs p-3 rounded border border-stone-200 focus:border-stone-400 focus:outline-none"
              rows={14} value={templateFr} onChange={(e) => setTemplateFr(e.target.value)}/>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Template EN</label>
            <textarea className="w-full font-mono text-xs p-3 rounded border border-stone-200 focus:border-stone-400 focus:outline-none"
              rows={14} value={templateEn} onChange={(e) => setTemplateEn(e.target.value)}/>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button onClick={() => setShowEmails((s) => !s)}
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded bg-stone-800 text-white hover:bg-stone-900">
            <Mail className="w-4 h-4"/>{showEmails ? "Masquer" : "Générer"} les brouillons ({rows.length})
          </button>
          {showEmails && (
            <>
              <button onClick={() => {
                const txt = emails.map((e) => `=== ${e.row.startup_name} (${e.lang.toUpperCase()}) ===\nTo: ${e.to}\nSubject: ${e.subject}\n\n${e.body}\n\n`).join("\n");
                copy(txt, "Tous les emails copiés");
              }} className="text-sm px-3 py-2 rounded border border-stone-200 hover:bg-stone-100">
                Copier tout (vrac)
              </button>
              <button onClick={() => {
                setTemplateFr(DEFAULT_TEMPLATE_FR); setTemplateEn(DEFAULT_TEMPLATE_EN);
                toast.success("Templates réinitialisés");
              }} className="text-xs text-stone-500 hover:text-stone-700">
                Réinitialiser les templates
              </button>
            </>
          )}
        </div>

        {showEmails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {emails.map((e) => {
              const sent = !!e.row.instructions_sent_at;
              return (
                <div key={e.row.id} className={`rounded-lg border p-4 ${sent ? "bg-stone-50 border-stone-200 opacity-70" : "bg-white border-stone-200"}`}>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div>
                      <div className="text-sm font-semibold text-stone-800">{e.row.startup_name}</div>
                      <div className="text-xs text-stone-500">{e.row.startup_contact_prenom || "—"} · {e.to || <span className="text-rose-500">aucun email</span>}</div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${e.lang === "fr" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                      {e.lang.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-stone-600 mb-1 font-medium">{e.subject}</div>
                  <pre className="text-[11px] text-stone-600 whitespace-pre-wrap max-h-32 overflow-y-auto p-2 bg-stone-50 rounded border border-stone-100 font-sans leading-relaxed">{e.body}</pre>
                  <div className="flex gap-1 mt-3 flex-wrap">
                    <a href={mailtoLink(e)}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-stone-800 text-white hover:bg-stone-900">
                      <ExternalLink className="w-3 h-3"/>Ouvrir (Proton)
                    </a>
                    <a href={gmailLink(e)} target="_blank" rel="noreferrer"
                      title="Alternative Gmail"
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-stone-200 hover:bg-stone-100 text-stone-600">
                      Gmail
                    </a>
                    <button onClick={() => copy(fullEmailText(e), "Email copié (TO + Subject + Body)")}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-stone-200 hover:bg-stone-100">
                      <Copy className="w-3 h-3"/>Copier
                    </button>
                    <button onClick={() => sent ? unmarkSent(e.row) : markSent(e.row)}
                      className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded border ${sent ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "border-stone-200 hover:bg-stone-100"}`}>
                      {sent ? <><Check className="w-3 h-3"/>envoyé</> : "Marquer envoyé"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section C: jury outreach tracking */}
      <section>
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-stone-800 inline-flex items-center gap-2">
            <Users className="w-4 h-4 text-stone-500"/>Suivi partage jury
          </h2>
          <button onClick={() => copy(scoringUrl, "Lien scoring copié")}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-stone-200 hover:bg-stone-100 text-stone-600">
            <Copy className="w-3 h-3"/>Lien scoring session
          </button>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-3 py-2 text-left w-6">#</th>
                <th className="px-3 py-2 text-left">Juré</th>
                <th className="px-3 py-2 text-left">Contact</th>
                <th className="px-3 py-2 text-left">Langue</th>
                <th className="px-3 py-2 text-left">Invitation jury</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jurors.map((j, idx) => {
                const busy = working === j.id;
                const sentAt = jurySentAt(j);
                const lang = (j.lang === "fr" || j.lang === "en" || j.lang === "de") ? j.lang : "en";
                const langClass = lang === "fr"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : lang === "de"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-purple-50 text-purple-700 border-purple-200";
                return (
                  <tr key={j.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                    <td className="px-3 py-2 text-stone-400 text-xs">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-stone-800">
                      {j.prenom} {j.nom}
                      {j.qualite && <div className="text-[10px] font-normal text-stone-400">{j.qualite}{j.organisation ? ` · ${j.organisation}` : ""}</div>}
                    </td>
                    <td className="px-3 py-2 text-stone-600 text-xs">
                      {j.email || <span className="text-stone-400">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${langClass}`}>{lang.toUpperCase()}</span>
                    </td>
                    <td className="px-3 py-2">
                      {sentAt
                        ? <button onClick={() => unmarkJurySent(j)} disabled={busy}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                            <Check className="w-3 h-3"/>envoyé {new Date(sentAt).toLocaleDateString("fr-FR", {day:"2-digit", month:"short"})}
                          </button>
                        : <span className="inline-flex text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">⏳ en attente</span>
                      }
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end flex-wrap">
                        <button onClick={() => copy(scoringUrl, "Lien scoring copié")}
                          title="Copier le lien scoring de cette session"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-stone-200 hover:bg-stone-100">
                          <Copy className="w-3 h-3"/>scoring
                        </button>
                        {!sentAt && (
                          <button onClick={() => markJurySent(j)} disabled={busy}
                            title="Marquer l'invitation comme envoyée (sans ouvrir de brouillon)"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-stone-200 hover:bg-stone-100 text-stone-600">
                            <Check className="w-3 h-3"/>marquer envoyé
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {jurors.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-stone-400 text-sm italic">Aucun juré validé assigné à cette session. Assignez-les dans l'onglet Setup.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section D: emails jury (tri-lingue FR/EN/DE) */}
      <section>
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-stone-800 inline-flex items-center gap-2">
            <Users className="w-4 h-4 text-stone-500"/>Brouillons d'emails jury
            <span className="text-[10px] font-normal text-stone-500">· {jurors.length} juré{jurors.length > 1 ? "s" : ""} assigné{jurors.length > 1 ? "s" : ""}</span>
          </h2>
          <div className="text-xs text-stone-500">Variables : <code className="text-[10px] bg-stone-100 px-1 rounded">{"{JURY_PRENOM}"} {"{SESSION_LABEL}"} {"{DATE_LONGUE}"} {"{N}"} {"{SCORING_URL}"} {"{STARTUPS_BLOCK}"} {"{CRITERIA_BLOCK}"} {"{ORGANISER_NAME}"}</code></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs text-stone-500 block mb-1">Template FR</label>
            <textarea className="w-full font-mono text-xs p-3 rounded border border-stone-200 focus:border-stone-400 focus:outline-none"
              rows={16} value={juryTemplateFr} onChange={(e) => setJuryTemplateFr(e.target.value)}/>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Template EN</label>
            <textarea className="w-full font-mono text-xs p-3 rounded border border-stone-200 focus:border-stone-400 focus:outline-none"
              rows={16} value={juryTemplateEn} onChange={(e) => setJuryTemplateEn(e.target.value)}/>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Template DE</label>
            <textarea className="w-full font-mono text-xs p-3 rounded border border-stone-200 focus:border-stone-400 focus:outline-none"
              rows={16} value={juryTemplateDe} onChange={(e) => setJuryTemplateDe(e.target.value)}/>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button onClick={() => setShowJuryEmails((s) => !s)}
            disabled={!jurors.length}
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded bg-stone-800 text-white hover:bg-stone-900 disabled:opacity-40 disabled:cursor-not-allowed">
            <Mail className="w-4 h-4"/>{showJuryEmails ? "Masquer" : "Générer"} les brouillons ({jurors.length})
          </button>
          {showJuryEmails && jurors.length > 0 && (
            <>
              <button onClick={() => {
                const txt = juryEmails.map((e) => `=== ${e.jury.prenom} ${e.jury.nom} (${e.lang.toUpperCase()}) ===\nTo: ${e.to}\nSubject: ${e.subject}\n\n${e.body}\n\n`).join("\n");
                copy(txt, "Tous les emails jury copiés");
              }} className="text-sm px-3 py-2 rounded border border-stone-200 hover:bg-stone-100">
                Copier tout (vrac)
              </button>
              <button onClick={() => {
                setJuryTemplateFr(DEFAULT_JURY_TEMPLATE_FR);
                setJuryTemplateEn(DEFAULT_JURY_TEMPLATE_EN);
                setJuryTemplateDe(DEFAULT_JURY_TEMPLATE_DE);
                toast.success("Templates jury réinitialisés");
              }} className="text-xs text-stone-500 hover:text-stone-700">
                Réinitialiser les templates
              </button>
            </>
          )}
          {!jurors.length && (
            <span className="text-xs text-stone-400 italic">Aucun juré validé assigné à cette session. Assignez-les dans l'onglet Setup.</span>
          )}
        </div>

        {showJuryEmails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {juryEmails.map((e) => {
              const langClass = e.lang === "fr"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : e.lang === "de"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-purple-50 text-purple-700 border-purple-200";
              const sent = !!jurySentAt(e.jury);
              return (
                <div key={e.jury.id} className={`rounded-lg border p-4 ${sent ? "bg-stone-50 border-stone-200 opacity-70" : "bg-white border-stone-200"}`}>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div>
                      <div className="text-sm font-semibold text-stone-800">{e.jury.prenom} {e.jury.nom}</div>
                      <div className="text-xs text-stone-500">{e.jury.qualite || "—"}{e.jury.organisation ? ` · ${e.jury.organisation}` : ""}</div>
                      <div className="text-xs text-stone-500">{e.to || <span className="text-rose-500">aucun email</span>}</div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${langClass}`}>
                      {e.lang.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-stone-600 mb-1 font-medium">{e.subject}</div>
                  <pre className="text-[11px] text-stone-600 whitespace-pre-wrap max-h-40 overflow-y-auto p-2 bg-stone-50 rounded border border-stone-100 font-sans leading-relaxed">{e.body}</pre>
                  <div className="flex gap-1 mt-3 flex-wrap">
                    <a href={mailtoLink(e)}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-stone-800 text-white hover:bg-stone-900">
                      <ExternalLink className="w-3 h-3"/>Ouvrir (Proton)
                    </a>
                    <a href={gmailLink(e)} target="_blank" rel="noreferrer"
                      title="Alternative Gmail"
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-stone-200 hover:bg-stone-100 text-stone-600">
                      Gmail
                    </a>
                    <button onClick={() => copy(fullEmailText(e), "Email copié (TO + Subject + Body)")}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-stone-200 hover:bg-stone-100">
                      <Copy className="w-3 h-3"/>Copier
                    </button>
                    <button onClick={() => sent ? unmarkJurySent(e.jury) : markJurySent(e.jury)}
                      className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded border ${sent ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "border-stone-200 hover:bg-stone-100"}`}>
                      {sent ? <><Check className="w-3 h-3"/>envoyé</> : "Marquer envoyé"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function KPI({ label, value, accent }) {
  const colorClass =
    accent === "emerald" ? "text-emerald-700"
    : accent === "amber" ? "text-amber-700"
    : "text-stone-800";
  return (
    <div className="bg-white border border-stone-200 rounded-lg px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-stone-500">{label}</div>
      <div className={`text-2xl font-semibold mt-0.5 ${colorClass}`}>{value}</div>
    </div>
  );
}
