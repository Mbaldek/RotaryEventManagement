// Hooks TanStack Query du Module 9 — Email Studio.
//
// Co-localisés avec les composants comms/* (même patron que useMaster.js et
// useClub.js). Tous les RPC sont SECURITY DEFINER + RLS — les hooks ne portent
// AUCUNE garde de rôle (serveur seule frontière). On évite d'ajouter ces
// entités à src/lib/rsa/entities.js pour ne pas créer de merge conflict avec
// l'agent parallèle qui y travaille (cf. consigne mission).
//
// Préfixe des React Query keys : ['rsa', 'comms', ...] pour ne pas marcher
// sur l'invalidation de M4a (['rsa','admin']) ni du Master Cockpit (['rsa','master']).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { previewAudience as previewAudienceFn } from '@/lib/platform/bulk';

export const KEYS = {
  templates: (clubId) => ['rsa', 'comms', 'templates', clubId ?? '__global__'],
  sends:     (clubId) => ['rsa', 'comms', 'sends', clubId ?? '__global__'],
  audience:  (clubId, audienceType, filterKey) =>
    ['rsa', 'comms', 'audience', clubId ?? '__global__', audienceType, filterKey],
};

// ─── Templates ──────────────────────────────────────────────────────────────

export function useEmailTemplates(clubId) {
  return useQuery({
    queryKey: KEYS.templates(clubId ?? null),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rsa_list_email_templates', {
        p_club_id: clubId ?? null,
      });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000,
  });
}

export function useSaveTemplate(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, subject, bodyHtml, audienceType, lang }) => {
      const { data, error } = await supabase.rpc('rsa_save_email_template', {
        p_id: id ?? null,
        p_club_id: clubId ?? null,
        p_name: name,
        p_subject: subject,
        p_body_html: bodyHtml,
        p_audience_type: audienceType,
        p_lang: lang ?? 'fr',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.templates(clubId ?? null) });
    },
  });
}

export function useDeleteTemplate(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc('rsa_delete_email_template', { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.templates(clubId ?? null) });
    },
  });
}

// ─── Send history ───────────────────────────────────────────────────────────

export function useEmailSends(clubId, limit = 50) {
  return useQuery({
    queryKey: KEYS.sends(clubId ?? null),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rsa_list_email_sends', {
        p_club_id: clubId ?? null,
        p_limit: limit,
      });
      if (error) throw error;
      return data || [];
    },
    staleTime: 15 * 1000,
  });
}

export function useInvalidateSends(clubId) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEYS.sends(clubId ?? null) });
}

// ─── Audience preview (live count + 3 examples via dry-run de send-bulk) ───

export function useAudiencePreview({ clubId, audienceType, audienceFilter, enabled = true }) {
  // Clé stable pour le cache : on sérialise audience_filter de façon déterministe
  // (clés triées). Pas de dépendance externe (pas de fast-json-stable-stringify) :
  // le filter est petit, JSON.stringify suffit pour notre usage cache-key.
  const filterKey = JSON.stringify(audienceFilter || {}, Object.keys(audienceFilter || {}).sort());
  return useQuery({
    queryKey: KEYS.audience(clubId ?? null, audienceType, filterKey),
    enabled: enabled && !!audienceType,
    staleTime: 15 * 1000,
    retry: false,
    queryFn: async () => {
      const res = await previewAudienceFn({
        clubId: clubId ?? null,
        audienceType,
        audienceFilter: audienceFilter || {},
      });
      if (!res.ok) throw new Error(res.error || 'audience_resolve_failed');
      return { count: res.count, sample: res.sample || [] };
    },
  });
}

// ─── Sessions list for AudienceSelector ─────────────────────────────────────
// Lecture directe : la RLS sessions_read autorise au moins club_admin du club
// (ou master_admin pour tout). Pour le scope master (clubId=NULL), on ne propose
// pas les session_* audiences (cf. audienceTypesForScope).

export function useSessionsForClub(clubId, editionId) {
  return useQuery({
    queryKey: ['rsa', 'comms', 'sessions', clubId ?? '__global__', editionId ?? '__all__'],
    enabled: !!clubId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!clubId) return [];
      let q = supabase
        .from('sessions')
        .select('id, name, kind, club_id, session_date, edition_id')
        .eq('club_id', clubId)
        .order('session_date', { ascending: true });
      if (editionId) q = q.eq('edition_id', editionId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

// ─── Editions for master scope (all_finalists_edition selector) ────────────

export function useEditionsForComms() {
  return useQuery({
    queryKey: ['rsa', 'comms', 'editions'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('editions')
        .select('id, name, year, status, model')
        .order('year', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
