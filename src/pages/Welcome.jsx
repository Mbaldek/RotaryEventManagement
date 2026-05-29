// Welcome — page d'onboarding post-invite / post-promotion.
//
// Atterrissage après clic sur un magic link envoyé par l'edge function
// `invite-user` (M7 user-management) ou après approbation d'une candidature
// jury spontanée. Affiche un message contextualisé selon le rôle attribué,
// puis CTA vers l'espace correspondant.
//
// Query params : role={jury|comite|admin|club_admin|master_admin}, edition?,
// inviter? (nom du master_admin qui a invité, pour personnaliser le message).
//
// Auth-gate : si pas authentifié, redirige vers /Login en préservant les
// query params (computeLandingRoute prendra ensuite le relais via intent).
//
// Hero variant : H-Typo-Only (catalog §16.1). Giant serif greeting + italic
// role-aware subline. Pas d'icône, pas de carte. Signature `M-Editorial-Veil`.
// Cf. design-upgrade-blueprint §3.2 + §4.8.

import React from 'react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  PageShell,
  PlatformFooter,
  NAVY,
  GOLD,
  CREAM,
  CREAM2,
  INK,
  MUTED,
  SERIF,
  EASE,
} from '@/components/design';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';

const T = {
  greeting: { fr: 'Bonjour', en: 'Hello', de: 'Hallo' },
  loading: { fr: 'Connexion en cours…', en: 'Signing you in…', de: 'Anmeldung läuft…' },
  signedInAs: { fr: 'Connecté en tant que', en: 'Signed in as', de: 'Angemeldet als' },
  invitedBy: { fr: 'Invité par', en: 'Invited by', de: 'Eingeladen von' },
  // Sub-line italique en serif + CTA par rôle. Body retiré : la sous-ligne porte le sens.
  rolesT: {
    jury: {
      subline: {
        fr: 'Votre fauteuil de juge vous attend.',
        en: 'Your jury seat is ready.',
        de: 'Ihr Platz in der Jury wartet.',
      },
      cta: { fr: 'Accéder à mon espace jury', en: 'Open my jury area', de: 'Zu meinem Jury-Bereich' },
      to: '/Jury',
    },
    comite: {
      subline: {
        fr: 'Le comité ouvre ses dossiers.',
        en: 'The committee opens its dossiers.',
        de: 'Das Komitee öffnet seine Akten.',
      },
      cta: { fr: 'Accéder à la Sélection', en: 'Open Selection', de: 'Zum Auswahlbereich' },
      to: '/Selection',
    },
    club_admin: {
      subline: {
        fr: 'Votre cockpit club vous attend.',
        en: 'Your club cockpit is ready.',
        de: 'Ihr Club-Cockpit wartet.',
      },
      cta: { fr: 'Accéder au cockpit', en: 'Open cockpit', de: 'Cockpit öffnen' },
      to: '/Admin',
    },
    admin: {
      subline: {
        fr: "L'édition vous attend.",
        en: 'The edition awaits.',
        de: 'Die Ausgabe wartet.',
      },
      cta: { fr: "Accéder à l'Admin", en: 'Open Admin', de: 'Zur Administration' },
      to: '/Admin',
    },
    master_admin: {
      subline: {
        fr: 'La plateforme est entre vos mains.',
        en: 'The platform is in your hands.',
        de: 'Die Plattform liegt in Ihren Händen.',
      },
      cta: { fr: 'Accéder au cockpit Master', en: 'Open Master cockpit', de: 'Master-Cockpit öffnen' },
      to: '/Admin',
    },
  },
  fallback: {
    subline: {
      fr: 'Votre rôle se précise.',
      en: 'Your role is being set up.',
      de: 'Ihre Rolle wird eingerichtet.',
    },
    cta: { fr: 'Mon dossier', en: 'My application', de: 'Meine Bewerbung' },
    to: '/MonDossier',
  },
};

const ALLOWED_ROLES = new Set(['jury', 'comite', 'club_admin', 'admin', 'master_admin']);

// Extrait un prénom depuis full_name (en gardant le premier mot) ou le préfixe
// de l'email. "mathieu.balde@gmail.com" → "Mathieu", "Mathieu Baldé" → "Mathieu".
function extractFirstName(user) {
  if (!user) return null;
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (fullName && typeof fullName === 'string') {
    const first = fullName.trim().split(/\s+/)[0];
    if (first) return first.charAt(0).toUpperCase() + first.slice(1);
  }
  if (user?.email) {
    const prefix = user.email.split('@')[0];
    const word = prefix.replace(/[._-].*$/, '');
    if (word) return word.charAt(0).toUpperCase() + word.slice(1);
  }
  return null;
}

export default function Welcome() {
  const { t } = useLang();
  const { isAuthenticated, authUser, loading } = usePlatformAuth();
  const [searchParams] = useSearchParams();
  const reduce = useReducedMotion();

  const role = searchParams.get('role');
  const edition = searchParams.get('edition');
  const inviter = searchParams.get('inviter');

  // Auth-gate : on préserve les query params pour que le post-login route bien.
  if (loading) {
    return (
      <PageShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-[13.5px]" style={{ color: MUTED }}>{t(T.loading)}</p>
        </div>
      </PageShell>
    );
  }
  if (!isAuthenticated) {
    const qs = searchParams.toString();
    const next = `/Welcome${qs ? '?' + qs : ''}`;
    return <Navigate to={`/Login?next=${encodeURIComponent(next)}`} replace />;
  }

  const cfg = (role && ALLOWED_ROLES.has(role)) ? T.rolesT[role] : T.fallback;
  const firstName = extractFirstName(authUser);
  const greetingLine = firstName ? `${t(T.greeting)}, ${firstName}.` : `${t(T.greeting)}.`;

  return (
    <PageShell nav footer={<PlatformFooter />}>
      {/* Signature M-Editorial-Veil (catalog §16.6) — voile CREAM se lève en 600ms. */}
      {!reduce && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="fixed inset-0 z-[60] pointer-events-none"
          style={{ background: CREAM }}
        />
      )}

      <div className="min-h-[70vh] flex items-center py-12">
        <div className="w-full max-w-[760px] mx-auto">
          {/* Hero H-Typo-Only — giant serif greeting + italic sub-line role-aware. */}
          <motion.h1
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.25 }}
            className="font-normal"
            style={{
              fontFamily: SERIF,
              color: NAVY,
              fontSize: 'clamp(56px, 9vw, 104px)',
              lineHeight: 0.95,
              letterSpacing: '-0.01em',
            }}
          >
            {greetingLine}
          </motion.h1>

          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.42 }}
            className="mt-5 italic"
            style={{
              fontFamily: SERIF,
              color: INK,
              fontSize: 'clamp(18px, 2.4vw, 24px)',
              lineHeight: 1.3,
            }}
          >
            {t(cfg.subline)}
          </motion.p>

          {/* Meta editorial — signed in as, invited by, edition. */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.6 }}
            className="mt-10 text-[12px] uppercase tracking-[0.14em]"
            style={{ color: MUTED }}
          >
            <div>
              {t(T.signedInAs)}{' '}
              <span className="normal-case tracking-normal" style={{ color: INK }}>
                {authUser?.email}
              </span>
            </div>
            {inviter && (
              <div className="mt-1.5">
                {t(T.invitedBy)}{' '}
                <span className="normal-case tracking-normal" style={{ color: INK }}>
                  {inviter}
                </span>
                {edition && (
                  <span className="normal-case tracking-normal" style={{ color: MUTED }}>
                    {' · '}{edition}
                  </span>
                )}
              </div>
            )}
            {!inviter && edition && (
              <div className="mt-1.5 normal-case tracking-normal" style={{ color: MUTED }}>
                {edition}
              </div>
            )}
          </motion.div>

          {/* CTA C-Single-Primary — un seul bouton NAVY. */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.75 }}
            className="mt-12"
          >
            <Link
              to={cfg.to}
              className="inline-flex items-center justify-center min-h-[44px] px-6 text-[14px] font-medium rounded-[4px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
              style={{ background: NAVY, color: 'white', border: `1px solid ${NAVY}` }}
            >
              {t(cfg.cta)} →
            </Link>
          </motion.div>

          <div className="mt-16 pt-5" style={{ borderTop: `1px solid ${CREAM2}` }}>
            <p className="text-[11px]" style={{ color: MUTED }}>
              Rotary Startup Award
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
