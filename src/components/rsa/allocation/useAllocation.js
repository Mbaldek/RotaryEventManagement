// src/components/rsa/allocation/useAllocation.js
// Hooks TanStack de l'écran Allocation : pool d'éligibles (status='eligible'),
// allouées (status='affecte'), clusters (sessions kind='qualifying'), compteur
// "à examiner", + mutations allocate / reject / sendBack / createCluster.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Startup, RsaSession, SelectionReview } from '@/lib/rsa/entities';
import { slugSessionId } from '@/lib/rsa/allocation';

export const ALLOC_KEYS = {
  pool:     (editionId) => ['rsa', 'allocation', 'pool', editionId],
  allocated:(editionId) => ['rsa', 'allocation', 'allocated', editionId],
  clusters: (editionId) => ['rsa', 'allocation', 'clusters', editionId],
  summary:  (editionId) => ['rsa', 'allocation', 'summary', editionId],
};

export function useAllocationPool(editionId) {
  return useQuery({
    queryKey: ALLOC_KEYS.pool(editionId),
    queryFn: () => Startup.pageForAdmin({ editionId, statusIn: ['eligible'] }),
    enabled: !!editionId,
    staleTime: 15 * 1000,
  });
}

export function useAllocated(editionId) {
  return useQuery({
    queryKey: ALLOC_KEYS.allocated(editionId),
    queryFn: () => Startup.pageForAdmin({ editionId, statusIn: ['affecte'] }),
    enabled: !!editionId,
    staleTime: 15 * 1000,
  });
}

export function useClusters(editionId) {
  return useQuery({
    queryKey: ALLOC_KEYS.clusters(editionId),
    queryFn: async () => {
      const all = await RsaSession.forEdition(editionId);
      return (all || []).filter((s) => s.kind === 'qualifying');
    },
    enabled: !!editionId,
    staleTime: 30 * 1000,
  });
}

// Compteur "à examiner" pour le bandeau de gate souple.
export function useToReviewCount(editionId) {
  return useQuery({
    queryKey: ALLOC_KEYS.summary(editionId),
    queryFn: async () => {
      const byStatus = await Startup.summaryByStatus(editionId);
      return (byStatus.soumis || 0) + (byStatus.en_selection || 0);
    },
    enabled: !!editionId,
    staleTime: 30 * 1000,
  });
}

function invalidateAlloc(qc, editionId) {
  qc.invalidateQueries({ queryKey: ['rsa', 'allocation'], exact: false });
  qc.invalidateQueries({ queryKey: ['rsa', 'selection'], exact: false });
  if (editionId) {
    qc.invalidateQueries({ queryKey: ALLOC_KEYS.pool(editionId), exact: false });
    qc.invalidateQueries({ queryKey: ALLOC_KEYS.allocated(editionId), exact: false });
  }
}

// Allouer / déplacer : eligible|affecte -> affecte + session_id.
export function useAllocate(editionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ startupId, sessionId }) => Startup.allocate(startupId, sessionId),
    onSuccess: () => invalidateAlloc(qc, editionId),
  });
}

// Renvoyer au pool (affecte -> eligible) ou écarter (-> rejete) : admin override.
export function useReassign(editionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ startupId, decision, rationale = null }) =>
      SelectionReview.adminOverride({
        startupId,
        decision, // 'eligible' (retour pool) | 'rejete' | 'liste_attente'
        assignedSessionId: null,
        rationale,
        overridesReviewId: null,
      }),
    onSuccess: () => invalidateAlloc(qc, editionId),
  });
}

// Créer un cluster (= RsaSession kind='qualifying'). clubId requis (monoclub : le
// club unique de l'édition). position : index suivant.
export function useCreateCluster(editionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, theme, sessionDate, clubId, position }) =>
      RsaSession.createWithConfig({
        editionId,
        payload: {
          id: slugSessionId(editionId, name),
          name,
          theme: theme || null,
          kind: 'qualifying',
          session_date: sessionDate || null,
          position: position ?? 0,
          club_id: clubId ?? null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALLOC_KEYS.clusters(editionId), exact: false });
    },
  });
}
