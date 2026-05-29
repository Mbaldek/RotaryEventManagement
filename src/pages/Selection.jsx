// Espace Sélection — orchestrateur du Module 2 (comité + admin).
//
// Flux : auth-gate (-> /Login) -> role-gate (comité OU admin) -> page filtres + queue
// + drawer/detail. Filtres lifted ici ; les hooks vivent dans useSelection.
//
// Layout :
//   lg+ : grille 2 colonnes (queue à gauche, drawer à droite, sticky).
//   < lg : master/detail (drawer prend le plein écran avec bouton retour).

import React, { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import {
  PageShell,
  PlatformFooter,
  Eyebrow,
  GOLD,
  NAVY,
  INK,
  MUTED,
  CREAM2,
  SERIF,
  EASE,
} from '@/components/design';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import {
  FiltersBar,
  QueueList,
  DossierDrawer,
  STATUS_FILTERS,
  useEditions,
  useSessionsForEdition,
  useSelectionQueue,
  useDossierDetail,
  useReviews,
  useUpsertReview,
  useFinalizeReview,
  useAdminOverride,
} from '@/components/rsa/selection';
// Refonte hiérarchie : pour le master_admin / admin legacy, la queue est rendue
// groupée Compétition ▸ Club au lieu d'une liste plate. Le club_admin / comité
// scoped conserve la <QueueList> plate (un seul club implicite côté UX).
import GroupedQueue from '@/components/rsa/selection/GroupedQueue';
import { groupSelectionPages } from '@/components/rsa/selection/useSelectionQueueGrouped';
import { UI } from '@/components/rsa/selection/i18n';
import { Club, Edition } from '@/lib/rsa/entities';
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

// Compute the server filters object passed to the queue from local UI state.
// quickTab maps onto status filters ; verdict is a single value (kept as array).
//
// V2 multi-club : on ajoute clubIdsIn (multi-club allowed pour un master_admin
// qui inspecterait 2 clubs simultanément ; pour le cas standard 1 seul club, on
// passe un tableau singleton). Le client-side .pageForStaff ne le supporte pas
// encore en natif — on filtre donc dans `filteredPages` côté composant.
function buildFilters({ editionId, quickTab, verdictIn, search }) {
  const filters = {
    editionId: editionId || undefined,
    search: search || undefined,
  };
  if (quickTab === 'toReview') filters.statusIn = STATUS_FILTERS.toReview;
  else if (quickTab === 'decided') filters.statusIn = STATUS_FILTERS.decided;
  else if (quickTab === 'toValidate') {
    // Côté serveur on ne sait pas filtrer sur "needs validation" sans une vue dédiée ;
    // on ramène l'union (à examiner + décidés) puis on filtre côté client (cf. queue).
    filters.statusIn = [...STATUS_FILTERS.toReview, ...STATUS_FILTERS.decided];
  }
  if (Array.isArray(verdictIn) && verdictIn.length > 0) filters.verdictIn = verdictIn;
  return filters;
}

export default function Selection() {
  const {
    isAuthenticated,
    isComite,
    isAdmin,
    isMasterAdmin,
    clubMemberships,
    loading: authLoading,
  } = usePlatformAuth();
  const { t } = useLang();
  const reduce = useReducedMotion();

  // V2 multi-club : périmètre de clubs visibles par défaut.
  // - master_admin OR admin legacy : voit TOUT (rendu en GroupedQueue : sections
  //   par compétition, sous-sections par club — refonte hiérarchie).
  // - club_admin / comite scoped : limité à ses clubs (auto-filter sans toggle,
  //   rendu en QueueList plate puisqu'un seul club est implicite).
  const myComiteClubIds = useMemo(
    () => (clubMemberships || [])
      .filter((m) => m.role === 'comite' || m.role === 'club_admin')
      .map((m) => m.club_id),
    [clubMemberships],
  );
  const canSeeAllClubs = isMasterAdmin || isAdmin;
  const isClubScoped = !canSeeAllClubs && myComiteClubIds.length > 0;

  // Liste des clubs (pour résoudre les noms dans la GroupedQueue master/admin).
  const { data: allClubs = [] } = useQuery({
    queryKey: ['rsa', 'selection', 'clubs'],
    queryFn: () => Club.listAll(),
    enabled: canSeeAllClubs,
    staleTime: 5 * 60 * 1000,
  });

  // ── Filtres locaux ──────────────────────────────────────────────────────
  // L'édition active sert de défaut tant que l'utilisateur n'en pick pas une autre.
  // On charge l'édition active séparément pour pouvoir initialiser editionId.
  const { data: activeEdition } = useQuery({
    queryKey: ['rsa', 'selection', 'active-edition'],
    queryFn: () => Edition.active(),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated && (isComite || isAdmin),
  });

  const [editionId, setEditionId] = useState(null);
  const [quickTab, setQuickTab] = useState('toReview');
  const [verdictIn, setVerdictIn] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  // Bootstrap editionId from the active edition once it loads.
  React.useEffect(() => {
    if (!editionId && activeEdition?.id) {
      setEditionId(activeEdition.id);
    }
  }, [editionId, activeEdition?.id]);

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: editions = [] } = useEditions();
  const filters = useMemo(
    () => buildFilters({ editionId, quickTab, verdictIn, search }),
    [editionId, quickTab, verdictIn, search],
  );

  const queue = useSelectionQueue(filters);
  // Sessions de l'édition sélectionnée (sinon de l'édition du dossier ouvert).
  const detail = useDossierDetail(selectedId);
  const { data: reviews = [] } = useReviews(selectedId);

  const sessionEditionId = detail.data?.edition_id || editionId;
  const { data: sessions = [] } = useSessionsForEdition(sessionEditionId);

  // ── Mutations ──────────────────────────────────────────────────────────
  const upsert = useUpsertReview();
  const finalize = useFinalizeReview();
  const override = useAdminOverride();

  // ── Client-side filtres (à valider + club_id) ──────────────────────────
  // 1. quickTab=='toValidate' : on garde uniquement les rows ayant des reviews
  //    non-finales.
  // 2. Refonte hiérarchie : pour le club_scoped (comite/club_admin), on
  //    restreint aux clubs visibles. Pour le master_admin / admin legacy, on
  //    ne filtre plus côté client — la GroupedQueue rend visuellement par
  //    section club, plus besoin de masquer.
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
        // Club filter (club_scoped uniquement)
        if (allow && row.club_id && !allow.has(row.club_id)) return false;
        if (allow && !row.club_id && allow.size > 0) {
          return false;
        }
        // Validation filter
        if (quickTab !== 'toValidate') return true;
        const reviews = Array.isArray(row.selection_reviews) ? row.selection_reviews : [];
        if (!reviews.length) return false;
        return !reviews.some((r) => r.is_final);
      }),
    );
  }, [queue.data, quickTab, clubAllowList]);

  // Lookups + groupement pour la vue GroupedQueue (master_admin / admin).
  const editionsLookup = useMemo(() => {
    const m = new Map();
    for (const e of editions) m.set(e.id, e);
    return m;
  }, [editions]);
  const clubsLookup = useMemo(() => {
    const m = new Map();
    for (const c of allClubs) m.set(c.id, c);
    return m;
  }, [allClubs]);
  const groupedFiltered = useMemo(
    () => (canSeeAllClubs ? groupSelectionPages(filteredPages) : []),
    [canSeeAllClubs, filteredPages],
  );

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

  if (!(isComite || isAdmin)) {
    return (
      <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
        <Centered minHeight="50vh">
          <div className="text-center max-w-md" role="status">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
              <span
                className="uppercase text-[10px] tracking-[0.18em] font-medium"
                style={{ color: GOLD }}
              >
                {t(UI.eyebrow)}
              </span>
              <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
            </div>
            <p className="text-[15px]" style={{ color: INK }}>
              {t(UI.noAccess)}
            </p>
          </div>
        </Centered>
      </PageShell>
    );
  }

  // ── Mutation handlers (close over selectedId) ──────────────────────────
  const handleSubmitReview = (payload) => upsert.mutate(payload);
  const handleAdminValidate = (payload) => finalize.mutate(payload);
  const handleAdminOverride = (payload) => override.mutate(payload);

  return (
    <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
      {/* En-tête éditorial */}
      <header className="mb-4 md:mb-6">
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
      </header>

      {/* Refonte hiérarchie : retrait du toggle club pour master_admin / admin
          legacy — devenu redondant puisque la GroupedQueue rend désormais une
          section par compétition puis sous-section par club. */}

      <FiltersBar
        editions={editions}
        editionId={editionId}
        quickTab={quickTab}
        verdictIn={verdictIn}
        search={search}
        onEditionChange={setEditionId}
        onQuickTabChange={setQuickTab}
        onVerdictChange={setVerdictIn}
        onSearchChange={setSearch}
        onReset={() => {
          setQuickTab('toReview');
          setVerdictIn([]);
          setSearch('');
          setEditionId(activeEdition?.id || null);
        }}
      />

      {/* Signature M-Hairline-Reveal — hairline scaleX 0→1 left-origin 400ms
          juste avant la queue, signature comité/admin. */}
      <motion.span
        aria-hidden
        initial={reduce ? { opacity: 0 } : { scaleX: 0 }}
        animate={reduce ? { opacity: 1 } : { scaleX: 1 }}
        transition={{ duration: 0.4, ease: EASE, delay: 0.15 }}
        className="block h-px mt-4 mb-5"
        style={{ background: CREAM2, transformOrigin: 'left' }}
      />

      {/* Layout master/detail */}
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE, delay: 0.35 }}
        className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,520px)] gap-6"
      >
        {/* Queue — caché en mobile quand un dossier est ouvert.
            master_admin / admin legacy : <GroupedQueue> (sections compétition
              ▸ club, cf. refonte hiérarchie).
            club_scoped (comité / club_admin) : <QueueList> plate (un seul
              club implicite, comportement V2 préservé). */}
        <div className={selectedId ? 'hidden lg:block' : ''}>
          {canSeeAllClubs ? (
            <GroupedQueue
              groups={groupedFiltered}
              editionsLookup={editionsLookup}
              clubsLookup={clubsLookup}
              isLoading={queue.isLoading}
              isError={queue.isError}
              hasNextPage={!!queue.hasNextPage}
              isFetchingNextPage={queue.isFetchingNextPage}
              onLoadMore={() => queue.fetchNextPage()}
              onOpen={(id) => setSelectedId(id)}
              selectedId={selectedId}
              onRetry={() => queue.refetch()}
            />
          ) : (
            <QueueList
              pages={filteredPages}
              isLoading={queue.isLoading}
              isError={queue.isError}
              hasNextPage={!!queue.hasNextPage}
              isFetchingNextPage={queue.isFetchingNextPage}
              onLoadMore={() => queue.fetchNextPage()}
              onOpen={(id) => setSelectedId(id)}
              selectedId={selectedId}
              onRetry={() => queue.refetch()}
            />
          )}
        </div>

        {/* Drawer / Detail — sticky sur desktop */}
        <div className={`${selectedId ? '' : 'hidden lg:block'} lg:sticky lg:top-20 lg:self-start`}>
          <AnimatePresence mode="wait" initial={false}>
            {selectedId ? (
              <motion.div
                key={`detail-${selectedId}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: EASE }}
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
              </motion.div>
            ) : (
              <motion.div
                key="detail-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="rounded-[4px] p-6 text-center"
                style={{ background: 'white', border: `1px solid ${CREAM2}` }}
              >
                <p className="text-[14px]" style={{ color: MUTED }}>
                  {t(UI.emptyDetailHint)}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </PageShell>
  );
}
