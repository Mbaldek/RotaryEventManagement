// useAnalytics — hooks TanStack Query + subscription Realtime (V3 Vague 3 · F).
//
// 4 hooks de lecture (1 par RPC SECURITY DEFINER) + un hook
// useAnalyticsRealtimeInvalidator qui ouvre 3 channels Supabase Realtime
// (startups + platform_jury_assignments + platform_jury_scores) et déclenche
// invalidate sur les queryKeys analytics quand un changement est détecté
// (pattern symétrique à useLiveScores dans useAdmin.js).
//
// Frontière sécurité : RPC SECURITY DEFINER côté serveur (caller check
// master_admin / club_admin / comite). Ces hooks ne portent AUCUNE garde.

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const ANALYTICS_KEYS = {
  funnel:        (editionId, clubId) => ['rsa', 'analytics', 'funnel', editionId || null, clubId || null],
  clubsBreakdown:(editionId)         => ['rsa', 'analytics', 'clubs-breakdown', editionId || null],
  jury:          (editionId, clubId) => ['rsa', 'analytics', 'jury', editionId || null, clubId || null],
  conversion:    (editionId, clubId) => ['rsa', 'analytics', 'conversion', editionId || null, clubId || null],
};

// ── Funnel overview ────────────────────────────────────────────────────────
// scope='club' : passe clubId, scope='master' : laisse clubId à null.
export function useAnalyticsFunnel({ editionId, clubId = null }) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.funnel(editionId, clubId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rsa_analytics_funnel_overview', {
        p_edition_id: editionId,
        p_club_id: clubId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!editionId,
    staleTime: 15 * 1000,
  });
}

// ── Conversion (étapes + ratios) ──────────────────────────────────────────
export function useAnalyticsConversion({ editionId, clubId = null }) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.conversion(editionId, clubId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rsa_analytics_conversion_rates', {
        p_edition_id: editionId,
        p_club_id: clubId,
      });
      if (error) throw error;
      // jsonb { stages: [...] }
      return data?.stages || [];
    },
    enabled: !!editionId,
    staleTime: 15 * 1000,
  });
}

// ── Clubs breakdown (master_admin only — la RPC gate côté serveur) ─────────
export function useAnalyticsClubs({ editionId, enabled = true }) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.clubsBreakdown(editionId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rsa_analytics_clubs_breakdown', {
        p_edition_id: editionId,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!editionId && enabled,
    staleTime: 30 * 1000,
  });
}

// ── Jury activity ─────────────────────────────────────────────────────────
export function useAnalyticsJury({ editionId, clubId = null }) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.jury(editionId, clubId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rsa_analytics_jury_activity', {
        p_edition_id: editionId,
        p_club_id: clubId,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!editionId,
    staleTime: 30 * 1000,
  });
}

// ── Realtime invalidator ───────────────────────────────────────────────────
// Pattern symétrique à useLiveScores (useAdmin.js) : on ouvre 3 channels avec
// suffixe random pour éviter le re-use d'un channel zombi entre remounts, on
// invalide grosse maille tout le scope `['rsa', 'analytics']` quand n'importe
// quel insert/update/delete arrive sur startups, platform_jury_assignments ou
// platform_jury_scores. Coût : invalidate ne re-run que les queries ACTIVES,
// donc seules les analytics visibles font un round-trip.
//
// Note : on ne filtre PAS côté serveur sur edition_id (les startups n'ont pas
// de filtre Realtime côté postgres_changes natif sans un index dédié, et la
// volumétrie est faible — ≤ qq centaines de startups par édition).
export function useAnalyticsRealtimeInvalidator({ editionId }) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!editionId) return undefined;

    const suffix = Math.random().toString(36).slice(2);

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ['rsa', 'analytics'], exact: false });
    };

    const ch1 = supabase
      .channel(`analytics_startups_${editionId}_${suffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'startups' },
        invalidate,
      )
      .subscribe();

    const ch2 = supabase
      .channel(`analytics_jury_assignments_${editionId}_${suffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_jury_assignments' },
        invalidate,
      )
      .subscribe();

    const ch3 = supabase
      .channel(`analytics_jury_scores_${editionId}_${suffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_jury_scores' },
        invalidate,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, [editionId, qc]);
}
