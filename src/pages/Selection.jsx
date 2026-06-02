// Espace Sélection — orchestrateur du Module 2 (comité + admin).
//
// Flux : auth-gate (-> /Login) -> role-gate (comité OU admin) -> filtres + tableau
// + drawer détail (sheet overlay). Filtres lifted ici ; les hooks vivent dans useSelection.
//
// Refonte 2026-06-02 : la file passe d'une liste éditoriale (GroupedQueue par club /
// QueueList plate) à un TABLEAU filtrable unifié (QueueTable) — tient à l'échelle
// (~10 000 startups / ~200 clubs). Le club devient une colonne + un filtre.
// Cf. docs/blueprints/selection-queue-table.md.

import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import {
  PageShell,
  PlatformFooter,
  Eyebrow,
  GOLD,
  NAVY,
  INK,
  CREAM,
  CREAM2,
  SERIF,
  EASE,
} from '@/components/design';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import {
  FiltersBar,
  DossierDrawer,
  STATUS_FILTERS,
  pickEffectiveReview,
  useEditions,
  useSessionsForEdition,
  useSelectionQueue,
  useDossierDetail,
  useReviews,
  useUpsertReview,
  useFinalizeReview,
  useAdminOverride,
} from '@/components/rsa/selection';
import QueueTable from '@/components/rsa/selection/QueueTable';
import { buildSectorOptions } from '@/components/rsa/selection/sectors';
import { UI } from '@/components/rsa/selection/i18n';
import GuideSpaceHelp from '@/components/rsa/guides/GuideSpaceHelp';
import { Club, Edition, Startup } from '@/lib/rsa/entities';
import { useQuery } from '@tanstack/react-query';

function Centered({ children, minHeight = '40vh' }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight }}>
      {children}
    </div>
  );
}

function Spinner({ size = 6, label }) {
  return (
    <Loader2
      className={`w-${size} h-${size} animate-spin`}
      style={{ color: GOLD }}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

// Compute the server filters object from local UI state.
// - statusValue (selecteur explicite) prime sur le quickTab.
// - sinon quickTab pilote statusIn (toReview / decided / union pour toValidate).
// - clubId / sectorIn sont poussés côté serveur (clubIdIn / sectorIn).
function buildFilters({ editionId, quickTab, verdictIn, search, clubId, statusValue, sectorIn }) {
  const filters = {
    editionId: editionId || undefined,
    search: search || undefined,
  };
  if (statusValue) {
    filters.statusIn = [statusValue];
  } else if (quickTab === 'toReview') {
    filters.statusIn = STATUS_FILTERS.toReview;
  } else if (quickTab === 'decided') {
    filters.statusIn = STATUS_FILTERS.decided;
  } else if (quickTab === 'toValidate') {
    // "needs validation" non filtrable côté serveur sans vue dédiée :
    // on ramène l'union puis on filtre côté client (cf. filteredPages).
    filters.statusIn = [...STATUS_FILTERS.toReview, ...STATUS_FILTERS.decided];
  }
  if (Array.isArray(verdictIn) && verdictIn.length > 0) filters.verdictIn = verdictIn;
  if (clubId) filters.clubIdIn = [clubId];
  if (Array.isArray(sectorIn) && sectorIn.length > 0) filters.sectorIn = sectorIn;
  return filters;
}

export default function Selection() {
  const {
    isAuthenticated,
    isComite,
    isAdmin,
    isMasterAdmin,
    isCompetitionAdmin,
    clubMemberships,
    loading: authLoading,
  } = usePlatformAuth();
  const { t, lang } = useLang();
  const reduce = useReducedMotion();

  // Deep-link cockpit : /Selection?edition=… pré-sélectionne la compétition.
  const [searchParams] = useSearchParams();
  const editionParam = searchParams.get('edition');

  // Périmètre clubs : comité / club_admin scoped à ses clubs ; admins voient tout.
  const myComiteClubIds = useMemo(
    () => (clubMemberships || [])
      .filter((m) => m.role === 'comite' || m.role === 'club_admin')
      .map((m) => m.club_id),
    [clubMemberships],
  );
  const canSeeAllClubs = isMasterAdmin || isAdmin;
  const isClubScoped = !canSeeAllClubs && myComiteClubIds.length > 0;
  const canValidate = isAdmin || isMasterAdmin || isCompetitionAdmin;

  const isStaff = isComite || isAdmin || isMasterAdmin || isCompetitionAdmin;

  // Liste des clubs (RPC public) — pour résoudre les noms + peupler le filtre Club.
  const { data: allClubs = [] } = useQuery({
    queryKey: ['rsa', 'selection', 'clubs'],
    queryFn: () => Club.listAll(),
    enabled: isAuthenticated && isStaff,
    staleTime: 5 * 60 * 1000,
  });

  // ── Filtres locaux ──────────────────────────────────────────────────────
  const { data: activeEdition } = useQuery({
    queryKey: ['rsa', 'selection', 'active-edition'],
    queryFn: () => Edition.active(),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated && isStaff,
  });

  const [editionId, setEditionId] = useState(editionParam || null);
  const [quickTab, setQuickTab] = useState('toReview');
  const [verdictIn, setVerdictIn] = useState([]);
  const [search, setSearch] = useState('');
  const [clubId, setClubId] = useState(null);
  const [statusValue, setStatusValue] = useState('');
  const [sectorIn, setSectorIn] = useState([]);
  const [sort, setSort] = useState(null); // { key, dir } | null
  const [selectedId, setSelectedId] = useState(null);

  // Bootstrap editionId depuis l'édition active (sauf si un param d'URL prime).
  useEffect(() => {
    if (!editionId && activeEdition?.id) setEditionId(activeEdition.id);
  }, [editionId, activeEdition?.id]);

  // Fermer le sheet détail sur Échap.
  useEffect(() => {
    if (!selectedId) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setSelectedId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: editions = [] } = useEditions();

  // Options secteur (valeurs distinctes en base, scopées à l'édition courante).
  const { data: distinctSectors = [] } = useQuery({
    queryKey: ['rsa', 'selection', 'sectors', editionId],
    queryFn: () => Startup.distinctSectors({ editionId }),
    enabled: isAuthenticated && isStaff,
    staleTime: 5 * 60 * 1000,
  });
  const sectorOptions = useMemo(
    () => buildSectorOptions(distinctSectors, lang),
    [distinctSectors, lang],
  );

  const filters = useMemo(
    () => buildFilters({ editionId, quickTab, verdictIn, search, clubId, statusValue, sectorIn }),
    [editionId, quickTab, verdictIn, search, clubId, statusValue, sectorIn],
  );

  const queue = useSelectionQueue(filters);
  const detail = useDossierDetail(selectedId);
  const { data: reviews = [] } = useReviews(selectedId);

  const sessionEditionId = detail.data?.edition_id || editionId;
  const { data: sessions = [] } = useSessionsForEdition(sessionEditionId);

  // ── Mutations ──────────────────────────────────────────────────────────
  const upsert = useUpsertReview();
  const finalize = useFinalizeReview();
  const override = useAdminOverride();

  // ── Lookups + filtre client (toValidate + scoping club) ──────────────────
  const clubsLookup = useMemo(() => {
    const m = new Map();
    for (const c of allClubs) m.set(c.id, c);
    return m;
  }, [allClubs]);

  // Options du filtre Club : limité aux clubs du comité scoped, sinon tous.
  const clubFilterOptions = useMemo(() => {
    if (isClubScoped) {
      const allow = new Set(myComiteClubIds);
      return allClubs.filter((c) => allow.has(c.id));
    }
    return allClubs;
  }, [isClubScoped, myComiteClubIds, allClubs]);

  const clubAllowList = useMemo(() => {
    if (isClubScoped) return new Set(myComiteClubIds);
    return null;
  }, [isClubScoped, myComiteClubIds]);

  const filteredPages = useMemo(() => {
    if (!queue.data) return [];
    const allow = clubAllowList;
    const pages = queue.data.pages || [];
    return pages.map((page) =>
      (page || []).filter((row) => {
        if (allow && row.club_id && !allow.has(row.club_id)) return false;
        if (allow && !row.club_id && allow.size > 0) return false;
        if (quickTab !== 'toValidate') return true;
        const rev = Array.isArray(row.selection_reviews) ? row.selection_reviews : [];
        if (!rev.length) return false;
        return !rev.some((r) => r.is_final);
      }),
    );
  }, [queue.data, quickTab, clubAllowList]);

  // ── Auth / role gates ──────────────────────────────────────────────────
  if (authLoading) {
    return (
      <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
        <Centered>
          <div role="status" aria-live="polite">
            <Spinner label={t(UI.authLoading)} />
          </div>
        </Centered>
      </PageShell>
    );
  }
  if (!isAuthenticated) return <Navigate to="/Login" replace />;

  if (!isStaff) {
    return (
      <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
        <Centered minHeight="50vh">
          <div className="text-center max-w-md" role="status">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
              <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
                {t(UI.eyebrow)}
              </span>
              <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
            </div>
            <p className="text-[15px]" style={{ color: INK }}>{t(UI.noAccess)}</p>
          </div>
        </Centered>
      </PageShell>
    );
  }

  // ── Mutation handlers ──────────────────────────────────────────────────
  const handleSubmitReview = (payload, options) => upsert.mutate(payload, options);
  const handleAdminValidate = (payload, options) => finalize.mutate(payload, options);
  const handleAdminOverride = (payload, options) => override.mutate(payload, options);

  // Action rapide inline : valider (finaliser) la review en attente d'un dossier.
  const handleQuickValidate = (startup) => {
    const rev = Array.isArray(startup?.selection_reviews) ? startup.selection_reviews : [];
    const eff = pickEffectiveReview(rev);
    if (eff && !eff.is_final && eff.id) {
      finalize.mutate({ reviewId: eff.id, startupId: startup.id });
    }
  };

  const handleReset = () => {
    setQuickTab('toReview');
    setVerdictIn([]);
    setSearch('');
    setClubId(null);
    setStatusValue('');
    setSectorIn([]);
    setSort(null);
    setEditionId(activeEdition?.id || null);
  };

  return (
    <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
      {/* En-tête éditorial */}
      <header className="mb-4 md:mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow>
            {t(UI.eyebrow)}
            {isClubScoped && <span> · {myComiteClubIds.join(' / ')}</span>}
          </Eyebrow>
          <h1
            className="text-[28px] md:text-[32px] leading-tight mt-2 mb-2"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(UI.pageTitle)}
          </h1>
          <p className="text-[14px] max-w-[60ch]" style={{ color: INK, lineHeight: 1.6 }}>
            {t(UI.pageSubtitle)}
          </p>
        </div>
        <GuideSpaceHelp space="selection" editionId={editionId || null} className="shrink-0 mt-1" />
      </header>

      <FiltersBar
        editions={editions}
        editionId={editionId}
        quickTab={quickTab}
        verdictIn={verdictIn}
        search={search}
        clubs={clubFilterOptions}
        clubId={clubId}
        statusValue={statusValue}
        sectorIn={sectorIn}
        sectorOptions={sectorOptions}
        onEditionChange={setEditionId}
        onQuickTabChange={setQuickTab}
        onVerdictChange={setVerdictIn}
        onSearchChange={setSearch}
        onClubChange={setClubId}
        onStatusChange={setStatusValue}
        onSectorChange={setSectorIn}
        onReset={handleReset}
      />

      {/* Signature M-Hairline-Reveal avant le tableau. */}
      <motion.span
        aria-hidden
        initial={reduce ? { opacity: 0 } : { scaleX: 0 }}
        animate={reduce ? { opacity: 1 } : { scaleX: 1 }}
        transition={{ duration: 0.4, ease: EASE, delay: 0.15 }}
        className="block h-px mt-4 mb-5"
        style={{ background: CREAM2, transformOrigin: 'left' }}
      />

      {/* Tableau pleine largeur */}
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE, delay: 0.35 }}
      >
        <QueueTable
          pages={filteredPages}
          clubsLookup={clubsLookup}
          isLoading={queue.isLoading}
          isError={queue.isError}
          hasNextPage={!!queue.hasNextPage}
          isFetchingNextPage={queue.isFetchingNextPage}
          onLoadMore={() => queue.fetchNextPage()}
          onOpen={(id) => setSelectedId(id)}
          onQuickValidate={handleQuickValidate}
          canValidate={canValidate}
          selectedId={selectedId}
          onRetry={() => queue.refetch()}
          sort={sort}
          onSortChange={setSort}
        />
      </motion.div>

      {/* Drawer détail — sheet overlay à droite (plein écran < lg) */}
      <AnimatePresence>
        {selectedId && (
          <>
            <motion.div
              key="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedId(null)}
              className="fixed inset-0 z-[60]"
              style={{ background: 'rgba(15,31,61,0.18)' }}
              aria-hidden
            />
            <motion.aside
              key="sheet-panel"
              role="dialog"
              aria-modal="true"
              initial={reduce ? { opacity: 0 } : { x: '100%' }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: '100%' }}
              transition={{ duration: 0.28, ease: EASE }}
              className="fixed top-0 right-0 bottom-0 z-[61] w-full max-w-[560px] overflow-y-auto p-5"
              style={{ background: CREAM, borderLeft: `1px solid ${CREAM2}`, boxShadow: '-8px 0 24px rgba(15,31,61,0.10)' }}
            >
              <DossierDrawer
                startupId={selectedId}
                startup={detail.data}
                reviews={reviews}
                sessions={sessions}
                isLoading={detail.isLoading}
                isError={detail.isError}
                onBack={() => setSelectedId(null)}
                onClose={() => setSelectedId(null)}
                onRetry={() => detail.refetch()}
                onSubmitReview={handleSubmitReview}
                onAdminValidate={handleAdminValidate}
                onAdminOverride={handleAdminOverride}
                isSubmittingReview={upsert.isPending}
                isAdminValidating={finalize.isPending}
                isAdminOverriding={override.isPending}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
