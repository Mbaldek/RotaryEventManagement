// Step1Picker — écran public self-signup (Candidater).
//
// Le candidat choisit :
//   - une compétition (édition seule, pas de club — la startup candidate au
//     concours en général, l'admin route ensuite vers un club organisateur)
//   - une adresse email
//
// Au submit :
//   1. RPC rsa_create_pending_application(edition_id, email) — crée un draft
//      pending dans startups (owner_id=NULL, club_id=NULL, pending_expires_at = +7j).
//   2. Magic-link envoyé via supabase.auth.signInWithOtp(email,
//      emailRedirectTo=/Candidater?claim=1)
//   3. Confirmation "Vérifiez votre email"
//
// Idempotence : si un draft pending existe déjà pour (email, edition), le RPC
// rafraîchit la TTL et renvoie l'id — pas de doublon.
//
// Pré-remplissage : si ?edition=… arrive en query, le select est préfocus.
//
// 100% tokens. i18n FR/EN/DE. framer-motion pour la transition states.

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MailCheck, AlertCircle, ArrowRight } from 'lucide-react';
import {
  NAVY, GOLD, INK, MUTED, CREAM2, SERIF, EASE,
  Field, TextInput, Select,
} from '@/components/design';
import { DANGER, TINT_DANGER, GOLD_TEXT } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { usePlatformAuth } from '@/lib/platform/auth';
import { Edition, Startup } from '@/lib/rsa/entities';

const T = {
  eyebrow: {
    fr: 'Démarrez votre candidature',
    en: 'Start your application',
    de: 'Bewerbung starten',
  },
  title: {
    fr: 'Quelques secondes pour commencer',
    en: 'A few seconds to get started',
    de: 'Wenige Sekunden zum Start',
  },
  subtitle: {
    fr: 'Choisissez la compétition et indiquez votre adresse email. Vous recevrez un lien de connexion pour ouvrir votre dossier — sans mot de passe.',
    en: 'Pick the competition and enter your email address. You will receive a sign-in link to open your application — no password required.',
    de: 'Wählen Sie den Wettbewerb und geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Anmeldelink, um Ihre Bewerbung zu öffnen — ganz ohne Passwort.',
  },
  competitionLabel: { fr: 'Compétition', en: 'Competition', de: 'Wettbewerb' },
  competitionPlaceholder: {
    fr: 'Sélectionnez une compétition…',
    en: 'Select a competition…',
    de: 'Wettbewerb auswählen…',
  },
  emailLabel: { fr: 'Adresse email', en: 'Email address', de: 'E-Mail-Adresse' },
  emailHelper: {
    fr: "Nous l'utilisons uniquement pour vous envoyer votre lien d'accès et les communications liées à votre dossier.",
    en: 'We only use it to send your sign-in link and communications related to your application.',
    de: 'Wir verwenden sie ausschließlich zum Versand Ihres Anmeldelinks und der dossierbezogenen Kommunikation.',
  },
  emailPlaceholder: { fr: 'vous@exemple.com', en: 'you@example.com', de: 'sie@beispiel.com' },
  submit: {
    fr: 'Démarrer ma candidature',
    en: 'Start my application',
    de: 'Bewerbung starten',
  },
  submitting: { fr: 'Envoi…', en: 'Sending…', de: 'Senden…' },
  noCompetitions: {
    fr: 'Aucune compétition ouverte pour le moment.',
    en: 'No competition is currently open.',
    de: 'Derzeit ist kein Wettbewerb geöffnet.',
  },
  loading: {
    fr: 'Chargement des compétitions…',
    en: 'Loading competitions…',
    de: 'Wettbewerbe werden geladen…',
  },
  sentTitle: { fr: 'Vérifiez votre email', en: 'Check your email', de: 'Prüfen Sie Ihre E-Mails' },
  sentBody: {
    fr: 'Votre dossier est en attente. Nous avons envoyé un lien de connexion à',
    en: 'Your application is reserved. We sent a sign-in link to',
    de: 'Ihr Dossier ist vorgemerkt. Wir haben einen Anmeldelink gesendet an',
  },
  sentHint: {
    fr: "Cliquez sur le lien dans l'email pour ouvrir votre dossier. Pensez à vérifier vos spams. Le lien est valide 7 jours.",
    en: 'Click the link in the email to open your application. Please check your spam folder. The link is valid for 7 days.',
    de: 'Klicken Sie auf den Link in der E-Mail, um Ihr Dossier zu öffnen. Prüfen Sie ggf. den Spam-Ordner. Der Link ist 7 Tage gültig.',
  },
  changeEmail: { fr: 'Renvoyer / changer d’email', en: 'Resend / change email', de: 'Erneut senden / E-Mail ändern' },
  errInvalidEmail: { fr: 'Adresse email invalide.', en: 'Invalid email address.', de: 'Ungültige E-Mail-Adresse.' },
  errEditionRequired: {
    fr: 'Veuillez sélectionner une compétition.',
    en: 'Please select a competition.',
    de: 'Bitte wählen Sie einen Wettbewerb.',
  },
  errRateLimit: {
    fr: 'Trop de tentatives. Réessayez dans 24 h.',
    en: 'Too many attempts. Please try again in 24 hours.',
    de: 'Zu viele Versuche. Bitte in 24 Stunden erneut versuchen.',
  },
  errEditionClosed: {
    fr: 'Cette compétition est désormais fermée.',
    en: 'This competition is now closed.',
    de: 'Dieser Wettbewerb ist nun geschlossen.',
  },
  errGeneric: {
    fr: 'Une erreur est survenue. Veuillez réessayer.',
    en: 'Something went wrong. Please try again.',
    de: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
  },
  legalSignature: {
    fr: 'Service candidatures',
    en: 'Applications service',
    de: 'Bewerbungsservice',
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapError(raw, t) {
  const msg = typeof raw === 'string' ? raw : raw?.message || raw?.error_description || '';
  if (/rate_limit_exceeded/i.test(msg)) return t(T.errRateLimit);
  if (/edition_closed|edition_not_open/i.test(msg)) return t(T.errEditionClosed);
  if (/invalid_email/i.test(msg)) return t(T.errInvalidEmail);
  return `${t(T.errGeneric)}${msg ? ` (${msg})` : ''}`;
}

export default function Step1Picker({ initialEdition = null, onSent }) {
  const { t } = useLang();
  const { signInWithMagicLink } = usePlatformAuth();

  const [editionId, setEditionId] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState(null);

  const { data: openList = [], isLoading } = useQuery({
    queryKey: ['rsa', 'open-competitions'],
    queryFn: () => Edition.openForApply(),
    staleTime: 60 * 1000,
  });

  // Pre-select si query param fourni et match dans la liste ouverte.
  useEffect(() => {
    if (!openList.length || editionId) return;
    if (initialEdition) {
      const match = openList.find((e) => e.edition.id === initialEdition);
      if (match) setEditionId(match.edition.id);
    }
  }, [openList, initialEdition, editionId]);

  const options = useMemo(() => {
    return openList.map((entry) => ({
      value: entry.edition.id,
      label: entry.edition.name || `${entry.edition.year}`,
    }));
  }, [openList]);

  const selected = useMemo(() => {
    if (!editionId) return null;
    return openList.find((e) => e.edition.id === editionId) || null;
  }, [openList, editionId]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selected) {
      setError(t(T.errEditionRequired));
      setStatus('error');
      return;
    }
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError(t(T.errInvalidEmail));
      setStatus('error');
      return;
    }

    setStatus('sending');
    try {
      // 1. Crée le draft pending (owner_id=NULL, club_id=NULL, expire dans 7j)
      await Startup.createPendingApplication({
        editionId: selected.edition.id,
        email: value,
      });

      // 2. Envoi du magic-link (Supabase Auth) avec redirectPath=/Candidater?claim=1
      //    Le `?claim=1` déclenche le claim post-login dans Candidater.jsx.
      const redirectPath = `/Candidater?claim=1&edition=${encodeURIComponent(selected.edition.id)}`;
      const { error: sbError } = await signInWithMagicLink(value, redirectPath);
      if (sbError) throw sbError;

      setStatus('sent');
      onSent?.(value);
    } catch (err) {
       
      console.error('[Step1Picker] submit failed:', err);
      setError(mapError(err, t));
      setStatus('error');
    }
  };

  const sending = status === 'sending';

  if (status === 'sent') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="max-w-[480px] mx-auto text-center"
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: '#ecf1e5', border: '1px solid #cfe0bd' }}
        >
          <MailCheck className="w-6 h-6" style={{ color: '#1d6b4f' }} aria-hidden />
        </div>
        <h2
          className="text-[26px] mb-3"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(T.sentTitle)}
        </h2>
        <p className="text-[14px] leading-relaxed" style={{ color: INK }}>
          {t(T.sentBody)}{' '}
          <strong style={{ color: NAVY }}>{email.trim()}</strong>
        </p>
        <p className="text-xs leading-relaxed mt-3" style={{ color: MUTED }}>
          {t(T.sentHint)}
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus('idle');
            setError(null);
          }}
          className="mt-6 text-[13px] font-medium underline underline-offset-4 rounded-[4px] px-1 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ color: NAVY }}
        >
          {t(T.changeEmail)}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="max-w-[560px] mx-auto"
    >
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span
            className="uppercase text-[10px] tracking-[0.18em] font-medium"
            style={{ color: GOLD_TEXT }}
          >
            {t(T.eyebrow)}
          </span>
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
        </div>
        <h2
          className="text-[32px] leading-tight mb-3"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(T.title)}
        </h2>
        <p className="text-[14.5px] leading-relaxed max-w-[440px] mx-auto" style={{ color: INK }}>
          {t(T.subtitle)}
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field label={t(T.competitionLabel)} required>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={editionId}
              onChange={(e) => setEditionId(e.target.value)}
              placeholder={t(T.competitionPlaceholder)}
              options={options}
              disabled={sending || isLoading || options.length === 0}
            />
          )}
        </Field>

        {isLoading && (
          <div className="flex items-center gap-2 text-[12.5px]" style={{ color: MUTED }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: GOLD }} aria-hidden />
            {t(T.loading)}
          </div>
        )}

        {!isLoading && options.length === 0 && (
          <p className="text-[13px]" style={{ color: MUTED }}>
            {t(T.noCompetitions)}
          </p>
        )}

        <Field label={t(T.emailLabel)} helper={t(T.emailHelper)} required>
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t(T.emailPlaceholder)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={describedBy}
              invalid={invalid}
              disabled={sending}
            />
          )}
        </Field>

        <AnimatePresence>
          {status === 'error' && error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: EASE }}
              role="alert"
              className="flex items-start gap-2 px-3 py-2 rounded-[4px]"
              style={{ background: TINT_DANGER, border: `1px solid ${DANGER}33` }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: DANGER }} aria-hidden />
              <p className="text-[13px] leading-relaxed" style={{ color: DANGER }}>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 text-[14px] font-medium rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-70 disabled:cursor-not-allowed"
          style={{ background: NAVY, color: 'white', border: `1px solid ${NAVY}` }}
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              {t(T.submitting)}
            </>
          ) : (
            <>
              {t(T.submit)}
              <ArrowRight className="w-4 h-4" aria-hidden />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 pt-5 text-center text-[11px]" style={{ color: MUTED, borderTop: `1px solid ${CREAM2}` }}>
        {/* signature légale */}
        {t(T.legalSignature)}
      </p>
    </motion.div>
  );
}
