// Hooks TanStack Query de l'Espace Sélection (Module 2).
//
// Colocalise les clés de cache + queries + mutations contre les entités RSA
// (@/lib/rsa/entities) et les RPC server-side. Réutilise le QueryClient partagé
// monté via QueryClientProvider dans App.jsx.

import {
  useMutation,
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Edition, RsaSession, SelectionReview, Startup } from '@/lib/rsa/entities';

export const KEYS = {
  editions:     ['rsa', 'selection', 'editions'],
  sessions:     (editionId) => ['rsa', 'selection', 'sessions', editionId],
  queue:        (filters) => ['rsa', 'selection', 'queue', filters],
  dossier:      (id) => ['rsa', 'selection', 'dossier', id],
  reviews:      (id) => ['rsa', 'selection', 'reviews', id],
};

const PAGE_SIZE = 25;

// Toutes les éditions visibles au staff (lecture libre par RLS editions_read pour staff).
export function useEditions() {
  return useQuery({
    queryKey: KEYS.editions,
    queryFn: () => Edition.list('-year'),
    staleTime: 5 * 60 * 1000,
  });
}

// Sessions d'une édition (référence). Inclut la finale ; le UI filtre kind='qualifying'.
export function useSessionsForEdition(editionId) {
  return useQuery({
    queryKey: KEYS.sessions(editionId),
    queryFn: () => RsaSession.filter({ edition_id: editionId }),
    enabled: !!editionId,
    staleTime: 5 * 60 * 1000,
  });
}

// File des dossiers (cursor-based, page 25). filters = objet sérialisable
// { editionId, statusIn[], verdictIn[], sessionIdIn[], search }.
export function useSelectionQueue(filters) {
  return useInfiniteQuery({
    queryKey: KEYS.queue(filters),
    queryFn: ({ pageParam = null }) =>
      Startup.pageForStaff({ filters, cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      if (!Array.isArray(lastPage) || lastPage.length < PAGE_SIZE) return undefined;
      // Cursor = submitted_at de la dernière ligne ; on continue avec lt(cursor).
      const last = lastPage[lastPage.length - 1];
      return last?.submitted_at ?? undefined;
    },
    staleTime: 30 * 1000,
  });
}

// Dossier complet (single startup) — réutilise filter qui passe par la RLS staff.
export function useDossierDetail(startupId) {
  return useQuery({
    queryKey: KEYS.dossier(startupId),
    queryFn: () => Startup.filter({ id: startupId }).then((rows) => rows[0] || null),
    enabled: !!startupId,
    staleTime: 15 * 1000,
  });
}

// Timeline des reviews d'un dossier (la plus récente en tête).
export function useReviews(startupId) {
  return useQuery({
    queryKey: KEYS.reviews(startupId),
    queryFn: () => SelectionReview.forStartup(startupId),
    enabled: !!startupId,
    staleTime: 15 * 1000,
  });
}

// Helper d'invalidation : on invalide TOUT ce qui dépend de la sélection après une mutation.
// Coût marginal vs surchirurgie de cache pour un workspace staff faible volume.
function invalidateSelectionScope(qc, startupId) {
  qc.invalidateQueries({ queryKey: ['rsa', 'selection'], exact: false });
  if (startupId) {
    qc.invalidateQueries({ queryKey: KEYS.dossier(startupId), exact: false });
    qc.invalidateQueries({ queryKey: KEYS.reviews(startupId), exact: false });
  }
}

// Comité — INSERT d'une nouvelle review (jamais d'UPDATE de l'ancienne, audit clean).
export function useUpsertReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => SelectionReview.createComiteReview(payload),
    onSuccess: (_row, vars) => invalidateSelectionScope(qc, vars?.startupId),
  });
}

// Admin — VALIDATE : flip is_final sur la review existante.
export function useFinalizeReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId }) => SelectionReview.finalizeExisting(reviewId),
    onSuccess: (_data, vars) => invalidateSelectionScope(qc, vars?.startupId),
  });
}

// Admin — OVERRIDE : nouvelle row is_final=true qui supersède l'ancienne.
export function useAdminOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => SelectionReview.adminOverride(payload),
    onSuccess: (_row, vars) => invalidateSelectionScope(qc, vars?.startupId),
  });
}
