// /Concours — Dashboard public du concours (V2.5).
//
// Vitrine éditoriale ouverte à tous les utilisateurs authentifiés (jury,
// comité, club_admin, master_admin, candidat). Lecture seule, aucun panneau
// admin : un juré voit en 3 secondes l'état du concours (clubs participants,
// sessions à venir / live / terminées, prochaine session, finalistes), peut
// cliquer sur une session pour voir le détail (startups + decks + jurés).
//
// Pattern : reproduit le RsaJuryHub V1 (legacy 1107 lignes) en multi-club V2,
// en strict Élysée (navy/gold/cream) via les composants partagés. Auth-gate
// magic-link (redirige /Login si non authentifié — tout rôle authentifié OK).

import React, { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PageShell, TopNav, Footer } from '@/components/design';
import { NAVY, INK, MUTED, CREAM2 } from '@/components/design/tokens';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import ConcoursHero from '@/components/rsa/concours-dashboard/ConcoursHero';
import ClubSection from '@/components/rsa/concours-dashboard/ClubSection';
import FederatedFinaleSection from '@/components/rsa/concours-dashboard/FederatedFinaleSection';
import SessionDetailDrawer from '@/components/rsa/concours-dashboard/SessionDetailDrawer';
import {
  useEditionsAvailable,
  useEditionOverview,
} from '@/components/rsa/concours-dashboard/useConcours';
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

  const editionsQ = useEditionsAvailable();
  const editions = editionsQ.data || [];

  // Édition sélectionnée : par défaut, la plus récente 'open' OU sinon la plus
  // récente tout court (status != 'draft' déjà filtré par useEditionsAvailable).
  const [selectedEditionId, setSelectedEditionId] = useState(null);
  const effectiveEditionId = useMemo(() => {
    if (selectedEditionId) return selectedEditionId;
    if (editions.length === 0) return null;
    const open = editions.find((e) => e.status === 'open');
    return (open || editions[0]).id;
  }, [selectedEditionId, editions]);

  const overviewQ = useEditionOverview(effectiveEditionId);

  // Drawer state.
  const [openSessionId, setOpenSessionId] = useState(null);

  const overview = overviewQ.data;
  const edition = overview?.edition;

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!overview) return null;
    const clubsCount = (overview.clubs || []).length;
    // Sessions: tout sauf la finale fédérée ; le compte « done » = status 'published'.
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
    // La finale compte aussi dans le "prochain" si rien d'autre n'arrive.
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

  // ── Finalistes pour la section finale ────────────────────────────────────
  const finaleFinalists = useMemo(() => {
    if (!overview) return [];
    // On extrait les startups status='finaliste' depuis les indices ; comme on
    // n'a pas un endpoint dédié finaliste-par-source, on s'appuie sur
    // finalists_by_source_session pour compter, et on essaie d'afficher les
    // noms via le drawer detail (sinon liste vide).
    // Pour l'instant : on liste les sources et c'est tout. Le RPC final
    // (`rsa_concours_edition_overview`) DOIT idéalement renvoyer
    // `finalists: [{startup_name, source_session_name}]`.
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

  // ── Auth gate (after hooks to respect rules-of-hooks) ──────────────────────
  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/Login" replace />;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <PageShell
      width="wide"
      nav={
        <TopNav
          wordmark={t(UI.navTitle)}
          subtitle={t(UI.navSubtitle)}
        />
      }
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
              style={{ color: INK, background: TINT_DANGER, borderLeft: `2px solid ${DANGER}` }}
            >
              {t(UI.loadError)}
            </div>
          )}

          {overview && (
            <>
              {(overview.clubs || []).length === 0 ? (
                <div
                  role="status"
                  className="text-[14px] italic px-6 py-10 text-center rounded-[4px] mb-12"
                  style={{ color: MUTED, background: 'white', border: `1px dashed ${CREAM2}` }}
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

              <FederatedFinaleSection
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
