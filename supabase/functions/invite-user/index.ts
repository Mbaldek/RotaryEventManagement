// invite-user — Edge function (Deno) — V2.5 user-management, Plateforme RSA.
//
// Responsabilité
// ─────────────────────────────────────────────────────────────────────────────
// Pivot unique pour l'invitation d'un nouvel utilisateur (ou la promotion d'un
// existant) sur la plateforme RSA. Trois cas distincts gérés uniformément :
//
//   1. L'email n'existe pas dans auth.users
//        -> crée le user (service_role : supabaseAdmin.auth.admin.createUser)
//        -> applique le rôle (INSERT app_user_roles OU club_memberships)
//        -> génère un magic-link via supabaseAdmin.auth.admin.generateLink
//        -> POST l'email brandé Élysée vers Resend (sujet localisé + message
//           personnalisé optionnel)
//
//   2. L'email existe déjà dans auth.users
//        -> applique simplement le rôle (UPSERT)
//        -> envoie l'email de "bienvenue / votre rôle a été mis à jour" avec
//           un magic-link aussi (un seul clic pour se connecter, l'expérience
//           reste cohérente)
//
//   3. L'email existe et le rôle aussi
//        -> idempotent : on renvoie l'email quand même (le rôle est déjà OK,
//           mais l'admin est censé pouvoir relancer l'invitation manuellement
//           — rate-limit ci-dessous protège contre les abus).
//
// Auth model
// ─────────────────────────────────────────────────────────────────────────────
//   - JWT requis (Authorization: Bearer <jwt>)
//   - Le caller est résolu via rsa_my_roles + my_club_memberships +
//     my_competition_admin_editions (mêmes RPC SECURITY DEFINER que PlatformAuth
//     + send-bulk).
//   - Matrice (V3 — 5 tiers) :
//       role='master_admin' | 'admin'         -> caller doit être master_admin
//       role='competition_admin'              -> caller doit être master_admin
//                                                 (édition cible via edition_id)
//       role='club_admin'                     -> caller doit être master_admin
//                                                 OU competition_admin de
//                                                 l'édition à laquelle le club
//                                                 ciblé (club_id) est attaché
//                                                 via edition_clubs.
//       role='comite' | 'jury'                -> caller doit être master_admin
//                                                 OU competition_admin de
//                                                 l'édition du club ciblé OU
//                                                 club_admin du club_id ciblé
//   - Rôles club-scoped (club_admin/comite/jury) exigent club_id ; rejet 400 sinon.
//   - Rôle competition_admin exige edition_id ; rejet 400 sinon.
//   - Rôles globaux (master_admin/admin) n'exigent ni l'un ni l'autre.
//
// Rate-limit
// ─────────────────────────────────────────────────────────────────────────────
// Pour éviter le spam (admin qui clique 4x sur "Inviter"), on consulte
// email_sends et on refuse si une ligne audience_type='single_email' avec le
// même recipient_email existe dans la dernière heure. Le service_role bypass
// la RLS (INSERT denied côté JWT), donc on log SI envoi OK pour activer le
// garde-fou des appels suivants.
//
// Payload
// ─────────────────────────────────────────────────────────────────────────────
//   {
//     email:           string,
//     role:            'master_admin' | 'admin' | 'competition_admin'
//                       | 'club_admin' | 'comite' | 'jury',
//     club_id?:        string,                                // requis si role club-scoped
//     edition_id?:     string,                                // requis si role='competition_admin'
//     custom_message?: string,                                // optionnel, ~300c
//     lang?:           'fr' | 'en' | 'de'                     // défaut 'fr'
//   }
//
// Réponse OK
// ─────────────────────────────────────────────────────────────────────────────
//   {
//     ok: true,
//     user_id: string,
//     was_already_existing: boolean,
//     magic_link_sent: boolean,
//     resend_id?: string
//   }
//
// Notes
// ─────────────────────────────────────────────────────────────────────────────
// - supabaseAdmin.auth.admin.createUser exige SUPABASE_SERVICE_ROLE_KEY (déjà
//   présent en env côté Supabase ; cf. send-bulk qui l'utilise déjà).
// - generateLink renvoie un objet { properties: { action_link } } qu'on insère
//   dans le CTA bulletproof Élysée — l'utilisateur clique, Supabase consomme
//   le token, et il atterrit sur https://app.rotary-startup.org/Login.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Constants ───────────────────────────────────────────────────────────────
const FROM = "Rotary Startup Award <contact@rotary-startup.org>";
const REPLY_TO = "contact@rotary-startup.org";
const APP_URL = "https://app.rotary-startup.org";
// V3 — Magic-link redirige vers /Welcome avec param firstLogin=1, ce qui déclenche
// le form profile-completion bloquant côté Welcome.jsx (cf. plan §"Welcome.jsx").
// /Welcome route inconditionnellement vers /Login si aucune session ; le magic-link
// pose la session avant le render, donc on atterrit bien sur le form welcome.
const WELCOME_PATH = "/Welcome";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Brand tokens (mirror src/components/design/tokens.js).
const COLORS = {
  NAVY: "#0f1f3d",
  GOLD: "#c9a84c",
  CREAM: "#faf7f2",
  CREAM2: "#e8e3d9",
  INK: "#3a3a52",
  MUTED: "#9090a8",
} as const;

const GLOBAL_ROLES = ["master_admin", "admin"] as const;
const COMPETITION_ROLES = ["competition_admin"] as const;
const CLUB_ROLES = ["club_admin", "comite", "jury"] as const;
const ALL_ROLES = [...GLOBAL_ROLES, ...COMPETITION_ROLES, ...CLUB_ROLES] as const;

type Lang = "fr" | "en" | "de";
type Role = (typeof ALL_ROLES)[number];

interface Payload {
  email: string;
  role: Role;
  club_id?: string;
  edition_id?: string;
  custom_message?: string;
  lang?: Lang;
}

// Garde-fou rate-limit : pas plus d'une invitation par heure pour le même email.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
// Limite de longueur du message personnalisé (sécurité + UX cohérente avec le form).
const MAX_CUSTOM_MESSAGE_LENGTH = 400;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

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

function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ALL_ROLES as readonly string[]).includes(v);
}

function isClubScopedRole(role: Role): boolean {
  return (CLUB_ROLES as readonly string[]).includes(role);
}

function isCompetitionScopedRole(role: Role): boolean {
  return (COMPETITION_ROLES as readonly string[]).includes(role);
}

function isGlobalRole(role: Role): boolean {
  return (GLOBAL_ROLES as readonly string[]).includes(role);
}

// Erreur typée pour interrompre la matrice d'authz depuis un helper async sans
// chaîner des early returns dans des closures.
class AuthzError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthzError";
  }
}

function normalizeEmail(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const trimmed = s.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

// V3 — Build redirect URL pointing to /Welcome with role + scope params, so
// Welcome.jsx can show the right post-login form. firstLogin=1 forces the
// profile-completion form for tiered admin roles. URL params are escaped via
// URLSearchParams (safe against injection / control chars in role/edition_id).
function buildRedirectTo(args: {
  role: Role;
  clubId: string | null;
  editionId: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("role", args.role);
  if (args.editionId) params.set("edition", args.editionId);
  if (args.clubId) params.set("club", args.clubId);
  params.set("firstLogin", "1");
  return `${APP_URL}${WELCOME_PATH}?${params.toString()}`;
}

// ─── i18n copy ───────────────────────────────────────────────────────────────

interface InviteCopy {
  subject: string;
  eyebrow: string;
  greeting: string;
  intro: string;            // "Vous avez été invité…" — phrase d'amorce
  roleLine: string;         // "Rôle attribué : club_admin du Rotary Club de Paris"
  messageLabel: string;     // "Note personnelle :" — si custom_message
  ctaIntro: string;         // "Cliquez sur le bouton ci-dessous pour vous connecter…"
  ctaLabel: string;         // "Se connecter"
  signOff: string;
  signature: string;
  ttl: string;              // "Ce lien est valable pendant une heure."
  alreadyExistingNote: string; // "Votre compte existait déjà — votre rôle a été mis à jour."
}

const SIGNATURE = "Rotary Club de Paris — Rotary Startup Award";

function roleLabel(role: Role, lang: Lang): string {
  const dict: Record<Role, Record<Lang, string>> = {
    master_admin: { fr: "Administrateur principal", en: "Master Administrator", de: "Hauptadministrator/in" },
    admin: { fr: "Administrateur", en: "Administrator", de: "Administrator/in" },
    competition_admin: {
      fr: "Administrateur de compétition",
      en: "Competition Administrator",
      de: "Wettbewerbs-Administrator/in",
    },
    club_admin: { fr: "Administrateur de club", en: "Club Administrator", de: "Club-Administrator/in" },
    comite: { fr: "Membre du comité", en: "Selection Committee Member", de: "Auswahlausschuss-Mitglied" },
    jury: { fr: "Juré", en: "Jury Member", de: "Jurymitglied" },
  };
  return dict[role][lang];
}

function buildRoleLine(
  role: Role,
  lang: Lang,
  clubName: string | null,
  editionName: string | null,
): string {
  const label = roleLabel(role, lang);
  const scope = isCompetitionScopedRole(role) ? editionName : isClubScopedRole(role) ? clubName : null;
  if (scope) {
    if (lang === "fr") return `Rôle attribué : <strong>${esc(label)}</strong> — ${esc(scope)}.`;
    if (lang === "en") return `Assigned role: <strong>${esc(label)}</strong> — ${esc(scope)}.`;
    return `Zugewiesene Rolle: <strong>${esc(label)}</strong> — ${esc(scope)}.`;
  }
  if (lang === "fr") return `Rôle attribué : <strong>${esc(label)}</strong>.`;
  if (lang === "en") return `Assigned role: <strong>${esc(label)}</strong>.`;
  return `Zugewiesene Rolle: <strong>${esc(label)}</strong>.`;
}

function resolveCopy(args: {
  lang: Lang;
  role: Role;
  clubName: string | null;
  editionName: string | null;
  customMessage: string;
  wasAlreadyExisting: boolean;
}): InviteCopy {
  const { lang, role, clubName, editionName, customMessage, wasAlreadyExisting } = args;

  if (lang === "fr") {
    return {
      subject: wasAlreadyExisting
        ? "Votre rôle a été mis à jour — Rotary Startup Award"
        : "Vous êtes invité au Rotary Startup Award",
      eyebrow: wasAlreadyExisting ? "Mise à jour du compte" : "Invitation",
      greeting: "Bonjour,",
      intro: wasAlreadyExisting
        ? "Votre compte sur la plateforme Rotary Startup Award vient d'être mis à jour."
        : "Vous êtes invité(e) à rejoindre la plateforme Rotary Startup Award.",
      roleLine: buildRoleLine(role, lang, clubName, editionName),
      messageLabel: "Message personnel :",
      ctaIntro: "Cliquez ci-dessous pour accéder à votre espace.",
      ctaLabel: "Accéder à la plateforme",
      signOff: "Avec nos cordiales salutations,",
      signature: SIGNATURE,
      ttl: "Ce lien est valable pendant une heure.",
      alreadyExistingNote:
        "Votre compte existait déjà — votre rôle a été mis à jour et ce lien vous permet d'accéder directement à votre espace.",
    };
  }

  if (lang === "en") {
    return {
      subject: wasAlreadyExisting
        ? "Your role has been updated — Rotary Startup Award"
        : "You are invited to the Rotary Startup Award",
      eyebrow: wasAlreadyExisting ? "Account update" : "Invitation",
      greeting: "Dear Madam, dear Sir,",
      intro: wasAlreadyExisting
        ? "Your Rotary Startup Award account has just been updated."
        : "You are invited to join the Rotary Startup Award platform.",
      roleLine: buildRoleLine(role, lang, clubName, editionName),
      messageLabel: "Personal note:",
      ctaIntro: "Please click below to access your space.",
      ctaLabel: "Open the platform",
      signOff: "With our kindest regards,",
      signature: SIGNATURE,
      ttl: "This link is valid for one hour.",
      alreadyExistingNote:
        "Your account already existed — your role has been updated and this link gives you direct access to your space.",
    };
  }

  // de
  return {
    subject: wasAlreadyExisting
      ? "Ihre Rolle wurde aktualisiert — Rotary Startup Award"
      : "Sie sind eingeladen zum Rotary Startup Award",
    eyebrow: wasAlreadyExisting ? "Kontoaktualisierung" : "Einladung",
    greeting: "Sehr geehrte Damen und Herren,",
    intro: wasAlreadyExisting
      ? "Ihr Konto auf der Rotary Startup Award Plattform wurde soeben aktualisiert."
      : "Sie sind eingeladen, der Rotary Startup Award Plattform beizutreten.",
    roleLine: buildRoleLine(role, lang, clubName, editionName),
    messageLabel: "Persönliche Nachricht:",
    ctaIntro: "Bitte klicken Sie unten, um Ihren Bereich zu öffnen.",
    ctaLabel: "Zur Plattform",
    signOff: "Mit freundlichen Grüßen,",
    signature: SIGNATURE,
    ttl: "Dieser Link ist eine Stunde gültig.",
    alreadyExistingNote:
      "Ihr Konto bestand bereits — Ihre Rolle wurde aktualisiert und dieser Link führt Sie direkt zu Ihrem Bereich.",
  };
}

// ─── HTML shell (bulletproof <table>, mirrors send-transactional + magic-link.md) ──

function renderInviteEmail(args: {
  lang: Lang;
  copy: InviteCopy;
  magicLink: string;
  customMessage: string;
  wasAlreadyExisting: boolean;
}): string {
  const { lang, copy, magicLink, customMessage, wasAlreadyExisting } = args;
  const footerNoReply =
    lang === "fr"
      ? "Ne pas répondre à cet email."
      : lang === "en"
        ? "Please do not reply to this email."
        : "Bitte antworten Sie nicht auf diese E-Mail.";
  const footerContact = lang === "fr" ? "Contact :" : lang === "en" ? "Contact:" : "Kontakt:";

  const messageBlock = customMessage
    ? `<p style="margin:0 0 8px 0; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:11px; line-height:1.4; color:${COLORS.MUTED}; letter-spacing:0.12em; text-transform:uppercase;">
         ${esc(copy.messageLabel)}
       </p>
       <p style="margin:0 0 24px 0; padding:14px 18px; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-style:italic; font-size:15px; line-height:1.6; color:${COLORS.NAVY}; background-color:${COLORS.CREAM}; border-left:2px solid ${COLORS.GOLD};">
         ${esc(customMessage)}
       </p>`
    : "";

  const alreadyExistingBlock = wasAlreadyExisting
    ? `<p style="margin:0 0 18px 0; padding:12px 16px; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:13px; line-height:1.55; color:${COLORS.INK}; background-color:${COLORS.CREAM}; border:1px solid ${COLORS.CREAM2};">
         ${esc(copy.alreadyExistingNote)}
       </p>`
    : "";

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
      ${esc(copy.intro)} &mdash; Rotary Startup Award
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
                  ${esc(copy.greeting)}
                </p>
                <p style="margin:0 0 16px 0; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.65; color:${COLORS.INK};">
                  ${esc(copy.intro)}
                </p>
                <p style="margin:0 0 24px 0; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.65; color:${COLORS.INK};">
                  ${copy.roleLine}
                </p>
                ${alreadyExistingBlock}
                ${messageBlock}
                <p style="margin:0 0 20px 0; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.65; color:${COLORS.INK};">
                  ${esc(copy.ctaIntro)}
                </p>

                <!-- CTA: bulletproof button -->
                <table role="presentation" class="rsa-cta" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 8px auto;">
                  <tr>
                    <td align="center" bgcolor="${COLORS.NAVY}" style="background-color:${COLORS.NAVY}; border:1px solid ${COLORS.NAVY}; border-radius:4px;">
                      <a href="${esc(magicLink)}"
                         target="_blank"
                         style="display:inline-block; padding:14px 28px; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:14px; font-weight:500; line-height:1.2; color:#ffffff; text-decoration:none; border-radius:4px;">
                        ${esc(copy.ctaLabel)}
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:8px 0 0 0; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size:12px; line-height:1.5; color:${COLORS.MUTED}; text-align:center;">
                  ${esc(copy.ttl)}
                </p>

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
                      ${esc(footerNoReply)} ${esc(footerContact)}
                      <a href="mailto:${REPLY_TO}" style="color:${COLORS.NAVY}; text-decoration:underline;">${REPLY_TO}</a>
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

async function sendViaResend(args: {
  apiKey: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true; id: string } | { ok: false; status: number; error: string }> {
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      reply_to: REPLY_TO,
      to: [args.to],
      subject: args.subject,
      html: args.html,
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
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
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

  // Per-request client (caller's JWT) — propage auth.uid() vers les RPC.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Service-role client — création de user, génération magic-link, INSERT email_sends.
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

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

  const email = normalizeEmail(payload.email);
  if (!email) {
    return jsonResponse(400, { ok: false, error: "invalid_email" });
  }
  if (!isRole(payload.role)) {
    return jsonResponse(400, { ok: false, error: "invalid_role" });
  }
  const role = payload.role;
  const lang: Lang = isLang(payload.lang) ? payload.lang : "fr";
  const clubId = typeof payload.club_id === "string" && payload.club_id.trim() ? payload.club_id.trim() : null;
  const editionId = typeof payload.edition_id === "string" && payload.edition_id.trim()
    ? payload.edition_id.trim()
    : null;
  let customMessage = typeof payload.custom_message === "string" ? payload.custom_message.trim() : "";
  if (customMessage.length > MAX_CUSTOM_MESSAGE_LENGTH) {
    customMessage = customMessage.slice(0, MAX_CUSTOM_MESSAGE_LENGTH);
  }

  if (isClubScopedRole(role) && !clubId) {
    return jsonResponse(400, { ok: false, error: "club_id_required_for_role" });
  }
  if (isCompetitionScopedRole(role) && !editionId) {
    return jsonResponse(400, { ok: false, error: "edition_id_required_for_role" });
  }

  // ── validate caller ──
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return jsonResponse(401, { ok: false, error: "invalid_jwt" });
  }
  const callerId = userData.user.id;
  const callerEmail = userData.user.email || "";

  const { data: rolesData, error: rolesErr } = await supabase.rpc("rsa_my_roles");
  if (rolesErr) {
    return jsonResponse(500, { ok: false, error: `roles_lookup_failed:${rolesErr.message}` });
  }
  const callerRoles = Array.isArray(rolesData) ? rolesData.map((r) => String(r).toLowerCase()) : [];
  const isMasterAdmin = callerRoles.includes("master_admin");

  // Authz matrix (V3 — 5 tiers).
  // Helper : on lit my_competition_admin_editions paresseusement (uniquement
  // si nécessaire pour ne pas pénaliser le path global/master par un RPC en plus).
  let competitionAdminEditionsCache: string[] | null = null;
  const loadCompetitionAdminEditions = async (): Promise<string[]> => {
    if (competitionAdminEditionsCache !== null) return competitionAdminEditionsCache;
    const { data, error } = await supabase.rpc("my_competition_admin_editions");
    if (error) {
      // Tolérance : si l'RPC n'existe pas (build local sans migration), on
      // dégrade vers liste vide — l'authz traitera le caller comme non
      // competition_admin et tombera correctement sur 403 si requis.
      console.warn("[invite-user] my_competition_admin_editions lookup failed:", error.message);
      competitionAdminEditionsCache = [];
      return competitionAdminEditionsCache;
    }
    competitionAdminEditionsCache = Array.isArray(data) ? data.map((v: unknown) => String(v)) : [];
    return competitionAdminEditionsCache;
  };

  let clubMembershipsCache: Array<{ club_id: string; role: string }> | null = null;
  const loadClubMemberships = async (): Promise<Array<{ club_id: string; role: string }>> => {
    if (clubMembershipsCache !== null) return clubMembershipsCache;
    const { data, error } = await supabase.rpc("my_club_memberships");
    if (error) {
      return jsonResponseThrow(`memberships_lookup_failed:${error.message}`);
    }
    clubMembershipsCache = Array.isArray(data)
      ? data.map((m: { club_id: string; role: string }) => ({ club_id: m.club_id, role: m.role }))
      : [];
    return clubMembershipsCache;
  };

  // Helper interne : on signalise une erreur d'authz via une exception capturée
  // ci-dessous. Plus simple que d'imbriquer des early returns dans des branches
  // asynchrones.
  function jsonResponseThrow(error: string): never {
    throw new AuthzError(error);
  }

  try {
    if (isGlobalRole(role)) {
      // master_admin / admin -> caller doit être master_admin.
      if (!isMasterAdmin) {
        return jsonResponse(403, {
          ok: false,
          error: "forbidden",
          detail: "global role assignment requires master_admin",
        });
      }
    } else if (isCompetitionScopedRole(role)) {
      // competition_admin -> caller doit être master_admin (uniquement).
      if (!isMasterAdmin) {
        return jsonResponse(403, {
          ok: false,
          error: "forbidden",
          detail: "competition_admin role assignment requires master_admin",
        });
      }
    } else if (role === "club_admin") {
      // club_admin -> master_admin OU competition_admin de l'édition à laquelle
      // le club ciblé (clubId) est attaché via edition_clubs. On résout l'édition
      // côté serveur pour éviter qu'un caller forge un edition_id arbitraire.
      if (!isMasterAdmin) {
        const editions = await loadCompetitionAdminEditions();
        if (editions.length === 0) {
          return jsonResponse(403, {
            ok: false,
            error: "forbidden",
            detail: "club_admin assignment requires master_admin OR competition_admin",
          });
        }
        const { data: ecRows, error: ecErr } = await supabaseAdmin
          .from("edition_clubs")
          .select("edition_id")
          .eq("club_id", clubId)
          .in("edition_id", editions);
        if (ecErr) {
          return jsonResponse(500, { ok: false, error: `edition_club_lookup_failed:${ecErr.message}` });
        }
        if (!Array.isArray(ecRows) || ecRows.length === 0) {
          return jsonResponse(403, {
            ok: false,
            error: "forbidden",
            detail: `competition_admin not authorized for club ${clubId}`,
          });
        }
      }
    } else {
      // comite / jury -> master_admin OU competition_admin de l'édition du club
      // OU club_admin du club ciblé.
      if (!isMasterAdmin) {
        const memberships = await loadClubMemberships();
        const isClubAdmin = memberships.some((m) => m.club_id === clubId && m.role === "club_admin");
        if (!isClubAdmin) {
          // Fallback : competition_admin d'une édition à laquelle clubId est attaché.
          const editions = await loadCompetitionAdminEditions();
          let isCompetitionAdminForClub = false;
          if (editions.length > 0) {
            const { data: ecRows, error: ecErr } = await supabaseAdmin
              .from("edition_clubs")
              .select("edition_id")
              .eq("club_id", clubId)
              .in("edition_id", editions);
            if (ecErr) {
              return jsonResponse(500, { ok: false, error: `edition_club_lookup_failed:${ecErr.message}` });
            }
            isCompetitionAdminForClub = Array.isArray(ecRows) && ecRows.length > 0;
          }
          if (!isCompetitionAdminForClub) {
            return jsonResponse(403, {
              ok: false,
              error: "forbidden",
              detail: `requires master_admin OR competition_admin of ${clubId}'s edition OR club_admin of ${clubId}`,
            });
          }
        }
      }
    }
  } catch (err) {
    if (err instanceof AuthzError) {
      return jsonResponse(500, { ok: false, error: err.message });
    }
    throw err;
  }

  // ── rate-limit : pas plus d'une invite/heure pour le même email ──
  // On consulte email_sends via le service_role (la table refuse SELECT côté JWT
  // pour les non-admins, mais notre service_role bypasse la RLS).
  const sinceIso = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { data: recentSends, error: recentErr } = await supabaseAdmin
    .from("email_sends")
    .select("id, sent_at, recipients_emails, audience_type")
    .gte("sent_at", sinceIso)
    .contains("recipients_emails", [email])
    .eq("audience_type", "user_invitation")
    .limit(1);
  if (recentErr) {
    // On ne bloque pas si la table n'a pas la forme attendue (graceful) — on log.
    console.warn("[invite-user] rate-limit lookup failed:", recentErr.message);
  } else if (Array.isArray(recentSends) && recentSends.length > 0) {
    return jsonResponse(429, {
      ok: false,
      error: "rate_limited",
      detail: "An invitation was already sent to this email less than an hour ago.",
    });
  }

  // ── récupère le nom du club si club-scoped (pour l'email) ──
  let clubName: string | null = null;
  if (clubId) {
    const { data: clubRow, error: clubErr } = await supabaseAdmin
      .from("clubs")
      .select("id, name")
      .eq("id", clubId)
      .maybeSingle();
    if (clubErr) {
      return jsonResponse(500, { ok: false, error: `club_lookup_failed:${clubErr.message}` });
    }
    if (!clubRow) {
      return jsonResponse(404, { ok: false, error: "club_not_found" });
    }
    clubName = clubRow.name || clubId;
  }

  // ── récupère le nom de l'édition si competition-scoped (pour l'email) ──
  // On lit editions.name (V3) en tombant sur editions.id en fallback.
  let editionName: string | null = null;
  if (editionId) {
    const { data: editionRow, error: editionErr } = await supabaseAdmin
      .from("editions")
      .select("id, name")
      .eq("id", editionId)
      .maybeSingle();
    if (editionErr) {
      return jsonResponse(500, { ok: false, error: `edition_lookup_failed:${editionErr.message}` });
    }
    if (!editionRow) {
      return jsonResponse(404, { ok: false, error: "edition_not_found" });
    }
    editionName = (editionRow as { name?: string | null }).name || editionId;
  }

  // ── recherche / création du user dans auth.users ──
  let userId: string | null = null;
  let wasAlreadyExisting = false;

  // listUsers ne supporte pas de filtre direct côté API admin — on filtre côté client.
  // Pour V2.5 on accepte un scan (< 1000 users prévus). À monitor plus tard.
  // Plus efficace : SELECT depuis auth.users via le service_role.
  const { data: existing, error: existErr } = await supabaseAdmin
    .schema("auth")
    .from("users")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();
  if (existErr) {
    return jsonResponse(500, { ok: false, error: `user_lookup_failed:${existErr.message}` });
  }

  if (existing?.id) {
    userId = existing.id;
    wasAlreadyExisting = true;
  } else {
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false,
    });
    if (createErr || !created?.user?.id) {
      return jsonResponse(500, {
        ok: false,
        error: `user_create_failed:${createErr?.message || "unknown"}`,
      });
    }
    userId = created.user.id;
  }

  // ── applique le rôle ──
  if (isGlobalRole(role)) {
    // Rôle global : UPSERT app_user_roles (on ajoute le rôle à la liste).
    // master_admin et admin sont stockés comme entries dans roles[].
    const { data: existingRow, error: existingErr } = await supabaseAdmin
      .from("app_user_roles")
      .select("email, roles")
      .ilike("email", email)
      .maybeSingle();
    if (existingErr) {
      return jsonResponse(500, { ok: false, error: `roles_lookup_failed:${existingErr.message}` });
    }
    const merged = new Set<string>([
      ...((existingRow?.roles as string[] | undefined) || []),
      role,
    ]);
    const { error: upsertErr } = await supabaseAdmin
      .from("app_user_roles")
      .upsert(
        {
          email,
          roles: Array.from(merged),
          granted_by: callerId,
          granted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );
    if (upsertErr) {
      return jsonResponse(500, { ok: false, error: `role_apply_failed:${upsertErr.message}` });
    }
  } else if (isCompetitionScopedRole(role)) {
    // V3 — Rôle competition_admin : RPC SECURITY DEFINER rsa_grant_competition_admin.
    // L'RPC valide caller=master_admin et INSERT competition_admins (idempotent
    // via ON CONFLICT (user_id, edition_id)). On passe par le service_role
    // client pour bypass RLS et appliquer le grant de manière déterministe (la
    // matrice authz a déjà confirmé que le caller est master_admin).
    const { error: grantErr } = await supabaseAdmin.rpc("rsa_grant_competition_admin", {
      p_user_id: userId,
      p_edition_id: editionId,
    });
    if (grantErr) {
      return jsonResponse(500, { ok: false, error: `competition_admin_apply_failed:${grantErr.message}` });
    }
  } else {
    // Rôle club-scoped : INSERT club_memberships (idempotent via ON CONFLICT).
    const { error: insertErr } = await supabaseAdmin
      .from("club_memberships")
      .upsert(
        {
          user_id: userId,
          club_id: clubId,
          role,
          granted_by: callerId,
          granted_at: new Date().toISOString(),
        },
        { onConflict: "user_id,club_id,role" },
      );
    if (insertErr) {
      return jsonResponse(500, { ok: false, error: `club_role_apply_failed:${insertErr.message}` });
    }
  }

  // ── génère le magic-link ──
  // V3 — la redirection cible /Welcome?role=...&edition=...&club=...&firstLogin=1.
  // Welcome.jsx lit ces query-params pour afficher le bon form post-login
  // (notamment le profile-completion bloquant pour les rôles tiers admin).
  const redirectTo = buildRedirectTo({ role, clubId, editionId });
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
  if (linkErr || !linkData?.properties?.action_link) {
    return jsonResponse(500, {
      ok: false,
      error: `magic_link_failed:${linkErr?.message || "unknown"}`,
    });
  }
  const magicLink = linkData.properties.action_link;

  // ── rend + envoie l'email ──
  const copy = resolveCopy({ lang, role, clubName, editionName, customMessage, wasAlreadyExisting });
  const html = renderInviteEmail({ lang, copy, magicLink, customMessage, wasAlreadyExisting });

  const sendRes = await sendViaResend({
    apiKey: resendKey,
    to: email,
    subject: copy.subject,
    html,
  });

  if (!sendRes.ok) {
    return jsonResponse(
      sendRes.status >= 400 && sendRes.status < 600 ? sendRes.status : 502,
      { ok: false, error: `resend_failed:${sendRes.error}` },
    );
  }

  // ── audit log dans email_sends (rate-limit guard pour les appels suivants) ──
  // On ne bloque pas en cas d'échec audit — l'email est déjà parti.
  const { error: auditErr } = await supabaseAdmin.from("email_sends").insert({
    sent_by: callerId,
    club_id: clubId,
    audience_type: "user_invitation",
    audience_filter: {
      role,
      lang,
      edition_id: editionId,
      was_already_existing: wasAlreadyExisting,
      caller_email: callerEmail,
    },
    subject: copy.subject,
    body_html: html,
    recipients_count: 1,
    recipients_emails: [email],
    resend_message_ids: sendRes.id ? [sendRes.id] : [],
    status: "sent",
  });
  if (auditErr) {
    console.warn("[invite-user] audit insert failed:", auditErr.message);
  }

  return jsonResponse(200, {
    ok: true,
    user_id: userId,
    was_already_existing: wasAlreadyExisting,
    magic_link_sent: true,
    resend_id: sendRes.id,
  });
});
