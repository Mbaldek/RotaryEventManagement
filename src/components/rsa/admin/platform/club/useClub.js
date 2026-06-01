// Hooks TanStack Query du Club Cockpit (V2 multi-club, étape 6).
//
// Surcouches club-scoped au-dessus des entités RSA et des hooks legacy `useAdmin`.
// La frontière de sécurité reste serveur (RLS + RPC SECURITY DEFINER étendus en
// étape 3). Ces hooks ne portent AUCUNE garde de rôle ; Admin.jsx pose le scope.
//
// Pourquoi ré-implémenter ici plutôt que d'étendre useAdmin :
//   - useAdmin est SSOT pour le cockpit legacy/master ; on n'y touche pas (la
//     contrainte du brief interdit son édition).
//   - les hooks club-scoped exposent une API minimaliste taillée pour le shell
//     ClubCockpit (1 hook par tab + un summary pour la strip).

import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Club,
  ClubMembership,
  Edition,
  EditionClub,
  RsaSession,
} from '@/lib/rsa/entities';
import { mapSessionMetrics } from '@/lib/rsa/club-cockpit/metrics';

export const CLUB_KEYS = {
  club:               (id) => ['rsa', 'club', 'club', id],
  members:            (id) => ['rsa', 'club', 'members', id],
  editionsForAdmin:   ['rsa', 'club', 'editions'],
  attachment:         (eid, cid) => ['rsa', 'club', 'attachment', eid, cid],
  startupsSummary:    (eid, cid) => ['rsa', 'club', 'startups-summary', eid, cid],
  juryAssignmentsForEdition: (eid, cid) => ['rsa', 'club', 'jury-assignments', eid, cid],
  sessionMetrics:     (eid, cid) => ['rsa', 'club', 'session-metrics', eid, cid],
};

// ── Club courant (lecture publique via rsa_list_clubs + filtre côté client) ──
// On ré-utilise Club.listAll() (RPC) plutôt qu'une 2nde fonction dédiée — listAll
// est cheap (< 100 clubs prévus) et le cache TanStack la déduplique.
export function useClub(clubId) {
  return useQuery({
    queryKey: CLUB_KEYS.club(clubId),
    queryFn: async () => {
      if (!clubId) return null;
      const clubs = await Club.listAll();
      return (clubs || []).find((c) => c.id === clubId) || null;
    },
    enabled: !!clubId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Liste des membres d'un club (RPC rsa_list_club_members, scope serveur) ──
export function useClubMembers(clubId) {
  return useQuery({
    queryKey: CLUB_KEYS.members(clubId),
    queryFn: () => ClubMembership.listMembers(clubId),
    enabled: !!clubId,
    staleTime: 30 * 1000,
  });
}

// ── Assignation / retrait d'un membre (RPC, contrôle d'accès serveur) ──────
export function useAssignClubMember(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }) => ClubMembership.assign({ email, clubId, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLUB_KEYS.members(clubId) });
    },
  });
}

export function useRevokeClubMember(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }) => ClubMembership.revoke({ email, clubId, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLUB_KEYS.members(clubId) });
    },
  });
}

// ── Éditions accessibles à l'admin (toutes : draft inclus côté staff) ───────
// Réutilise Edition.listAllForAdmin() (couvre la RLS staff) — pas de surcharge
// club-scoped : un club_admin a besoin de voir la compétition active + tout
// historique de son club. Les sessions/startups sont filtrés ensuite par club_id.
export function useClubEditions() {
  return useQuery({
    queryKey: CLUB_KEYS.editionsForAdmin,
    queryFn: () => Edition.listAllForAdmin(),
    staleTime: 60 * 1000,
  });
}

// ── Sessions d'une édition (jointure session_config), filtrées par club ────
// On délègue à RsaSession.withConfigForEdition (déjà SSOT du legacy) puis on
// filtre côté client par club_id. Coût minime (< 50 sessions par édition).
export function useClubSessions(editionId, clubId) {
  return useQuery({
    queryKey: ['rsa', 'club', 'sessions', editionId, clubId],
    queryFn: async () => {
      if (!editionId) return [];
      const all = await RsaSession.withConfigForEdition(editionId);
      if (!clubId) return all;
      return (all || []).filter((s) => s.club_id === clubId);
    },
    enabled: !!editionId,
    staleTime: 15 * 1000,
  });
}

// ── Rattachement edition×club (eligibility_rules override) ──────────────────
// Lit l'entrée edition_clubs ; null si le club n'est pas rattaché à l'édition.
export function useEditionClubAttachment(editionId, clubId) {
  return useQuery({
    queryKey: CLUB_KEYS.attachment(editionId, clubId),
    queryFn: async () => {
      if (!editionId || !clubId) return null;
      const all = await EditionClub.forEdition(editionId);
      return (all || []).find((r) => r.club_id === clubId) || null;
    },
    enabled: !!editionId && !!clubId,
    staleTime: 60 * 1000,
  });
}

// ── Sauvegarde des règles d'éligibilité (override club) ────────────────────
// EditionClub.attach() passe par rsa_attach_club_to_edition (idempotent via
// ON CONFLICT côté SQL — sert aussi de upsert pour eligibility_rules).
export function useSaveClubEligibilityRules(editionId, clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eligibilityRules }) => EditionClub.attach({ editionId, clubId, eligibilityRules }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLUB_KEYS.attachment(editionId, clubId) });
    },
  });
}

// ── Synthèse startups d'un club pour la status strip ───────────────────────
// On lit (id, status, club_id) pour l'édition + on filtre par club côté client.
export function useClubStartupsSummary(editionId, clubId) {
  return useQuery({
    queryKey: CLUB_KEYS.startupsSummary(editionId, clubId),
    queryFn: async () => {
      if (!editionId || !clubId) return {};
      const { data, error } = await supabase
        .from('startups')
        .select('id, status, club_id')
        .eq('edition_id', editionId)
        .eq('club_id', clubId);
      if (error) throw error;
      const out = {};
      for (const r of data || []) {
        out[r.status] = (out[r.status] || 0) + 1;
      }
      out.__total__ = (data || []).length;
      return out;
    },
    enabled: !!editionId && !!clubId,
    staleTime: 30 * 1000,
  });
}

// ── Assignments jury agrégés pour les sessions d'un club ──────────────────
// Sert à la strip ("K jurés assignés") — on dédoublonne par jury_user_id
// (un même juré sur 3 sessions ne compte qu'une fois).
export function useClubJuryAssignmentsCount(editionId, clubId) {
  const sessionsQ = useClubSessions(editionId, clubId);
  const sessionIds = useMemo(
    () => (sessionsQ.data || []).map((s) => s.id),
    [sessionsQ.data],
  );
  return useQuery({
    queryKey: CLUB_KEYS.juryAssignmentsForEdition(editionId, clubId),
    queryFn: async () => {
      if (sessionIds.length === 0) return { uniqueJurors: 0, totalAssignments: 0 };
      const { data, error } = await supabase
        .from('platform_jury_assignments')
        .select('jury_user_id, session_id')
        .in('session_id', sessionIds);
      if (error) throw error;
      const uniq = new Set((data || []).map((a) => a.jury_user_id));
      return { uniqueJurors: uniq.size, totalAssignments: (data || []).length };
    },
    enabled: !!editionId && !!clubId && !sessionsQ.isLoading,
    staleTime: 30 * 1000,
  });
}

// ── Métriques par session (timeline du Pilotage) ───────────────────────────
// Deux requêtes club-scoped (startups affectées à une session + assignations
// jury), mappées par le helper pur mapSessionMetrics. sessionIds vient du parent
// (useClubSessions) pour scoper la requête jury.
export function useClubSessionMetrics(editionId, clubId, sessionIds) {
  return useQuery({
    queryKey: CLUB_KEYS.sessionMetrics(editionId, clubId),
    queryFn: async () => {
      if (!editionId || !clubId || !sessionIds?.length) return {};
      const [startupsRes, juryRes] = await Promise.all([
        supabase
          .from('startups')
          .select('id, session_id')
          .eq('edition_id', editionId)
          .eq('club_id', clubId)
          .not('session_id', 'is', null),
        supabase
          .from('platform_jury_assignments')
          .select('jury_user_id, session_id')
          .in('session_id', sessionIds),
      ]);
      if (startupsRes.error) throw startupsRes.error;
      if (juryRes.error) throw juryRes.error;
      return mapSessionMetrics({
        startupRows: startupsRes.data || [],
        juryRows: juryRes.data || [],
      });
    },
    enabled: !!editionId && !!clubId && !!sessionIds?.length,
    staleTime: 30 * 1000,
  });
}
