// Hooks React Query des guides.
//
// useGuides(space, editionId) — LECTEUR : récupère les guides publiés de
// l'espace, résout l'héritage (global/édition), calcule la pastille « nouveau »
// depuis l'ack du user, et expose markSeen() (upsert ack + invalide).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Guide, GuideAck } from '@/lib/rsa/entities';
import { resolveGuidesForScope, hasNewBadge } from '@/lib/rsa/guides/guideLogic';

export const GUIDE_KEYS = {
  published: (space) => ['rsa', 'guides', 'published', space],
  ack: (space) => ['rsa', 'guides', 'ack', space],
  admin: (space, editionId) => ['rsa', 'guides', 'admin', space, editionId ?? '__global__'],
};

export function useGuides(space, editionId) {
  const qc = useQueryClient();

  const publishedQ = useQuery({
    queryKey: GUIDE_KEYS.published(space),
    queryFn: () => Guide.listPublishedForSpace(space),
    staleTime: 5 * 60 * 1000,
    enabled: !!space,
  });

  const ackQ = useQuery({
    queryKey: GUIDE_KEYS.ack(space),
    queryFn: () => GuideAck.getForSpace(space),
    staleTime: 5 * 60 * 1000,
    enabled: !!space,
  });

  const markSeen = useMutation({
    mutationFn: () => GuideAck.touch(space),
    onSuccess: () => qc.invalidateQueries({ queryKey: GUIDE_KEYS.ack(space) }),
  });

  const guides = resolveGuidesForScope(publishedQ.data || [], editionId);
  const showBadge = hasNewBadge(guides, ackQ.data ?? null);

  return {
    guides,
    isLoading: publishedQ.isLoading,
    isError: publishedQ.isError,
    showBadge,
    hasGuides: guides.length > 0,
    markSeen: () => markSeen.mutate(),
  };
}

// — ADMIN —

export function useGuidesAdmin(space, editionId) {
  return useQuery({
    queryKey: GUIDE_KEYS.admin(space, editionId),
    queryFn: () => Guide.listAllForAdmin(space, editionId),
    enabled: !!space,
    staleTime: 0,
  });
}

export function useGuideMutations(space, editionId) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: GUIDE_KEYS.admin(space, editionId) });
    qc.invalidateQueries({ queryKey: GUIDE_KEYS.published(space) });
  };

  const save = useMutation({
    // record : { id?, space, edition_id, title, body_md, is_published, sort_order }
    mutationFn: async (record) => {
      const payload = { ...record, updated_at: new Date().toISOString() };
      if (record.id) {
        const { id, ...rest } = payload;
        return Guide.update(id, rest);
      }
      return Guide.create(payload);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id) => Guide.delete(id),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: (ids) => Guide.reorder(ids),
    onSuccess: invalidate,
  });

  return { save, remove, reorder };
}
