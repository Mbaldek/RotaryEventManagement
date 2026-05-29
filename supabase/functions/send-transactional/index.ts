// send-transactional — Edge function (Deno) — Module 4c, Plateforme RSA.
//
// Responsibility
// ─────────────────────────────────────────────────────────────────────────────
// Send Élysée-branded transactional emails via the Resend HTTP API. Not used
// for Supabase Auth magic links (those go through Resend SMTP — cf.
// docs/deepsolve/email-smtp-resend-setup.md). The Auth path is SMTP because
// Supabase only supports SMTP for that flow ; everything else (post-comité
// decision, jury assignment, results announcement…) is routed here so we get
// HTTP API niceties (per-message id, structured errors, future template
// loops) without standing up an SMTP client in Deno.
//
// Auth model
// ─────────────────────────────────────────────────────────────────────────────
// Caller MUST present a Supabase JWT (Authorization: Bearer <jwt>). The
// function:
//   1. Reads the JWT, derives the caller's email via supabase.auth.getUser().
//   2. Looks up roles via the SECURITY DEFINER RPC `rsa_my_roles` (same path
//      used by the React PlatformAuth provider — single source of truth, no
//      RLS surprise on app_user_roles).
//   3. Maps email `type` -> required role set. Refuses with 403 if the caller
//      lacks the required role.
//
//   selection_decision   -> admin OR comite (comité is the canonical sender)
//   jury_assignment      -> admin only
//   session_published    -> admin only
//   results_published    -> admin only
//
// Body shape
// ─────────────────────────────────────────────────────────────────────────────
//   {
//     type: 'selection_decision' | 'jury_assignment' | 'session_published' | 'results_published',
//     recipient_email: string,
//     recipient_name?: string,
//     lang: 'fr' | 'en' | 'de',
//     data: Record<string, any>
//   }
//
// The handler renders an Élysée-branded HTML body (bulletproof <table>
// pattern, same shell as docs/design/email-templates/magic-link.md) for the
// requested lang, POSTs to Resend, and returns the Resend id on success or a
// structured error.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Types ───────────────────────────────────────────────────────────────────
type Lang = "fr" | "en" | "de";
type EmailType =
  | "selection_decision"
  | "jury_assignment"
  | "session_published"
  | "results_published";

interface Payload {
  type: EmailType;
  recipient_email: string;
  recipient_name?: string;
  lang: Lang;
  data: Record<string, unknown>;
}

// type -> required roles (caller must have at least one)
const ROLE_REQUIREMENTS: Record<EmailType, string[]> = {
  selection_decision: ["admin", "comite"],
  jury_assignment: ["admin"],
  session_published: ["admin"],
  results_published: ["admin"],
};

// ─── Brand tokens (mirror src/components/design/tokens.js) ───────────────────
const COLORS = {
  NAVY: "#0f1f3d",
  GOLD: "#c9a84c",
  CREAM: "#faf7f2",
  CREAM2: "#e8e3d9",
  INK: "#3a3a52",
  MUTED: "#9090a8",
} as const;

const FROM = "Rotary Startup Award <contact@rotary-startup.org>";
const APP_URL = "https://app.rotary-startup.org";
const CONTACT_EMAIL = "contact@rotary-startup.org";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Light HTML escape — recipient_name and free-text data fields can contain
// `<`, `>`, `&`, `"`. Strict enough for body interpolation ; we never inject
// into attribute values that aren't already quoted (CTA href uses APP_URL paths).
function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isLang(v: unknown): v is Lang {
  return v === "fr" || v === "en" || v === "de";
}

function isEmailType(v: unknown): v is EmailType {
  return (
    v === "selection_decision" ||
    v === "jury_assignment" ||
    v === "session_published" ||
    v === "results_published"
  );
}

// ─── i18n copy ───────────────────────────────────────────────────────────────
// Centralised dictionary — subjects + body parts. Each (type, lang) yields
// the editorial copy used by `renderEmail`. Voice: institutional, courteous,
// "Vous"/"Sie", no exclamation marks (except results_published, very subdued).

interface Copy {
  subject: string;
  eyebrow: string;
  greeting: (recipientName?: string) => string;
  // paragraphs : ordered list of paragraphs (HTML-safe strings already)
  paragraphs: (data: Record<string, unknown>) => string[];
  ctaLabel?: string;
  ctaHref?: string;
  signOff: string;
  signature: string; // displayed line just under the sign-off
}

const FOOTER_BY_LANG: Record<Lang, { noReply: string; contact: string }> = {
  fr: {
    noReply: "Ne pas répondre à cet email.",
    contact: "Contact :",
  },
  en: {
    noReply: "Please do not reply to this email.",
    contact: "Contact:",
  },
  de: {
    noReply: "Bitte antworten Sie nicht auf diese E-Mail.",
    contact: "Kontakt:",
  },
};

const SIGNATURE_BY_LANG: Record<Lang, string> = {
  fr: "Rotary Club de Paris — Rotary Startup Award",
  en: "Rotary Club de Paris — Rotary Startup Award",
  de: "Rotary Club de Paris — Rotary Startup Award",
};

function greet(lang: Lang, name?: string): string {
  const trimmed = (name || "").trim();
  if (lang === "fr") return trimmed ? `Bonjour ${esc(trimmed)},` : "Bonjour,";
  if (lang === "en") return trimmed ? `Dear ${esc(trimmed)},` : "Dear Madam, Dear Sir,";
  // de
  return trimmed ? `Sehr geehrte/r ${esc(trimmed)},` : "Sehr geehrte Damen und Herren,";
}

function signOff(lang: Lang): string {
  if (lang === "fr") return "Avec nos cordiales salutations,";
  if (lang === "en") return "With our kindest regards,";
  return "Mit freundlichen Grüßen,";
}

// ── selection_decision ──
// data: { startup_name, session_name, decision: 'eligible'|'rejected', message?: string }
function copySelectionDecision(lang: Lang, data: Record<string, unknown>): Omit<Copy, "greeting" | "signOff" | "signature"> {
  const startup = esc(data.startup_name);
  const session = esc(data.session_name);
  const decision = String(data.decision || "").toLowerCase();
  const message = typeof data.message === "string" ? esc(data.message) : "";
  const isEligible = decision === "eligible";

  if (lang === "fr") {
    const subject = "Votre candidature au Rotary Startup Award — décision";
    const paragraphs: string[] = [];
    paragraphs.push(
      `Le comité de sélection du Rotary Startup Award s'est prononcé sur la candidature de <strong>${startup}</strong>.`,
    );
    if (isEligible) {
      paragraphs.push(
        `Nous avons le plaisir de vous confirmer que votre dossier a été retenu pour la session <em>${session}</em>. Vous recevrez prochainement les modalités pratiques (date, format de pitch, durée des échanges avec le jury).`,
      );
    } else {
      paragraphs.push(
        `Après examen attentif, le comité n'a pas retenu votre dossier pour l'édition en cours. Nous vous remercions sincèrement pour l'intérêt que vous portez au Rotary Startup Award et pour le temps consacré à la préparation de votre candidature.`,
      );
    }
    if (message) {
      paragraphs.push(`<em>Note du comité :</em><br/>${message}`);
    }
    paragraphs.push(
      `Vous pouvez consulter le détail de votre dossier dans votre espace personnel.`,
    );
    return {
      subject,
      eyebrow: "Décision du comité",
      paragraphs: () => paragraphs,
      ctaLabel: "Accéder à mon dossier",
      ctaHref: `${APP_URL}/MonDossier`,
    };
  }
  if (lang === "en") {
    const subject = "Your Rotary Startup Award application — decision";
    const paragraphs: string[] = [];
    paragraphs.push(
      `The Rotary Startup Award selection committee has reviewed the application of <strong>${startup}</strong>.`,
    );
    if (isEligible) {
      paragraphs.push(
        `We are pleased to confirm that your application has been selected for the <em>${session}</em> session. You will shortly receive the practical details (date, pitch format, length of the Q&amp;A with the jury).`,
      );
    } else {
      paragraphs.push(
        `After careful consideration, the committee has not retained your application for the current edition. We sincerely thank you for your interest in the Rotary Startup Award and for the time you devoted to preparing your file.`,
      );
    }
    if (message) {
      paragraphs.push(`<em>Note from the committee:</em><br/>${message}`);
    }
    paragraphs.push(`You may consult the details of your application in your personal space.`);
    return {
      subject,
      eyebrow: "Committee decision",
      paragraphs: () => paragraphs,
      ctaLabel: "Open my application",
      ctaHref: `${APP_URL}/MonDossier`,
    };
  }
  // de
  // TODO refine DE copy
  const subject = "Ihre Bewerbung beim Rotary Startup Award — Entscheidung";
  const paragraphs: string[] = [];
  paragraphs.push(
    `Der Auswahlausschuss des Rotary Startup Award hat über die Bewerbung von <strong>${startup}</strong> entschieden.`,
  );
  if (isEligible) {
    paragraphs.push(
      `Wir freuen uns, Ihnen mitteilen zu können, dass Ihre Bewerbung für die Session <em>${session}</em> ausgewählt wurde. Die praktischen Details (Datum, Pitch-Format, Dauer des Austauschs mit der Jury) erhalten Sie in Kürze.`,
    );
  } else {
    paragraphs.push(
      `Nach sorgfältiger Prüfung hat der Ausschuss Ihre Bewerbung für die laufende Ausgabe nicht berücksichtigt. Wir danken Ihnen herzlich für Ihr Interesse am Rotary Startup Award und für die aufgewendete Zeit.`,
    );
  }
  if (message) {
    paragraphs.push(`<em>Anmerkung des Ausschusses:</em><br/>${message}`);
  }
  paragraphs.push(`Sie können die Details Ihrer Bewerbung in Ihrem persönlichen Bereich einsehen.`);
  return {
    subject,
    eyebrow: "Entscheidung des Ausschusses",
    paragraphs: () => paragraphs,
    ctaLabel: "Mein Dossier öffnen",
    ctaHref: `${APP_URL}/MonDossier`,
  };
}

// ── jury_assignment ──
// data: { jury_name, session_name, session_date, startups: [{name, sector}], jury_pack_url?: string }
function copyJuryAssignment(lang: Lang, data: Record<string, unknown>): Omit<Copy, "greeting" | "signOff" | "signature"> {
  const session = esc(data.session_name);
  const sessionDate = esc(data.session_date);
  const startups = Array.isArray(data.startups) ? (data.startups as Array<Record<string, unknown>>) : [];
  const packUrl = typeof data.jury_pack_url === "string" ? data.jury_pack_url : "";

  const renderStartupList = (label: string) => {
    if (!startups.length) return "";
    const items = startups
      .map((s) => {
        const name = esc(s.name);
        const sector = s.sector ? ` — <span style="color:${COLORS.MUTED};">${esc(s.sector)}</span>` : "";
        return `<li style="margin:0 0 6px 0; padding:0;">${name}${sector}</li>`;
      })
      .join("");
    return `<p style="margin:0 0 8px 0;">${label}</p><ul style="margin:0 0 16px 0; padding-left:18px; list-style:disc;">${items}</ul>`;
  };

  if (lang === "fr") {
    const subject = "Votre affectation jury — Rotary Startup Award";
    const paragraphs: string[] = [];
    paragraphs.push(
      `Au nom de la Commission Rotary Startup Award, nous vous remercions d'avoir accepté de siéger au sein du jury de cette édition.`,
    );
    paragraphs.push(
      `Vous êtes affecté(e) à la session <strong>${session}</strong>, prévue le <strong>${sessionDate}</strong>.`,
    );
    paragraphs.push(renderStartupList("Les startups que vous évaluerez :"));
    if (packUrl) {
      paragraphs.push(
        `Le pack jury (executive summaries, ordre de passage) est disponible en téléchargement : <a href="${esc(packUrl)}" style="color:${COLORS.NAVY}; text-decoration:underline;">${esc(packUrl)}</a>.`,
      );
    }
    paragraphs.push(
      `Vous retrouverez l'ensemble des informations utiles, ainsi que la grille de notation, dans votre espace juré.`,
    );
    return {
      subject,
      eyebrow: "Affectation jury",
      paragraphs: () => paragraphs.filter(Boolean),
      ctaLabel: "Accéder à mon espace juré",
      ctaHref: `${APP_URL}/Jury`,
    };
  }
  if (lang === "en") {
    const subject = "Your jury assignment — Rotary Startup Award";
    const paragraphs: string[] = [];
    paragraphs.push(
      `On behalf of the Rotary Startup Award Commission, thank you for having accepted to serve on the jury for this edition.`,
    );
    paragraphs.push(
      `You have been assigned to the <strong>${session}</strong> session, scheduled on <strong>${sessionDate}</strong>.`,
    );
    paragraphs.push(renderStartupList("The startups you will assess:"));
    if (packUrl) {
      paragraphs.push(
        `The jury pack (executive summaries, pitch order) is available for download: <a href="${esc(packUrl)}" style="color:${COLORS.NAVY}; text-decoration:underline;">${esc(packUrl)}</a>.`,
      );
    }
    paragraphs.push(
      `All useful information, including the scoring rubric, is available in your jury space.`,
    );
    return {
      subject,
      eyebrow: "Jury assignment",
      paragraphs: () => paragraphs.filter(Boolean),
      ctaLabel: "Open my jury space",
      ctaHref: `${APP_URL}/Jury`,
    };
  }
  // de
  // TODO refine DE copy
  const subject = "Ihre Jury-Zuordnung — Rotary Startup Award";
  const paragraphs: string[] = [];
  paragraphs.push(
    `Im Namen der Rotary Startup Award Kommission danken wir Ihnen, dass Sie bereit sind, in der Jury dieser Ausgabe mitzuwirken.`,
  );
  paragraphs.push(
    `Sie wurden der Session <strong>${session}</strong> am <strong>${sessionDate}</strong> zugeteilt.`,
  );
  paragraphs.push(renderStartupList("Die zu bewertenden Startups:"));
  if (packUrl) {
    paragraphs.push(
      `Das Jury-Paket (Executive Summaries, Pitch-Reihenfolge) steht zum Download bereit: <a href="${esc(packUrl)}" style="color:${COLORS.NAVY}; text-decoration:underline;">${esc(packUrl)}</a>.`,
    );
  }
  paragraphs.push(
    `Alle weiteren Informationen sowie das Bewertungsraster finden Sie in Ihrem Jury-Bereich.`,
  );
  return {
    subject,
    eyebrow: "Jury-Zuordnung",
    paragraphs: () => paragraphs.filter(Boolean),
    ctaLabel: "Mein Jury-Bereich öffnen",
    ctaHref: `${APP_URL}/Jury`,
  };
}

// ── session_published ──
// data: { startup_name, session_name, rank: number, finalist: boolean, total_startups: number }
function copySessionPublished(lang: Lang, data: Record<string, unknown>): Omit<Copy, "greeting" | "signOff" | "signature"> {
  const startup = esc(data.startup_name);
  const session = esc(data.session_name);
  const rank = Number(data.rank) || 0;
  const total = Number(data.total_startups) || 0;
  const finalist = Boolean(data.finalist);

  if (lang === "fr") {
    const subject = "Résultats de votre session — Rotary Startup Award";
    const paragraphs: string[] = [];
    paragraphs.push(
      `Le jury de la session <strong>${session}</strong> a rendu ses délibérations.`,
    );
    paragraphs.push(
      `À l'issue des présentations, <strong>${startup}</strong> se classe <strong>${rank}<sup>${rank === 1 ? "er" : "e"}</sup></strong> sur <strong>${total}</strong> startups.`,
    );
    if (finalist) {
      paragraphs.push(
        `Nous avons le plaisir de vous annoncer que vous êtes <strong>finaliste</strong> de la Grande Finale. Nous reviendrons rapidement vers vous avec les modalités de cette dernière étape.`,
      );
    } else {
      paragraphs.push(
        `Nous tenons à saluer la qualité de votre pitch et de vos échanges avec le jury. Le Rotary Startup Award restera attentif à votre parcours et vous encourage à poursuivre votre développement.`,
      );
    }
    paragraphs.push(
      `Le détail des évaluations et le classement de votre session sont consultables depuis votre espace.`,
    );
    return {
      subject,
      eyebrow: "Résultats de session",
      paragraphs: () => paragraphs,
      ctaLabel: "Voir mon dossier",
      ctaHref: `${APP_URL}/MonDossier`,
    };
  }
  if (lang === "en") {
    const subject = "Your session results — Rotary Startup Award";
    const paragraphs: string[] = [];
    paragraphs.push(`The jury of the <strong>${session}</strong> session has delivered its deliberations.`);
    paragraphs.push(
      `Following the pitches, <strong>${startup}</strong> is ranked <strong>${rank}</strong> out of <strong>${total}</strong> startups.`,
    );
    if (finalist) {
      paragraphs.push(
        `We are delighted to inform you that you are a <strong>finalist</strong> of the Grand Final. We will come back to you shortly with the practical details for this final stage.`,
      );
    } else {
      paragraphs.push(
        `We would like to commend the quality of your pitch and of your exchanges with the jury. The Rotary Startup Award will continue to follow your journey and encourages you to keep developing your venture.`,
      );
    }
    paragraphs.push(`The detailed evaluations and the session ranking are available in your space.`);
    return {
      subject,
      eyebrow: "Session results",
      paragraphs: () => paragraphs,
      ctaLabel: "View my application",
      ctaHref: `${APP_URL}/MonDossier`,
    };
  }
  // de
  // TODO refine DE copy
  const subject = "Ergebnisse Ihrer Session — Rotary Startup Award";
  const paragraphs: string[] = [];
  paragraphs.push(`Die Jury der Session <strong>${session}</strong> hat ihre Beratungen abgeschlossen.`);
  paragraphs.push(
    `Im Anschluss an die Pitches belegt <strong>${startup}</strong> Platz <strong>${rank}</strong> von <strong>${total}</strong>.`,
  );
  if (finalist) {
    paragraphs.push(
      `Wir freuen uns, Ihnen mitzuteilen, dass Sie <strong>Finalist/in</strong> des Großen Finales sind. Die Modalitäten dieser letzten Etappe übermitteln wir Ihnen in Kürze.`,
    );
  } else {
    paragraphs.push(
      `Wir möchten die Qualität Ihres Pitchs und Ihres Austauschs mit der Jury würdigen. Der Rotary Startup Award verfolgt Ihren Weg weiterhin mit Interesse.`,
    );
  }
  paragraphs.push(
    `Die detaillierten Bewertungen und die Rangliste der Session können Sie in Ihrem Bereich einsehen.`,
  );
  return {
    subject,
    eyebrow: "Session-Ergebnisse",
    paragraphs: () => paragraphs,
    ctaLabel: "Mein Dossier ansehen",
    ctaHref: `${APP_URL}/MonDossier`,
  };
}

// ── results_published ──
// data: { startup_name, prize: 'main'|'special'|'finalist', prize_amount?: number }
function copyResultsPublished(lang: Lang, data: Record<string, unknown>): Omit<Copy, "greeting" | "signOff" | "signature"> {
  const startup = esc(data.startup_name);
  const prize = String(data.prize || "").toLowerCase();
  const amount = data.prize_amount != null && data.prize_amount !== "" ? Number(data.prize_amount) : null;
  const amountStr = amount != null && !Number.isNaN(amount)
    ? new Intl.NumberFormat("fr-FR").format(amount) + " €"
    : "";

  const prizeLabelFr = prize === "main"
    ? "Lauréat du Rotary Startup Award"
    : prize === "special"
    ? "Prix spécial du jury"
    : "Finaliste";
  const prizeLabelEn = prize === "main"
    ? "Laureate of the Rotary Startup Award"
    : prize === "special"
    ? "Special Jury Prize"
    : "Finalist";
  const prizeLabelDe = prize === "main"
    ? "Preisträger/in des Rotary Startup Award"
    : prize === "special"
    ? "Sonderpreis der Jury"
    : "Finalist/in";

  if (lang === "fr") {
    const subject = "Félicitations — Rotary Startup Award";
    const paragraphs: string[] = [];
    paragraphs.push(
      `C'est avec une grande fierté que nous vous annonçons officiellement la distinction décernée à <strong>${startup}</strong> :`,
    );
    paragraphs.push(
      `<strong style="color:${COLORS.NAVY}; font-family:Georgia, 'Times New Roman', serif; font-size:18px;">${prizeLabelFr}${amountStr ? ` — ${amountStr}` : ""}</strong>`,
    );
    paragraphs.push(
      `La Commission Rotary Startup Award et l'ensemble des Rotariens du Club de Paris saluent la qualité de votre projet et la rigueur de votre démarche.`,
    );
    paragraphs.push(
      `Les modalités de remise du prix et la communication officielle (palmarès public, relations presse, mise en relation avec nos partenaires) vous seront détaillées dans les prochains jours.`,
    );
    return {
      subject,
      eyebrow: "Palmarès officiel",
      paragraphs: () => paragraphs,
      ctaLabel: "Voir le palmarès",
      ctaHref: `${APP_URL}/Resultats`,
    };
  }
  if (lang === "en") {
    const subject = "Congratulations — Rotary Startup Award";
    const paragraphs: string[] = [];
    paragraphs.push(
      `It is with great pride that we officially announce the distinction awarded to <strong>${startup}</strong>:`,
    );
    paragraphs.push(
      `<strong style="color:${COLORS.NAVY}; font-family:Georgia, 'Times New Roman', serif; font-size:18px;">${prizeLabelEn}${amountStr ? ` — ${amountStr}` : ""}</strong>`,
    );
    paragraphs.push(
      `The Rotary Startup Award Commission and all the Rotarians of the Paris Club commend the quality of your project and the rigour of your approach.`,
    );
    paragraphs.push(
      `The practical details of the prize ceremony and the official communication (public palmares, press relations, introductions to our partners) will reach you over the coming days.`,
    );
    return {
      subject,
      eyebrow: "Official palmares",
      paragraphs: () => paragraphs,
      ctaLabel: "View the palmares",
      ctaHref: `${APP_URL}/Resultats`,
    };
  }
  // de
  // TODO refine DE copy
  const subject = "Herzlichen Glückwunsch — Rotary Startup Award";
  const paragraphs: string[] = [];
  paragraphs.push(
    `Mit großer Freude geben wir die Auszeichnung an <strong>${startup}</strong> offiziell bekannt:`,
  );
  paragraphs.push(
    `<strong style="color:${COLORS.NAVY}; font-family:Georgia, 'Times New Roman', serif; font-size:18px;">${prizeLabelDe}${amountStr ? ` — ${amountStr}` : ""}</strong>`,
  );
  paragraphs.push(
    `Die Rotary Startup Award Kommission und alle Rotarier des Rotary Club de Paris würdigen die Qualität Ihres Projekts und die Sorgfalt Ihrer Herangehensweise.`,
  );
  paragraphs.push(
    `Die Modalitäten der Preisverleihung und die offizielle Kommunikation (öffentliche Ergebnisliste, Pressearbeit, Vermittlung an unsere Partner) übermitteln wir Ihnen in den kommenden Tagen.`,
  );
  return {
    subject,
    eyebrow: "Offizielle Ergebnisliste",
    paragraphs: () => paragraphs,
    ctaLabel: "Ergebnisliste ansehen",
    ctaHref: `${APP_URL}/Resultats`,
  };
}

function resolveCopy(type: EmailType, lang: Lang, data: Record<string, unknown>): Copy {
  let base: Omit<Copy, "greeting" | "signOff" | "signature">;
  switch (type) {
    case "selection_decision":
      base = copySelectionDecision(lang, data);
      break;
    case "jury_assignment":
      base = copyJuryAssignment(lang, data);
      break;
    case "session_published":
      base = copySessionPublished(lang, data);
      break;
    case "results_published":
      base = copyResultsPublished(lang, data);
      break;
  }
  return {
    ...base,
    greeting: (recipientName?: string) => greet(lang, recipientName),
    signOff: signOff(lang),
    signature: SIGNATURE_BY_LANG[lang],
  };
}

// ─── HTML shell (bulletproof <table>, mirrors magic-link.md) ─────────────────

function renderEmail({
  lang,
  copy,
  recipientName,
  data,
}: {
  lang: Lang;
  copy: Copy;
  recipientName?: string;
  data: Record<string, unknown>;
}): string {
  const footer = FOOTER_BY_LANG[lang];
  const paragraphs = copy.paragraphs(data);
  const ctaBlock = copy.ctaLabel && copy.ctaHref
    ? `
              <!-- CTA: bulletproof button -->
              <table role="presentation" class="rsa-cta" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 8px auto;">
                <tr>
                  <td align="center" bgcolor="${COLORS.NAVY}" style="background-color:${COLORS.NAVY}; border:1px solid ${COLORS.NAVY}; border-radius:4px;">
                    <a href="${esc(copy.ctaHref)}"
                       target="_blank"
                       style="display:inline-block; padding:14px 28px; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:14px; font-weight:500; line-height:1.2; color:#ffffff; text-decoration:none; border-radius:4px;">
                      ${esc(copy.ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>
            `
    : "";

  const paragraphsHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px 0; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.65; color:${COLORS.INK};">${p}</p>`,
    )
    .join("");

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light only" />
    <title>${esc(copy.subject)}</title>
    <style type="text/css">
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600&display=swap');
      a { text-decoration: none; }
      @media only screen and (max-width: 480px) {
        .rsa-container { width: 100% !important; }
        .rsa-px { padding-left: 24px !important; padding-right: 24px !important; }
        .rsa-cta a { display: block !important; width: auto !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:${COLORS.CREAM}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
    <!-- Preheader (hidden) -->
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${COLORS.CREAM};">
      ${esc(copy.subject)} &mdash; Rotary Startup Award
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.CREAM};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" class="rsa-container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:560px; background-color:#ffffff; border:1px solid ${COLORS.CREAM2};">

            <!-- Header: NAVY strip with serif wordmark + gold rule -->
            <tr>
              <td align="center" bgcolor="${COLORS.NAVY}" style="background-color:${COLORS.NAVY}; padding:36px 24px 28px 24px;">
                <div style="font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-weight:500; font-size:22px; line-height:1.2; color:#ffffff; letter-spacing:0.01em;">
                  Rotary Startup Award
                </div>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:14px auto 0 auto;">
                  <tr>
                    <td height="2" bgcolor="${COLORS.GOLD}" style="background-color:${COLORS.GOLD}; line-height:2px; font-size:0; width:40px;">&nbsp;</td>
                  </tr>
                </table>
                <div style="margin-top:10px; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:10px; line-height:1.4; color:${COLORS.GOLD}; letter-spacing:0.18em; text-transform:uppercase;">
                  ${esc(copy.eyebrow)}
                </div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td class="rsa-px" bgcolor="#ffffff" style="background-color:#ffffff; padding:40px 48px 24px 48px;">
                <p style="margin:0 0 18px 0; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.65; color:${COLORS.INK};">
                  ${copy.greeting(recipientName)}
                </p>
                ${paragraphsHtml}
                ${ctaBlock}
                <p style="margin:24px 0 4px 0; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.65; color:${COLORS.INK};">
                  ${esc(copy.signOff)}
                </p>
                <p style="margin:0; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-style:italic; font-size:15px; line-height:1.5; color:${COLORS.NAVY};">
                  ${esc(copy.signature)}
                </p>
              </td>
            </tr>

            <!-- Footer hairline -->
            <tr>
              <td class="rsa-px" bgcolor="#ffffff" style="background-color:#ffffff; padding:0 48px 32px 48px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="border-top:1px solid ${COLORS.CREAM2}; padding-top:20px; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:11px; line-height:1.6; color:${COLORS.MUTED}; text-align:center;">
                      Rotary Club de Paris &middot; Rotary Startup Award<br />
                      ${esc(footer.noReply)} ${esc(footer.contact)}
                      <a href="mailto:${CONTACT_EMAIL}" style="color:${COLORS.NAVY}; text-decoration:underline;">${CONTACT_EMAIL}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ─── Resend call ─────────────────────────────────────────────────────────────

async function sendViaResend({
  apiKey,
  to,
  subject,
  html,
}: {
  apiKey: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true; id: string } | { ok: false; status: number; error: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      html,
    }),
  });

  const text = await res.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const message = parsed && typeof parsed.message === "string"
      ? parsed.message
      : text || `Resend returned status ${res.status}`;
    return { ok: false, status: res.status, error: message };
  }
  const id = parsed && typeof parsed.id === "string" ? parsed.id : "";
  return { ok: true, id };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return jsonResponse(405, { ok: false, error: "method_not_allowed" });

  // ── env ──
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!supabaseUrl || !anonKey) {
    return jsonResponse(500, { ok: false, error: "missing_supabase_env" });
  }
  if (!resendKey) {
    return jsonResponse(500, { ok: false, error: "missing_resend_api_key" });
  }

  // ── auth header ──
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return jsonResponse(401, { ok: false, error: "missing_bearer_token" });
  }

  // Use a per-request client that carries the caller's JWT — this propagates
  // auth.uid() / auth.jwt() into the rsa_my_roles RPC, which is what the rest
  // of the platform already relies on.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // ── parse payload ──
  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return jsonResponse(400, { ok: false, error: "invalid_json" });
  }

  if (!payload || typeof payload !== "object") {
    return jsonResponse(400, { ok: false, error: "invalid_payload" });
  }
  if (!isEmailType(payload.type)) {
    return jsonResponse(400, { ok: false, error: "invalid_type" });
  }
  if (!isLang(payload.lang)) {
    return jsonResponse(400, { ok: false, error: "invalid_lang" });
  }
  if (typeof payload.recipient_email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.recipient_email)) {
    return jsonResponse(400, { ok: false, error: "invalid_recipient_email" });
  }
  const data = (payload.data && typeof payload.data === "object") ? payload.data as Record<string, unknown> : {};

  // ── validate caller ──
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return jsonResponse(401, { ok: false, error: "invalid_jwt" });
  }

  // Resolve roles via the SECURITY DEFINER RPC (same path as PlatformAuth).
  const { data: rolesData, error: rolesErr } = await supabase.rpc("rsa_my_roles");
  if (rolesErr) {
    return jsonResponse(500, { ok: false, error: `roles_lookup_failed:${rolesErr.message}` });
  }
  const roles = Array.isArray(rolesData) ? rolesData.map((r) => String(r).toLowerCase()) : [];
  const required = ROLE_REQUIREMENTS[payload.type];
  const allowed = required.some((r) => roles.includes(r));
  if (!allowed) {
    return jsonResponse(403, {
      ok: false,
      error: "forbidden",
      detail: `requires one of: ${required.join(", ")}`,
    });
  }

  // ── render + send ──
  const copy = resolveCopy(payload.type, payload.lang, data);
  const html = renderEmail({
    lang: payload.lang,
    copy,
    recipientName: payload.recipient_name,
    data,
  });

  const result = await sendViaResend({
    apiKey: resendKey,
    to: payload.recipient_email,
    subject: copy.subject,
    html,
  });

  if (!result.ok) {
    return jsonResponse(result.status >= 400 && result.status < 600 ? result.status : 502, {
      ok: false,
      error: result.error,
    });
  }

  return jsonResponse(200, {
    ok: true,
    id: result.id,
    type: payload.type,
    lang: payload.lang,
    recipient: payload.recipient_email,
  });
});
