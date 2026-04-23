import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, RotateCcw, ExternalLink, Check, Mail, Download } from "lucide-react";
import { SESSION_BY_ID } from "@/lib/rsa/constants";
import { StartupConfirmation, SessionConfig } from "@/lib/db";
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
  s1_foodtech:  {fr:"jeudi 30 avril 2026, 18h", en:"Thursday 30 April 2026, 6pm"},
  s2_social:    {fr:"mercredi 6 mai 2026, 18h", en:"Wednesday 6 May 2026, 6pm"},
  s3_tech:      {fr:"mercredi 13 mai 2026, 18h", en:"Wednesday 13 May 2026, 6pm"},
  s4_health:    {fr:"mardi 19 mai 2026, 18h", en:"Tuesday 19 May 2026, 6pm"},
  s5_greentech: {fr:"jeudi 21 mai 2026, 18h", en:"Thursday 21 May 2026, 6pm"},
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

Bonnes pratiques pour votre pitch (10 à 12 minutes, chronométrées) :
  • Problème & solution en 60 secondes — rendez le pain point tangible
  • Marché visé & dynamique (TAM/SAM/SOM si pertinent)
  • Business model : comment vous gagnez de l'argent, unit economics
  • Traction : clients, revenus, partenariats, pilotes
  • Équipe : qui vous êtes, pourquoi vous
  • Ask : ce que vous recherchez (levée, partenariats, mentorat)
Conseil : entraînez-vous en conditions réelles (timer + partage d'écran). Privilégiez un message clair à l'exhaustivité. Le Q&A compte autant que le pitch — préparez les objections.

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

Pitch best practices (10 to 12 minutes, timed):
  • Problem & solution in 60 seconds — make the pain point tangible
  • Target market & dynamics (TAM/SAM/SOM if relevant)
  • Business model: how you make money, unit economics
  • Traction: customers, revenue, partnerships, pilots
  • Team: who you are, why you
  • Ask: what you are looking for (funding, partnerships, mentoring)
Tip: rehearse in real conditions (timer + screen share). Prefer a sharp message over exhaustiveness. Q&A counts as much as the pitch itself — prepare for objections.

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
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null); // row id currently being mutated
  const [showEmails, setShowEmails] = useState(false);
  const [templateFr, setTemplateFr] = useState(() => localStorage.getItem(`rsa_tpl_fr_${sessionId}`) || DEFAULT_TEMPLATE_FR);
  const [templateEn, setTemplateEn] = useState(() => localStorage.getItem(`rsa_tpl_en_${sessionId}`) || DEFAULT_TEMPLATE_EN);

  useEffect(() => {
    setTemplateFr(localStorage.getItem(`rsa_tpl_fr_${sessionId}`) || DEFAULT_TEMPLATE_FR);
    setTemplateEn(localStorage.getItem(`rsa_tpl_en_${sessionId}`) || DEFAULT_TEMPLATE_EN);
  }, [sessionId]);
  useEffect(() => { localStorage.setItem(`rsa_tpl_fr_${sessionId}`, templateFr); }, [sessionId, templateFr]);
  useEffect(() => { localStorage.setItem(`rsa_tpl_en_${sessionId}`, templateEn); }, [sessionId, templateEn]);

  async function load() {
    setLoading(true);
    try {
      const [confs, cfg] = await Promise.all([
        StartupConfirmation.filter({ session_id: sessionId }),
        SessionConfig.filter({ session_id: sessionId }),
      ]);
      const savedOrder = Array.isArray(cfg[0]?.session_order) ? cfg[0].session_order : [];
      const byName = new Map(confs.map((r) => [r.startup_name, r]));
      const ordered = [];
      for (const n of savedOrder) if (byName.has(n)) ordered.push(n);
      for (const r of confs) if (!ordered.includes(r.startup_name)) ordered.push(r.startup_name);
      setRows(ordered.map((n) => byName.get(n)).filter(Boolean));
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

  function gmailLink(e) {
    const u = new URL("https://mail.google.com/mail/");
    u.searchParams.set("view", "cm");
    u.searchParams.set("fs", "1");
    if (e.to) u.searchParams.set("to", e.to);
    u.searchParams.set("su", e.subject);
    u.searchParams.set("body", e.body);
    return u.toString();
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

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-stone-500 p-4"><Loader2 className="w-4 h-4 animate-spin"/>Chargement…</div>;
  }

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Startups" value={rows.length}/>
        <KPI label="Décks confirmés" value={`${nConfirmed}/${rows.length}`} accent={nConfirmed === rows.length ? "emerald" : "amber"}/>
        <KPI label="Nouvelles versions uploadées" value={nUploaded}/>
        <KPI label="Exec. summaries (pre-read)" value={`${nExec}/${rows.length}`}/>
        <KPI label="Emails J-7 marqués envoyés" value={`${nSent}/${rows.length}`}/>
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
                    <a href={gmailLink(e)} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-stone-800 text-white hover:bg-stone-900">
                      <ExternalLink className="w-3 h-3"/>Ouvrir dans Gmail
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
