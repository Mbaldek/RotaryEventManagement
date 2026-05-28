// useInvite.js — hooks TanStack Query pour le flow V2.5 invite + delete user.
//
// Pattern aligné sur src/components/rsa/admin/platform/club/useClub.js :
//   * mutationFn déléguée aux helpers @/lib/platform/userManagement ;
//   * invalidation propre des caches (rôles club + rôles globaux) en cas de
//     succès, pour que l'UI source de vérité (RolesManager, TeamTab) re-fetch
//     immédiatement les nouveaux membres ;
//   * pas de garde rôle ici — la frontière de sécurité est serveur.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inviteUser, deleteUser, buildDeleteConfirmString } from '@/lib/platform/userManagement';

// Clés de cache invalidées après un succès. On retire toute clé qui commence
// par ces préfixes pour ratisser large (les hooks club/admin utilisent des
// suffixes variables — clubId, edition, etc.).
const ROLE_RELATED_PREFIXES = [
  ['rsa', 'club', 'members'],     // useClubMembers
  ['rsa', 'admin', 'roles'],      // useRolesAdmin (GlobalRolesTab)
  ['rsa', 'admin', 'users'],      // hypothétique liste cross-club (Phase 2)
];

function invalidateRoles(qc) {
  for (const prefix of ROLE_RELATED_PREFIXES) {
    qc.invalidateQueries({ queryKey: prefix });
  }
}

/**
 * useInviteUser — mutation hook qui appelle l'edge function invite-user.
 *
 * Usage :
 *   const invite = useInviteUser();
 *   await invite.mutateAsync({ email, role, clubId, customMessage, lang });
 *
 * Retour : voir lib/platform/userManagement.js#inviteUser.
 */
export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => inviteUser(vars),
    onSuccess: (res) => {
      if (res?.ok) invalidateRoles(qc);
    },
  });
}

/**
 * useDeleteUser — mutation hook qui appelle l'edge function delete-user.
 *
 * Usage :
 *   const del = useDeleteUser();
 *   await del.mutateAsync({ email, typedConfirm });
 */
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => deleteUser(vars),
    onSuccess: (res) => {
      if (res?.ok) invalidateRoles(qc);
    },
  });
}

export { buildDeleteConfirmString };
