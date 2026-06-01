// Hooks TanStack Query du cockpit admin (Module 4a — SETUP / LIVE / RESULTS).
//
// Co-localisés avec les composants admin/platform/* (même patron que useSelection.js
// Module 2 et useJury.js Module 3). Frontière sécurité = RLS + RPC SECURITY DEFINER
// (cf. migrations 20260527_rsa_module*_*.sql).
//
// Les hooks ne portent AUCUNE garde de rôle (ils sont rendus dans un arbre déjà gaté
// par AdminShell + Admin.jsx isAdmin). Le serveur est l'ultime frontière.

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  AppUserRole,
  Edition,
  JuryAssignment,
  JuryProfile,
  JuryScore,
  RsaSession,
  Startup,
} from '@/lib/rsa/entities';

export const KEYS = {
  // Catalogue éditions (admin = lit toutes y compris draft).
  editions:           ['rsa', 'admin', 'editions'],
  // Sessions + session_config (jointure) pour une édition.
  sessionsForEdition: (eid) => ['rsa', 'admin', 'sessions', eid],
  // Synthèse {status: count} pour la ModuleStatusStrip.
  startupsSummary:    (eid) => ['rsa', 'admin', 'startups-summary', eid],
  // Roster admin transverse (filtré côté serveur).
  startupsAdminList:  (filters) => [
    'rsa', 'admin', 'startups-list',
    filters?.editionId || null,
    Array.isArray(filters?.statusIn) ? filters.statusIn.join(',') : null,
    filters?.sessionId || null,
  ],
  // Rôles plateforme (table app_user_roles via RPC admin).
  roles:              ['rsa', 'admin', 'roles'],
  // Live grid : drafts + scores pour une session.
  liveDrafts:         (sid) => ['rsa', 'admin', 'live-drafts', sid],
  liveScores:         (sid) => ['rsa', 'admin', 'live-scores', sid],
  liveAssignments:    (sid) => ['rsa', 'admin', 'live-assignments', sid],
  liveStartups:       (sid) => ['rsa', 'admin', 'live-startups', sid],
  juryProfiles:       (ids) => ['rsa', 'admin', 'jury-profiles', ...(ids || []).sort()],
  // Lifecycle d'une session (session_config — lecture directe table legacy).
  sessionConfig:      (sid) => ['rsa', 'admin', 'session-config', sid],
};

// ── Helper d'invalidation grosse maille ────────────────────────────────────
function invalidateAdminScope(qc) {
  qc.invalidateQueries({ queryKey: ['rsa', 'admin'], exact: false });
}

// ── Éditions ────────────────────────────────────────────────────────────────
export function useAdminEditions() {
  return useQuery({
    queryKey: KEYS.editions,
    queryFn: () => Edition.listAllForAdmin(),
    staleTime: 60 * 1000,
  });
}

export function useUpdateEdition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => Edition.patch(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.editions });
    },
  });
}

// ── Sessions (jointure sessions × session_config) pour une édition ─────────
export function useSessionsAdmin(editionId) {
  return useQuery({
    queryKey: KEYS.sessionsForEdition(editionId),
    queryFn: () => RsaSession.withConfigForEdition(editionId),
    enabled: !!editionId,
    staleTime: 15 * 1000,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ editionId, payload }) => RsaSession.createWithConfig({ editionId, payload }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.sessionsForEdition(vars.editionId) });
    },
  });
}

export function useSetSessionLive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId) => RsaSession.setLive(sessionId),
    onSuccess: (_d, sessionId) => {
      qc.invalidateQueries({ queryKey: KEYS.sessionConfig(sessionId) });
      qc.invalidateQueries({ queryKey: ['rsa', 'admin', 'sessions'], exact: false });
    },
  });
}

export function useSetSessionDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId) => RsaSession.setDraft(sessionId),
    onSuccess: (_d, sessionId) => {
      qc.invalidateQueries({ queryKey: KEYS.sessionConfig(sessionId) });
      qc.invalidateQueries({ queryKey: ['rsa', 'admin', 'sessions'], exact: false });
    },
  });
}

export function useUnlockSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId) => RsaSession.unlock(sessionId),
    onSuccess: (_d, sessionId) => {
      qc.invalidateQueries({ queryKey: KEYS.sessionConfig(sessionId) });
      qc.invalidateQueries({ queryKey: ['rsa', 'admin', 'sessions'], exact: false });
      qc.invalidateQueries({ queryKey: ['rsa', 'admin', 'live-startups'], exact: false });
    },
  });
}

export function useResetSessionTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId) => RsaSession.resetTemplate(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rsa', 'admin', 'sessions'], exact: false });
    },
  });
}

export function useLockSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId) => JuryScore.lockSession(sessionId),
    onSuccess: (_d, sessionId) => {
      qc.invalidateQueries({ queryKey: KEYS.sessionConfig(sessionId) });
      qc.invalidateQueries({ queryKey: ['rsa', 'admin', 'sessions'], exact: false });
      qc.invalidateQueries({ queryKey: ['rsa', 'admin', 'live-startups'], exact: false });
    },
  });
}

export function usePublishSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId) => JuryScore.publishSession(sessionId),
    onSuccess: () => {
      invalidateAdminScope(qc);
    },
  });
}

// ── Rôles plateforme ───────────────────────────────────────────────────────
export function useRolesAdmin() {
  return useQuery({
    queryKey: KEYS.roles,
    queryFn: () => AppUserRole.list(),
    staleTime: 30 * 1000,
  });
}

export function useAssignRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, roles }) => AppUserRole.assign({ email, roles }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.roles });
    },
  });
}

// ── Synthèse globale (ModuleStatusStrip) ───────────────────────────────────
export function useStartupsSummary(editionId) {
  return useQuery({
    queryKey: KEYS.startupsSummary(editionId),
    queryFn: () => Startup.summaryByStatus(editionId),
    enabled: !!editionId,
    staleTime: 30 * 1000,
  });
}

// ── Live grid ──────────────────────────────────────────────────────────────
// On combine 4 queries (assignments + profiles + startups + scores) + une sub realtime
// sur drafts + scores. Le hook expose un objet stable {assignments, profiles, startups,
// scores, drafts, isLoading, isError, refetch}. Les composants en haut consomment
// directement via useLiveGrid.
export function useLiveStartupsForSession(sessionId) {
  return useQuery({
    queryKey: KEYS.liveStartups(sessionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startups')
        .select('id, name, status, session_id')
        .eq('session_id', sessionId)
        .in('status', ['affecte', 'en_session', 'note', 'finaliste'])
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId,
    staleTime: 15 * 1000,
  });
}

export function useLiveAssignmentsForSession(sessionId) {
  return useQuery({
    queryKey: KEYS.liveAssignments(sessionId),
    queryFn: () => JuryAssignment.forSession(sessionId),
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });
}

export function useLiveJuryProfiles(userIds) {
  const ids = Array.isArray(userIds) ? userIds.filter(Boolean) : [];
  return useQuery({
    queryKey: KEYS.juryProfiles(ids),
    queryFn: () => JuryProfile.forIds(ids),
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// Lecture directe session_config (table legacy — pas exposée via entities).
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
    staleTime: 5 * 1000,
  });
}

// Live drafts + final scores avec subscription Realtime.
// On gère un state local mirroring les deux tables pour que la grille répercute
// immédiatement les changements (sans round-trip query/invalidate).
export function useLiveScores(sessionId) {
  const [drafts, setDrafts] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId) {
      setDrafts([]);
      setScores([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [dRes, sRes] = await Promise.all([
          supabase
            .from('platform_jury_score_drafts')
            .select('*')
            .eq('session_id', sessionId),
          supabase
            .from('platform_jury_scores')
            .select('*')
            .eq('session_id', sessionId),
        ]);
        if (dRes.error) throw dRes.error;
        if (sRes.error) throw sRes.error;
        if (!cancelled) {
          setDrafts(dRes.data || []);
          setScores(sRes.data || []);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Realtime subscriptions — drafts + scores. La PK composite (startup_id, jury_user_id)
    // ne donne pas un .id unique côté payload : on reconcilie par les deux colonnes.
    const draftChannel = supabase
      .channel(`admin_live_drafts_${sessionId}_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_jury_score_drafts', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const next = payload.new;
          const old = payload.old;
          if (payload.eventType === 'DELETE') {
            setDrafts((prev) =>
              prev.filter((d) => !(d.startup_id === old?.startup_id && d.jury_user_id === old?.jury_user_id)),
            );
            return;
          }
          if (!next) return;
          setDrafts((prev) => {
            const idx = prev.findIndex(
              (d) => d.startup_id === next.startup_id && d.jury_user_id === next.jury_user_id,
            );
            if (idx >= 0) {
              const out = [...prev];
              out[idx] = next;
              return out;
            }
            return [...prev, next];
          });
        },
      )
      .subscribe();

    const scoreChannel = supabase
      .channel(`admin_live_scores_${sessionId}_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_jury_scores', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const next = payload.new;
          const old = payload.old;
          if (payload.eventType === 'DELETE') {
            setScores((prev) =>
              prev.filter((s) => !(s.startup_id === old?.startup_id && s.jury_user_id === old?.jury_user_id)),
            );
            return;
          }
          if (!next) return;
          setScores((prev) => {
            const idx = prev.findIndex(
              (s) => s.startup_id === next.startup_id && s.jury_user_id === next.jury_user_id,
            );
            if (idx >= 0) {
              const out = [...prev];
              out[idx] = next;
              return out;
            }
            return [...prev, next];
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(draftChannel);
      supabase.removeChannel(scoreChannel);
    };
  }, [sessionId]);

  return { drafts, scores, loading, error };
}

// ── Live grid composé (utilisé par LiveTab) ────────────────────────────────
export function useLiveGrid(sessionId) {
  const assignments = useLiveAssignmentsForSession(sessionId);
  const startups    = useLiveStartupsForSession(sessionId);
  const userIds     = useMemo(
    () => (assignments.data || []).map((a) => a.jury_user_id),
    [assignments.data],
  );
  const profiles    = useLiveJuryProfiles(userIds);
  const { drafts, scores, loading: liveLoading, error: liveError } = useLiveScores(sessionId);

  const isLoading = assignments.isLoading || startups.isLoading || profiles.isLoading || liveLoading;
  const isError   = assignments.isError   || startups.isError   || profiles.isError   || !!liveError;

  return {
    assignments: assignments.data || [],
    profiles:    profiles.data || [],
    startups:    startups.data || [],
    drafts,
    scores,
    isLoading,
    isError,
    error: liveError || assignments.error || startups.error || profiles.error,
    refetch: () => {
      assignments.refetch();
      startups.refetch();
      profiles.refetch();
    },
  };
}

// ── Live grid NAME-KEYED (flux jury SANS COMPTE) ────────────────────────────
// Source : jurés = jury_applications approved (RPC rsa_session_jurors, filtré) ;
// startups = lineup en pitch_order ; scores/drafts = jury_scores / jury_score_drafts
// (clé = jury_name::startup_name). Répare la grille pour le flux name-pick : l'ancien
// useLiveGrid lit le modèle auth (platform_jury_*) où ce flux n'écrit jamais.
export function useSessionApprovedJurors(sessionId) {
  return useQuery({
    queryKey: ['rsa', 'admin', 'nk-jurors', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase.rpc('rsa_session_jurors', { p_session_id: sessionId });
      if (error) throw error;
      return (data || []).filter((j) => j.status === 'approved');
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });
}

export function useSessionStartupsOrdered(sessionId) {
  return useQuery({
    queryKey: ['rsa', 'admin', 'nk-startups', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('startups')
        .select('id, name, status, session_id, pitch_order')
        .eq('session_id', sessionId)
        .in('status', ['affecte', 'en_session', 'note', 'finaliste'])
        .order('pitch_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId,
    staleTime: 15 * 1000,
  });
}

// jury_scores + jury_score_drafts (name-keyed) + Realtime. Reconciliation par
// (jury_name, startup_name) — la PK des drafts ne donne pas d'.id côté payload.
export function useNameKeyedScores(sessionId) {
  const [scores, setScores] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId) { setScores([]); setDrafts([]); setLoading(false); return undefined; }
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [sRes, dRes] = await Promise.all([
          supabase.from('jury_scores').select('*').eq('session_id', sessionId),
          supabase.from('jury_score_drafts').select('*').eq('session_id', sessionId),
        ]);
        if (sRes.error) throw sRes.error;
        if (dRes.error) throw dRes.error;
        if (!cancelled) { setScores(sRes.data || []); setDrafts(dRes.data || []); }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const rand = Math.random().toString(36).slice(2);
    const reconcile = (setter) => (payload) => {
      const next = payload.new;
      const old = payload.old;
      if (payload.eventType === 'DELETE') {
        setter((prev) => prev.filter((r) => !(r.jury_name === old?.jury_name && r.startup_name === old?.startup_name)));
        return;
      }
      if (!next) return;
      setter((prev) => {
        const idx = prev.findIndex((r) => r.jury_name === next.jury_name && r.startup_name === next.startup_name);
        if (idx >= 0) { const out = [...prev]; out[idx] = next; return out; }
        return [...prev, next];
      });
    };
    const scoreCh = supabase
      .channel(`nk_scores_${sessionId}_${rand}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jury_scores', filter: `session_id=eq.${sessionId}` }, reconcile(setScores))
      .subscribe();
    const draftCh = supabase
      .channel(`nk_drafts_${sessionId}_${rand}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jury_score_drafts', filter: `session_id=eq.${sessionId}` }, reconcile(setDrafts))
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(scoreCh); supabase.removeChannel(draftCh); };
  }, [sessionId]);

  return { scores, drafts, loading, error };
}

export function useNameKeyedLiveGrid(sessionId) {
  const jurors = useSessionApprovedJurors(sessionId);
  const startups = useSessionStartupsOrdered(sessionId);
  const { scores, drafts, loading, error } = useNameKeyedScores(sessionId);
  const isLoading = jurors.isLoading || startups.isLoading || loading;
  const isError = jurors.isError || startups.isError || !!error;
  return {
    jurors: jurors.data || [],
    startups: startups.data || [],
    scores,
    drafts,
    isLoading,
    isError,
    error: error || jurors.error || startups.error,
    refetch: () => { jurors.refetch(); startups.refetch(); },
  };
}

// ── Results — lit le snapshot final_ranking + scores agrégés ───────────────
export function useSessionResults(sessionId) {
  return useQuery({
    queryKey: ['rsa', 'admin', 'results', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const [{ data: cfg, error: cfgErr }, scoresRes] = await Promise.all([
        supabase.from('session_config').select('*').eq('session_id', sessionId).maybeSingle(),
        supabase.from('platform_jury_scores').select('*').eq('session_id', sessionId),
      ]);
      if (cfgErr) throw cfgErr;
      if (scoresRes.error) throw scoresRes.error;
      return { config: cfg ?? null, scores: scoresRes.data || [] };
    },
    enabled: !!sessionId,
    staleTime: 5 * 1000,
  });
}

// ── Results NAME-KEYED (flux jury sans compte) ──────────────────────────────
// Lit session_config (statut + poids + overrides + snapshot) + jury_scores
// (name-keyed). Le preview de classement se calcule via buildRanking(scores,
// {}, resolveSessionWeights(config)). Le publish (RPC rsa_publish_session) agrège
// désormais aussi jury_scores name-keyed avec les poids de session.
export function useNameKeyedSessionResults(sessionId) {
  return useQuery({
    queryKey: ['rsa', 'admin', 'nk-results', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const [{ data: cfg, error: cfgErr }, scoresRes] = await Promise.all([
        supabase.from('session_config').select('*').eq('session_id', sessionId).maybeSingle(),
        supabase.from('jury_scores').select('*').eq('session_id', sessionId),
      ]);
      if (cfgErr) throw cfgErr;
      if (scoresRes.error) throw scoresRes.error;
      return { config: cfg ?? null, scores: scoresRes.data || [] };
    },
    enabled: !!sessionId,
    staleTime: 5 * 1000,
  });
}

// ── CSV export utility (used by RESULTS) ───────────────────────────────────
function csvField(value) {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function exportCsv(filename, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const header = Object.keys(rows[0]);
  const body = rows.map((r) => header.map((h) => csvField(r[h])).join(',')).join('\n');
  const csv = `${header.join(',')}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
