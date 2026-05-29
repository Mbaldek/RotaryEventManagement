// Hooks TanStack Query du Master Cockpit V2 (RSA multi-club).
//
// Co-localisés avec les composants master/* (même patron que useAdmin.js du M4a).
// Frontière de sécurité = RLS + RPC SECURITY DEFINER côté serveur (cf. migrations
// 20260529_rsa_v2_*.sql). Les hooks ne portent AUCUNE garde de rôle.
//
// Préfixe des React Query keys : ['rsa', 'master', ...] pour ne pas marcher sur
// l'invalidation du M4a (qui utilise ['rsa', 'admin', ...]).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Club,
  ClubMembership,
  Edition,
  EditionClub,
  RsaSession,
  createCompetition,
} from '@/lib/rsa/entities';

export const KEYS = {
  // Catalogue toutes compétitions (alias de M4a editions, listées desc par year)
  competitions:        ['rsa', 'master', 'competitions'],
  // Tous les clubs (lit via RPC rsa_list_clubs).
  clubs:               ['rsa', 'master', 'clubs'],
  // Clubs attachés à une compétition (junction edition_clubs).
  clubsForEdition:     (eid) => ['rsa', 'master', 'clubs-for-edition', eid],
  // Membres d'un club (rsa_list_club_members).
  clubMembers:         (cid) => ['rsa', 'master', 'club-members', cid],
  // Comptes agrégés par compétition (startups + sessions ; lus directement en
  // table car la RLS startups_read/sessions autorise déjà le master_admin).
  countsForEdition:    (eid) => ['rsa', 'master', 'counts-for-edition', eid],
  // Finalistes par club pour une compétition multiclub (kind='qualifying' + status='finaliste').
  finalistsForEdition: (eid) => ['rsa', 'master', 'finalists', eid],
  // V3 Vague 2 — Pool de la Grande Finale fédérée (platform_finale_membership).
  finalePool:          (eid) => ['rsa', 'master', 'finale-pool', eid],
};

// ── Helper d'invalidation ──────────────────────────────────────────────────
function invalidateMaster(qc) {
  qc.invalidateQueries({ queryKey: ['rsa', 'master'], exact: false });
}

// ── Compétitions ────────────────────────────────────────────────────────────
export function useAllCompetitions() {
  return useQuery({
    queryKey: KEYS.competitions,
    queryFn: () => Edition.listAllForAdmin(),
    staleTime: 60 * 1000,
  });
}

export function useCreateCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, year, model }) =>
      createCompetition({ id, name, year, model }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.competitions });
    },
  });
}

// V3 — Update direct d'une compétition (Edition.patch). Utilisé par l'autosave
// debounced du funnel/CompetitionEditView. Invalide le cache master (catalogue +
// dépendances) sur succès. Pas de toast ici : le statut "Enregistré il y a Xs"
// est rendu par <FunnelEditorModal> via useAutosaveCompetition.
export function useUpdateCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => Edition.patch(id, patch),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.competitions });
      if (vars?.id) {
        qc.invalidateQueries({
          queryKey: ['rsa', 'master', 'competition-dependencies', vars.id],
        });
      }
    },
  });
}

// V2.5 — Pré-comptage des dépendances pour la modale de suppression de compétition.
// Retourne un jsonb { name, year, model, clubs_count, sessions_total, sessions_draft,
// sessions_live, sessions_published, startups_count, reviews_count, scores_count }.
export function useCountCompetitionDependencies(editionId) {
  return useQuery({
    queryKey: ['rsa', 'master', 'competition-dependencies', editionId],
    enabled: !!editionId,
    staleTime: 10 * 1000,
    queryFn: async () => {
      if (!editionId) return null;
      const { data, error } = await supabase.rpc(
        'rsa_count_competition_dependencies',
        { p_id: editionId },
      );
      if (error) throw error;
      return data;
    },
  });
}

// V2.5 — Suppression typée d'une compétition. Le typed_confirm doit être exactement
// "SUPPRIMER {edition.name}", validé côté RPC (RAISE 'typed_confirm_mismatch' sinon).
// Retourne le snapshot jsonb des compteurs supprimés (pour toast détaillé).
export function useDeleteCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ editionId, typedConfirm }) => {
      const { data, error } = await supabase.rpc('rsa_delete_competition', {
        p_id:            editionId,
        p_typed_confirm: typedConfirm,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.competitions });
      invalidateMaster(qc);
    },
  });
}

// ── Clubs ───────────────────────────────────────────────────────────────────
export function useAllClubs() {
  return useQuery({
    queryKey: KEYS.clubs,
    queryFn: () => Club.listAll(),
    staleTime: 60 * 1000,
  });
}

export function useCreateClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => Club.createClub(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.clubs });
    },
  });
}

// V2.5 — édition d'un club existant (master_admin OR club_admin du club).
// payload : { id, name?, country?, language?, contactFirstName?, ... }
export function useUpdateClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => Club.updateClub(payload),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.clubs });
      if (vars?.id) {
        qc.invalidateQueries({ queryKey: KEYS.clubMembers(vars.id) });
      }
    },
  });
}

// ── Junction edition_clubs ──────────────────────────────────────────────────
export function useClubsForEdition(editionId) {
  return useQuery({
    queryKey: KEYS.clubsForEdition(editionId),
    queryFn: () => EditionClub.forEdition(editionId),
    enabled: !!editionId,
    staleTime: 30 * 1000,
  });
}

export function useAttachClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ editionId, clubId, eligibilityRules }) =>
      EditionClub.attach({ editionId, clubId, eligibilityRules }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.clubsForEdition(vars.editionId) });
      qc.invalidateQueries({ queryKey: KEYS.countsForEdition(vars.editionId) });
    },
  });
}

export function useDetachClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ editionId, clubId }) => EditionClub.detach({ editionId, clubId }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.clubsForEdition(vars.editionId) });
      qc.invalidateQueries({ queryKey: KEYS.countsForEdition(vars.editionId) });
    },
  });
}

// ── Membres club ────────────────────────────────────────────────────────────
export function useClubMembers(clubId) {
  return useQuery({
    queryKey: KEYS.clubMembers(clubId),
    queryFn: () => ClubMembership.listMembers(clubId),
    enabled: !!clubId,
    staleTime: 30 * 1000,
  });
}

export function useAssignClubRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, clubId, role }) =>
      ClubMembership.assign({ email, clubId, role }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.clubMembers(vars.clubId) });
    },
  });
}

export function useRevokeClubRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, clubId, role }) =>
      ClubMembership.revoke({ email, clubId, role }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.clubMembers(vars.clubId) });
    },
  });
}

// ── Compteurs agrégés par compétition ───────────────────────────────────────
// Une seule query qui rapporte :
//   { clubsCount, startupsCount, sessionsCount, sessionsLive, sessionsPublished, byClub: Map }
// La RLS startups_read / sessions_read autorise le master_admin via is_master_admin().
// Pour éviter une explosion d'aller-retours : on lit (id, club_id, status) pour startups
// et (id, club_id, status, kind, name, session_date, config?) pour sessions.
export function useCountsForEdition(editionId) {
  return useQuery({
    queryKey: KEYS.countsForEdition(editionId),
    enabled: !!editionId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!editionId) return null;
      // 1) clubs attachés
      const ec = await EditionClub.forEdition(editionId);
      // 2) startups (id, status, club_id)
      const stRes = await supabase
        .from('startups')
        .select('id, status, club_id')
        .eq('edition_id', editionId);
      if (stRes.error) throw stRes.error;
      // 3) sessions + status (jointure session_config)
      const sessions = await RsaSession.withConfigForEdition(editionId);

      const byClub = new Map();
      for (const row of ec || []) {
        byClub.set(row.club_id, {
          club: row.club || { id: row.club_id, name: row.club_id },
          startups: 0,
          sessions: 0,
          sessionsLive: 0,
          sessionsPublished: 0,
        });
      }
      let sessionsLive = 0;
      let sessionsPublished = 0;
      for (const s of sessions || []) {
        const cstatus = s.config?.status || 'draft';
        if (cstatus === 'live') sessionsLive += 1;
        if (cstatus === 'published') sessionsPublished += 1;
        // Per-club counters
        if (s.club_id) {
          if (!byClub.has(s.club_id)) {
            // club non attaché mais session pré-existante (legacy) — on l'ajoute pour
            // la cohérence d'affichage.
            byClub.set(s.club_id, {
              club: { id: s.club_id, name: s.club_id },
              startups: 0,
              sessions: 0,
              sessionsLive: 0,
              sessionsPublished: 0,
            });
          }
          const bucket = byClub.get(s.club_id);
          bucket.sessions += 1;
          if (cstatus === 'live') bucket.sessionsLive += 1;
          if (cstatus === 'published') bucket.sessionsPublished += 1;
        }
      }
      for (const s of stRes.data || []) {
        if (s.club_id && byClub.has(s.club_id)) {
          byClub.get(s.club_id).startups += 1;
        } else if (s.club_id) {
          byClub.set(s.club_id, {
            club: { id: s.club_id, name: s.club_id },
            startups: 1,
            sessions: 0,
            sessionsLive: 0,
            sessionsPublished: 0,
          });
        }
      }
      return {
        clubsCount:        (ec || []).length,
        startupsCount:     (stRes.data || []).length,
        sessionsCount:     (sessions || []).length,
        sessionsLive,
        sessionsPublished,
        byClub:            Array.from(byClub.values()),
        // raw sessions kept for downstream (FederatedFinaleTab finds finale session)
        sessions,
      };
    },
  });
}

// ── Champions par club (status='finaliste', kind='qualifying') ──────────────
// Lit les startups finalistes attachées à une session qualificative d'un club
// pour la compétition donnée. Master_admin a accès via RLS startups_read.
export function useFinalistsForEdition(editionId) {
  return useQuery({
    queryKey: KEYS.finalistsForEdition(editionId),
    enabled: !!editionId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!editionId) return [];
      // On lit les startups en finalist + la session associée pour avoir le name/club.
      const stRes = await supabase
        .from('startups')
        .select('id, name, status, club_id, session_id')
        .eq('edition_id', editionId)
        .eq('status', 'finaliste');
      if (stRes.error) throw stRes.error;
      const startups = stRes.data || [];
      const sessionIds = Array.from(new Set(startups.map((s) => s.session_id).filter(Boolean)));
      if (sessionIds.length === 0) return startups.map((s) => ({ ...s, session: null }));
      const sessRes = await supabase
        .from('sessions')
        .select('id, name, kind, club_id, session_date')
        .in('id', sessionIds);
      if (sessRes.error) throw sessRes.error;
      const byId = new Map((sessRes.data || []).map((s) => [s.id, s]));
      return startups
        .map((s) => ({ ...s, session: byId.get(s.session_id) || null }))
        // On exclut les finalistes promus dans la session 'finale' (club_id=NULL) car
        // ils ne sont plus à "promouvoir" — ils sont déjà à la finale.
        .filter((s) => !s.session || s.session.kind !== 'finale');
    },
  });
}

// ── Finale session (kind='finale' AND club_id IS NULL) ──────────────────────
// Retourne la session de Grande Finale fédérée pour une compétition, si elle existe.
// Lit via les sessions déjà chargées par useCountsForEdition côté consommateur quand
// possible. Hook autonome ici pour les cas où on n'a pas le contexte.
export function useFederatedFinale(editionId) {
  return useQuery({
    queryKey: ['rsa', 'master', 'federated-finale', editionId],
    enabled: !!editionId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!editionId) return null;
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('edition_id', editionId)
        .eq('kind', 'finale')
        .is('club_id', null)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

// ── V3 Vague 2 — Pool finale fédérée (platform_finale_membership) ───────────
// Lit le pool des startups promues à la Grande Finale d'une édition. La RLS
// pfm_read autorise master_admin + admin/comité legacy + club_admin pour ses
// propres startups. On enrichit côté client avec name + club + session source.
export function useFinalePool(editionId) {
  return useQuery({
    queryKey: KEYS.finalePool(editionId),
    enabled: !!editionId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!editionId) return [];
      const { data: rows, error } = await supabase
        .from('platform_finale_membership')
        .select('edition_id, startup_id, source_session_id, promoted_at, promoted_by')
        .eq('edition_id', editionId)
        .order('promoted_at', { ascending: false });
      if (error) throw error;
      const list = rows || [];
      if (list.length === 0) return [];
      // Enrichir avec startups + sessions (sources).
      const startupIds = Array.from(new Set(list.map((r) => r.startup_id)));
      const sessionIds = Array.from(new Set(list.map((r) => r.source_session_id).filter(Boolean)));
      const [stRes, sessRes] = await Promise.all([
        supabase.from('startups').select('id, name, club_id').in('id', startupIds),
        sessionIds.length > 0
          ? supabase.from('sessions').select('id, name, session_date, club_id').in('id', sessionIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (stRes.error)  throw stRes.error;
      if (sessRes.error) throw sessRes.error;
      const startupsById = new Map((stRes.data || []).map((s) => [s.id, s]));
      const sessionsById = new Map((sessRes.data || []).map((s) => [s.id, s]));
      // Récupère aussi le nom du club si possible.
      const clubIds = Array.from(new Set(
        (stRes.data || []).map((s) => s.club_id).filter(Boolean),
      ));
      let clubsById = new Map();
      if (clubIds.length > 0) {
        const clRes = await supabase.from('clubs').select('id, name').in('id', clubIds);
        if (clRes.error) throw clRes.error;
        clubsById = new Map((clRes.data || []).map((c) => [c.id, c]));
      }
      return list.map((row) => {
        const startup = startupsById.get(row.startup_id) || null;
        const session = row.source_session_id
          ? (sessionsById.get(row.source_session_id) || null)
          : null;
        const club = startup?.club_id ? (clubsById.get(startup.club_id) || null) : null;
        return { ...row, startup, session, club };
      });
    },
  });
}

// Retire une startup du pool finale (master_admin only ; RPC SECURITY DEFINER).
// Idempotent côté serveur. Invalide cache pool + finalists + counts.
export function useRemoveFinalist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ editionId, startupId }) => {
      const { error } = await supabase.rpc('rsa_remove_finalist', {
        p_edition_id: editionId,
        p_startup_id: startupId,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.finalePool(vars.editionId) });
      qc.invalidateQueries({ queryKey: KEYS.finalistsForEdition(vars.editionId) });
      qc.invalidateQueries({ queryKey: KEYS.countsForEdition(vars.editionId) });
    },
  });
}

// ── Création session finale fédérée ─────────────────────────────────────────
// Wrap RsaSession.createWithConfig en forçant kind='finale' et club_id=null.
// Le RPC rsa_create_session accepte un payload avec club_id explicite.
export function useCreateFederatedFinale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ editionId, payload }) => {
      const full = {
        ...payload,
        kind: 'finale',
        // club_id explicitement null pour la finale fédérée
        club_id: null,
      };
      return RsaSession.createWithConfig({ editionId, payload: full });
    },
    onSuccess: (_d, vars) => {
      invalidateMaster(qc);
      qc.invalidateQueries({ queryKey: KEYS.countsForEdition(vars.editionId) });
    },
  });
}
