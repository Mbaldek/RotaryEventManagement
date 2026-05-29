// MagicLinkLogin — Élysée-styled single-door login. One email input → "Recevoir mon
// lien de connexion" → "vérifiez votre email" success state, with error handling.
// Calls usePlatformAuth().signInWithMagicLink(email, redirectPath). Fully trilingual
// via useLang (copy overridable through `labels`).
//
// V3.0 — SSO Google + Microsoft (Azure AD) en haut du form, en parallèle du
// magic-link. Cible : jurés CEO de grands groupes dont l'email DLP/throttling
// bloque souvent les magic-links Resend. Le magic-link reste accessible pour les
// candidats / users qui n'ont ni Google ni Microsoft 365. Cf. docs/onboarding/sso-setup.md.
//
// Single door: there is no role chooser here — everyone (startup / jury / comité /
// admin) signs in with the same magic link OR SSO; roles are resolved server-side
// after auth (app_user_roles). See src/lib/platform/auth.jsx.
//
// Props:
//   redirectPath : string — return path after the magic-link click (default "/").
//   title, subtitle : node — optional editorial title overrides (resolved copy).
//   labels       : partial copy override (see DEFAULT_T keys).
//   onSent       : (email) => void — optional callback once the link is sent.
//   intent       : 'candidate' | 'jury-onboard' | null — optional, ONLY used to
//                  customise the eyebrow/subtitle copy ("Apply · RSA 2027 · paris").
//                  No effect on the magic-link call itself.
//   editionId    : string — same usage as `intent`, displayed in the eyebrow.
//   clubId       : string — same usage as `intent`, displayed in the eyebrow.
//   className.

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MailCheck } from "lucide-react";
import { NAVY, GOLD, CREAM2, INK, MUTED, SERIF, EASE } from "@/components/design/tokens";
import { usePlatformAuth } from "@/lib/platform/auth";
import { useLang } from "@/lib/platform/i18n";
import Field from "@/components/design/form/Field";
import TextInput from "@/components/design/form/TextInput";
import ForceLogoutLink from "@/components/design/auth/ForceLogoutLink";

const DEFAULT_T = {
  eyebrow: { fr: "Espace candidats & jury", en: "Applicants & jury area", de: "Bewerber- und Jury-Bereich" },
  title: { fr: "Connexion", en: "Sign in", de: "Anmeldung" },
  subtitle: {
    fr: "Recevez un lien de connexion par email. Pas de mot de passe.",
    en: "Get a sign-in link by email. No password.",
    de: "Erhalten Sie einen Anmeldelink per E-Mail — ganz ohne Passwort.",
  },
  emailLabel: { fr: "Adresse email", en: "Email address", de: "E-Mail-Adresse" },
  emailPlaceholder: { fr: "vous@exemple.com", en: "you@example.com", de: "ihre.adresse@beispiel.com" },
  submit: { fr: "Recevoir mon lien de connexion", en: "Send me a sign-in link", de: "Anmeldelink anfordern" },
  sending: { fr: "Envoi…", en: "Sending…", de: "Wird gesendet…" },
  sentTitle: { fr: "Vérifiez votre email", en: "Check your email", de: "Bitte prüfen Sie Ihr E-Mail-Postfach" },
  sentBody: {
    fr: "Nous avons envoyé un lien de connexion à",
    en: "We've sent a sign-in link to",
    de: "Wir haben einen Anmeldelink versendet an",
  },
  sentHint: {
    fr: "Cliquez sur le lien dans l'email pour vous connecter. Pensez à vérifier vos spams.",
    en: "Click the link in the email to sign in. Don't forget to check your spam.",
    de: "Klicken Sie auf den Link in der E-Mail, um sich anzumelden. Falls Sie ihn nicht finden, prüfen Sie bitte den Spam-Ordner.",
  },
  resend: { fr: "Renvoyer / changer d'email", en: "Resend / change email", de: "Erneut senden / E-Mail-Adresse ändern" },
  errInvalid: { fr: "Adresse email invalide.", en: "Invalid email address.", de: "Ungültige E-Mail-Adresse." },
  errGeneric: {
    fr: "Une erreur est survenue. Veuillez réessayer.",
    en: "Something went wrong. Please try again.",
    de: "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
  },
  // — SSO (V3.0) —
  ssoHeader: { fr: "Connexion rapide", en: "Quick sign-in", de: "Schnelle Anmeldung" },
  ssoSubtext: {
    fr: "Recommandé pour les utilisateurs entreprise",
    en: "Recommended for enterprise users",
    de: "Empfohlen für Unternehmensnutzer",
  },
  ssoGoogle: { fr: "Continuer avec Google", en: "Continue with Google", de: "Mit Google fortfahren" },
  ssoMicrosoft: { fr: "Continuer avec Microsoft", en: "Continue with Microsoft", de: "Mit Microsoft fortfahren" },
  ssoOr: { fr: "OU", en: "OR", de: "ODER" },
  ssoError: {
    fr: "Connexion impossible. Veuillez réessayer.",
    en: "Sign-in failed. Please try again.",
    de: "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.",
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// — SVG officiels SSO providers (inline pour la perf, pas de fetch externe).
//   Les couleurs sont les couleurs OFFICIELLES des marques — on ne les tokenize
//   PAS Élysée (NAVY/GOLD) car ça casserait la reconnaissance utilisateur du
//   bouton SSO (norme de facto cross-web). C'est l'unique entorse à la palette.

function GoogleGIcon({ className = "" }) {
  // Google "G" multi-color officiel (https://developers.google.com/identity/branding-guidelines)
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function MicrosoftIcon({ className = "" }) {
  // Microsoft logo 4-carrés officiel (https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-add-branding-in-azure-ad-apps)
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 23 23" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

export default function MagicLinkLogin({
  redirectPath = "/",
  title,
  subtitle,
  labels = {},
  onSent,
  intent = null,
  editionId = null,
  clubId = null,
  className = "",
}) {
  const { t } = useLang();
  const { signInWithMagicLink, signInWithGoogle, signInWithMicrosoft } = usePlatformAuth();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState(null);
  // SSO : pending state séparé pour ne pas mixer avec le magic-link form
  // (ex. user clique Google → on disable les autres boutons + magic-link en attendant
  // le redirect Supabase, qui prend 200-500ms pour partir).
  const [ssoPending, setSsoPending] = useState(null); // null | 'google' | 'microsoft'

  // Eyebrow contextuel : "Inscription · RSA 2027 · paris-etoile" pour un lien
  // de candidature. On NE remplace QUE l'eyebrow (titre + reste de la copy
  // restent neutres) — c'est juste un indice visuel pour rassurer le candidat
  // qu'il est sur le bon onglet.
  const contextEyebrow = (() => {
    if (intent !== 'candidate' || !editionId) return null;
    const suffix = clubId ? ` · ${clubId}` : '';
    return {
      fr: `Inscription · RSA ${editionId}${suffix}`,
      en: `Apply · RSA ${editionId}${suffix}`,
      de: `Bewerbung · RSA ${editionId}${suffix}`,
    };
  })();

  // Subtitle contextuel pour intent=candidate : on rassure que l'email arrive.
  const contextSubtitle =
    intent === 'candidate'
      ? {
          fr: "Vous recevrez un lien de connexion par email pour finaliser votre inscription.",
          en: "You'll receive a sign-in link by email to finalise your application.",
          de: "Sie erhalten per E-Mail einen Anmeldelink, mit dem Sie Ihre Bewerbung abschließen können.",
        }
      : null;

  // Resolve copy: per-key label override > built-in trilingual default.
  const L = (key) => {
    if (labels[key] != null) return labels[key];
    if (key === 'eyebrow' && contextEyebrow) return t(contextEyebrow);
    if (key === 'subtitle' && contextSubtitle) return t(contextSubtitle);
    return t(DEFAULT_T[key]);
  };

  const submit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError(L("errInvalid"));
      setStatus("error");
      return;
    }
    setStatus("sending");
    setError(null);
    try {
      const { error: sbError } = await signInWithMagicLink(value, redirectPath);
      if (sbError) throw sbError;
      setStatus("sent");
      onSent?.(value);
    } catch (err) {
      // Diagnostic V2.5 : on expose le vrai message Supabase (rate-limit,
      // SMTP misconfig, redirect URL non whitelistée…) plutôt que de masquer
      // sous un générique stérile. On garde le wording Élysée + on append le
      // détail technique en petit. Console.error pour les power-users qui
      // ouvrent DevTools.
      // eslint-disable-next-line no-console
      console.error("[MagicLinkLogin] signInWithMagicLink failed:", err);
      const detail = err?.message || err?.error_description || String(err);
      setError(`${L("errGeneric")} (${detail})`);
      setStatus("error");
    }
  };

  // SSO handler générique. provider = 'google' | 'microsoft'. signInFn renvoie
  // une promise qui résout après que Supabase a déclenché le window.location =
  // redirect_uri externe (Google/Azure) → en cas de succès l'utilisateur quitte
  // la page. On gère uniquement le cas d'erreur (provider mal configuré, etc.).
  const handleSso = async (provider, signInFn) => {
    if (ssoPending || sending) return;
    setSsoPending(provider);
    setError(null);
    setStatus("idle");
    try {
      const { error: sbError } = await signInFn(redirectPath);
      if (sbError) throw sbError;
      // Supabase va rediriger vers le provider → on n'arrive pas ici normalement.
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[MagicLinkLogin] SSO ${provider} failed:`, err);
      const detail = err?.message || err?.error_description || String(err);
      setError(`${L("ssoError")} (${detail})`);
      setStatus("error");
      setSsoPending(null);
    }
  };

  const sending = status === "sending";
  const anyBusy = sending || !!ssoPending;

  // — Sent confirmation state —
  if (status === "sent") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className={`max-w-[420px] mx-auto text-center ${className}`}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "#ecf1e5", border: "1px solid #cfe0bd" }}
        >
          <MailCheck className="w-6 h-6" style={{ color: "#1d6b4f" }} aria-hidden />
        </div>
        <h1 className="text-[26px] mb-3" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {L("sentTitle")}
        </h1>
        <p className="text-[14px] leading-relaxed" style={{ color: INK }}>
          {L("sentBody")} <strong style={{ color: NAVY }}>{email.trim()}</strong>
        </p>
        <p className="text-xs leading-relaxed mt-3" style={{ color: MUTED }}>
          {L("sentHint")}
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setError(null);
          }}
          className="mt-6 text-[13px] font-medium underline underline-offset-4 rounded-[4px] px-1 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-[#faf7f2]"
          style={{ color: NAVY }}
        >
          {L("resend")}
        </button>
      </motion.div>
    );
  }

  // — Idle / sending / error form —
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={`max-w-[420px] mx-auto ${className}`}
    >
      <div className="text-center mb-7">
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
            {L("eyebrow")}
          </span>
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
        </div>
        <h1 className="text-[32px] leading-tight mb-2" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {title ?? L("title")}
        </h1>
        <p className="text-[14px] leading-relaxed" style={{ color: INK }}>
          {subtitle ?? L("subtitle")}
        </p>
      </div>

      {/* — SECTION SSO (V3.0) — Google + Microsoft, au-dessus du form magic-link.
            Cible : jurés CEO entreprise (cf. docs/onboarding/sso-setup.md). */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE, delay: 0.05 }}
        className="mb-5"
      >
        <div className="text-center mb-3">
          <h2
            className="text-[13px] font-medium uppercase tracking-[0.14em]"
            style={{ color: NAVY }}
          >
            {L("ssoHeader")}
          </h2>
          <p className="text-[11px] mt-1" style={{ color: MUTED }}>
            {L("ssoSubtext")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSso('google', signInWithGoogle)}
            disabled={anyBusy}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3 text-[13px] font-medium rounded-[4px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-[#faf7f2] disabled:opacity-60 disabled:cursor-not-allowed hover:border-[#c9a84c]"
            style={{ background: "white", color: NAVY, border: `1px solid ${CREAM2}` }}
            aria-label={L("ssoGoogle")}
          >
            {ssoPending === 'google' ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <GoogleGIcon />
            )}
            <span>Google</span>
          </button>
          <button
            type="button"
            onClick={() => handleSso('microsoft', signInWithMicrosoft)}
            disabled={anyBusy}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3 text-[13px] font-medium rounded-[4px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-[#faf7f2] disabled:opacity-60 disabled:cursor-not-allowed hover:border-[#c9a84c]"
            style={{ background: "white", color: NAVY, border: `1px solid ${CREAM2}` }}
            aria-label={L("ssoMicrosoft")}
          >
            {ssoPending === 'microsoft' ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <MicrosoftIcon />
            )}
            <span>Microsoft</span>
          </button>
        </div>
      </motion.div>

      {/* — Séparateur OU / OR / ODER — hairline gold avec le mot au milieu */}
      <div
        className="flex items-center gap-3 my-5"
        role="separator"
        aria-orientation="horizontal"
      >
        <span className="h-px flex-1" style={{ background: GOLD, opacity: 0.5 }} aria-hidden />
        <span
          className="uppercase text-[10px] tracking-[0.18em] font-medium"
          style={{ color: GOLD }}
        >
          {L("ssoOr")}
        </span>
        <span className="h-px flex-1" style={{ background: GOLD, opacity: 0.5 }} aria-hidden />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label={L("emailLabel")} error={status === "error" ? error : undefined}>
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={L("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={describedBy}
              invalid={invalid}
              disabled={anyBusy}
              autoFocus
            />
          )}
        </Field>

        <button
          type="submit"
          disabled={anyBusy}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 text-[14px] font-medium rounded-[4px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-[#faf7f2] disabled:opacity-70 disabled:cursor-not-allowed"
          style={{ background: NAVY, color: "white", border: `1px solid ${NAVY}` }}
        >
          {sending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
          {sending ? L("sending") : L("submit")}
        </button>
      </form>

      <div className="mt-6 pt-5 text-center" style={{ borderTop: `1px solid ${CREAM2}` }}>
        <p className="text-[11px]" style={{ color: MUTED }}>
          {/* intentionally language-neutral legal sliver; pass via labels if needed */}
          Rotary Startup Award 2026
        </p>
        {/* F10 — Sortie de secours pour les sessions zombies (JWT expiré + cookie
            stale + onAuthStateChange muet). Subtil, sous le footer, ton non
            catastrophiste. Cf. ForceLogoutLink.jsx. */}
        <ForceLogoutLink />
      </div>
    </motion.div>
  );
}
