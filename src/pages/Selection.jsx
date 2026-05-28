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
import { Edition } from '@/lib/rsa/entities';
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
  const { isAuthenticated, isComite, isAdmin, loading: authLoading } = usePlatformAuth();
  const { t } = useLang();

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

  // ── Client-side "à valider" filter ─────────────────────────────────────
  // On filtre les rows non-finales si quickTab === 'toValidate'.
  const filteredPages = useMemo(() => {
    if (!queue.data) return [];
    if (quickTab !== 'toValidate') return queue.data.pages || [];
    return (queue.data.pages || []).map((page) =>
      (page || []).filter((row) => {
        const reviews = Array.isArray(row.selection_reviews) ? row.selection_reviews : [];
        if (!reviews.length) return false;
        // au moins une review existe et aucune n'est is_final
        return !reviews.some((r) => r.is_final);
      }),
    );
  }, [queue.data, quickTab]);

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
        </span>
      </div>
      <h1
        className="text-[32px] leading-tight mb-2"
        style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
      >
        {t(UI.pageTitle)}
      </h1>
      <p className="text-[14px] mb-6" style={{ color: INK }}>
        {t(UI.pageSubtitle)}
      </p>

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
