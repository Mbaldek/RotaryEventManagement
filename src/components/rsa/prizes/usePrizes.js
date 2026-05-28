// Hooks TanStack Query du module Prix V2.5.
//
// Co-localisés avec les composants @/components/rsa/prizes/* (même patron que
// useMaster.js / useClub.js). Frontière de sécurité = RLS prizes_* + RPC SECURITY
// DEFINER côté serveur (cf. migration 20260531_rsa_v25_prizes.sql). Aucune garde
// de rôle côté hook.
//
// Préfixe des React Query keys : ['rsa', 'prizes', ...] pour ne pas marcher sur
// l'invalidation des hooks Master ou Club.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Prize } from '@/lib/rsa/prizes';

export const PRIZE_KEYS = {
  // Tous les prix d'une compétition (toutes scopes).
  forEdition: (editionId) => ['rsa', 'prizes', 'edition', editionId],
  // Prix d'un club dans une compétition.
  forClub: (editionId, clubId) => ['rsa', 'prizes', 'edition', editionId, 'club', clubId],
  // Prix d'une session précise.
  forSession: (editionId, sessionId) => ['rsa', 'prizes', 'edition', editionId, 'session', sessionId],
};

// ── Helper d'invalidation ──────────────────────────────────────────────────
function invalidatePrizes(qc, editionId) {
  qc.invalidateQueries({ queryKey: ['rsa', 'prizes'], exact: false });
  if (editionId) {
    qc.invalidateQueries({ queryKey: PRIZE_KEYS.forEdition(editionId), exact: false });
  }
}

// ── Lectures ───────────────────────────────────────────────────────────────

// Prix au niveau compétition (club_id IS NULL) — pour CompetitionEditor.
// scope='competition' dans le composant <PrizesList>. On filtre côté client car
// rsa_list_prizes ne supporte pas un "club_id IS NULL" explicite (NULL = "tous").
export function useEditionPrizes(editionId, { scope = 'all' } = {}) {
  return useQuery({
    queryKey: PRIZE_KEYS.forEdition(editionId).concat([scope]),
    enabled: !!editionId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const all = await Prize.list({ editionId });
      if (scope === 'competition') {
        return all.filter((p) => p.club_id == null);
      }
      return all;
    },
  });
}

// Prix d'un club dans une compétition. clubId obligatoire.
export function useClubPrizes(editionId, clubId) {
  return useQuery({
    queryKey: PRIZE_KEYS.forClub(editionId, clubId),
    enabled: !!editionId && !!clubId,
    staleTime: 30 * 1000,
    queryFn: () => Prize.list({ editionId, clubId }),
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────

export function useCreatePrize(editionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => Prize.create({ editionId, ...payload }),
    onSuccess: () => invalidatePrizes(qc, editionId),
  });
}

export function useUpdatePrize(editionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...fields }) => Prize.update(id, fields),
    onSuccess: () => invalidatePrizes(qc, editionId),
  });
}

export function useDeletePrize(editionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => Prize.delete(id),
    onSuccess: () => invalidatePrizes(qc, editionId),
  });
}

export function useAwardPrize(editionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, startupId }) => Prize.award({ id, startupId }),
    onSuccess: () => invalidatePrizes(qc, editionId),
  });
}
