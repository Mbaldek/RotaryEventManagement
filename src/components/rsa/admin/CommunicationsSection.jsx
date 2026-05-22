import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Copy, Mail, Send, Mic2, Users as UsersIcon, Trophy, ExternalLink, Megaphone, Crown, CalendarClock } from "lucide-react";
import { JuryProfile, StartupConfirmation } from "@/lib/db";
import { SESSION_BY_ID, FINAL_SESSION_ID, getSessionLabel, getSessionDate } from "@/lib/rsa/constants";

const FINALE_DATES = {
  fr: "Mardi 26 mai 2026 · 16h–19h",
  en: "Tuesday 26 May 2026 · 4pm–7pm",
  de: "Dienstag, 26. Mai 2026 · 16:00–19:00 Uhr",
};
const FINALE_LOC = "Cyrus Conseil · 50 bd Haussmann · Paris 75009";

// Losing startups carry no explicit lang field, so we derive the visitor-email
// language from their country (DACH → de, francophone → fr, else en).
const DE_COUNTRIES = new Set([
  "Allemagne", "Germany", "Deutschland", "Autriche", "Austria", "Österreich",
]);
const FR_COUNTRIES = new Set([
  "France", "Belgique", "Belgium", "Suisse", "Switzerland", "Luxembourg",
  "Québec", "Quebec", "Canada", "Monaco",
]);
function startupLang(country) {
  const c = (country || "").trim();
  if (DE_COUNTRIES.has(c)) return "de";
  if (FR_COUNTRIES.has(c)) return "fr";
  return "en";
}

export default function CommunicationsSection({ sessionId, ranking }) {
  const session = SESSION_BY_ID[sessionId];
  const [jurors, setJurors] = useState([]);
  const [finaleJurors, setFinaleJurors] = useState([]);
  const [startups, setStartups] = useState([]);
  const [finalistRowsCount, setFinalistRowsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null); // open card key
  const announceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [allJury, startupRows, finaleRows] = await Promise.all([
          JuryProfile.list("nom"),
          StartupConfirmation.filter({ session_id: sessionId }),
          StartupConfirmation.filter({ session_id: FINAL_SESSION_ID }),
        ]);
        if (cancelled) return;
        const validated = (allJury || []).filter((j) => {
          if (!j.validated) return false;
          if (session.isFinal) return j.grande_finale === true;
          const a = j.assigned_sessions || [];
          return a.includes(session.label) || a.includes(session.id);
        });
        // Independent of which session is being viewed: always know the full
        // list of finale jurors so we can offer the "invite finale jury" cards
        // from any session's Communications panel.
        const allFinaleJurors = (allJury || []).filter(
          (j) => j.validated && j.grande_finale === true
        );
        setJurors(validated);
        setFinaleJurors(allFinaleJurors);
        setStartups(startupRows || []);
        setFinalistRowsCount((finaleRows || []).length);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, session.label, session.id, session.isFinal]);

  // Open + scroll the announce card if the URL hash points to it (deep link
  // from RsaDashboard's PublishedSessionCard "📣 Annonce publique" button).
  useEffect(() => {
    if (loading) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#announce") return;
    setOpen("announce");
    requestAnimationFrame(() => {
      announceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [loading]);

  const winner = useMemo(() => ranking.find((r) => r.final_rank === 1), [ranking]);
  const losers = useMemo(() => ranking.filter((r) => r.final_rank > 1), [ranking]);

  const startupByName = useMemo(() => {
    const m = new Map();
    for (const s of startups) m.set(s.startup_name, s);
    return m;
  }, [startups]);

  // Recipient lists
  const juryByLang = useMemo(() => {
    const groups = { fr: [], en: [], de: [] };
    for (const j of jurors) {
      if (!j.email) continue;
      const lang = (j.lang === "en" || j.lang === "de") ? j.lang : "fr";
      groups[lang].push(j.email);
    }
    return groups;
  }, [jurors]);
  const finaleJuryByLang = useMemo(() => {
    const groups = { fr: [], en: [], de: [] };
    for (const j of finaleJurors) {
      if (!j.email) continue;
      const lang = (j.lang === "en" || j.lang === "de") ? j.lang : "fr";
      groups[lang].push(j.email);
    }
    return groups;
  }, [finaleJurors]);
  const winnerStartup = winner ? startupByName.get(winner.startup) : null;
  const winnerEmail = winnerStartup?.startup_contact_email || "";
  const winnerFirstName = winnerStartup?.startup_contact_prenom || "";
  const losersByLang = useMemo(() => {
    const groups = { fr: [], en: [], de: [] };
    for (const r of losers) {
      const row = startupByName.get(r.startup);
      const email = row?.startup_contact_email;
      if (!email) continue;
      groups[startupLang(row?.startup_country)].push(email);
    }
    return groups;
  }, [losers, startupByName]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // -------- Templates --------
  const juryTemplateFr = buildJuryTemplate({ session, ranking, winner, baseUrl, lang: "fr" });
  const juryTemplateEn = buildJuryTemplate({ session, ranking, winner, baseUrl, lang: "en" });
  const juryTemplateDe = buildJuryTemplate({ session, ranking, winner, baseUrl, lang: "de" });
  const finaleInviteTemplateFr = buildFinaleJuryInvitationTemplate({ baseUrl, lang: "fr" });
  const finaleInviteTemplateEn = buildFinaleJuryInvitationTemplate({ baseUrl, lang: "en" });
  const finaleInviteTemplateDe = buildFinaleJuryInvitationTemplate({ baseUrl, lang: "de" });
  const saveDateTemplateFr = buildFinaleSaveTheDateTemplate({ lang: "fr" });
  const saveDateTemplateEn = buildFinaleSaveTheDateTemplate({ lang: "en" });
  const saveDateTemplateDe = buildFinaleSaveTheDateTemplate({ lang: "de" });
  const losersTemplateFr = buildLosersTemplate({ session, winner, baseUrl, lang: "fr" });
  const losersTemplateEn = buildLosersTemplate({ session, winner, baseUrl, lang: "en" });
  const losersTemplateDe = buildLosersTemplate({ session, winner, baseUrl, lang: "de" });
  const winnerTemplate = winner
    ? buildWinnerTemplate({
        session,
        winner,
        ranking,
        firstName: winnerFirstName,
        baseUrl,
      })
    : null;
  const announceTemplate = winner && !session.isFinal
    ? buildAnnounceTemplate({
        session,
        winner,
        baseUrl,
        finalistsSoFar: finalistRowsCount,
      })
    : null;

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-4 flex items-center gap-2 text-sm text-stone-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Chargement des destinataires…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start gap-3 flex-wrap mb-4">
        <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-indigo-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-stone-800">Communications post-session</div>
          <p className="text-xs text-stone-500 mt-0.5">
            Templates pré-remplis avec les données réelles. Jury session (bleu) = thank-you après
            chaque session qualificative. Jury finale (vert) = invitation présence des jurés
            sélectionnés pour la Grande Finale (flag <code className="text-[10px] bg-stone-100 px-1 rounded">grande_finale</code>). Tout est groupé par langue (FR/EN/DE).
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        <TemplateCard
          color="blue"
          Icon={Trophy}
          title="Jury 🇫🇷 FR"
          subtitle={`${juryByLang.fr.length} juré${juryByLang.fr.length > 1 ? "s" : ""} francophone${juryByLang.fr.length > 1 ? "s" : ""} · classement final`}
          recipients={juryByLang.fr}
          template={juryTemplateFr}
          isOpen={open === "juryFr"}
          onToggle={() => setOpen(open === "juryFr" ? null : "juryFr")}
        />
        <TemplateCard
          color="blue"
          Icon={Trophy}
          title="Jury 🇬🇧 EN"
          subtitle={`${juryByLang.en.length} English-speaking juror${juryByLang.en.length > 1 ? "s" : ""} · final ranking`}
          recipients={juryByLang.en}
          template={juryTemplateEn}
          isOpen={open === "juryEn"}
          onToggle={() => setOpen(open === "juryEn" ? null : "juryEn")}
        />
        <TemplateCard
          color="blue"
          Icon={Trophy}
          title="Jury 🇩🇪 DE"
          subtitle={`${juryByLang.de.length} deutschsprachige${juryByLang.de.length > 1 ? "s" : "r"} Jurymitglied${juryByLang.de.length > 1 ? "er" : ""} · Endklassement`}
          recipients={juryByLang.de}
          template={juryTemplateDe}
          isOpen={open === "juryDe"}
          onToggle={() => setOpen(open === "juryDe" ? null : "juryDe")}
        />
        <TemplateCard
          color="indigo"
          Icon={CalendarClock}
          title="📅 Save the date 🇫🇷 FR"
          subtitle={`${finaleJuryByLang.fr.length} juré${finaleJuryByLang.fr.length > 1 ? "s" : ""} finale FR · bloquer le créneau`}
          recipients={finaleJuryByLang.fr}
          template={saveDateTemplateFr}
          isOpen={open === "saveDateFr"}
          onToggle={() => setOpen(open === "saveDateFr" ? null : "saveDateFr")}
        />
        <TemplateCard
          color="indigo"
          Icon={CalendarClock}
          title="📅 Save the date 🇬🇧 EN"
          subtitle={`${finaleJuryByLang.en.length} finale juror${finaleJuryByLang.en.length > 1 ? "s" : ""} EN · block the date`}
          recipients={finaleJuryByLang.en}
          template={saveDateTemplateEn}
          isOpen={open === "saveDateEn"}
          onToggle={() => setOpen(open === "saveDateEn" ? null : "saveDateEn")}
        />
        <TemplateCard
          color="indigo"
          Icon={CalendarClock}
          title="📅 Save the date 🇩🇪 DE"
          subtitle={`${finaleJuryByLang.de.length} Finale-Jurymitglied${finaleJuryByLang.de.length > 1 ? "er" : ""} DE · Termin blockieren`}
          recipients={finaleJuryByLang.de}
          template={saveDateTemplateDe}
          isOpen={open === "saveDateDe"}
          onToggle={() => setOpen(open === "saveDateDe" ? null : "saveDateDe")}
        />
        <TemplateCard
          color="emerald"
          Icon={Crown}
          title="🏆 Jury Finale 🇫🇷 FR"
          subtitle={`${finaleJuryByLang.fr.length} juré${finaleJuryByLang.fr.length > 1 ? "s" : ""} finale FR · invitation présence`}
          recipients={finaleJuryByLang.fr}
          template={finaleInviteTemplateFr}
          isOpen={open === "finaleFr"}
          onToggle={() => setOpen(open === "finaleFr" ? null : "finaleFr")}
        />
        <TemplateCard
          color="emerald"
          Icon={Crown}
          title="🏆 Jury Finale 🇬🇧 EN"
          subtitle={`${finaleJuryByLang.en.length} finale juror${finaleJuryByLang.en.length > 1 ? "s" : ""} EN · attendance invitation`}
          recipients={finaleJuryByLang.en}
          template={finaleInviteTemplateEn}
          isOpen={open === "finaleEn"}
          onToggle={() => setOpen(open === "finaleEn" ? null : "finaleEn")}
        />
        <TemplateCard
          color="emerald"
          Icon={Crown}
          title="🏆 Jury Finale 🇩🇪 DE"
          subtitle={`${finaleJuryByLang.de.length} Finale-Jurymitglied${finaleJuryByLang.de.length > 1 ? "er" : ""} DE · Teilnahme-Einladung`}
          recipients={finaleJuryByLang.de}
          template={finaleInviteTemplateDe}
          isOpen={open === "finaleDe"}
          onToggle={() => setOpen(open === "finaleDe" ? null : "finaleDe")}
        />
        <TemplateCard
          color="violet"
          Icon={UsersIcon}
          title="Perdantes 🇫🇷 FR"
          subtitle={`${losersByLang.fr.length} contact${losersByLang.fr.length > 1 ? "s" : ""} FR · invitation visiteur`}
          recipients={losersByLang.fr}
          template={losersTemplateFr}
          isOpen={open === "losersFr"}
          onToggle={() => setOpen(open === "losersFr" ? null : "losersFr")}
        />
        <TemplateCard
          color="violet"
          Icon={UsersIcon}
          title="Perdantes 🇬🇧 EN"
          subtitle={`${losersByLang.en.length} contact${losersByLang.en.length > 1 ? "s" : ""} EN · visitor invitation`}
          recipients={losersByLang.en}
          template={losersTemplateEn}
          isOpen={open === "losersEn"}
          onToggle={() => setOpen(open === "losersEn" ? null : "losersEn")}
        />
        <TemplateCard
          color="violet"
          Icon={UsersIcon}
          title="Perdantes 🇩🇪 DE"
          subtitle={`${losersByLang.de.length} Kontakt${losersByLang.de.length > 1 ? "e" : ""} DE · Gast-Einladung`}
          recipients={losersByLang.de}
          template={losersTemplateDe}
          isOpen={open === "losersDe"}
          onToggle={() => setOpen(open === "losersDe" ? null : "losersDe")}
        />
        <TemplateCard
          color="amber"
          Icon={Mic2}
          title="Startup gagnante"
          subtitle={
            winner
              ? `${winner.startup} · save the date Grande Finale`
              : "Pas encore de gagnant"
          }
          recipients={winnerEmail ? [winnerEmail] : []}
          template={winnerTemplate}
          isOpen={open === "winner"}
          onToggle={() => setOpen(open === "winner" ? null : "winner")}
          disabled={!winner}
        />
        <div ref={announceRef} id="announce" style={{ scrollMarginTop: 16 }}>
          <TemplateCard
            color="rose"
            Icon={Megaphone}
            title="📣 Annonce publique"
            subtitle={
              winner
                ? session.isFinal
                  ? "Réservé aux sessions qualificatives"
                  : `Annoncer ${winner.startup} comme finaliste`
                : "Pas encore de gagnant"
            }
            recipients={[]}
            template={announceTemplate}
            isOpen={open === "announce"}
            onToggle={() => setOpen(open === "announce" ? null : "announce")}
            disabled={!winner || session.isFinal}
            recipientsHint="Pas de destinataires pré-remplis — colle où tu veux : email club, partenaires, réseau"
          />
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  color,
  Icon,
  title,
  subtitle,
  recipients,
  template,
  isOpen,
  onToggle,
  disabled,
  recipientsHint,
}) {
  const tones = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", btn: "bg-blue-600 hover:bg-blue-700" },
    violet: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", btn: "bg-violet-600 hover:bg-violet-700" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", btn: "bg-amber-600 hover:bg-amber-700" },
    rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", btn: "bg-rose-600 hover:bg-rose-700" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", btn: "bg-emerald-600 hover:bg-emerald-700" },
    indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", btn: "bg-indigo-600 hover:bg-indigo-700" },
  };
  const tone = tones[color] || tones.blue;

  function copy(text, label) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copié`),
      () => toast.error("Copie impossible")
    );
  }

  function copyEmails() {
    const dedup = [...new Set(recipients)];
    if (dedup.length === 0) {
      toast.error("Aucun destinataire");
      return;
    }
    copy(dedup.join(", "), `${dedup.length} email${dedup.length > 1 ? "s" : ""}`);
  }

  function openMailto() {
    if (!template) return;
    const dedup = [...new Set(recipients)];
    // Use BCC to keep recipients private when there are several. With zero
    // recipients (e.g. public announce template) we still open the compose
    // window so the user can paste their audience manually.
    const useBcc = dedup.length > 1;
    // Build the query manually with encodeURIComponent so spaces become %20.
    // URLSearchParams.toString() encodes spaces as "+" (form-urlencoded), which
    // some mail clients (Proton) do not decode in mailto links — body arrives
    // peppered with "+" characters.
    const parts = [
      `subject=${encodeURIComponent(template.subject)}`,
      `body=${encodeURIComponent(template.body)}`,
    ];
    if (useBcc) parts.push(`bcc=${encodeURIComponent(dedup.join(","))}`);
    const to = useBcc ? "" : dedup[0] || "";
    const url = `mailto:${encodeURIComponent(to)}?${parts.join("&")}`;
    window.location.href = url;
  }

  return (
    <div className={`rounded-lg border ${tone.border} ${tone.bg} p-3 flex flex-col gap-2`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 ${tone.text} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${tone.text}`}>{title}</div>
          <div className="text-[11px] text-stone-600 mt-0.5">{subtitle}</div>
        </div>
      </div>

      {disabled ? (
        <div className="text-xs text-stone-500 italic py-3">
          Publie d'abord le classement pour activer ce template.
        </div>
      ) : (
        <>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => copy(template.subject, "Sujet")}
              className="text-[11px] px-2 py-1 rounded border border-white/0 bg-white hover:bg-stone-50 text-stone-700"
              title="Copier le sujet"
            >
              <Copy className="w-3 h-3 inline mr-1" /> Sujet
            </button>
            <button
              onClick={() => copy(template.body, "Corps")}
              className="text-[11px] px-2 py-1 rounded bg-white hover:bg-stone-50 text-stone-700"
              title="Copier le corps de l'email"
            >
              <Copy className="w-3 h-3 inline mr-1" /> Corps
            </button>
            {recipientsHint ? null : (
              <button
                onClick={copyEmails}
                disabled={recipients.length === 0}
                className="text-[11px] px-2 py-1 rounded bg-white hover:bg-stone-50 text-stone-700 disabled:opacity-50"
                title="Copier les emails destinataires"
              >
                <Copy className="w-3 h-3 inline mr-1" /> Emails ({recipients.length})
              </button>
            )}
          </div>
          {recipientsHint && (
            <div className="text-[11px] text-stone-500 italic">
              {recipientsHint}
            </div>
          )}

          <div className="flex gap-1.5">
            <button
              onClick={openMailto}
              disabled={recipients.length === 0 && !recipientsHint}
              className={`flex-1 text-[12px] px-2 py-1.5 rounded text-white font-medium inline-flex items-center justify-center gap-1.5 ${tone.btn} disabled:opacity-50`}
              title={recipientsHint ? "Ouvre ton client mail avec sujet et corps pré-remplis (à toi de mettre les destinataires)" : "Ouvre ton client mail avec sujet, corps et destinataires en BCC"}
            >
              <Send className="w-3 h-3" /> Ouvrir dans le mail
              <ExternalLink className="w-3 h-3 opacity-70" />
            </button>
            <button
              onClick={onToggle}
              className="text-[12px] px-3 py-1.5 rounded border border-stone-300 bg-white hover:bg-stone-50 text-stone-700"
            >
              {isOpen ? "Masquer" : "Aperçu"}
            </button>
          </div>

          {isOpen && (
            <div className="mt-1 bg-white border border-stone-200 rounded p-3 space-y-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-1">
                  Sujet
                </div>
                <div className="text-xs text-stone-800 font-medium">{template.subject}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-1">
                  Corps
                </div>
                <pre className="text-[11.5px] text-stone-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {template.body}
                </pre>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-1">
                  Destinataires ({recipients.length})
                </div>
                <div className="text-[11px] text-stone-600 break-all">
                  {[...new Set(recipients)].join(", ") || "—"}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ----- Template builders (FR) -----

function rankingLines(ranking) {
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  return ranking
    .map((r) => {
      const m = medals[r.final_rank] || `   #${r.final_rank}`;
      return `${m} #${r.final_rank} — ${r.startup} · ${r.final_score.toFixed(2)}/5`;
    })
    .join("\n");
}

// Save-the-date — earliest finale-jury comm. Light, no RSVP, no jury pack.
// Goal: get the 11 finale jurors to block the slot in their calendar before
// anything else. Sent weeks ahead. Insists on the physical / in-person nature
// (vs the qualifying sessions which run on Teams) and the public format with
// cocktail at the end so they understand it's a different beast.
function buildFinaleSaveTheDateTemplate({ lang = "fr" }) {
  const finaleDate = FINALE_DATES[lang] || FINALE_DATES.fr;

  if (lang === "de") {
    const subject = "Save the date — Rotary Startup Award Großes Finale 2026";
    const body = `Guten Tag,

bitte blockieren Sie sich folgenden Termin im Kalender:

🏆 GROSSES FINALE — Rotary Startup Award 2026
${finaleDate}
${FINALE_LOC}

Sie wurden als Mitglied der Finale-Jury ausgewählt — herzlichen Glückwunsch und vielen Dank für Ihr Engagement!

Im Unterschied zu den Qualifikationssessions (auf Teams) findet das Finale ausschließlich vor Ort statt:
  • Präsenz vor Ort, kein Teams.
  • Publikum: Rotary-Mitglieder, Partner, Investoren und Gäste.
  • Pitches und Q&A vor Live-Publikum.
  • Im Anschluss Cocktail-Empfang & Networking mit Jury, Startups und Gästen.

Eine offizielle Einladung mit RSVP-Link folgt in den kommenden Tagen, gefolgt vom Jury-Paket (Decks, Bewertungsraster, Ablauf) in den Wochen vor dem Termin.

Bei Fragen oder Terminkonflikten gerne kurz Bescheid geben.

Mit freundlichen Grüßen,
Die Kommission Rotary Startup Award 2026
Rotary Club de Paris`;
    return { subject, body };
  }

  if (lang === "en") {
    const subject = "Save the date — Rotary Startup Award Grand Finale 2026";
    const body = `Hello,

Please block the following slot in your calendar:

🏆 GRAND FINALE — Rotary Startup Award 2026
${finaleDate}
${FINALE_LOC}

You have been selected as a member of the finale jury panel — congratulations and thank you for your commitment!

Unlike the qualifying sessions (held on Teams), the Grand Finale is fully in person:
  • In-person attendance only, no Teams.
  • Live audience: Rotary members, partners, investors and guests.
  • Pitches and Q&A in front of a live crowd.
  • Followed by a cocktail reception & networking with jury, startups and guests.

A formal invitation with the RSVP link will follow in the coming days, then the jury pack (decks, rating grid, schedule) in the weeks before the event.

If you spot a conflict or have any question, just drop us a line.

Best regards,
The Rotary Startup Award 2026 Committee
Rotary Club de Paris`;
    return { subject, body };
  }

  // fr (default)
  const subject = "Save the date — Grande Finale Rotary Startup Award 2026";
  const body = `Bonjour,

Merci de bloquer dès maintenant ce créneau dans votre agenda :

🏆 GRANDE FINALE — Rotary Startup Award 2026
${finaleDate}
${FINALE_LOC}

Vous avez été retenu·e comme juré·e de la finale — bravo et merci pour votre engagement !

Contrairement aux sessions qualificatives (qui se tenaient sur Teams), la Grande Finale est intégralement en présentiel :
  • Présentiel exclusif, pas de Teams.
  • Public présent : membres du Rotary, partenaires, investisseurs et invités.
  • Pitchs et Q&A devant audience.
  • Cocktail d'échange & networking en clôture, avec jury, startups et public.

Une invitation formelle avec lien RSVP suivra dans les prochains jours, puis le pack jury (decks, grille, déroulé) dans les semaines précédant l'évènement.

Si vous repérez un conflit d'agenda ou avez la moindre question, un mot suffit.

Bien cordialement,
La Commission Rotary Startup Award 2026
Rotary Club de Paris`;
  return { subject, body };
}

// Invitation to confirm presence as a finale juror — sent to validated jurors
// flagged grande_finale=true. Distinct from the post-session thank-you email
// (buildJuryTemplate) which thanks every juror after their qualifying session.
function buildFinaleJuryInvitationTemplate({ baseUrl, lang = "fr" }) {
  const finaleLink = `${baseUrl}/RsaFinaleRsvp?role=jury`;
  const finaleDate = FINALE_DATES[lang] || FINALE_DATES.fr;

  if (lang === "de") {
    const subject = "Rotary Startup Award — Einladung Jury Großes Finale";
    const body = `Guten Tag,

es wäre uns eine große Ehre, Sie als Jurymitglied beim Großen Finale des Rotary Startup Award 2026 begrüßen zu dürfen.

🏆 GROSSES FINALE
${finaleDate}
${FINALE_LOC}

Sie wurden ausgewählt, um die finalistischen Startups zu bewerten — die Gewinner der jeweiligen Qualifikationssessions. Das Format ist anspruchsvoller als in den Qualifikationen: 10–12 Min Pitch, 8 Min Q&A pro Startup.

📅 Bitte bestätigen Sie Ihre Teilnahme mit wenigen Klicks:
${finaleLink}

Das Jury-Paket (Pre-Read-Deck, Teams-Link, Scoring-Link, Bewertungsraster) wird Ihnen in den Tagen vor dem Finale zugesandt.

Mit freundlichen Grüßen,
Die Kommission Rotary Startup Award 2026
Rotary Club de Paris`;
    return { subject, body };
  }

  if (lang === "en") {
    const subject = "Rotary Startup Award — Grand Finale jury invitation";
    const body = `Hello,

We would be honoured to have you on the jury panel for the Rotary Startup Award 2026 Grand Finale.

🏆 GRAND FINALE
${finaleDate}
${FINALE_LOC}

You have been selected to evaluate the finalist startups — the winners of each qualifying session. The format is more demanding than the qualifiers: 10–12 min pitch + 8 min Q&A per startup.

📅 Please confirm your attendance in a few clicks:
${finaleLink}

The jury pack (pre-read deck, Teams link, scoring link, rating grid) will be sent to you in the days leading up to the finale.

Best regards,
The Rotary Startup Award 2026 Committee
Rotary Club de Paris`;
    return { subject, body };
  }

  // fr (default)
  const subject = "Rotary Startup Award — Invitation jury Grande Finale";
  const body = `Bonjour,

Nous serions très honorés de vous compter parmi les jurés de la Grande Finale du Rotary Startup Award 2026.

🏆 GRANDE FINALE
${finaleDate}
${FINALE_LOC}

Vous avez été retenu·e pour évaluer les startups finalistes — les gagnants de chacune des sessions qualificatives. Le format est plus exigeant qu'en qualif : pitch 10–12 min + Q&A 8 min par startup.

📅 Merci de confirmer votre présence en quelques clics :
${finaleLink}

Le pack jury (deck pré-read, lien Teams, lien scoring, grille de notation) vous parviendra dans les jours précédant la finale.

Bien cordialement,
La Commission Rotary Startup Award 2026
Rotary Club de Paris`;
  return { subject, body };
}

function buildJuryTemplate({ session, ranking, winner, baseUrl, lang = "fr" }) {
  // Note: this email no longer asks session jurors to RSVP for the Grande
  // Finale — being on a session jury does NOT make you a finale juror, so
  // the previous "?role=jury" RSVP link was misleading. Finale jury is a
  // separate vetted list (jury_profiles.grande_finale === true) and they
  // receive their own dedicated invitation flow.
  const sessionLabel = getSessionLabel(session, lang);
  const sessionDate = getSessionDate(session, lang);

  if (lang === "de") {
    const subject = `Rotary Startup Award — Vielen Dank für Ihre Bewertung · ${sessionLabel}`;
    const body = `Guten Tag,

vielen Dank für Ihre Zeit und Ihre Expertise bei der Session „${sessionLabel}" des Rotary Startup Award 2026 am ${sessionDate}.

Hier das konsolidierte Endklassement:

${rankingLines(ranking)}

${winner ? `${winner.startup} vertritt diese Session beim Großen Finale.\n\n` : ""}📋 DETAILLIERTER SESSION-RÜCKBLICK
Vollständige Übersicht der Jury-Bewertungen, des Rankings und Kommentare:
${baseUrl}/RsaRecap?s=${session.id}

👁 AWARDS-ÜBERSICHT — alle Sessions auf einen Blick
Vollständiges Programm, Startups, Decks, Jurys, Finalisten Session für Session:
${baseUrl}/RsaJuryHub

Nochmals herzlichen Dank für Ihr Engagement und Ihren Expertenblick auf diese Projekte.

Mit freundlichen Grüßen,
Die Kommission Rotary Startup Award 2026
Rotary Club de Paris`;
    return { subject, body };
  }

  if (lang === "en") {
    const subject = `Rotary Startup Award — Thank you for your evaluation · ${sessionLabel}`;
    const body = `Hello,

Many thanks for your time and your expertise during the "${sessionLabel}" session of the Rotary Startup Award 2026, held on ${sessionDate}.

Here is the consolidated final ranking:

${rankingLines(ranking)}

${winner ? `${winner.startup} will represent this session at the Grand Finale.\n\n` : ""}📋 DETAILED SESSION RECAP
Full view of jurors' scores, ranking and comments:
${baseUrl}/RsaRecap?s=${session.id}

👁 AWARDS DASHBOARD — all sessions at a glance
Full programme, startups, decks, jurors, finalists announced session after session:
${baseUrl}/RsaJuryHub

Once again, thank you for your commitment and your expert eye on these projects.

Best regards,
The Rotary Startup Award 2026 Committee
Rotary Club de Paris`;
    return { subject, body };
  }

  // fr (default)
  const subject = `Rotary Startup Award — Merci pour votre évaluation · ${sessionLabel}`;
  const body = `Bonjour,

Merci infiniment pour votre temps et votre expertise lors de la session "${sessionLabel}" du Rotary Startup Award 2026, qui s'est tenue le ${sessionDate}.

Voici le classement final consolidé :

${rankingLines(ranking)}

${winner ? `${winner.startup} représentera cette session lors de la Grande Finale.\n\n` : ""}📋 RÉCAP DÉTAILLÉ DE LA SESSION
Vue complète des notes par juré, classement et commentaires :
${baseUrl}/RsaRecap?s=${session.id}

👁 ESPACE CONCOURS — toutes les sessions en un coup d'œil
Programme complet, startups, decks, jurés, finalistes annoncés au fil des sessions :
${baseUrl}/RsaJuryHub

Encore merci pour votre engagement et votre regard d'expert sur ces projets.

Bien cordialement,
La Commission Rotary Startup Award 2026
Rotary Club de Paris`;
  return { subject, body };
}

function buildLosersTemplate({ session, winner, baseUrl, lang = "fr" }) {
  const label = getSessionLabel(session, lang);
  const date = getSessionDate(session, lang);
  const finaleDate = FINALE_DATES[lang] || FINALE_DATES.fr;
  const rsvpLink = `${baseUrl}/RsaFinaleRsvp?role=visitor&from=${encodeURIComponent(session.id)}`;

  if (lang === "de") {
    const subject = `Rotary Startup Award — Vielen Dank für Ihren Pitch · ${label}`;
    const winnerLine = winner
      ? `Nach den Bewertungen wurde ${winner.startup} ausgewählt, um „${label}" beim Großen Finale zu vertreten. Die Entscheidung war knapp: über alle Bewerbungen hinweg blieben die Abstände gering, und mehrere Projekte hätten diesen Platz verdient. Die Jury entschied anhand eines Bündels von Kriterien — das schmälert die Qualität Ihres Pitches in keiner Weise.`
      : `Die Jury hat beraten und das Startup bestimmt, das die Session beim Großen Finale vertreten wird.`;
    const body = `Guten Tag,

vielen Dank, dass Sie sich die Zeit genommen haben, bei der Session „${label}" des Rotary Startup Award 2026 am ${date} zu pitchen. Sein Projekt vor einer anspruchsvollen Jury zu präsentieren, erfordert Vorbereitung und Mut — das ist an sich schon eine Leistung.

${winnerLine}

Wir wollten Ihnen direkt danken, denn die Gesamtqualität der Session verdankt sich auch Ihnen.

🏆 EINLADUNG ZUM GROSSEN FINALE — als Gast

Wir würden uns sehr freuen, Sie als Gast beim Großen Finale begrüßen zu dürfen:

${finaleDate}
${FINALE_LOC}

Sie treffen dort Investoren, Jurymitglieder, Gründer und die Rotary-Gemeinschaft. Eine echte Gelegenheit, den Austausch fortzusetzen, neue Kontakte zu knüpfen und das Finale-Format unter realen Bedingungen zu erleben — nützlich, falls Sie Ihr Projekt später erneut präsentieren.

Um Ihre Teilnahme zu bestätigen (oder unverbindlich abzusagen), füllen Sie bitte dieses kurze Formular aus:
${rsvpLink}

Alles Gute für Ihren weiteren Weg — halten Sie uns gerne über Ihre Fortschritte auf dem Laufenden.

Mit freundlichen Grüßen,
Die Kommission Rotary Startup Award 2026
Rotary Club de Paris`;
    return { subject, body };
  }

  if (lang === "en") {
    const subject = `Rotary Startup Award — Thank you for your pitch · ${label}`;
    const winnerLine = winner
      ? `Following the evaluations, ${winner.startup} was selected to represent "${label}" at the Grand Finale. It was a close call: across all the entries the gaps stayed narrow and several projects could have claimed that spot. The jury decided on a combination of criteria, which takes nothing away from the quality of your pitch.`
      : `The jury deliberated and chose the startup that will represent the session at the Grand Finale.`;
    const body = `Hello,

Thank you for taking the time to pitch during the "${label}" session of the Rotary Startup Award 2026, on ${date}. Presenting your project to a demanding jury takes preparation and nerve — that's an achievement in itself.

${winnerLine}

We wanted to thank you directly, because the overall quality of the session owes a lot to yours too.

🏆 GRAND FINALE INVITATION — as a guest

We would be delighted to have you with us at the Grand Finale, as a guest:

${finaleDate}
${FINALE_LOC}

You will meet investors, jurors, entrepreneurs and the Rotary community. It's a real chance to keep the conversations going, make new connections, and see the finale format in real conditions — useful if you pitch your project again later.

To confirm your attendance (or decline, no obligation), please fill in this short form:
${rsvpLink}

All the best for what's next — feel free to keep us posted on your progress.

Best regards,
The Rotary Startup Award 2026 Committee
Rotary Club de Paris`;
    return { subject, body };
  }

  // fr (default)
  const subject = `Rotary Startup Award — Merci pour votre pitch · ${label}`;
  const winnerLine = winner
    ? `À l'issue des évaluations, ${winner.startup} a été retenu·e pour représenter "${label}" en Grande Finale. Le choix a été serré : sur l'ensemble des dossiers, les écarts sont restés faibles et plusieurs projets auraient pu défendre cette place. Le jury a tranché sur un faisceau de critères, sans que cela retire quoi que ce soit à la qualité de votre pitch.`
    : `Le jury a délibéré et désigné la startup qui représentera la session en Grande Finale.`;
  const body = `Bonjour,

Merci d'avoir pris le temps de pitcher lors de la session "${label}" du Rotary Startup Award 2026, le ${date}. Présenter son projet devant un jury exigeant demande de la préparation et du cran — c'est déjà un accomplissement en soi.

${winnerLine}

Nous tenions à vous remercier directement, parce que la qualité globale de la session tient aussi à la vôtre.

🏆 INVITATION GRANDE FINALE — comme visiteur

Nous serions ravis de vous compter parmi nous lors de la Grande Finale, comme invité·e :

${finaleDate}
${FINALE_LOC}

Vous y croiserez investisseurs, jurés, entrepreneurs et la communauté Rotary. C'est une vraie occasion de prolonger les échanges, faire de nouvelles rencontres, et voir le format finale en conditions réelles — utile si vous représentez à nouveau votre projet plus tard.

Pour confirmer votre présence (ou décliner sans obligation), merci de remplir ce court formulaire :
${rsvpLink}

Bonne continuation pour la suite — n'hésitez pas à nous tenir au courant de vos avancées.

Bien cordialement,
La Commission Rotary Startup Award 2026
Rotary Club de Paris`;
  return { subject, body };
}

function buildWinnerTemplate({ session, winner, ranking, firstName, baseUrl }) {
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const subject = `🏆 Félicitations ${winner.startup} — vous êtes en Grande Finale !`;
  const finaleLink = `${baseUrl}/RsaFinaleRsvp?role=pitcher&startup=${encodeURIComponent(winner.startup)}&from=${encodeURIComponent(session.id)}`;
  const body = `${greeting}

Toutes nos félicitations ! ${winner.startup} a remporté la session "${session.label}" du Rotary Startup Award 2026 avec un score final de ${winner.final_score.toFixed(2)}/5 sur ${winner.n} évaluations.

Vous représenterez cette session lors de la Grande Finale, face aux gagnants des autres sessions.

🏆 GRANDE FINALE
${FINALE_DATES.fr}
${FINALE_LOC}

📌 Format pitch ajusté pour la finale
Le format de la finale est plus exigeant que les sessions qualificatives :
• Pitch : 10 à 12 minutes (vs. 4 min en qualif)
• Q&A jury : 8 minutes
• Total max : 20 minutes — un dépassement coupe court à la Q&A
• Slides à mettre à jour : nous reviendrons vers vous très vite avec les consignes détaillées et la deadline d'envoi du deck final
• Habillez-vous comme pour une finale — c'est aussi du media training

📅 ACTION DE VOTRE CÔTÉ
1. Bloquez la date dans votre agenda (et celui de votre cofondateur·rice si pertinent)
2. Confirmez votre présence en remplissant ce formulaire (vous pouvez venir accompagné·e) :
${finaleLink}
3. Préparez vos questions / besoins pour qu'on vous aide au mieux d'ici là

Nous sommes très enthousiastes à l'idée de vous voir représenter cette session. Toute l'équipe est mobilisée pour vous accompagner d'ici la finale.

Encore bravo, et à très vite.

Bien cordialement,
La Commission Rotary Startup Award 2026
Rotary Club de Paris`;
  return { subject, body };
}

// Public-facing announce (signed by the orga team) — the "faire monter la
// sauce" moment after each session publish. Marketing tone, ready to forward
// to the club mailing list, partners, or paste into a LinkedIn post.
function buildAnnounceTemplate({ session, winner, baseUrl, finalistsSoFar }) {
  const TOTAL = 5;
  const ordinal = (n) => (n === 1 ? "1er" : `${n}e`);
  const counterLine =
    finalistsSoFar > 0
      ? finalistsSoFar === 1
        ? "🏁 Premier finaliste désigné !"
        : finalistsSoFar >= TOTAL
        ? "🎯 Plateau finaliste au complet !"
        : `🏁 ${ordinal(finalistsSoFar)} finaliste désigné — ${finalistsSoFar}/${TOTAL} ! Plus que ${TOTAL - finalistsSoFar} à venir.`
      : "";

  const subject = `📣 ${winner.startup} en Grande Finale du Rotary Startup Award 2026 !`;
  const finaleHubLink = `${baseUrl}/RsaJuryHub`;
  const recapLink = `${baseUrl}/RsaRecap?s=${session.id}`;

  const body = `Bonjour à toutes et tous,

${counterLine}

À l'issue de la session "${session.label}" du ${session.date}, le jury international du Rotary Startup Award 2026 a désigné son lauréat :

🏆 ${winner.startup}

Score final : ${winner.final_score.toFixed(2)}/5 sur ${winner.n} évaluations indépendantes — un résultat serré qui témoigne de la densité du plateau cette année.

${winner.startup} rejoint donc le plateau de la Grande Finale, où elle pitchera face aux gagnants des autres sessions devant un jury élargi et l'ensemble de la communauté Rotary Paris.

🏆 GRANDE FINALE
${FINALE_DATES.fr}
${FINALE_LOC}

Toutes les startups, jurys et le programme complet sont consultables ici :
${finaleHubLink}

Et le récap détaillé de cette session (notes, classement, jurys) :
${recapLink}

Un grand merci à tous les jurés qui ont accepté de donner de leur temps et de leur expertise pour évaluer ces projets. Nous avons hâte de vivre la suite avec vous — la prochaine session arrive vite, restez à l'affût !

À très bientôt,

L'équipe organisation
Rotary Startup Award 2026
Rotary Club de Paris`;
  return { subject, body };
}
