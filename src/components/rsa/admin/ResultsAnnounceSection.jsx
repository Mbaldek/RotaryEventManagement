import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Send, ExternalLink, RotateCcw, Trophy, Users as UsersIcon, Mic2, UserCheck, Building2, Sprout, Loader2 } from "lucide-react";
import { JuryScore, StartupConfirmation, JuryProfile, FinaleRsvp } from "@/lib/db";
import { SESSION_BY_ID, FINAL_SESSION_ID, getSessionLabel } from "@/lib/rsa/constants";
import { buildRanking } from "@/lib/rsa/ranking";

// Post-finale RESULTS announcement — sent AFTER the Grande Finale to every
// audience. Deliberately score-free (winner + ranking only) per the organiser's
// instruction. Distinct from CommunicationsSection (per-session thank-you, WITH
// scores) and FinaleEmailsSection (pre-finale logistics). Trilingual FR/EN/DE.

// Country → language for startups (no explicit lang field), mirrors
// CommunicationsSection so the grouping stays consistent across the admin.
const DE_COUNTRIES = new Set(["Allemagne", "Germany", "Deutschland", "Autriche", "Austria", "Österreich"]);
const FR_COUNTRIES = new Set(["France", "Belgique", "Belgium", "Suisse", "Switzerland", "Luxembourg", "Québec", "Quebec", "Canada", "Monaco"]);
function startupLang(country) {
  const c = (country || "").trim();
  if (DE_COUNTRIES.has(c)) return "de";
  if (FR_COUNTRIES.has(c)) return "fr";
  return "en";
}
function juryLang(j) {
  return j.lang === "en" || j.lang === "de" ? j.lang : "fr";
}
function emptyGroups() {
  return { fr: [], en: [], de: [] };
}

const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

const SIGNOFF = {
  fr: "La Commission Rotary Startup Award\nRotary Club de Paris",
  en: "The Rotary Startup Award Committee\nRotary Club de Paris",
  de: "Die Kommission Rotary Startup Award\nRotary Club de Paris",
};
const SEE_YOU = {
  fr: "Rendez-vous en 2027 pour une nouvelle édition. D'ici là, prenez soin de vos projets — et restez en contact.",
  en: "See you in 2027 for a new edition. Until then, take good care of your projects — and stay in touch.",
  de: "Wir sehen uns 2027 zu einer neuen Ausgabe. Bis dahin: passen Sie gut auf Ihre Projekte auf — und bleiben Sie in Kontakt.",
};
const PALMARES_LABEL = {
  fr: "🏆 Le palmarès complet et la page de la finale :",
  en: "🏆 Full results and the finale page:",
  de: "🏆 Das vollständige Ergebnis und die Finale-Seite:",
};
// Public results page on the rotary-startup.org domain (Vercel custom domain).
// This is the ONLY external link allowed in the announcement emails — no vercel.app,
// no JuryHub, nothing else.
const PUBLIC_RESULTS_URL = "https://palmares.rotary-startup.org/RsaFinaleResults";

export default function ResultsAnnounceSection() {
  const RESULTS_URL = PUBLIC_RESULTS_URL;
  const JURYHUB_URL = ""; // deprecated — emails carry only the results-page link

  const [loading, setLoading] = useState(true);
  const [ranked, setRanked] = useState([]);
  const [catByStartup, setCatByStartup] = useState({}); // startup → source_session_id
  const [recipients, setRecipients] = useState({
    finalists: emptyGroups(),
    visitors: emptyGroups(),
    finaleJury: emptyGroups(),
    allStartups: emptyGroups(),
    allJury: emptyGroups(),
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [scores, finaleConfirms, allConfirms, allJury, rsvps] = await Promise.all([
          JuryScore.filter({ session_id: FINAL_SESSION_ID }),
          StartupConfirmation.filter({ session_id: FINAL_SESSION_ID }),
          StartupConfirmation.list(),
          JuryProfile.list("nom"),
          FinaleRsvp.filter({ role: "visitor" }),
        ]);
        if (cancelled) return;

        setRanked(buildRanking(scores || [], {}));

        // startup → its qualifying category (source session)
        const cat = {};
        for (const r of finaleConfirms || []) {
          if (r.startup_name) cat[r.startup_name] = r.source_session_id || null;
        }
        setCatByStartup(cat);

        // ---- recipient groups ----
        const finalists = emptyGroups();
        for (const r of finaleConfirms || []) {
          if (r.startup_contact_email) finalists[startupLang(r.startup_country)].push(r.startup_contact_email);
        }

        const visitors = emptyGroups();
        for (const v of rsvps || []) {
          // Visitor RSVPs carry no country/lang → default to FR (dominant audience).
          if (v.email) visitors.fr.push(v.email);
        }

        // All participating startups across qualifying sessions, de-duplicated.
        const allStartups = emptyGroups();
        const seen = new Set();
        for (const r of allConfirms || []) {
          if (r.session_id === FINAL_SESSION_ID) continue;
          const email = r.startup_contact_email;
          if (!email || seen.has(email)) continue;
          seen.add(email);
          allStartups[startupLang(r.startup_country)].push(email);
        }

        const finaleJury = emptyGroups();
        const allJuryG = emptyGroups();
        for (const j of allJury || []) {
          if (!j.validated || !j.email) continue;
          allJuryG[juryLang(j)].push(j.email);
          if (j.grande_finale) finaleJury[juryLang(j)].push(j.email);
        }

        setRecipients({ finalists, visitors, finaleJury, allStartups, allJury: allJuryG });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const winner = ranked.find((r) => r.final_rank === 1) || null;

  const catOf = (startup, lang) => {
    const sid = catByStartup[startup];
    const s = sid ? SESSION_BY_ID[sid] : null;
    return s ? getSessionLabel(s, lang) : "";
  };
  const rankingBlock = (lang) =>
    ranked
      .map((r) => {
        const medal = MEDALS[r.final_rank] || "  ";
        const cat = catOf(r.startup, lang);
        return `${medal} ${r.final_rank}. ${r.startup}${cat ? ` — ${cat}` : ""}`;
      })
      .join("\n");

  // Shared context for every builder
  const ctx = { rankingBlock, winner, RESULTS_URL, JURYHUB_URL };

  const audiences = useMemo(() => {
    if (!winner) return [];
    return [
      { id: "finalists", Icon: Mic2, color: "amber", title: "Finalistes", group: recipients.finalists, build: buildFinalists },
      { id: "visitors", Icon: UsersIcon, color: "violet", title: "Visiteurs de la finale", group: recipients.visitors, build: buildVisitors },
      { id: "finaleJury", Icon: Trophy, color: "emerald", title: "Jury de la finale", group: recipients.finaleJury, build: buildFinaleJury },
      { id: "allStartups", Icon: UserCheck, color: "blue", title: "Startups ayant pitché", group: recipients.allStartups, build: buildAllStartups },
      { id: "allApplicants", Icon: UserCheck, color: "blue", title: "Tous les candidats (65+ dossiers)", group: emptyGroups(), build: buildAllApplicants, manual: "Destinataires à importer — TOUS les dossiers Airtable, candidats non retenus inclus (CSV ou AIRTABLE_PAT)." },
      { id: "allJury", Icon: UsersIcon, color: "blue", title: "Tous les jurés participants", group: recipients.allJury, build: buildAllJury },
      { id: "clubs", Icon: Building2, color: "rose", title: "Clubs Rotary", group: emptyGroups(), build: buildClubs, manual: "Destinataires à saisir (contacts clubs)." },
      { id: "incubators", Icon: Sprout, color: "rose", title: "Incubateurs / partenaires — compte rendu", group: emptyGroups(), build: buildIncubators, manual: "Destinataires à saisir à la main (incubateurs / partenaires)." },
    ];
  }, [winner, recipients]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-4 flex items-center gap-2 text-sm text-stone-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Chargement des résultats et des destinataires…
      </div>
    );
  }

  if (!winner) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Aucun classement calculable pour la finale (pas de notes de jury). Les templates d'annonce s'activeront dès qu'un lauréat sera déterminé.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start gap-3 flex-wrap mb-4">
        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-5 h-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-stone-800">Annonce des résultats — post-finale</div>
          <p className="text-xs text-stone-500 mt-0.5">
            Lauréat <strong>{winner.startup}</strong> · messages de félicitations + remerciements, <strong>sans les scores</strong> (vainqueur + classement uniquement). Trilingue FR/EN/DE, destinataires pré-remplis. Seul lien dans les emails : la page palmarès sur <code className="text-[10px] bg-stone-100 px-1 rounded">rotary-startup.org</code>.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {audiences.map((a) => (
          <AudienceCard key={a.id} audience={a} ctx={ctx} />
        ))}
      </div>
    </div>
  );
}

const TONES = {
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", btn: "bg-amber-600 hover:bg-amber-700" },
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", btn: "bg-blue-600 hover:bg-blue-700" },
  violet: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", btn: "bg-violet-600 hover:bg-violet-700" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", btn: "bg-emerald-600 hover:bg-emerald-700" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", btn: "bg-rose-600 hover:bg-rose-700" },
};

function escapeHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
// Plain body → HTML, turning the two known URLs into short clickable anchors.
function bodyToHtml(body, links) {
  let out = escapeHtml(body);
  for (const { url, label } of links) {
    if (!url) continue;
    out = out.split(escapeHtml(url)).join(`<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`);
  }
  return out.replace(/\n/g, "<br>");
}
async function copyRich(html, plain) {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([plain], { type: "text/plain" }) }),
      ]);
      toast.success("Email copié (liens cliquables — colle dans Gmail/Proton)");
    } else {
      await navigator.clipboard.writeText(plain);
      toast.success("Copié (texte simple)");
    }
  } catch {
    toast.error("Copie impossible");
  }
}

const LINK_LABELS = {
  fr: { results: "Voir le palmarès" },
  en: { results: "View the results" },
  de: { results: "Ergebnis ansehen" },
};

function AudienceCard({ audience, ctx }) {
  const { id, Icon, color, title, group, build, manual } = audience;
  const tone = TONES[color] || TONES.blue;
  const [lang, setLang] = useState("fr");
  const [editing, setEditing] = useState(false);

  // Manual audiences (clubs, incubators, all applicants) have no DB source — the
  // organiser pastes recipients here. Kept out of the repo (personal data) and
  // persisted only in the browser.
  const manualKey = `rsa_results_recips_${id}`;
  const [manualMap, setManualMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem(manualKey) || "{}") || {}; } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem(manualKey, JSON.stringify(manualMap)); } catch {} }, [manualKey, manualMap]);
  const manualRecips = manualMap[lang] || "";
  const setManualRecips = (val) => setManualMap((m) => ({ ...m, [lang]: val }));

  const generated = useMemo(() => ({
    fr: build({ ...ctx, lang: "fr" }),
    en: build({ ...ctx, lang: "en" }),
    de: build({ ...ctx, lang: "de" }),
  }), [build, ctx]);

  // Editable overrides, persisted per card+lang.
  const lsKey = (l) => `rsa_results_email_${id}_${l}`;
  const [overrides, setOverrides] = useState(() => {
    const o = {};
    for (const l of ["fr", "en", "de"]) {
      try { o[l] = localStorage.getItem(lsKey(l)) || ""; } catch { o[l] = ""; }
    }
    return o;
  });
  function setOverride(l, val) {
    setOverrides((prev) => ({ ...prev, [l]: val }));
    try { localStorage.setItem(lsKey(l), val); } catch {}
  }
  function resetOverride(l) {
    setOverrides((prev) => ({ ...prev, [l]: "" }));
    try { localStorage.removeItem(lsKey(l)); } catch {}
    toast.success("Template réinitialisé");
  }

  const tpl = generated[lang];
  const customBody = overrides[lang];
  const subject = tpl.subject;
  const body = customBody || tpl.body;

  const parsedManual = manualRecips
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  const recips = manual ? [...new Set(parsedManual)] : [...new Set(group[lang] || [])];
  const links = [
    { url: ctx.RESULTS_URL, label: LINK_LABELS[lang].results },
  ];
  const bodyHtml = bodyToHtml(body, links);

  function copyText(text, label) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copié`), () => toast.error("Copie impossible"));
  }
  function copyEmails() {
    if (recips.length === 0) { toast.error("Aucun destinataire"); return; }
    copyText(recips.join(", "), `${recips.length} email${recips.length > 1 ? "s" : ""}`);
  }
  function openMailto() {
    const useBcc = recips.length > 1;
    const parts = [`subject=${encodeURIComponent(subject)}`, `body=${encodeURIComponent(body)}`];
    if (useBcc) parts.push(`bcc=${encodeURIComponent(recips.join(","))}`);
    const to = useBcc ? "" : recips[0] || "";
    window.location.href = `mailto:${encodeURIComponent(to)}?${parts.join("&")}`;
  }

  return (
    <div className={`rounded-lg border ${tone.border} ${tone.bg} p-3 flex flex-col gap-2`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 ${tone.text} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${tone.text}`}>{title}</div>
          <div className="text-[11px] text-stone-600 mt-0.5">
            {manual ? "destinataires manuels" : `${recips.length} destinataire${recips.length > 1 ? "s" : ""} ${lang.toUpperCase()}`}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {["fr", "en", "de"].map((l) => (
            <button key={l} onClick={() => setLang(l)}
              className={`text-[10px] px-1.5 py-0.5 rounded border ${lang === l ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-300"}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {manual && (
        <div className="flex flex-col gap-1">
          <div className="text-[11px] text-stone-500 italic">{manual}</div>
          <textarea
            value={manualRecips}
            onChange={(e) => setManualRecips(e.target.value)}
            rows={2}
            placeholder="Colle ici les emails (séparés par virgule, espace ou retour à la ligne)…"
            className="w-full text-[11px] p-1.5 rounded border border-stone-200 focus:border-stone-400 focus:outline-none"
          />
          <div className="text-[10px] text-stone-400">{recips.length} destinataire{recips.length > 1 ? "s" : ""} valide{recips.length > 1 ? "s" : ""}</div>
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => copyText(subject, "Sujet")} className="text-[11px] px-2 py-1 rounded bg-white hover:bg-stone-50 text-stone-700">
          <Copy className="w-3 h-3 inline mr-1" /> Sujet
        </button>
        <button onClick={() => copyRich(bodyHtml, body)} className="text-[11px] px-2 py-1 rounded bg-white hover:bg-stone-50 text-stone-700" title="Copie HTML avec liens cliquables">
          <Copy className="w-3 h-3 inline mr-1" /> Copier (HTML)
        </button>
        {!manual && (
          <button onClick={copyEmails} disabled={recips.length === 0} className="text-[11px] px-2 py-1 rounded bg-white hover:bg-stone-50 text-stone-700 disabled:opacity-50">
            <Copy className="w-3 h-3 inline mr-1" /> Emails ({recips.length})
          </button>
        )}
        <button onClick={() => setEditing((s) => !s)} className="text-[11px] px-2 py-1 rounded bg-white hover:bg-stone-50 text-stone-700">
          {editing ? "Aperçu" : "Éditer"}
        </button>
        {customBody && (
          <button onClick={() => resetOverride(lang)} className="text-[11px] px-2 py-1 rounded bg-white hover:bg-stone-50 text-stone-500" title="Réinitialiser ce template">
            <RotateCcw className="w-3 h-3 inline" />
          </button>
        )}
      </div>

      <button onClick={openMailto} disabled={recips.length === 0 && !manual}
        className={`text-[12px] px-2 py-1.5 rounded text-white font-medium inline-flex items-center justify-center gap-1.5 ${tone.btn} disabled:opacity-50`}>
        <Send className="w-3 h-3" /> Ouvrir dans le mail <ExternalLink className="w-3 h-3 opacity-70" />
      </button>

      {editing ? (
        <textarea value={body} onChange={(e) => setOverride(lang, e.target.value)} rows={14}
          className="w-full font-mono text-[11px] p-2 rounded border border-stone-200 focus:border-stone-400 focus:outline-none" />
      ) : (
        <div className="bg-white border border-stone-200 rounded p-2 space-y-1.5">
          <div className="text-xs text-stone-800 font-medium">{subject}</div>
          <div className="text-[11px] text-stone-700 leading-relaxed max-h-72 overflow-y-auto [&_a]:text-indigo-600 [&_a]:underline"
            style={{ whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          {!manual && (
            <div className="text-[10px] text-stone-400 break-all pt-1 border-t border-stone-100">
              {recips.join(", ") || "—"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================ TEMPLATE BUILDERS ============================
// Each returns { subject, body }. No scores anywhere — winner + ranking only.

function footer(lang, RESULTS_URL) {
  return `${PALMARES_LABEL[lang]}
${RESULTS_URL}

${SEE_YOU[lang]}

${SIGNOFF[lang]}`;
}

function buildFinalists({ lang, rankingBlock, winner, RESULTS_URL, JURYHUB_URL }) {
  const block = rankingBlock(lang);
  if (lang === "de") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — Ergebnis des Großen Finales`,
      body: `Guten Tag,

was für ein Finale! Als Finalist gehören Sie bereits zu den fünf besten Startups einer ganzen Wettbewerbssaison — darauf können Sie sehr stolz sein.

Herzlichen Glückwunsch an ${winner.startup}, Preisträger des Rotary Startup Award 2026.

Das Endklassement des Großen Finales:

${block}

Doch lassen Sie uns das klar sagen: zwischen diesen fünf Projekten war jedes ein würdiger Sieger. Bis ins Finale zu kommen, vor einer anspruchsvollen Jury und einem vollen Saal auf Englisch zu pitchen — das ist eine echte Leistung.

Vielen Dank für Ihr Engagement, Ihre Energie und die Qualität Ihrer Pitches.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  if (lang === "en") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — Grand Finale results`,
      body: `Hello,

What a finale! As a finalist, you are already among the five best startups of an entire competition season — and that is something to be very proud of.

Congratulations to ${winner.startup}, laureate of the Rotary Startup Award 2026.

The Grand Finale final ranking:

${block}

But let's be clear: among these five projects, every single one was a worthy winner. Reaching the finale, pitching in English in front of a demanding jury and a full room — that is a real achievement.

Thank you for your commitment, your energy and the quality of your pitches.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  return {
    subject: `🏆 Rotary Startup Award 2026 — résultats de la Grande Finale`,
    body: `Bonjour,

Quelle finale ! En tant que finaliste, vous figurez déjà parmi les cinq meilleures startups de toute une saison de concours — et c'est une vraie fierté.

Toutes nos félicitations à ${winner.startup}, lauréat du Rotary Startup Award 2026.

Le classement final de la Grande Finale :

${block}

Mais disons-le clairement : parmi ces cinq projets, chacun était un vainqueur méritant. Atteindre la finale, pitcher en anglais devant un jury exigeant et une salle comble — c'est un véritable accomplissement.

Merci pour votre engagement, votre énergie et la qualité de vos pitchs.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
  };
}

function buildVisitors({ lang, rankingBlock, winner, RESULTS_URL, JURYHUB_URL }) {
  const block = rankingBlock(lang);
  if (lang === "de") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — danke für Ihre Teilnahme & das Ergebnis`,
      body: `Guten Tag,

vielen Dank, dass Sie beim Großen Finale des Rotary Startup Award 2026 dabei waren. Ihre Anwesenheit hat zur Atmosphäre dieses Abends beigetragen — und die Pitches haben gezeigt, wie viel Talent unsere Region zu bieten hat.

Herzlichen Glückwunsch an ${winner.startup}, den Preisträger 2026.

Das Endklassement:

${block}

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  if (lang === "en") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — thank you for joining & the results`,
      body: `Hello,

Thank you for being with us at the Grand Finale of the Rotary Startup Award 2026. Your presence helped make the evening what it was — and the pitches showed just how much talent our ecosystem has to offer.

Congratulations to ${winner.startup}, the 2026 laureate.

The final ranking:

${block}

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  return {
    subject: `🏆 Rotary Startup Award 2026 — merci de votre présence & les résultats`,
    body: `Bonjour,

Merci d'avoir été parmi nous pour la Grande Finale du Rotary Startup Award 2026. Votre présence a contribué à l'atmosphère de cette soirée — et les pitchs ont montré tout le talent que recèle notre écosystème.

Toutes nos félicitations à ${winner.startup}, lauréat 2026.

Le classement final :

${block}

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
  };
}

function buildFinaleJury({ lang, rankingBlock, winner, RESULTS_URL, JURYHUB_URL }) {
  const block = rankingBlock(lang);
  if (lang === "de") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — das Ergebnis, das Sie mitbestimmt haben`,
      body: `Guten Tag,

vielen Dank, dass Sie in der Jury des Großen Finales mitgewirkt haben. Ihr fachkundiger Blick und Ihre Bewertungen haben den Preisträger des Rotary Startup Award 2026 bestimmt.

Das Ergebnis Ihrer Bewertungen:

${block}

Herzlichen Glückwunsch an ${winner.startup} — und vielen Dank, dass Sie diesen Wettbewerb anspruchsvoll und fair gemacht haben.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  if (lang === "en") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — the result you helped decide`,
      body: `Hello,

Thank you for serving on the Grand Finale jury. Your expert eye and your scores determined the laureate of the Rotary Startup Award 2026.

The outcome of your evaluations:

${block}

Congratulations to ${winner.startup} — and thank you for making this competition demanding and fair.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  return {
    subject: `🏆 Rotary Startup Award 2026 — le résultat que vous avez décidé`,
    body: `Bonjour,

Merci d'avoir siégé au jury de la Grande Finale. Votre regard d'expert et vos notes ont désigné le lauréat du Rotary Startup Award 2026.

Le résultat de vos évaluations :

${block}

Toutes nos félicitations à ${winner.startup} — et merci d'avoir rendu ce concours exigeant et équitable.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
  };
}

function buildAllStartups({ lang, rankingBlock, winner, RESULTS_URL, JURYHUB_URL }) {
  const block = rankingBlock(lang);
  if (lang === "de") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — Saisonabschluss & Ergebnis des Finales`,
      body: `Guten Tag,

der Rotary Startup Award 2026 ist zu Ende — und er war es dank Ihnen. Über fünf thematische Sessions haben Dutzende Startups vor unseren Jurys gepitcht. Ob Sie ins Finale gekommen sind oder nicht: Ihr Projekt war Teil eines anspruchsvollen, lebendigen und inspirierenden Wettbewerbs.

Beim Großen Finale trafen die fünf Sessionsieger aufeinander. Herzlichen Glückwunsch an ${winner.startup}, Preisträger 2026.

Das Endklassement des Finales:

${block}

Vielen Dank, dass Sie sich getraut, vorbereitet und gepitcht haben. Das ist an sich schon ein Erfolg.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  if (lang === "en") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — season wrap-up & finale result`,
      body: `Hello,

The Rotary Startup Award 2026 has come to a close — and it was what it was thanks to you. Across five themed sessions, dozens of startups pitched in front of our juries. Whether or not you reached the finale, your project was part of a demanding, lively and inspiring competition.

The Grand Finale brought together the five session winners. Congratulations to ${winner.startup}, the 2026 laureate.

The finale's final ranking:

${block}

Thank you for daring, preparing and pitching. That, in itself, is an achievement.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  return {
    subject: `🏆 Rotary Startup Award 2026 — clôture de la saison & résultat de la finale`,
    body: `Bonjour,

Le Rotary Startup Award 2026 s'achève — et il a été ce qu'il a été grâce à vous. À travers cinq sessions thématiques, des dizaines de startups ont pitché devant nos jurys. Que vous ayez atteint la finale ou non, votre projet a fait partie d'un concours exigeant, vivant et inspirant.

La Grande Finale réunissait les cinq vainqueurs de session. Toutes nos félicitations à ${winner.startup}, lauréat 2026.

Le classement final de la finale :

${block}

Merci d'avoir osé, préparé et pitché. C'est déjà, en soi, une réussite.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
  };
}

function buildAllJury({ lang, rankingBlock, winner, RESULTS_URL, JURYHUB_URL }) {
  const block = rankingBlock(lang);
  if (lang === "de") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — vielen Dank & Ergebnis`,
      body: `Guten Tag,

der Rotary Startup Award 2026 wäre ohne seine Jurymitglieder nicht möglich gewesen. Ob in einer Qualifikationssession oder im Finale: Sie haben Ihre Zeit, Ihre Erfahrung und Ihren Anspruch eingebracht — und genau das gibt diesem Wettbewerb seinen Wert.

Beim Großen Finale wurde ${winner.startup} zum Preisträger 2026 gekürt.

Das Endklassement des Finales:

${block}

Von Herzen Dank für Ihr Engagement während dieser ganzen Saison.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  if (lang === "en") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — thank you & results`,
      body: `Hello,

The Rotary Startup Award 2026 would not have been possible without its jurors. Whether in a qualifying session or in the finale, you gave your time, your experience and your high standards — and that is exactly what gives this competition its value.

At the Grand Finale, ${winner.startup} was named the 2026 laureate.

The finale's final ranking:

${block}

Heartfelt thanks for your commitment throughout this whole season.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  return {
    subject: `🏆 Rotary Startup Award 2026 — merci & résultats`,
    body: `Bonjour,

Le Rotary Startup Award 2026 n'aurait pas existé sans ses jurés. Que ce soit lors d'une session qualificative ou en finale, vous avez donné votre temps, votre expérience et votre exigence — et c'est précisément ce qui fait la valeur de ce concours.

Lors de la Grande Finale, ${winner.startup} a été désigné lauréat 2026.

Le classement final de la finale :

${block}

Merci du fond du cœur pour votre engagement tout au long de cette saison.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
  };
}

// Sent to EVERY applicant of the season — including the ~40 startups that applied
// but were not selected to pitch. Inclusive, warm, no judgement on non-selection.
function buildAllApplicants({ lang, rankingBlock, winner, RESULTS_URL, JURYHUB_URL }) {
  const block = rankingBlock(lang);
  if (lang === "de") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — Ergebnis & Dank für Ihre Bewerbung`,
      body: `Guten Tag,

vielen Dank, dass Sie sich für den Rotary Startup Award 2026 beworben haben. Diese erste Ausgabe hat über 65 Bewerbungen zusammengebracht — ein starkes Zeichen für die Dynamik des Ökosystems. Nicht alle konnten zum Pitchen ausgewählt werden, doch jede Bewerbung hat zum Reichtum dieser Saison beigetragen.

Falls Ihr Projekt diesmal nicht ausgewählt wurde: Das ist kein Urteil über seinen Wert. Die Auswahl war hart, und viele hervorragende Bewerbungen konnten nicht ins Programm aufgenommen werden.

Beim Großen Finale am 26. Mai bei Cyrus Conseil traten die fünf Sessionsieger vor einer internationalen Jury an. Herzlichen Glückwunsch an ${winner.startup}, Preisträger 2026.

Das Endklassement:

${block}

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  if (lang === "en") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — results & thank you for applying`,
      body: `Hello,

Thank you for applying to the Rotary Startup Award 2026. This first edition brought together more than 65 applications — a strong signal of how vibrant the ecosystem is. Not all could be selected to pitch, but every application added to the richness of this season.

If your project wasn't selected this time, please don't take it as a verdict on its value. The selection was tough, and many excellent applications could not be scheduled.

At the Grand Finale on 26 May at Cyrus Conseil, the five session winners competed before an international jury. Congratulations to ${winner.startup}, the 2026 laureate.

The final ranking:

${block}

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  return {
    subject: `🏆 Rotary Startup Award 2026 — résultats & merci pour votre candidature`,
    body: `Bonjour,

Merci d'avoir candidaté au Rotary Startup Award 2026. Cette première édition a réuni plus de 65 candidatures — un signal fort de la vitalité de l'écosystème. Toutes n'ont pas pu être retenues pour pitcher, mais chaque dossier a compté dans la richesse de cette saison.

Si votre projet n'a pas été retenu cette fois, ne le prenez pas comme un verdict sur sa valeur : la sélection a été difficile, et beaucoup d'excellents dossiers n'ont pas pu être programmés.

Lors de la Grande Finale, le 26 mai chez Cyrus Conseil, les cinq vainqueurs de session se sont affrontés devant un jury international. Toutes nos félicitations à ${winner.startup}, lauréat 2026.

Le classement final :

${block}

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
  };
}

function buildClubs({ lang, rankingBlock, winner, RESULTS_URL, JURYHUB_URL }) {
  const block = rankingBlock(lang);
  if (lang === "de") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — Ergebnis & Dank an die Clubs`,
      body: `Liebe Rotary-Freundinnen und -Freunde,

der Rotary Startup Award 2026 ist zu Ende — und Ihr Club hat dazu beigetragen, sei es durch die Verbreitung des Aufrufs, durch Jurymitglieder oder durch Ihre Präsenz. Vielen Dank.

Beim Großen Finale wurde ${winner.startup} zum Preisträger 2026 gekürt.

Das Endklassement:

${block}

Diese Ausgabe hat gezeigt, was Rotary im Dienst des Unternehmertums und des gesellschaftlichen Engagements bewirken kann.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  if (lang === "en") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — results & thanks to the clubs`,
      body: `Dear Rotary friends,

The Rotary Startup Award 2026 has come to a close — and your club helped make it happen, whether by relaying the call, providing jurors, or simply being there. Thank you.

At the Grand Finale, ${winner.startup} was named the 2026 laureate.

The final ranking:

${block}

This edition showed what Rotary can achieve in the service of entrepreneurship and community impact.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  return {
    subject: `🏆 Rotary Startup Award 2026 — résultats & merci aux clubs`,
    body: `Chers amis rotariens,

Le Rotary Startup Award 2026 s'achève — et votre club y a contribué, que ce soit en relayant l'appel, en fournissant des jurés ou simplement par votre présence. Merci.

Lors de la Grande Finale, ${winner.startup} a été désigné lauréat 2026.

Le classement final :

${block}

Cette édition a montré ce que le Rotary peut accomplir au service de l'entrepreneuriat et de l'engagement sociétal.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
  };
}

// Generic competition recap ("compte rendu") — for incubators & partners who
// relayed the call. Manual recipients (no base available). Richer than the others:
// season figures + result. Reusable as a stand-alone debrief.
function buildIncubators({ lang, rankingBlock, winner, RESULTS_URL, JURYHUB_URL }) {
  const block = rankingBlock(lang);
  if (lang === "de") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — Bericht zur Ausgabe`,
      body: `Guten Tag,

hier ein kurzer Bericht zur ersten Ausgabe des Rotary Startup Award 2026, den Sie mit bekannt gemacht haben.

In Zahlen:
• über 65 eingegangene Bewerbungen
• 28 zum Pitchen ausgewählte Startups
• 5 thematische Sessions (FoodTech, Soziale Wirkung, Tech/KI/Fintech, Healthtech, Greentech)
• 34 mobilisierte Jurymitglieder
• ein Großes Finale am 26. Mai bei Cyrus Conseil, vor einer zwölfköpfigen internationalen Jury

Preisträger 2026: ${winner.startup}.

Das Endklassement des Finales:

${block}

Vielen Dank, dass Sie den Aufruf in Ihrem Netzwerk verbreitet haben — mehrere von Ihnen begleitete Projekte haben teilgenommen. Wir würden uns freuen, 2027 gemeinsam weiterzumachen.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  if (lang === "en") {
    return {
      subject: `🏆 Rotary Startup Award 2026 — edition report`,
      body: `Hello,

Here is a short report on the first edition of the Rotary Startup Award 2026, which you helped spread the word about.

In figures:
• more than 65 applications received
• 28 startups selected to pitch
• 5 themed sessions (FoodTech, Social Impact, Tech/AI/Fintech, Healthtech, Greentech)
• 34 jurors mobilised
• a Grand Finale on 26 May at Cyrus Conseil, before an international jury of twelve

2026 laureate: ${winner.startup}.

The finale's final ranking:

${block}

Thank you for relaying the call across your network — several projects you support took part. We would be delighted to continue together in 2027.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
    };
  }
  return {
    subject: `🏆 Rotary Startup Award 2026 — compte rendu de l'édition`,
    body: `Bonjour,

Voici un bref compte rendu de la première édition du Rotary Startup Award 2026, que vous avez contribué à faire connaître.

En quelques chiffres :
• plus de 65 candidatures reçues
• 28 startups sélectionnées pour pitcher
• 5 sessions thématiques (FoodTech, Impact social, Tech/AI/Fintech, Healthtech, Greentech)
• 34 jurés mobilisés
• une Grande Finale le 26 mai chez Cyrus Conseil, devant un jury international de douze membres

Lauréat 2026 : ${winner.startup}.

Le classement final de la finale :

${block}

Merci d'avoir relayé l'appel à candidatures auprès de votre réseau — plusieurs projets que vous accompagnez ont pris part au concours. Nous serions ravis de poursuivre ensemble en 2027.

${footer(lang, RESULTS_URL, JURYHUB_URL)}`,
  };
}
