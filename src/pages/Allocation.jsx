// src/pages/Allocation.jsx
// Écran Allocation (cockpit, phase Organisation) — ADMIN ONLY. Pool d'éligibles
// + clusters + dropdown par ligne. Gate souple (bandeau "à examiner").
import React, { useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { PageShell, PlatformFooter, Eyebrow, GOLD, NAVY, INK, MUTED, CREAM2, SERIF } from '@/components/design';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import { useQuery } from '@tanstack/react-query';
import { Edition } from '@/lib/rsa/entities';
import { useClubsForEdition } from '@/components/rsa/admin/platform/master/useMaster';
import { summarizeAllocation, groupAllocatedByCluster } from '@/lib/rsa/allocation';
import {
  useAllocationPool, useAllocated, useClusters, useToReviewCount,
  useAllocate, useReassign, useCreateCluster,
} from '@/components/rsa/allocation/useAllocation';
import AllocationPool from '@/components/rsa/allocation/AllocationPool';
import ClusterColumn from '@/components/rsa/allocation/ClusterColumn';
import CreateClusterInline from '@/components/rsa/allocation/CreateClusterInline';
import { UI } from '@/components/rsa/allocation/i18n';

export default function Allocation() {
  const { t } = useLang();
  // usePlatformAuth exposes `loading` (Selection.jsx aliases it as authLoading).
  const { isAuthenticated, isAdmin, isMasterAdmin, isCompetitionAdmin, loading } = usePlatformAuth();
  const [params] = useSearchParams();
  const editionParam = params.get('edition');

  const isAdminAny = isAdmin || isMasterAdmin || isCompetitionAdmin;

  const { data: activeEdition } = useQuery({
    queryKey: ['rsa', 'allocation', 'active-edition'],
    queryFn: () => Edition.active(),
    enabled: isAuthenticated && isAdminAny && !editionParam,
    staleTime: 5 * 60 * 1000,
  });
  const editionId = editionParam || activeEdition?.id || null;

  const poolQ = useAllocationPool(editionId);
  const allocQ = useAllocated(editionId);
  const clustersQ = useClusters(editionId);
  const toReviewQ = useToReviewCount(editionId);
  const clubsQ = useClubsForEdition(editionId);

  const allocate = useAllocate(editionId);
  const reassign = useReassign(editionId);
  const createCluster = useCreateCluster(editionId);

  const [showCreate, setShowCreate] = useState(false);

  const pool = poolQ.data || [];
  const allocated = allocQ.data || [];
  const clusters = clustersQ.data || [];
  const summary = useMemo(
    () => summarizeAllocation({ pool, allocated, toReviewCount: toReviewQ.data || 0 }),
    [pool, allocated, toReviewQ.data],
  );
  const groups = useMemo(() => groupAllocatedByCluster(allocated, clusters), [allocated, clusters]);

  // monoclub V1 : club unique de l'édition pour rattacher les sessions créées.
  // EditionClub.forEdition rows have shape { club_id, club: { id, name, ... }, ... }
  const clubId = useMemo(() => {
    const rows = clubsQ.data || [];
    const first = rows[0];
    return first?.club?.id || first?.club_id || null;
  }, [clubsQ.data]);

  if (loading) {
    return (
      <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
        <div className="flex items-center justify-center" style={{ minHeight: '40vh' }}>
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} aria-label={t(UI.authLoading)} />
        </div>
      </PageShell>
    );
  }
  if (!isAuthenticated) return <Navigate to="/Login" replace />;
  if (!isAdminAny) {
    return (
      <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
        <div className="text-center py-20" role="status">
          <p className="text-[15px]" style={{ color: INK }}>{t(UI.noAccess)}</p>
        </div>
      </PageShell>
    );
  }

  const onAllocate = (startupId, sessionId) => allocate.mutate({ startupId, sessionId });
  const onMove = (startupId, sessionId) => allocate.mutate({ startupId, sessionId });
  const onSendBack = (startupId) => reassign.mutate({ startupId, decision: 'eligible' });
  const onReject = (startupId) => reassign.mutate({ startupId, decision: 'rejete', rationale: 'Faute de place (allocation).' });
  const onCreate = (payload) => {
    createCluster.mutate(
      { ...payload, clubId, position: clusters.length },
      { onSuccess: () => setShowCreate(false) },
    );
  };

  const isLoadingAny = poolQ.isLoading || allocQ.isLoading || clustersQ.isLoading;

  return (
    <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
      <header className="mb-5">
        <Eyebrow>{t(UI.eyebrow)}</Eyebrow>
        <h1 className="text-[28px] md:text-[32px] leading-tight mt-2 mb-2"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(UI.pageTitle)}
        </h1>
        <p className="text-[14px] max-w-[60ch]" style={{ color: INK, lineHeight: 1.6 }}>
          {t(UI.pageSubtitle)}
        </p>
      </header>

      <div className="flex items-center justify-between gap-3 flex-wrap mb-4 pb-3"
           style={{ borderBottom: `1px solid ${CREAM2}` }}>
        <span className="text-[13px]" style={{ color: NAVY }}>
          {t(UI.summary)
            .replace('{total}', String(summary.eligibleTotal))
            .replace('{alloc}', String(summary.allocatedCount))
            .replace('{toPlace}', String(summary.toPlaceCount))}
        </span>
        {summary.toReviewCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: '#8a6d1f' }}>
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden style={{ color: GOLD }} />
            {t(UI.reviewWarning).replace('{n}', String(summary.toReviewCount))}
          </span>
        )}
      </div>

      {isLoadingAny ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      ) : summary.eligibleTotal === 0 ? (
        <p className="text-[14px] py-6" style={{ color: MUTED }}>{t(UI.noEligible)}</p>
      ) : (
        <>
          <h2 className="text-[12px] uppercase tracking-[0.14em] font-medium mb-2" style={{ color: MUTED }}>
            {t(UI.toPlace)} ({summary.toPlaceCount})
          </h2>
          <AllocationPool pool={pool} clusters={clusters} onAllocate={onAllocate} />

          <div className="flex items-center justify-between mt-8 mb-3">
            <h2 className="text-[12px] uppercase tracking-[0.14em] font-medium" style={{ color: MUTED }}>
              {t(UI.clusters)}
            </h2>
            {!showCreate && (
              <button type="button" onClick={() => setShowCreate(true)}
                      className="text-[12px] font-medium px-3 py-1.5 rounded-[4px]"
                      style={{ color: NAVY, border: `1px solid ${GOLD}` }}>
                {t(UI.addCluster)}
              </button>
            )}
          </div>
          {showCreate && (
            <CreateClusterInline onCreate={onCreate} onCancel={() => setShowCreate(false)} isPending={createCluster.isPending} />
          )}
          {clusters.length === 0 && !showCreate ? (
            <p className="text-[13px] py-3" style={{ color: MUTED }}>{t(UI.noCluster)}</p>
          ) : (
            groups.map((g) => (
              <ClusterColumn key={g.cluster.id} group={g} clusters={clusters}
                             onMove={onMove} onSendBack={onSendBack} onReject={onReject} />
            ))
          )}
        </>
      )}
    </PageShell>
  );
}
