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

import React from 'react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import {
  PageShell,
  NAVY,
  GOLD,
  CREAM2,
  INK,
  MUTED,
  SERIF,
  EASE,
} from '@/components/design';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';

const T = {
  eyebrow: { fr: 'Bienvenue', en: 'Welcome', de: 'Willkommen' },
  loading: { fr: 'Connexion en cours…', en: 'Signing you in…', de: 'Anmeldung läuft…' },
  signedInAs: { fr: 'Connecté en tant que', en: 'Signed in as', de: 'Angemeldet als' },
  invitedBy: { fr: 'Invité par', en: 'Invited by', de: 'Eingeladen von' },
  forEdition: { fr: 'pour', en: 'for', de: 'für' },
  // Messages par rôle
  rolesT: {
    jury: {
      title: { fr: 'Vous êtes désormais membre du jury.', en: 'You are now a jury member.', de: 'Sie sind nun Mitglied der Jury.' },
      body: {
        fr: 'Votre espace jury rassemble les sessions auxquelles vous êtes assigné, les dossiers à pré-lire et la grille de notation. Vous recevrez un email à chaque nouvelle assignation.',
        en: 'Your jury area gathers your assigned sessions, dossiers to pre-read, and the scoring grid. You will receive an email for each new assignment.',
        de: 'Ihr Jury-Bereich vereint die Ihnen zugewiesenen Sessions, die vorab zu lesenden Dossiers und das Bewertungsraster. Sie erhalten bei jeder neuen Zuweisung eine E-Mail.',
      },
      cta: { fr: 'Accéder à mon espace jury', en: 'Open my jury area', de: 'Zu meinem Jury-Bereich' },
      to: '/Jury',
    },
    comite: {
      title: { fr: 'Vous êtes désormais membre du comité.', en: 'You are now a committee member.', de: 'Sie sind nun Mitglied des Komitees.' },
      body: {
        fr: "Votre espace Sélection vous permet de pré-classer les candidatures de votre club et de les transmettre au jury.",
        en: 'Your Selection area lets you pre-rank applications for your club and forward them to the jury.',
        de: 'Im Bereich „Auswahl" können Sie die Bewerbungen Ihres Clubs vorab klassieren und an die Jury weiterleiten.',
      },
      cta: { fr: 'Accéder à la Sélection', en: 'Open Selection', de: 'Zum Auswahlbereich' },
      to: '/Selection',
    },
    club_admin: {
      title: { fr: 'Vous êtes désormais administrateur de votre club.', en: 'You now administer your club.', de: 'Sie sind nun Administrator·in Ihres Clubs.' },
      body: {
        fr: 'Votre cockpit club centralise la configuration de votre édition, vos membres (comité, jury), vos candidatures et vos sessions.',
        en: 'Your club cockpit centralises edition setup, members (committee, jury), applications and sessions.',
        de: 'Ihr Club-Cockpit bündelt die Konfiguration Ihrer Ausgabe, Ihrer Mitglieder (Komitee, Jury), Ihrer Bewerbungen und Ihrer Sessions.',
      },
      cta: { fr: 'Accéder au cockpit', en: 'Open cockpit', de: 'Cockpit öffnen' },
      to: '/Admin',
    },
    admin: {
      title: { fr: 'Vous êtes désormais administrateur de la plateforme.', en: 'You now administer the platform.', de: 'Sie sind nun Administrator·in der Plattform.' },
      body: {
        fr: "Le cockpit Admin vous donne accès à la configuration de l'édition, des sessions, des décisions de sélection et des résultats.",
        en: 'The Admin cockpit grants access to edition setup, sessions, selection decisions and results.',
        de: 'Das Admin-Cockpit gibt Ihnen Zugriff auf die Konfiguration der Ausgabe, der Sessions, der Auswahlentscheidungen sowie der Ergebnisse.',
      },
      cta: { fr: 'Accéder à l’Admin', en: 'Open Admin', de: 'Zur Administration' },
      to: '/Admin',
    },
    master_admin: {
      title: { fr: 'Vous êtes désormais master admin.', en: 'You are now master admin.', de: 'Sie sind nun Master-Administrator·in.' },
      body: {
        fr: 'Le cockpit Master pilote toute la plateforme : compétitions, clubs, rôles globaux et finale fédérée.',
        en: 'The Master cockpit drives the whole platform: competitions, clubs, global roles and federated finale.',
        de: 'Das Master-Cockpit steuert die gesamte Plattform: Wettbewerbe, Clubs, globale Rollen und föderiertes Finale.',
      },
      cta: { fr: 'Accéder au cockpit Master', en: 'Open Master cockpit', de: 'Master-Cockpit öffnen' },
      to: '/Admin',
    },
  },
  fallback: {
    title: { fr: 'Bienvenue sur la plateforme.', en: 'Welcome to the platform.', de: 'Willkommen auf der Plattform.' },
    body: {
      fr: "Votre rôle n'est pas encore configuré. Contactez un administrateur si vous pensez qu'il s'agit d'une erreur.",
      en: 'Your role is not configured yet. Contact an administrator if you think this is a mistake.',
      de: 'Ihre Rolle ist noch nicht eingerichtet. Bitte wenden Sie sich an die Administration, falls Sie hier einen Fehler vermuten.',
    },
    cta: { fr: 'Mon dossier', en: 'My application', de: 'Meine Bewerbung' },
    to: '/MonDossier',
  },
};

const ALLOWED_ROLES = new Set(['jury', 'comite', 'club_admin', 'admin', 'master_admin']);

export default function Welcome() {
  const { t } = useLang();
  const { isAuthenticated, authUser, loading } = usePlatformAuth();
  const [searchParams] = useSearchParams();

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

  return (
    <PageShell nav>
      <div className="min-h-[60vh] flex items-center justify-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="max-w-[520px] mx-auto text-center"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: '#ecf1e5', border: '1px solid #cfe0bd' }}
          >
            <CheckCircle2 className="w-6 h-6" style={{ color: '#1d6b4f' }} aria-hidden />
          </div>

          <div className="flex items-center justify-center gap-2.5 mb-4">
            <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
            <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
              {t(T.eyebrow)}
            </span>
            <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          </div>

          <h1
            className="text-[28px] leading-tight mb-3"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(cfg.title)}
          </h1>

          <p className="text-[14.5px] leading-relaxed mb-6" style={{ color: INK }}>
            {t(cfg.body)}
          </p>

          <div className="text-[12.5px] mb-7" style={{ color: MUTED }}>
            <div>
              {t(T.signedInAs)} <strong style={{ color: INK }}>{authUser?.email}</strong>
            </div>
            {inviter && (
              <div className="mt-1">
                {t(T.invitedBy)} <strong style={{ color: INK }}>{inviter}</strong>
                {edition && <> · RSA {edition}</>}
              </div>
            )}
            {!inviter && edition && (
              <div className="mt-1">RSA {edition}</div>
            )}
          </div>

          <Link
            to={cfg.to}
            className="inline-flex items-center justify-center min-h-[44px] px-6 text-[14px] font-medium rounded-[4px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
            style={{ background: NAVY, color: 'white', border: `1px solid ${NAVY}` }}
          >
            {t(cfg.cta)}
          </Link>

          <div className="mt-7 pt-5 text-center" style={{ borderTop: `1px solid ${CREAM2}` }}>
            <p className="text-[11px]" style={{ color: MUTED }}>
              Rotary Startup Award
            </p>
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
}
