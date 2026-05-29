// /Concours — Dashboard public du concours (V3 visual refresh).
//
// Vitrine éditoriale ouverte à tous les utilisateurs authentifiés. La v3
// remplace le Hero éditorial générique par un H-Ambient (logo Rotary qui
// respire + KPI rail), insère une Timeline horizontale entre Hero et
// ClubSections, et ré-introduit la couleur thématique par session sur les
// cartes + dans le drawer détail.
//
// Pattern : auth-gate magic-link (redirige /Login si non authentifié — tout
// rôle authentifié OK). Lecture seule. RPC SECURITY DEFINER pour l'overview
// (gating + masquage des champs sensibles ; cf. docs/hardening/concours-v2-rls-audit.md).

import React, { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PageShell, TopNav, Footer } from '@/components/design';
import { NAVY, INK, MUTED, CREAM2 } from '@/components/design/tokens';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import ConcoursHero from '@/components/rsa/concours-dashboard/ConcoursHero';
import ConcoursTimeline from '@/components/rsa/concours-dashboard/ConcoursTimeline';
import ClubSection from '@/components/rsa/concours-dashboard/ClubSection';
import FinaleSection from '@/components/rsa/concours-dashboard/FinaleSection';
import SessionDetailDrawer from '@/components/rsa/concours-dashboard/SessionDetailDrawer';
import {
  useEditionsAvailable,
  useEditionOverview,
} from '@/components/rsa/concours-dashboard/useConcours';
import { UI } from '@/components/rsa/concours-dashboard/i18n';
import { computeCountdown } from '@/components/rsa/jury/constants';

function CenterSpinner({ label }) {
  return (
    <div
      className="min-h-[50vh] flex items-center justify-center gap-2.5"
      style={{ color: MUTED }}
    >
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-[13px]">{label}</span>
    </div>
  );
}

export default function Concours() {
  const { isAuthenticated, loading: authLoading } = usePlatformAuth();
  const { t } = useLang();

  const editionsQ = useEditionsAvailable();
  const editions = editionsQ.data || [];

  // Édition sélectionnée : par défaut, la plus récente 'open' OU sinon la plus
  // récente tout court (status != 'draft' déjà filtré).
  const [selectedEditionId, setSelectedEditionId] = useState(null);
  const effectiveEditionId = useMemo(() => {
    if (selectedEditionId) return selectedEditionId;
    if (editions.length === 0) return null;
    const open = editions.find((e) => e.status === 'open');
    return (open || editions[0]).id;
  }, [selectedEditionId, editions]);

  const overviewQ = useEditionOverview(effectiveEditionId);
  const [openSessionId, setOpenSessionId] = useState(null);

  const overview = overviewQ.data;
  const edition = overview?.edition;

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!overview) return null;
    const clubsCount = (overview.clubs || []).length;
    let total = 0;
    let done = 0;
    let nextSession = null;
    let nextDays = Infinity;
    const allClubSessions = Object.values(overview.sessions_by_club || {}).flat();
    for (const s of allClubSessions) {
      total += 1;
      const status = s?.config?.status || 'draft';
      if (status === 'published') done += 1;
      const cd = computeCountdown(s?.session_date);
      if (cd && (cd.kind === 'today' || cd.kind === 'tomorrow' || cd.kind === 'in')) {
        const d = cd.days;
        if (d < nextDays && status !== 'published') {
          nextDays = d;
          nextSession = s;
        }
      }
    }
    for (const s of overview.finale_sessions || []) {
      const cd = computeCountdown(s?.session_date);
      const status = s?.config?.status || 'draft';
      if (cd && (cd.kind === 'today' || cd.kind === 'tomorrow' || cd.kind === 'in')) {
        if (cd.days < nextDays && status !== 'published') {
          nextDays = cd.days;
          nextSession = s;
        }
      }
    }
    let nextLabel = null;
    if (nextSession) {
      const cd = computeCountdown(nextSession.session_date);
      const sName = nextSession.name || nextSession.theme || nextSession.id;
      if (cd?.kind === 'today') nextLabel = `${sName} · ${t(UI.today)}`;
      else if (cd?.kind === 'tomorrow') nextLabel = `${sName} · ${t(UI.tomorrow)}`;
      else nextLabel = `${sName} · ${t(UI.inDays)(cd?.days || 0)}`;
    }
    return {
      clubsCount,
      sessionsTotal: total,
      sessionsDone: done,
      finalistsCount: overview.finalists_count || 0,
      nextLabel,
    };
  }, [overview, t]);

  const finaleFinalists = useMemo(() => {
    if (!overview) return [];
    if (Array.isArray(overview.finalists)) return overview.finalists;
    return [];
  }, [overview]);

  const totalFinalistsExpected = useMemo(() => {
    if (!overview) return 0;
    const perSession = edition?.finalists_per_session ?? 1;
    const qualifyingCount = Object.values(overview.sessions_by_club || {})
      .flat()
      .filter((s) => s.kind !== 'finale').length;
    return perSession * qualifyingCount;
  }, [overview, edition]);

  const finaleSession = (overview?.finale_sessions || [])[0] || null;

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/Login" replace />;
  }

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
              <a
                href="mailto:contact@rotary-startup.org"
                style={{ color: NAVY, textDecoration: 'underline' }}
              >
                contact@rotary-startup.org
              </a>
            </span>
          }
        />
      }
    >
      {authLoading || editionsQ.isLoading ? (
        <CenterSpinner label={t(UI.loading)} />
      ) : editions.length === 0 ? (
        <div className="min-h-[50vh] flex items-center justify-center">
          <p className="text-[14px] italic" style={{ color: MUTED }}>
            {t(UI.noEdition)}
          </p>
        </div>
      ) : (
        <>
          <ConcoursHero
            edition={edition || editions.find((e) => e.id === effectiveEditionId)}
            editionsList={editions}
            onEditionChange={setSelectedEditionId}
            kpis={kpis}
          />

          {overviewQ.isLoading && <CenterSpinner label={t(UI.loading)} />}
          {overviewQ.isError && (
            <div
              role="alert"
              className="text-[13px] px-4 py-4 rounded-[4px]"
              style={{
                color: INK,
                background: TINT_DANGER,
                borderLeft: `2px solid ${DANGER}`,
              }}
            >
              {t(UI.loadError)}
            </div>
          )}

          {overview && (
            <>
              {/* Timeline horizontale — entre Hero et ClubSections. */}
              <ConcoursTimeline
                sessionsByClub={overview.sessions_by_club || {}}
                finaleSessions={overview.finale_sessions || []}
                clubs={overview.clubs || []}
                onOpenSession={(s) => setOpenSessionId(s.id)}
              />

              {(overview.clubs || []).length === 0 ? (
                <div
                  role="status"
                  className="text-[14px] italic px-6 py-10 text-center rounded-[8px] mb-12"
                  style={{
                    color: MUTED,
                    background: 'white',
                    border: `1px dashed ${CREAM2}`,
                  }}
                >
                  {t(UI.noClubs)}
                </div>
              ) : (
                (overview.clubs || []).map((club) => (
                  <ClubSection
                    key={club.id}
                    club={club}
                    sessions={overview.sessions_by_club?.[club.id] || []}
                    startupsCount={overview.startups_by_club?.[club.id] || 0}
                    startupsBySession={overview.startups_by_session}
                    jurorsBySession={overview.jurors_by_session}
                    finalistsBySource={overview.finalists_by_source_session}
                    onOpenSession={(s) => setOpenSessionId(s.id)}
                  />
                ))
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

      <SessionDetailDrawer
        sessionId={openSessionId}
        onClose={() => setOpenSessionId(null)}
      />
    </PageShell>
  );
}
