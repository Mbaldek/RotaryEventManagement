// Hooks TanStack Query — composition jury par session (V3.0 / Prizes V2).
//
// Wraps autour des RPC livrées par la migration 20260604_rsa_v3_prizes_v2_jury :
//   * rsa_assign_juror(p_session_id, p_jury_user_id, p_role)        — upsert
//   * rsa_remove_juror(p_session_id, p_jury_user_id)                — raise 23503
//                                                                     si scores
//   * rsa_create_jury_profile(qualite, organisation, bio, photo_path,
//                              role_hint)                            — returns uuid
//
// Lecture : on lit directement platform_jury_assignments + platform_jury_profiles
// via Supabase (RLS lecture déjà ouverte aux admins + jurés). On JOIN côté JS pour
// rester compatible avec l'ancienne entité JuryAssignment (composite PK).
//
// Le scope d'autorisation est SERVEUR (RPC SECURITY DEFINER + RLS) ; ces hooks
// ne portent aucune garde côté client — c'est ClubCockpit qui filtre l'accès.

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const SESSION_JURY_KEYS = {
  forSession: (sessionId) => ['rsa', 'session-jury', 'list', sessionId],
  clubPool:   (clubId)    => ['rsa', 'session-jury', 'club-pool', clubId],
};

// ── Liste enrichie (jury + profile) pour une session ──────────────────────────
// Retourne : Array<{
//   jury_user_id, session_id, role, created_by, created_at,
//   profile: { user_id, qualite, organisation, bio, photo_path, auth_linked_at } | null,
// }>
export function useSessionJurors(sessionId) {
  return useQuery({
    queryKey: SESSION_JURY_KEYS.forSession(sessionId),
    queryFn: async () => {
      if (!sessionId) return [];
      const { data: assigns, error } = await supabase
        .from('platform_jury_assignments')
        .select('jury_user_id, session_id, role, created_by, created_at')
        .eq('session_id', sessionId);
      if (error) throw error;
      const rows = assigns || [];
      const ids = Array.from(new Set(rows.map((r) => r.jury_user_id))).filter(Boolean);
      let profilesById = new Map();
      if (ids.length > 0) {
        const { data: profiles, error: pe } = await supabase
          .from('platform_jury_profiles')
          .select('user_id, qualite, organisation, bio, photo_path, auth_linked_at')
          .in('user_id', ids);
        if (pe) throw pe;
        profilesById = new Map((profiles || []).map((p) => [p.user_id, p]));
      }
      return rows
        .map((r) => ({ ...r, profile: profilesById.get(r.jury_user_id) || null }))
        .sort((a, b) => {
          // 'special' (experts externes) en bas pour mettre les réguliers en premier
          if (a.role === b.role) return 0;
          return a.role === 'regular' ? -1 : 1;
        });
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });
}

// ── Pool club : memberships role='jury' + leur fiche profile éventuelle ───────
// Retourne : Array<{
//   user_id, email, full_name, qualite, organisation, photo_path, auth_linked_at
// }>
// Les jurés "ghost" (auth_linked_at NULL) ne sont PAS retournés ici : ils n'ont
// pas de club_memberships. Pour les ajouter à une session, on passe par la
// création inline (mode 'create') de AddJurorModal.
export function useClubJuryPool(clubId) {
  return useQuery({
    queryKey: SESSION_JURY_KEYS.clubPool(clubId),
    queryFn: async () => {
      if (!clubId) return [];
      const { data: members, error } = await supabase
        .rpc('rsa_list_club_members', { p_club_id: clubId });
      if (error) throw error;
      const jurors = (members || []).filter((m) => m.role === 'jury');
      const ids = Array.from(new Set(jurors.map((j) => j.user_id))).filter(Boolean);
      let profilesById = new Map();
      if (ids.length > 0) {
        const { data: profiles, error: pe } = await supabase
          .from('platform_jury_profiles')
          .select('user_id, qualite, organisation, photo_path, auth_linked_at')
          .in('user_id', ids);
        if (pe) throw pe;
        profilesById = new Map((profiles || []).map((p) => [p.user_id, p]));
      }
      return jurors.map((j) => {
        const p = profilesById.get(j.user_id) || {};
        return {
          user_id:        j.user_id,
          email:          j.email || null,
          full_name:      j.full_name || null,
          qualite:        p.qualite || null,
          organisation:   p.organisation || null,
          photo_path:     p.photo_path || null,
          auth_linked_at: p.auth_linked_at || null,
        };
      });
    },
    enabled: !!clubId,
    staleTime: 60 * 1000,
  });
}

// ── Mutation : assigner un juré à une session ─────────────────────────────────
export function useAssignJuror(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ juryUserId, role = 'regular' }) => {
      const { error } = await supabase.rpc('rsa_assign_juror', {
        p_session_id:    sessionId,
        p_jury_user_id:  juryUserId,
        p_role:          role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSION_JURY_KEYS.forSession(sessionId) });
    },
  });
}

// ── Mutation : retirer un juré (bloqué si scores) ─────────────────────────────
// Le caller doit catcher l'erreur SQLSTATE 23503 et afficher
// SESSION_JURY.removeBlockedScores. Code détecté via err.code ou err.message.
export function useRemoveJuror(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ juryUserId }) => {
      const { error } = await supabase.rpc('rsa_remove_juror', {
        p_session_id:    sessionId,
        p_jury_user_id:  juryUserId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSION_JURY_KEYS.forSession(sessionId) });
    },
  });
}

// ── Mutation : créer une ghost profile (juré externe sans auth.users) ────────
// Retourne le nouveau user_id (uuid) — à chaîner avec useAssignJuror pour
// l'attacher effectivement à la session.
export function useCreateJuryProfile() {
  return useMutation({
    mutationFn: async ({ qualite, organisation, bio, photoPath, roleHint = 'special' }) => {
      const { data, error } = await supabase.rpc('rsa_create_jury_profile', {
        p_qualite:      qualite || null,
        p_organisation: organisation || null,
        p_bio:          bio || null,
        p_photo_path:   photoPath || null,
        p_role_hint:    roleHint || 'special',
      });
      if (error) throw error;
      return data; // uuid
    },
  });
}

// ── Helper : détection de l'erreur "scores déjà saisis" (23503) ──────────────
// Retourne true si l'erreur Supabase correspond au RAISE 23503 côté RPC.
export function isJurorRemovalBlockedByScores(err) {
  if (!err) return false;
  if (err.code === '23503') return true;
  const msg = String(err.message || err.details || '').toLowerCase();
  return msg.includes('23503') || msg.includes('already') && msg.includes('score');
}
