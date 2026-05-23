import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Send, ExternalLink, Mic2, Users as UsersIcon, Crown, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Concrete finale logistics, baked into the editable defaults. The Teams join
// link was cleaned from the malformed launcher URL the organiser pasted.
const FINALE_TEAMS_URL = "https://teams.live.com/meet/93234415719609?p=7BjmHidIF7xzrs0rt0";

// Per-finalist list with individual pitch-deck links — same approach as the
// jury pack email. Finale rows carry a deck (final_deck_path = their new finale
// deck, else application_deck_path = the baseline backfilled from the source
// qualifying session). Rendered into {STARTUPS_BLOCK} per card language.
const BLOCK_LABELS = {
  fr: { deck: "Deck", none: "non fourni" },
  de: { deck: "Deck", none: "nicht bereitgestellt" },
};
function buildStartupsBlock(rows, lang) {
  const L = BLOCK_LABELS[lang] || BLOCK_LABELS.fr;
  const list = (rows || []).filter((r) => r && r.startup_name);
  if (!list.length) return "—";
  return list
    .map((r, i) => {
      const path = r.final_deck_path || r.application_deck_path;
      const url = path ? supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl : null;
      return `${i + 1}. ${r.startup_name}\n   ${L.deck} : ${url || L.none}`;
    })
    .join("\n\n");
}

// ---- Default templates (FR / DE) for the three finale audiences ----
// {SCORING_URL} {JURYHUB_URL} {PACK_URL} {TEAMS_URL} are substituted at render.
// Everything else (address, agenda, format) is static and editable in place.

const FINALIST_FR = `Sujet : 🏆 Grande Finale Rotary Startup Award 2026 — votre brief finaliste (mardi 26 mai)

Bonjour,

Le grand jour approche et nous sommes ravis de vous accueillir pour la Grande Finale du Rotary Startup Award 2026 ! Vous faites partie des finalistes — bravo encore.

📍 LIEU & ACCÈS (présentiel)
Cyrus Herez Wealth Management — 50 boulevard Haussmann, 75009 Paris, 10ᵉ étage.
Présentez-vous à l'accueil au rez-de-chaussée dès 15h30 ; un émargement vous sera demandé (d'où le RSVP) — n'oubliez pas votre pièce d'identité.

🕒 DÉROULÉ — merci d'être à l'heure !
  • 15h30 — accueil & émargement
  • 16h00 — ouverture de la session
  • 16h15 — début des pitchs
  • 18h15 — fin des pitchs
  • puis cocktail sur place — le lauréat est annoncé pendant le cocktail
L'événement est aussi diffusé en direct sur Teams Live pour le public à distance.

🎤 FORMAT — vous connaissez le principe, voici la différence
La finale vous laisse plus de temps qu'en qualification :
  • Pitch : 15 minutes (prenez le temps, déroulez votre histoire)
  • Q&A avec le jury : ~10 minutes
  • 25 minutes au total par finaliste
Un conseil pour le Q&A : gardez des réponses concises et précises — cela laisse la place à davantage de questions du jury, et c'est tout à votre avantage.

Vous pitcherez en anglais, devant le jury et le public (membres du Rotary, partenaires, investisseurs, invités). Nous aurons aussi le plaisir d'accueillir des fondateurs de startups non finalistes — une belle occasion d'échanges au cocktail.

Tenez-vous prêts, et surtout : profitez-en. Toute l'équipe est derrière vous.

À mardi !
La Commission Rotary Startup Award 2026
Rotary Club de Paris`;

const FINALIST_DE = `Betreff: 🏆 Große Finale Rotary Startup Award 2026 — Ihr Finalisten-Briefing (Dienstag, 26. Mai)

Guten Tag,

der große Tag rückt näher und wir freuen uns sehr, Sie beim Großen Finale des Rotary Startup Award 2026 begrüßen zu dürfen! Sie gehören zu den Finalisten — herzlichen Glückwunsch.

📍 ORT & ZUGANG (vor Ort)
Cyrus Herez Wealth Management — 50 boulevard Haussmann, 75009 Paris, 10. Etage.
Bitte melden Sie sich ab 15:30 Uhr am Empfang im Erdgeschoss; eine Anwesenheitsliste wird Ihnen vorgelegt (daher das RSVP) — denken Sie an Ihren Ausweis.

🕒 ABLAUF — bitte pünktlich sein!
  • 15:30 — Empfang & Anmeldung
  • 16:00 — Eröffnung der Session
  • 16:15 — Beginn der Pitches
  • 18:15 — Ende der Pitches
  • anschließend Cocktail vor Ort — der Sieger wird während des Cocktails bekannt gegeben
Die Veranstaltung wird zusätzlich live auf Teams Live für das Publikum aus der Ferne übertragen.

🎤 FORMAT — Sie kennen das Prinzip, hier der Unterschied
Das Finale gibt Ihnen mehr Zeit als in der Qualifikation:
  • Pitch: 15 Minuten (nehmen Sie sich Zeit, erzählen Sie Ihre Geschichte)
  • Q&A mit der Jury: ~10 Minuten
  • 25 Minuten insgesamt pro Finalist
Ein Tipp für die Q&A: Halten Sie Ihre Antworten kurz und präzise — so bleibt Raum für weitere Fragen der Jury, und das ist ganz zu Ihrem Vorteil.

Sie pitchen auf Englisch, vor der Jury und dem Publikum (Rotary-Mitglieder, Partner, Investoren, Gäste). Wir freuen uns außerdem, Gründer nicht-finalistischer Startups begrüßen zu dürfen — eine schöne Gelegenheit zum Austausch beim Cocktail.

Machen Sie sich bereit und vor allem: genießen Sie es. Das ganze Team steht hinter Ihnen.

Bis Dienstag!
Die Kommission Rotary Startup Award 2026
Rotary Club de Paris`;

const JURY_FR = `Sujet : 🏆 Grande Finale Rotary Startup Award 2026 — brief jury (mardi 26 mai)

Bonjour,

Nous y sommes — et nous sommes ravis de vous compter dans le jury de la Grande Finale du Rotary Startup Award 2026 ! Merci pour votre engagement.

📅 mardi 26 mai 2026 · 15h30–19h00

🖥️ À DISTANCE — Teams Live
Rotary Startup Award 2026 — Grande Finale+
Lien : {TEAMS_URL}
Connectez-vous dès 15h30.

📍 SUR PLACE (si vous êtes présent·e)
Cyrus Herez Wealth Management — 50 boulevard Haussmann, 75009 Paris, 10ᵉ étage.
Accueil au rez-de-chaussée dès 15h30, émargement + pièce d'identité.

🕒 DÉROULÉ — merci d'être à l'heure !
  • 15h30 — accueil / connexion
  • 16h00 — ouverture
  • 16h15 — pitchs (15 min de pitch + ~10 min de Q&A par finaliste)
  • 18h15 — fin des pitchs
  • puis cocktail — annonce du lauréat

📚 LES FINALISTES & LEURS DOCUMENTS
  • Pre-read (executive summaries des finalistes) : {PACK_URL}
  • Espace concours — l'historique complet du concours (toutes les sessions, startups, decks, jurys, classements) : {JURYHUB_URL}

Pitch decks des finalistes :
{STARTUPS_BLOCK}

📊 SCORING — même format que les sessions qualificatives
  • Page de scoring : {SCORING_URL}
  • Un QR code sera aussi affiché sur place.
  • 6 dimensions, notées de 0 à 5, comme d'habitude.
  • Tout le monde note EN DIRECT, pendant les pitchs.
  • Le lauréat est désigné par le score : pas de délibération ni de discussion entre jurés après les pitchs. Le processus est objectif — c'est le score qui décide. L'annonce se fait pendant le cocktail.

💬 CONDUITE DES Q&A
  • Questions concises et précises — pas de discussion qui s'éternise, pour que les autres jurés puissent aussi poser leurs questions.

▸ Vous avez déjà participé à une session de pitch
Vous connaissez le principe. Si vous avez déjà vu certaines de ces startups lors de votre session, merci de laisser la priorité des questions aux autres jurés sur ces startups-là.

▸ C'est votre première session
  • Ouvrez la page de scoring à l'avance ({SCORING_URL}) pour vous familiariser avec l'interface et les 6 dimensions.
  • Aucun stress technique : tout est sauvegardé en continu, automatiquement — vous pouvez fermer/rouvrir, changer d'appareil, vos notes restent.

Merci encore, et à mardi !
La Commission Rotary Startup Award 2026
Rotary Club de Paris`;

const JURY_DE = `Betreff: 🏆 Große Finale Rotary Startup Award 2026 — Jury-Briefing (Dienstag, 26. Mai)

Guten Tag,

es ist soweit — und wir freuen uns sehr, Sie in der Jury des Großen Finales des Rotary Startup Award 2026 zu haben! Vielen Dank für Ihr Engagement.

📅 Dienstag, 26. Mai 2026 · 15:30–19:00 Uhr

🖥️ AUS DER FERNE — Teams Live
Rotary Startup Award 2026 — Grande Finale+
Link: {TEAMS_URL}
Bitte ab 15:30 Uhr einwählen.

📍 VOR ORT (falls Sie anwesend sind)
Cyrus Herez Wealth Management — 50 boulevard Haussmann, 75009 Paris, 10. Etage.
Empfang im Erdgeschoss ab 15:30 Uhr, Anmeldung + Ausweis.

🕒 ABLAUF — bitte pünktlich sein!
  • 15:30 — Empfang / Einwahl
  • 16:00 — Eröffnung
  • 16:15 — Pitches (15 Min Pitch + ~10 Min Q&A pro Finalist)
  • 18:15 — Ende der Pitches
  • anschließend Cocktail — Bekanntgabe des Siegers

📚 DIE FINALISTEN & IHRE UNTERLAGEN
  • Pre-Read (Executive Summaries der Finalisten): {PACK_URL}
  • Wettbewerbsbereich — die vollständige Historie des Wettbewerbs (alle Sessions, Startups, Decks, Jurys, Rankings): {JURYHUB_URL}

Pitch Decks der Finalisten:
{STARTUPS_BLOCK}

📊 SCORING — gleiches Format wie die Qualifikationssessions
  • Scoring-Seite: {SCORING_URL}
  • Ein QR-Code wird auch vor Ort angezeigt.
  • 6 Dimensionen, bewertet von 0 bis 5, wie gewohnt.
  • Alle bewerten LIVE, während der Pitches.
  • Der Sieger wird durch das Ergebnis bestimmt: keine Beratung, keine Diskussion zwischen den Jurymitgliedern nach den Pitches. Der Prozess ist objektiv — das Ergebnis entscheidet. Die Bekanntgabe erfolgt während des Cocktails.

💬 Q&A-FÜHRUNG
  • Kurze, präzise Fragen — keine ausufernde Diskussion, damit auch die anderen Jurymitglieder Fragen stellen können.

▸ Sie haben bereits an einer Pitch-Session teilgenommen
Sie kennen das Prinzip. Falls Sie einige dieser Startups bereits in Ihrer Session gesehen haben, überlassen Sie bitte den anderen Jurymitgliedern bei diesen Startups den Vortritt bei den Fragen.

▸ Es ist Ihre erste Session
  • Öffnen Sie die Scoring-Seite vorab ({SCORING_URL}), um sich mit der Oberfläche und den 6 Dimensionen vertraut zu machen.
  • Kein technischer Stress: Alles wird laufend automatisch gespeichert — Sie können schließen/erneut öffnen, das Gerät wechseln, Ihre Bewertungen bleiben erhalten.

Nochmals vielen Dank, und bis Dienstag!
Die Kommission Rotary Startup Award 2026
Rotary Club de Paris`;

const EXT_FR = `Sujet : 🏆 Grande Finale Rotary Startup Award 2026 — votre rôle de Lead Jury (mardi 26 mai)

Bonjour,

C'est un grand honneur de vous accueillir au sein du jury de la Grande Finale du Rotary Startup Award 2026 — merci infiniment d'avoir accepté de nous accompagner et de guider notre jury Rotary.

📍 SUR PLACE (présentiel)
Cyrus Herez Wealth Management — 50 boulevard Haussmann, 75009 Paris, 10ᵉ étage.
Accueil au rez-de-chaussée dès 15h30 ; émargement + pièce d'identité.

🕒 DÉROULÉ — merci d'être à l'heure !
  • 15h30 — accueil & émargement
  • 16h00 — ouverture : je vous présenterai et vous passerai le micro pour quelques mots de présentation
  • 16h15 — pitchs (15 min de pitch + ~10 min de Q&A par finaliste)
  • 18h15 — fin des pitchs
  • puis cocktail — annonce du lauréat (désigné par le score)

🎤 VOTRE RÔLE
  • Après chaque pitch, vous avez la priorité pour les échanges avec les finalistes — n'hésitez pas à ouvrir le Q&A.
  • Questions concises et précises, pour laisser ensuite la place aux jurés Rotary.

📚 VOS DOCUMENTS
  • Pre-read (executive summaries des finalistes) : {PACK_URL}
  • Espace concours — l'historique complet du concours (toutes les sessions, startups, decks, jurys, classements) : {JURYHUB_URL}

Pitch decks des finalistes :
{STARTUPS_BLOCK}

📊 SCORING — comment ça marche
  • Page de scoring : {SCORING_URL} (un QR code sera aussi affiché sur place)
  • 6 dimensions, notées de 0 à 5.
  • On note EN DIRECT pendant les pitchs ; tout est sauvegardé automatiquement.
  • Le lauréat est désigné par le score, sans délibération ultérieure : un processus simple et objectif.

Au plaisir immense de vous accueillir mardi.
La Commission Rotary Startup Award 2026
Rotary Club de Paris`;

const EXT_DE = `Betreff: 🏆 Große Finale Rotary Startup Award 2026 — Ihre Rolle als Lead Jury (Dienstag, 26. Mai)

Guten Tag,

es ist uns eine große Ehre, Sie in der Jury des Großen Finales des Rotary Startup Award 2026 begrüßen zu dürfen — vielen herzlichen Dank, dass Sie uns begleiten und unsere Rotary-Jury anleiten.

📍 VOR ORT (Präsenz)
Cyrus Herez Wealth Management — 50 boulevard Haussmann, 75009 Paris, 10. Etage.
Empfang im Erdgeschoss ab 15:30 Uhr; Anmeldung + Ausweis.

🕒 ABLAUF — bitte pünktlich sein!
  • 15:30 — Empfang & Anmeldung
  • 16:00 — Eröffnung: Ich werde Sie vorstellen und Ihnen das Mikrofon für ein paar einleitende Worte übergeben
  • 16:15 — Pitches (15 Min Pitch + ~10 Min Q&A pro Finalist)
  • 18:15 — Ende der Pitches
  • anschließend Cocktail — Bekanntgabe des Siegers (durch das Ergebnis bestimmt)

🎤 IHRE ROLLE
  • Nach jedem Pitch haben Sie Vorrang beim Austausch mit den Finalisten — eröffnen Sie gerne die Q&A.
  • Kurze, präzise Fragen, um anschließend der Rotary-Jury Raum zu lassen.

📚 IHRE UNTERLAGEN
  • Pre-Read (Executive Summaries der Finalisten): {PACK_URL}
  • Wettbewerbsbereich — die vollständige Historie des Wettbewerbs (alle Sessions, Startups, Decks, Jurys, Rankings): {JURYHUB_URL}

Pitch Decks der Finalisten:
{STARTUPS_BLOCK}

📊 SCORING — so funktioniert es
  • Scoring-Seite: {SCORING_URL} (ein QR-Code wird auch vor Ort angezeigt)
  • 6 Dimensionen, bewertet von 0 bis 5.
  • Bewertung LIVE während der Pitches; alles wird automatisch gespeichert.
  • Der Sieger wird durch das Ergebnis bestimmt, ohne nachträgliche Beratung: ein einfacher und objektiver Prozess.

Wir freuen uns sehr, Sie am Dienstag begrüßen zu dürfen.
Die Kommission Rotary Startup Award 2026
Rotary Club de Paris`;

const DEFAULTS = {
  finalist: { fr: FINALIST_FR, de: FINALIST_DE },
  jury: { fr: JURY_FR, de: JURY_DE },
  ext: { fr: EXT_FR, de: EXT_DE },
};

function renderTemplate(tpl, vars) {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(v ?? "");
  return out;
}
function splitSubjectBody(text) {
  const lines = text.split("\n");
  const m = (lines[0] || "").trim().match(/^(?:sujet|betreff)\s*:\s*(.*)$/i);
  if (m) return { subject: m[1].trim(), body: lines.slice(1).join("\n").replace(/^\n+/, "") };
  return { subject: "", body: text };
}

export default function FinaleEmailsSection({ rows, jurors, juryPackUrl }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const vars = useMemo(() => ({
    SCORING_URL: `${origin}/RsaScore?s=final_grande`,
    JURYHUB_URL: `${origin}/RsaJuryHub`,
    PACK_URL: juryPackUrl || "(générer le pack pre-reads dans la section ci-dessous)",
    TEAMS_URL: FINALE_TEAMS_URL,
  }), [origin, juryPackUrl]);

  const finalistEmails = useMemo(
    () => [...new Set((rows || []).map((r) => r.startup_contact_email).filter(Boolean))],
    [rows]
  );
  const juryEmails = useMemo(
    () => [...new Set((jurors || []).map((j) => j.email).filter(Boolean))],
    [jurors]
  );

  return (
    <section>
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-stone-800">Grande Finale — emails finaux (FR / DE)</h2>
        <div className="text-xs text-stone-500">
          Liens injectés : <code className="text-[10px] bg-stone-100 px-1 rounded">{"{SCORING_URL}"} {"{JURYHUB_URL}"} {"{PACK_URL}"} {"{TEAMS_URL}"}</code>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <FinaleEmailCard
          id="finalist" color="amber" Icon={Mic2}
          title="Finalistes"
          subtitle={`${finalistEmails.length} contact${finalistEmails.length > 1 ? "s" : ""} · pitch 15 min / 25 min total`}
          defaults={DEFAULTS.finalist} vars={vars} rows={rows} recipients={finalistEmails}
        />
        <FinaleEmailCard
          id="jury" color="blue" Icon={UsersIcon}
          title="Jury Rotary"
          subtitle={`${juryEmails.length} juré${juryEmails.length > 1 ? "s" : ""} finale · scoring en direct`}
          defaults={DEFAULTS.jury} vars={vars} rows={rows} recipients={juryEmails}
          note="Retire les 2 jurées externes du BCC — elles ont leur email dédié ci-contre."
        />
        <FinaleEmailCard
          id="ext" color="emerald" Icon={Crown}
          title="Jurés externes (Lead Jury)"
          subtitle="à envoyer aux 2 jurées externes"
          defaults={DEFAULTS.ext} vars={vars} rows={rows} recipients={[]}
          recipientsHint="Saisis toi-même les destinataires (les 2 jurées externes)."
        />
      </div>
    </section>
  );
}

const TONES = {
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", btn: "bg-amber-600 hover:bg-amber-700" },
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", btn: "bg-blue-600 hover:bg-blue-700" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", btn: "bg-emerald-600 hover:bg-emerald-700" },
};

function FinaleEmailCard({ id, color, Icon, title, subtitle, defaults, vars, rows, recipients, note, recipientsHint }) {
  const tone = TONES[color] || TONES.blue;
  const [lang, setLang] = useState("fr");
  const [tplFr, setTplFr] = useState(() => localStorage.getItem(`rsa_fin_email_${id}_fr`) || defaults.fr);
  const [tplDe, setTplDe] = useState(() => localStorage.getItem(`rsa_fin_email_${id}_de`) || defaults.de);
  const [showEdit, setShowEdit] = useState(false);
  useEffect(() => { localStorage.setItem(`rsa_fin_email_${id}_fr`, tplFr); }, [id, tplFr]);
  useEffect(() => { localStorage.setItem(`rsa_fin_email_${id}_de`, tplDe); }, [id, tplDe]);

  const tpl = lang === "fr" ? tplFr : tplDe;
  const setTpl = lang === "fr" ? setTplFr : setTplDe;
  const fullVars = { ...vars, STARTUPS_BLOCK: buildStartupsBlock(rows, lang) };
  const { subject, body } = splitSubjectBody(renderTemplate(tpl, fullVars));

  function copy(text, label) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copié`),
      () => toast.error("Copie impossible")
    );
  }
  function copyEmails() {
    const dedup = [...new Set(recipients)];
    if (dedup.length === 0) { toast.error("Aucun destinataire"); return; }
    copy(dedup.join(", "), `${dedup.length} email${dedup.length > 1 ? "s" : ""}`);
  }
  function openMailto() {
    const dedup = [...new Set(recipients)];
    const useBcc = dedup.length > 1;
    const parts = [`subject=${encodeURIComponent(subject)}`, `body=${encodeURIComponent(body)}`];
    if (useBcc) parts.push(`bcc=${encodeURIComponent(dedup.join(","))}`);
    const to = useBcc ? "" : dedup[0] || "";
    window.location.href = `mailto:${encodeURIComponent(to)}?${parts.join("&")}`;
  }

  return (
    <div className={`rounded-lg border ${tone.border} ${tone.bg} p-3 flex flex-col gap-2`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 ${tone.text} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${tone.text}`}>{title}</div>
          <div className="text-[11px] text-stone-600 mt-0.5">{subtitle}</div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {["fr", "de"].map((l) => (
            <button key={l} onClick={() => setLang(l)}
              className={`text-[10px] px-1.5 py-0.5 rounded border ${lang === l ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-300"}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {note && <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">⚠ {note}</div>}
      {recipientsHint && <div className="text-[11px] text-stone-500 italic">{recipientsHint}</div>}

      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => copy(subject, "Sujet")} className="text-[11px] px-2 py-1 rounded bg-white hover:bg-stone-50 text-stone-700">
          <Copy className="w-3 h-3 inline mr-1" /> Sujet
        </button>
        <button onClick={() => copy(body, "Corps")} className="text-[11px] px-2 py-1 rounded bg-white hover:bg-stone-50 text-stone-700">
          <Copy className="w-3 h-3 inline mr-1" /> Corps
        </button>
        {!recipientsHint && (
          <button onClick={copyEmails} disabled={recipients.length === 0}
            className="text-[11px] px-2 py-1 rounded bg-white hover:bg-stone-50 text-stone-700 disabled:opacity-50">
            <Copy className="w-3 h-3 inline mr-1" /> Emails ({recipients.length})
          </button>
        )}
        <button onClick={() => setShowEdit((s) => !s)} className="text-[11px] px-2 py-1 rounded bg-white hover:bg-stone-50 text-stone-700">
          {showEdit ? "Aperçu" : "Éditer"}
        </button>
        <button onClick={() => { lang === "fr" ? setTplFr(defaults.fr) : setTplDe(defaults.de); toast.success("Template réinitialisé"); }}
          className="text-[11px] px-2 py-1 rounded bg-white hover:bg-stone-50 text-stone-500" title="Réinitialiser ce template">
          <RotateCcw className="w-3 h-3 inline" />
        </button>
      </div>

      <button onClick={openMailto} disabled={recipients.length === 0 && !recipientsHint}
        className={`text-[12px] px-2 py-1.5 rounded text-white font-medium inline-flex items-center justify-center gap-1.5 ${tone.btn} disabled:opacity-50`}>
        <Send className="w-3 h-3" /> Ouvrir dans le mail <ExternalLink className="w-3 h-3 opacity-70" />
      </button>

      {showEdit ? (
        <textarea value={tpl} onChange={(e) => setTpl(e.target.value)} rows={16}
          className="w-full font-mono text-[11px] p-2 rounded border border-stone-200 focus:border-stone-400 focus:outline-none" />
      ) : (
        <div className="bg-white border border-stone-200 rounded p-2 space-y-1.5">
          <div className="text-xs text-stone-800 font-medium">{subject}</div>
          <pre className="text-[11px] text-stone-700 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">{body}</pre>
        </div>
      )}
    </div>
  );
}
