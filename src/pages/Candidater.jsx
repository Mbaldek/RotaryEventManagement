// Candidater — V3 Vague 2, feature E : page publique self-signup.
//
// Trois états :
//   1. Anonyme (discovery)         — Hero éditorial + OpenCompetitions + section
//                                    Step1Picker pré-remplissable.
//   2. Anonyme avec ?edition=…    — Step1Picker pré-renseigné (deep link depuis
//                                    OpenCompetitions card "Candidater").
//   3. Authentifié (claim=1)      — Auto-claim du draft pending + redirection
//                                    vers /MonDossier?edition=… (route propre,
//                                    réutilise toute l'infra existante).
//
// SEO :
//   - document.title (FR/EN/DE selon useLang)
//   - meta description
//   - meta og:title / og:description / og:locale dynamiques
//
// L'auth-gate de PlatformAuthProvider reste optionnel ici : la page DOIT être
// publique (anon OK) puisque c'est le point d'entrée des candidatures. La
// logique d'auth est gérée par les conditions ci-dessous (sans Navigate).

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MailCheck } from 'lucide-react';
import {
  PageShell, Footer,
  Eyebrow, EditorialTitle,
  GOLD, NAVY, INK, MUTED, CREAM2, SERIF, EASE,
} from '@/components/design';

// Hero variant : H-Step-Pictogram (catalog §16.1) — step counter `01 / 03` +
// serif title + intro. Casse l'adjacence avec DevenirJury (H-Vertical-Rule).
// Section opener : S-Numbered (catalog §16.2). Signature micro : M-Gold-Sweep.
// Cf. design-upgrade-blueprint §3.3 + §4.12.
const FUNNEL_STEP = { current: 1, total: 3 };
import { useLang } from '@/lib/platform/i18n';
import { usePlatformAuth } from '@/lib/platform/auth';
import OpenCompetitions from '@/components/rsa/candidature/OpenCompetitions';
import Step1Picker from '@/components/rsa/candidature/Step1Picker';
import { Startup } from '@/lib/rsa/entities';

const T = {
  eyebrow: { fr: 'Candidatures ouvertes', en: 'Open applications', de: 'Offene Bewerbungen' },
  stepLabel: { fr: 'Étape', en: 'Step', de: 'Schritt' },
  titleLead: {
    fr: 'Postulez au Rotary Startup Award',
    en: 'Apply to the Rotary Startup Award',
    de: 'Bewerben Sie sich für den Rotary Startup Award',
  },
  subtitle: {
    fr: 'Choisissez la compétition qui vous correspond. Chaque dossier est examiné par le comité du club organisateur.',
    en: 'Pick the competition that matches you. Every application is reviewed by the committee of the organising club.',
    de: 'Wählen Sie den passenden Wettbewerb. Jede Bewerbung wird vom Komitee des organisierenden Clubs geprüft.',
  },
  sectionEyebrow: { fr: 'Compétitions', en: 'Competitions', de: 'Wettbewerbe' },
  startEyebrow: { fr: 'Démarrez en 30 secondes', en: 'Get started in 30 seconds', de: 'In 30 Sekunden starten' },
  footerLeft: {
    fr: `© ${new Date().getFullYear()} Rotary Startup Award`,
    en: `© ${new Date().getFullYear()} Rotary Startup Award`,
    de: `© ${new Date().getFullYear()} Rotary Startup Award`,
  },
  // SEO
  metaTitle: {
    fr: 'Candidater — Rotary Startup Award',
    en: 'Apply — Rotary Startup Award',
    de: 'Bewerben — Rotary Startup Award',
  },
  metaDescription: {
    fr: "Postulez au Rotary Startup Award. Choisissez votre compétition, démarrez votre dossier en quelques minutes — sans mot de passe.",
    en: 'Apply to the Rotary Startup Award. Pick your competition and start your application in a few minutes — no password needed.',
    de: 'Bewerben Sie sich beim Rotary Startup Award. Wählen Sie Ihren Wettbewerb und starten Sie Ihre Bewerbung in wenigen Minuten — ohne Passwort.',
  },
  // Claim flow
  claimingTitle: {
    fr: 'Connexion en cours…',
    en: 'Signing you in…',
    de: 'Anmeldung läuft…',
  },
  claimedTitle: {
    fr: 'Bienvenue — votre dossier est ouvert',
    en: 'Welcome — your application is open',
    de: 'Willkommen — Ihre Bewerbung ist geöffnet',
  },
  claimedSubtitle: {
    fr: 'Nous vous redirigeons vers votre espace candidat.',
    en: 'Redirecting you to your applicant space.',
    de: 'Sie werden in Ihren persönlichen Bewerberbereich weitergeleitet.',
  },
};

function useSeoMeta(lang, t) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const prevTitle = document.title;
    document.title = t(T.metaTitle);

    // helpers pour upsert meta tags
    const setMeta = (selector, attr, value) => {
      let tag = document.querySelector(selector);
      if (!tag) {
        tag = document.createElement('meta');
        const [, k, v] = selector.match(/\[([^=]+)="([^"]+)"\]/) || [];
        if (k && v) tag.setAttribute(k, v);
        document.head.appendChild(tag);
      }
      tag.setAttribute(attr, value);
      return tag;
    };

    const desc = t(T.metaDescription);
    const title = t(T.metaTitle);
    setMeta('meta[name="description"]', 'content', desc);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[property="og:type"]', 'content', 'website');
    setMeta('meta[property="og:locale"]', 'content', lang === 'fr' ? 'fr_FR' : lang === 'de' ? 'de_DE' : 'en_US');

    return () => {
      document.title = prevTitle;
    };
  }, [lang, t]);
}

export default function Candidater() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading, authUser } = usePlatformAuth();

  const claim = searchParams.get('claim') === '1';
  const editionParam = searchParams.get('edition') || null;
  const clubParam = searchParams.get('club') || null;

  // SEO meta — toujours actif quel que soit l'état.
  useSeoMeta(lang, t);

  // ── Claim flow : si on arrive avec ?claim=1 ET un user authentifié,
  //    on appelle rsa_claim_pending_application puis on route vers /MonDossier.
  const [claimState, setClaimState] = useState('idle'); // idle | claiming | done | error
  useEffect(() => {
    if (!claim) return;
    if (authLoading) return;
    if (!isAuthenticated) return; // pas encore signé : on attend l'arrivée du JWT
    if (claimState !== 'idle') return;

    let active = true;
    (async () => {
      setClaimState('claiming');
      try {
        await Startup.claimPending();
        if (!active) return;
        setClaimState('done');
        // ÉQUIPE A — F4 : on a réduit le délai UX de 900ms → 200ms.
        // L'état "done" reste affiché brièvement pour confirmer visuellement
        // le succès, mais on n'attend plus inutilement avant le redirect.
        setTimeout(() => {
          if (!active) return;
          const target = editionParam
            ? `/MonDossier?edition=${encodeURIComponent(editionParam)}`
            : '/MonDossier';
          navigate(target, { replace: true });
        }, 200);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Candidater] claim failed:', err);
        if (!active) return;
        // Échec rare : on route quand même vers /MonDossier — la RLS
        // pending_self_read autorise toujours la lecture du draft.
        setClaimState('error');
        // F4 : 600ms → 200ms aussi côté erreur pour la cohérence.
        setTimeout(() => {
          if (!active) return;
          navigate('/MonDossier', { replace: true });
        }, 200);
      }
    })();
    return () => { active = false; };
  }, [claim, authLoading, isAuthenticated, editionParam, navigate, claimState]);

  // Si l'utilisateur est déjà authentifié SANS flag claim : on l'envoie sur
  // /MonDossier (il est déjà connecté, pas besoin de re-choisir).
  // V3 bug bash V4 — préserve les query params `?edition=…&club=…` pour que les
  // deep-links partagés par les clubs (ex. "candidatez à RSA 2027 - Paris") ne
  // perdent pas leur contexte quand le destinataire est déjà loggé.
  useEffect(() => {
    if (claim) return;
    if (authLoading) return;
    if (isAuthenticated && authUser) {
      const params = new URLSearchParams();
      if (editionParam) params.set('edition', editionParam);
      if (clubParam) params.set('club', clubParam);
      const qs = params.toString();
      navigate(qs ? `/MonDossier?${qs}` : '/MonDossier', { replace: true });
    }
  }, [claim, authLoading, isAuthenticated, authUser, navigate, editionParam, clubParam]);

  const initialEdition = useMemo(() => editionParam, [editionParam]);
  const initialClub = useMemo(() => clubParam, [clubParam]);

  // ── Claim view ─────────────────────────────────────────────────────────────
  if (claim && (authLoading || claimState === 'claiming' || claimState === 'done')) {
    return (
      <PageShell nav width="wide" footer={<Footer width="wide" left={t(T.footerLeft)} />}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="text-center max-w-[420px]"
          >
            {claimState === 'done' ? (
              <>
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: '#ecf1e5', border: '1px solid #cfe0bd' }}
                >
                  <MailCheck className="w-6 h-6" style={{ color: '#1d6b4f' }} aria-hidden />
                </div>
                <h1 className="text-[28px] mb-3" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
                  {t(T.claimedTitle)}
                </h1>
                <p className="text-[14px]" style={{ color: INK }}>{t(T.claimedSubtitle)}</p>
              </>
            ) : (
              <>
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-4" style={{ color: GOLD }} aria-hidden />
                <p className="text-[14px]" style={{ color: NAVY, fontFamily: SERIF }}>
                  {t(T.claimingTitle)}
                </p>
              </>
            )}
          </motion.div>
        </div>
      </PageShell>
    );
  }

  // ── Discovery + Step1 (default) ────────────────────────────────────────────
  return (
    <PageShell nav width="wide" footer={<Footer width="wide" left={t(T.footerLeft)} />}>
      {/* Hero H-Step-Pictogram — step counter + serif title. */}
      <header className="mb-10 md:mb-12 max-w-[680px]">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="uppercase text-[11px] tracking-[0.18em] font-medium"
            style={{ color: GOLD }}
          >
            {t(T.stepLabel)}
          </span>
          <span
            className="text-[16px] tabular-nums"
            style={{ color: NAVY, fontFamily: SERIF }}
          >
            {String(FUNNEL_STEP.current).padStart(2, '0')} / {String(FUNNEL_STEP.total).padStart(2, '0')}
          </span>
          <span aria-hidden className="h-px w-8" style={{ background: CREAM2 }} />
          <span
            className="uppercase text-[10.5px] tracking-[0.18em] font-medium"
            style={{ color: MUTED }}
          >
            {t(T.eyebrow)}
          </span>
        </div>
        <EditorialTitle lead={t(T.titleLead)} size="md" />
        <p
          className="mt-4 text-[15.5px] max-w-[60ch]"
          style={{ color: INK, lineHeight: 1.65 }}
        >
          {t(T.subtitle)}
        </p>
      </header>

      {/* Rail de progression candidat — cohérent avec MonDossier. Étape 1 = Dossier. */}
      <nav
        aria-label={t({ fr: 'Parcours candidat', en: 'Applicant journey', de: 'Bewerbungspfad' })}
        className="mb-10 md:mb-14 max-w-[680px]"
      >
        <ol className="grid grid-cols-4 gap-2 md:gap-3" role="list">
          {[
            { n: 1, label: { fr: 'Dossier',  en: 'Dossier',    de: 'Akte' } },
            { n: 2, label: { fr: 'Soumis',   en: 'Submitted',  de: 'Eingereicht' } },
            { n: 3, label: { fr: 'Sélec.',   en: 'Selection',  de: 'Auswahl' } },
            { n: 4, label: { fr: 'Finale',   en: 'Finale',     de: 'Finale' } },
          ].map((stage, i, arr) => {
            const isCurrent = stage.n === 1;
            const last = i === arr.length - 1;
            return (
              <li key={stage.n} className="flex flex-col">
                <div className="flex items-center w-full">
                  <span
                    aria-hidden
                    className="shrink-0 inline-flex items-center justify-center rounded-full"
                    style={{
                      width: 12,
                      height: 12,
                      background: isCurrent ? GOLD : 'transparent',
                      border: `1.5px solid ${isCurrent ? GOLD : CREAM2}`,
                    }}
                  />
                  {!last && (
                    <span
                      aria-hidden
                      className="ml-1 flex-1 h-px"
                      style={{ background: CREAM2 }}
                    />
                  )}
                </div>
                <span
                  className="mt-2 uppercase text-[10px] tracking-[0.14em] font-medium tabular-nums"
                  style={{ color: isCurrent ? NAVY : MUTED }}
                >
                  {String(stage.n).padStart(2, '0')}·{t(stage.label)}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[12.5px] italic" style={{ fontFamily: SERIF, color: INK }}>
          {t({
            fr: 'Démarrez ici · 4 étapes jusqu\'à la finale.',
            en: 'Start here · 4 stages until the finale.',
            de: 'Hier starten · 4 Etappen bis zum Finale.',
          })}
        </p>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,420px)] gap-10 lg:gap-12">
        {/* Liste des compétitions ouvertes — section opener S-Numbered. */}
        <section aria-labelledby="open-competitions-title">
          <div className="mb-5 flex items-baseline gap-3">
            <span
              className="tabular-nums text-[14px]"
              style={{ fontFamily: SERIF, color: GOLD }}
            >
              01
            </span>
            <span aria-hidden className="h-px flex-1 max-w-[40px]" style={{ background: CREAM2 }} />
            <h2
              id="open-competitions-title"
              className="text-[14px] m-0"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {t(T.sectionEyebrow)}
            </h2>
          </div>
          <OpenCompetitions />
        </section>

        {/* Picker self-signup (Step1) */}
        <aside aria-labelledby="start-step1-title">
          <div className="lg:sticky lg:top-6">
            <div
              className="rounded-[4px] p-5 md:p-7"
              style={{ background: 'white', border: `1px solid ${CREAM2}` }}
            >
              <h2 id="start-step1-title" className="sr-only">{t(T.startEyebrow)}</h2>
              <AnimatePresence mode="wait">
                <Step1Picker
                  key="step1"
                  initialEdition={initialEdition}
                  initialClub={initialClub}
                />
              </AnimatePresence>
            </div>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
