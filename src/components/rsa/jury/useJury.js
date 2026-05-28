// Hooks TanStack Query de l'Espace Jury (Module 3).
//
// Colocalisés avec les composants jury/* (même patron que useSelection.js Module 2).
// Frontière sécurité = RLS + RPC SECURITY DEFINER (cf. migration 20260527_rsa_module3_jury.sql).
// Les hooks ne gardent AUCUNE garde de rôle (ils sont rendus dans des arbres déjà gates).

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  JuryAssignment,
  JuryDraft,
  JuryProfile,
  JuryScore,
  RsaSession,
  Startup,
} from '@/lib/rsa/entities';

export const KEYS = {
  // Lifecycle session_config (legacy table — on lit via .from directement).
  sessionConfig:    (sid)  => ['rsa', 'jury', 'session-config', sid],
  // Liste de mes assignments + jointure sessions/session_config.
  mySessions:       (uid)  => ['rsa', 'jury', 'my-sessions', uid],
  // Liste des startups d'une session (RLS staff incluant jury).
  startupsForSession: (sid) => ['rsa', 'jury', 'startups', sid],
  // Assignments (admin overview + co-jurors per session).
  assignmentsForSession: (sid) => ['rsa', 'jury', 'assignments', sid],
  allAssignments:   ['rsa', 'jury', 'assignments-all'],
  // Profils juré (résolution co-jurors popover).
  juryProfiles:     (ids)  => ['rsa', 'jury', 'profiles', ...(ids || []).sort()],
  myProfile:        (uid)  => ['rsa', 'jury', 'profile-mine', uid],
  // Mes drafts pour une session.
  myDraftsForSession: (sid, uid) => ['rsa', 'jury', 'drafts', sid, uid],
  myDraftForStartup:  (sid, sup, uid) => ['rsa', 'jury', 'draft', sid, sup, uid],
  // Mes scores finalisés pour une session.
  myScoresForSession: (sid, uid) => ['rsa', 'jury', 'my-scores', sid, uid],
  // Scores aggregated d'une session (staff RLS).
  scoresForSession:   (sid) => ['rsa', 'jury', 'scores', sid],
  // Roles annuaire (admin assignments panel — lecture app_user_roles).
  jurorsDirectory:    ['rsa', 'jury', 'jurors-directory'],
};

// ── Helper d'invalidation grosse maille (workspace juré faible volume) ─────
function invalidateJuryScope(qc) {
  qc.invalidateQueries({ queryKey: ['rsa', 'jury'], exact: false });
}

// ── Session lifecycle (session_config row) ──────────────────────────────────
// Lecture directe — session_config est legacy : on ne l'expose pas via entities.
export function useSessionConfig(sessionId) {
  return useQuery({
    queryKey: KEYS.sessionConfig(sessionId),
    queryFn: async () => {
      if (!sessionId) return null;
      const { data, error } = await supabase
        .from('session_config')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    enabled: !!sessionId,
    staleTime: 15 * 1000,
  });
}

// ── Mes sessions assignées (assignments + sessions reference + session_config) ──
// Résolution côté client (le RLS empêche un juré de lire les sessions des autres
// par a/sa propre voie ; les sessions reference sont publiques cf. sessions_read).
export function useMySessions(userId) {
  return useQuery({
    queryKey: KEYS.mySessions(userId),
    queryFn: async () => {
      if (!userId) return [];
      const assignments = await JuryAssignment.mine(userId);
      if (!assignments.length) return [];
      const sessionIds = assignments.map((a) => a.session_id);
      const [sessionsRes, configsRes] = await Promise.all([
        supabase.from('sessions').select('*').in('id', sessionIds),
        supabase.from('session_config').select('*').in('session_id', sessionIds),
      ]);
      if (sessionsRes.error) throw sessionsRes.error;
      if (configsRes.error) throw configsRes.error;
      const cfgBySession = new Map(
        (configsRes.data || []).map((c) => [c.session_id, c]),
      );
      const sessions = (sessionsRes.data || []).map((s) => ({
        ...s,
        config: cfgBySession.get(s.id) || null,
      }));
      return sessions;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

// ── Startups d'une session (Staff RLS : jury lit toutes les startups) ──────
export function useStartupsForSession(sessionId) {
  return useQuery({
    queryKey: KEYS.startupsForSession(sessionId),
    queryFn: () => Startup.filter({ session_id: sessionId }),
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });
}

// ── Co-jurés d'une session (RLS pja_read : juré voit ceux de ses sessions) ──
export function useAssignmentsForSession(sessionId) {
  return useQuery({
    queryKey: KEYS.assignmentsForSession(sessionId),
    queryFn: () => JuryAssignment.forSession(sessionId),
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });
}

// ── Profils juré pour résoudre display (popover co-jurors) ──────────────────
export function useJuryProfiles(userIds) {
  return useQuery({
    queryKey: KEYS.juryProfiles(userIds),
    queryFn: () => JuryProfile.forIds(userIds),
    enabled: Array.isArray(userIds) && userIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Mon profil juré (pour bio/qualité/organisation). ────────────────────────
export function useMyJuryProfile(userId) {
  return useQuery({
    queryKey: KEYS.myProfile(userId),
    queryFn: () => JuryProfile.mine(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

// ── Mes drafts pour une session entière (UX : progress chip dans la file) ──
export function useMyDraftsForSession(sessionId, userId) {
  return useQuery({
    queryKey: KEYS.myDraftsForSession(sessionId, userId),
    queryFn: () => JuryDraft.forSession(sessionId, userId),
    enabled: !!sessionId && !!userId,
    staleTime: 5 * 1000,
  });
}

// ── Mes scores finaux pour une session ──────────────────────────────────────
export function useMyScoresForSession(sessionId, userId) {
  return useQuery({
    queryKey: KEYS.myScoresForSession(sessionId, userId),
    queryFn: () => JuryScore.mineForSession(sessionId, userId),
    enabled: !!sessionId && !!userId,
    staleTime: 5 * 1000,
  });
}

// ── Scores agrégés d'une session (staff : comité/admin voient tout) ────────
export function useScoresForSession(sessionId) {
  return useQuery({
    queryKey: KEYS.scoresForSession(sessionId),
    queryFn: () => JuryScore.forSession(sessionId),
    enabled: !!sessionId,
    staleTime: 15 * 1000,
  });
}

// ── Save draft (autosave débouncé côté composant) ──────────────────────────
// vars : { startupId, sessionId, juryUserId, patch }
export function useSaveJuryDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => JuryDraft.upsert(vars),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: KEYS.myDraftsForSession(vars.sessionId, vars.juryUserId),
      });
    },
  });
}

// ── Submit final (RPC). Wipes the draft server-side. ───────────────────────
// vars : { startupId, sessionId, scores, comment, juryUserId }
export function useSubmitJuryScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ startupId, sessionId, scores, comment }) =>
      JuryScore.submit({ startupId, sessionId, scores, comment }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: KEYS.myScoresForSession(vars.sessionId, vars.juryUserId),
      });
      qc.invalidateQueries({
        queryKey: KEYS.myDraftsForSession(vars.sessionId, vars.juryUserId),
      });
      qc.invalidateQueries({ queryKey: KEYS.scoresForSession(vars.sessionId) });
    },
  });
}

// ── Admin — Lifecycle (lock / publish) ─────────────────────────────────────
export function useLockSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId) => JuryScore.lockSession(sessionId),
    onSuccess: (_d, sessionId) => {
      qc.invalidateQueries({ queryKey: KEYS.sessionConfig(sessionId) });
      qc.invalidateQueries({ queryKey: KEYS.startupsForSession(sessionId) });
      qc.invalidateQueries({ queryKey: ['rsa', 'jury', 'my-sessions'], exact: false });
    },
  });
}

export function usePublishSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId) => JuryScore.publishSession(sessionId),
    onSuccess: (_d, sessionId) => {
      qc.invalidateQueries({ queryKey: KEYS.sessionConfig(sessionId) });
      qc.invalidateQueries({ queryKey: KEYS.startupsForSession(sessionId) });
      qc.invalidateQueries({ queryKey: ['rsa', 'jury', 'my-sessions'], exact: false });
    },
  });
}

// ── Admin — Assignments CRUD ───────────────────────────────────────────────
export function useAssignJuror() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => JuryAssignment.assign(vars),
    onSuccess: () => invalidateJuryScope(qc),
  });
}

export function useUnassignJuror() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => JuryAssignment.unassign(vars),
    onSuccess: () => invalidateJuryScope(qc),
  });
}

// ── Admin — Listings d'assignments (overview) ──────────────────────────────
export function useAllAssignments() {
  return useQuery({
    queryKey: KEYS.allAssignments,
    queryFn: () => JuryAssignment.listAll(),
    staleTime: 30 * 1000,
  });
}

// ── Admin — Annuaire des jurés (app_user_roles + profiles join) ────────────
// app_user_roles est lock-down côté écriture (service_role only) mais lisible
// par admin. On lit l'email + roles, on joint profiles pour le full_name (RLS profiles
// est "Allow all" cf. C1 — donc lisible).
export function useJurorsDirectory() {
  return useQuery({
    queryKey: KEYS.jurorsDirectory,
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase
        .from('app_user_roles')
        .select('email, roles');
      if (rolesErr) throw rolesErr;
      const jurorEmails = (roles || [])
        .filter((r) => Array.isArray(r.roles) && r.roles.includes('jury'))
        .map((r) => String(r.email).toLowerCase());
      if (jurorEmails.length === 0) return [];
      const { data: profs, error: profsErr } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('email', jurorEmails);
      if (profsErr) throw profsErr;
      const byEmail = new Map((profs || []).map((p) => [String(p.email).toLowerCase(), p]));
      return jurorEmails.map((email) => {
        const prof = byEmail.get(email);
        return {
          email,
          user_id: prof?.id ?? null,
          full_name: prof?.full_name ?? null,
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Helper : RsaSession.filter pour le panneau admin (cluster select) ──────
export function useSessionsForEdition(editionId) {
  return useQuery({
    queryKey: ['rsa', 'jury', 'sessions-edition', editionId],
    queryFn: () => RsaSession.filter({ edition_id: editionId }),
    enabled: !!editionId,
    staleTime: 5 * 60 * 1000,
  });
}
