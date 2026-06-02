// /Concours — programme éditorial de la saison (refonte « La Saison »).
// Édition active unique (open || plus récente). Sessions chronologiques.
// Frise sticky = nav. Veil au mount. Lecture seule, auth-gate magic-link.
import React, { useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { PageShell, TopNav, Footer } from '@/components/design';
import { NAVY, CREAM, INK, MUTED, SERIF, EASE } from '@/components/design/tokens';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import ConcoursHero from '@/components/rsa/concours-dashboard/ConcoursHero';
import ConcoursTimeline from '@/components/rsa/concours-dashboard/ConcoursTimeline';
import SeasonProgram from '@/components/rsa/concours-dashboard/SeasonProgram';
import FinaleSection from '@/components/rsa/concours-dashboard/FinaleSection';
import SessionDetailDrawer from '@/components/rsa/concours-dashboard/SessionDetailDrawer';
import { useEditionsAvailable, useEditionOverview } from '@/components/rsa/concours-dashboard/useConcours';
import { buildSeason } from '@/components/rsa/concours-dashboard/seasonModel';
import { useScrollSpy, scrollToSession } from '@/components/rsa/concours-dashboard/useScrollSpy';
import { UI } from '@/components/rsa/concours-dashboard/i18n';
import { computeCountdown } from '@/components/rsa/jury/constants';

function CenterSpinner({ label }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center gap-2.5" style={{ color: MUTED }}>
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-[13px]">{label}</span>
    </div>
  );
}

export default function Concours() {
  const { isAuthenticated, loading: authLoading } = usePlatformAuth();
  const { t, lang } = useLang();
  const reduce = useReducedMotion();

  // ?edition=<id> scope la vitrine sur une compétition précise (liens diffusés).
  // Absent → fallback sur l'édition ouverte, sinon la plus récente.
  const [searchParams] = useSearchParams();
  const editionParam = searchParams.get('edition');

  const editionsQ = useEditionsAvailable();
  const editions = editionsQ.data || [];

  const edition = useMemo(() => {
    if (editions.length === 0) return null;
    if (editionParam) {
      const scoped = editions.find((e) => e.id === editionParam);
      if (scoped) return scoped;
    }
    return editions.find((e) => e.status === 'open') || editions[0];
  }, [editions, editionParam]);

  const overviewQ = useEditionOverview(edition?.id);
  const overview = overviewQ.data;
  const [openSessionId, setOpenSessionId] = useState(null);

  const season = useMemo(() => buildSeason(overview, lang), [overview, lang]);
  const ids = useMemo(() => season.flat.map((s) => s.id), [season]);
  const activeId = useScrollSpy(ids);

  const kpis = useMemo(() => {
    if (!overview) return null;
    const flat = season.flat;
    const done = flat.filter((s) => s.status === 'published').length;
    const next = flat.find((s) => s.id === season.nextId);
    let nextLabel = null;
    if (next) {
      const cd = computeCountdown(next.session_date);
      const nm = next.name || next.theme || next.id;
      if (cd?.kind === 'today') nextLabel = `${nm} · ${t(UI.today)}`;
      else if (cd?.kind === 'tomorrow') nextLabel = `${nm} · ${t(UI.tomorrow)}`;
      else if (cd?.kind === 'in') nextLabel = `${nm} · ${t(UI.inDays)(cd.days)}`;
    }
    return {
      clubsCount: (overview.clubs || []).length,
      sessionsTotal: flat.length,
      sessionsDone: done,
      finalistsCount: overview.finalists_count || 0,
      nextLabel,
    };
  }, [overview, season, t]);

  const finaleSession = (overview?.finale_sessions || [])[0] || null;
  const finaleFinalists = Array.isArray(overview?.finalists) ? overview.finalists : [];
  const totalFinalistsExpected = useMemo(() => {
    if (!overview) return 0;
    const per = edition?.finalists_per_session ?? 1;
    return per * season.flat.length;
  }, [overview, edition, season]);

  if (!authLoading && !isAuthenticated) return <Navigate to="/Login" replace />;

  const veil = !reduce && (
    <motion.div
      aria-hidden
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="fixed inset-0 z-[60] pointer-events-none"
      style={{ background: CREAM }}
    />
  );

  return (
    <PageShell
      width="wide"
      nav={<TopNav wordmark={t(UI.navTitle)} subtitle={t(UI.navSubtitle)} />}
      footer={
        <Footer
          width="wide"
          left={t(UI.footerLine)}
          right={
            <span>
              {t(UI.footerContact)}{' '}
              <a href="mailto:contact@rotary-startup.org" style={{ color: NAVY, textDecoration: 'underline' }}>
                contact@rotary-startup.org
              </a>
            </span>
          }
        />
      }
    >
      {veil}
      {authLoading || editionsQ.isLoading ? (
        <CenterSpinner label={t(UI.loading)} />
      ) : editions.length === 0 ? (
        <div className="py-16 max-w-[44ch] mx-auto text-center">
          <p className="italic text-[18px]" style={{ fontFamily: SERIF, color: NAVY }}>{t(UI.noEdition)}</p>
        </div>
      ) : (
        <>
          <ConcoursHero edition={edition} kpis={kpis} />
          {overviewQ.isLoading && <CenterSpinner label={t(UI.loading)} />}
          {overviewQ.isError && (
            <div
              role="alert"
              className="text-[13px] px-4 py-4 rounded-[4px]"
              style={{ color: INK, background: TINT_DANGER, borderLeft: `2px solid ${DANGER}` }}
            >
              {t(UI.loadError)}
            </div>
          )}
          {overview && (
            <>
              <ConcoursTimeline
                season={season}
                finaleSessions={overview.finale_sessions || []}
                activeId={activeId}
                onJump={scrollToSession}
                lang={lang}
              />
              {season.flat.length === 0 ? (
                <div className="py-12 max-w-[44ch] mx-auto text-center">
                  <p className="italic text-[18px]" style={{ fontFamily: SERIF, color: NAVY }}>{t(UI.noClubs)}</p>
                </div>
              ) : (
                <SeasonProgram season={season} overview={overview} onOpenSession={(s) => setOpenSessionId(s.id)} />
              )}
              <FinaleSection
                edition={edition}
                finaleSession={finaleSession}
                finalists={finaleFinalists}
                totalFinalistsExpected={totalFinalistsExpected}
              />
            </>
          )}
        </>
      )}
      <SessionDetailDrawer sessionId={openSessionId} onClose={() => setOpenSessionId(null)} />
    </PageShell>
  );
}
