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
import { Loader2 } from 'lucide-react';
import {
  PageShell,
  GOLD,
  NAVY,
  INK,
  MUTED,
  CREAM2,
  SERIF,
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

function Spinner({ size = 6 }) {
  return (
    <Loader2
      className={`w-${size} h-${size} animate-spin`}
      style={{ color: GOLD }}
      aria-hidden
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

  // V2 multi-club : périmètre de clubs visibles par défaut.
  // - master_admin OR admin legacy : voit TOUT (toggle "Tous les clubs / Filtrer")
  // - club_admin / comite scoped : limité à ses clubs (auto-filter sans toggle)
  const myComiteClubIds = useMemo(
    () => (clubMemberships || [])
      .filter((m) => m.role === 'comite' || m.role === 'club_admin')
      .map((m) => m.club_id),
    [clubMemberships],
  );
  const canSeeAllClubs = isMasterAdmin || isAdmin;
  const isClubScoped = !canSeeAllClubs && myComiteClubIds.length > 0;

  // Toggle pour master/admin : 'all' (défaut) ou un club_id particulier.
  // Pour les club-scoped, le filtre est forcé sur leurs clubs (pas de toggle).
  const [clubFilter, setClubFilter] = useState('all');

  // Liste des clubs (pour le dropdown master/admin).
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
  // 2. V2 multi-club : on restreint aux clubs visibles selon le rôle :
  //    - master/admin avec toggle 'all' : pas de filtre club ;
  //    - master/admin avec un club choisi : filtre sur ce club ;
  //    - club-scoped (comite/club_admin) : filtre auto sur ses clubs.
  const clubAllowList = useMemo(() => {
    if (isClubScoped) return new Set(myComiteClubIds);
    if (canSeeAllClubs && clubFilter !== 'all') return new Set([clubFilter]);
    return null; // null = pas de filtre club (master_admin 'all' OR legacy admin)
  }, [isClubScoped, myComiteClubIds, canSeeAllClubs, clubFilter]);

  const filteredPages = useMemo(() => {
    if (!queue.data) return [];
    const allow = clubAllowList;
    const pages = queue.data.pages || [];
    return pages.map((page) =>
      (page || []).filter((row) => {
        // Club filter (V2)
        if (allow && row.club_id && !allow.has(row.club_id)) return false;
        if (allow && !row.club_id && allow.size > 0) {
          // un dossier sans club_id (legacy 2026 backfillé en 'paris') ne devrait
          // jamais arriver post-migration ; on le masque par sûreté.
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

  // ── Auth / role gates ──────────────────────────────────────────────────
  if (authLoading) {
    return (
      <PageShell nav width="wide">
        <Centered>
          <Spinner />
        </Centered>
      </PageShell>
    );
  }
  if (!isAuthenticated) return <Navigate to="/Login" replace />;

  if (!(isComite || isAdmin)) {
    return (
      <PageShell nav width="wide">
        <Centered minHeight="50vh">
          <div className="text-center max-w-md">
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
    <PageShell nav width="wide">
      {/* En-tête editorial */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
        <span
          className="uppercase text-[10px] tracking-[0.18em] font-medium"
          style={{ color: GOLD }}
        >
          {t(UI.eyebrow)}
          {isClubScoped && (
            <span> · {myComiteClubIds.join(' / ')}</span>
          )}
        </span>
      </div>
      <h1
        className="text-[32px] leading-tight mb-2"
        style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
      >
        {t(UI.pageTitle)}
      </h1>
      <p className="text-[14px] mb-4" style={{ color: INK }}>
        {t(UI.pageSubtitle)}
      </p>

      {/* V2 : toggle club (visible UNIQUEMENT pour master_admin / admin legacy) */}
      {canSeeAllClubs && (
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>
            Club
          </span>
          <select
            value={clubFilter}
            onChange={(e) => setClubFilter(e.target.value)}
            className="text-[12.5px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
          >
            <option value="all">
              {t({ fr: 'Tous les clubs', en: 'All clubs', de: 'Alle Clubs' })}
            </option>
            {allClubs.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
            ))}
          </select>
        </div>
      )}

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

      {/* Layout master/detail */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,520px)] gap-6">
        {/* Queue — caché en mobile quand un dossier est ouvert */}
        <div className={selectedId ? 'hidden lg:block' : ''}>
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
        </div>

        {/* Drawer / Detail — sticky sur desktop */}
        <div className={`${selectedId ? '' : 'hidden lg:block'} lg:sticky lg:top-20 lg:self-start`}>
          {selectedId ? (
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
          ) : (
            <div
              className="rounded-[4px] p-6 text-center"
              style={{ background: 'white', border: `1px solid #e8e3d9` }}
            >
              <p className="text-[14px]" style={{ color: MUTED }}>
                {t(UI.emptyDetailHint)}
              </p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
