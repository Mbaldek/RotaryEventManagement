// Hooks TanStack Query du module Extensions V3.0.
//
// Co-localisés avec les composants @/components/rsa/extensions/* (même patron
// que useMaster.js / useClub.js / usePrizes.js). Frontière de sécurité = RLS
// extensions_* + RPC SECURITY DEFINER côté serveur. Aucune garde de rôle ici.
//
// Préfixe des React Query keys : ['rsa', 'extensions', ...] pour ne pas marcher
// sur l'invalidation des hooks Master / Club / Prizes.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Extension } from '@/lib/rsa/extensions';

export const EXTENSION_KEYS = {
  // Toutes les extensions (filtres optionnels).
  list: ({ scope = null, kind = null, clubId = null, editionId = null } = {}) =>
    ['rsa', 'extensions', 'list', scope, kind, clubId, editionId],
};

// ── Helper d'invalidation ──────────────────────────────────────────────────
function invalidateExtensions(qc) {
  qc.invalidateQueries({ queryKey: ['rsa', 'extensions'], exact: false });
}

// ── Lectures ───────────────────────────────────────────────────────────────

export function useExtensions({ scope = null, kind = null, clubId = null, editionId = null } = {}) {
  return useQuery({
    queryKey: EXTENSION_KEYS.list({ scope, kind, clubId, editionId }),
    queryFn:  () => Extension.list({ scope, kind, clubId, editionId }),
    staleTime: 30 * 1000,
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────

export function useCreateExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => Extension.create(payload),
    onSuccess: () => invalidateExtensions(qc),
  });
}

export function useUpdateExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...fields }) => Extension.update(id, fields),
    onSuccess: () => invalidateExtensions(qc),
  });
}

export function useDeleteExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => Extension.delete(id),
    onSuccess: () => invalidateExtensions(qc),
  });
}

export function useActivateExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }) => Extension.activate(id, active),
    onSuccess: () => invalidateExtensions(qc),
  });
}

// V4 Marketplace — installe une extension master vers un club (clone côté SQL).
export function useInstallExtensionToClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ masterExtensionId, clubId }) =>
      Extension.installToClub({ masterExtensionId, clubId }),
    onSuccess: () => invalidateExtensions(qc),
  });
}
