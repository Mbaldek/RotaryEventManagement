// MagicLinkLogin — Élysée-styled single-door login. One email input → "Recevoir mon
// lien de connexion" → "vérifiez votre email" success state, with error handling.
// Calls usePlatformAuth().signInWithMagicLink(email, redirectPath). Fully trilingual
// via useLang (copy overridable through `labels`).
//
// Single door: there is no role chooser here — everyone (startup / jury / comité /
// admin) signs in with the same magic link; roles are resolved server-side after
// auth (app_user_roles). See src/lib/platform/auth.jsx.
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
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const { signInWithMagicLink } = usePlatformAuth();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState(null);

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

  const sending = status === "sending";

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
              disabled={sending}
              autoFocus
            />
          )}
        </Field>

        <button
          type="submit"
          disabled={sending}
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
      </div>
    </motion.div>
  );
}
