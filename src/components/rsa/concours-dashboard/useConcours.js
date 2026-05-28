// Hooks TanStack Query du dashboard public du concours (V2.5).
//
// La page /Concours est une vitrine en lecture seule : tout passe par les RPC
// SECURITY DEFINER `rsa_concours_edition_overview` et `rsa_concours_session_detail`
// qui agrègent les données et masquent les colonnes sensibles (pas d'email perso,
// pas de score individuel, pas de owner_id). Les hooks ici n'opèrent aucune
// vérification de rôle : la frontière est serveur (la page elle-même fait
// l'auth-gate magic-link). Si jamais l'RPC n'est pas encore déployée (build
// local sans migration appliquée), on retombe sur un fallback minimal côté
// client en composant les entités existantes — la page reste utilisable.
//
// Convention de cache : 30s de staleTime suffisent (un juré reload sa page
// quelques fois par session ; pas besoin de polling continu). Pas de
// subscription temps réel (les RPC sont assez cheap pour une re-fetch manuelle).

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Edition, RsaSession, EditionClub } from '@/lib/rsa/entities';

export const CONCOURS_KEYS = {
  editions: ['rsa', 'concours', 'editions'],
  overview: (editionId) => ['rsa', 'concours', 'overview', editionId],
  sessionDetail: (sessionId) => ['rsa', 'concours', 'session-detail', sessionId],
};

// ── Liste des éditions accessibles (publique) ─────────────────────────────────
// On lit Edition.list() : la RLS editions_read est publique (status != 'draft' OK).
// Pour les staff, draft serait aussi visible mais la dashboard n'a pas vocation à
// montrer une compétition non publiée, donc on filtre côté client.
export function useEditionsAvailable() {
  return useQuery({
    queryKey: CONCOURS_KEYS.editions,
    queryFn: async () => {
      const all = await Edition.list('-year');
      // On expose tout sauf draft (vitrine publique).
      return (all || []).filter((e) => e.status !== 'draft');
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Overview agrégé d'une édition ─────────────────────────────────────────────
// Appel principal : RPC rsa_concours_edition_overview(edition_id). En cas
// d'erreur (RPC absente côté DB), on compose la donnée côté client à partir
// des entités existantes — la page reste fonctionnelle en dev sans migration.
export function useEditionOverview(editionId) {
  return useQuery({
    queryKey: CONCOURS_KEYS.overview(editionId),
    queryFn: async () => {
      if (!editionId) return null;

      // Tentative RPC (chemin nominal une fois la migration appliquée).
      try {
        const { data, error } = await supabase.rpc('rsa_concours_edition_overview', {
          p_edition_id: editionId,
        });
        if (!error && data) {
          return Array.isArray(data) ? data[0] : data;
        }
        // Si l'RPC retourne une erreur connue (function not found), on fallback
        // silencieusement. Tout autre error est remontée.
        if (error && error.code !== '42883' && error.code !== 'PGRST202') {
          // eslint-disable-next-line no-console
          console.warn('[useEditionOverview] RPC error, falling back to client agg', error);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[useEditionOverview] RPC threw, falling back', e);
      }

      // ── Fallback client-side (compose à partir des entités) ────────────────
      const [edition, editionClubs, sessionsWithCfg, prizesRes, startupsRes] =
        await Promise.all([
          supabase.from('editions').select('*').eq('id', editionId).maybeSingle(),
          EditionClub.forEdition(editionId),
          RsaSession.withConfigForEdition(editionId),
          supabase.from('prizes').select('*').eq('edition_id', editionId),
          supabase.from('startups')
            .select('id, club_id, status, session_id')
            .eq('edition_id', editionId),
        ]);

      if (edition.error) throw edition.error;
      if (startupsRes.error) throw startupsRes.error;

      const startupsByClub = {};
      let finalistsCount = 0;
      const startupsBySession = {};
      for (const r of startupsRes.data || []) {
        const cid = r.club_id || '__none__';
        startupsByClub[cid] = (startupsByClub[cid] || 0) + 1;
        if (r.status === 'finaliste' || r.status === 'laureat') finalistsCount += 1;
        if (r.session_id) {
          startupsBySession[r.session_id] = (startupsBySession[r.session_id] || 0) + 1;
        }
      }

      // Compteur jurés par session.
      const sessionIds = (sessionsWithCfg || []).map((s) => s.id);
      let jurorsBySession = {};
      if (sessionIds.length > 0) {
        const { data: assignments } = await supabase
          .from('platform_jury_assignments')
          .select('session_id, jury_user_id')
          .in('session_id', sessionIds);
        for (const a of assignments || []) {
          if (!jurorsBySession[a.session_id]) jurorsBySession[a.session_id] = new Set();
          jurorsBySession[a.session_id].add(a.jury_user_id);
        }
        jurorsBySession = Object.fromEntries(
          Object.entries(jurorsBySession).map(([k, v]) => [k, v.size]),
        );
      }

      // Finaliste désigné par session : startup en finale (kind='finale') avec source_session_id
      // n'existe pas en V2 — on relit les startups dont status='finaliste' joint sur session_id
      // de leur session qualifying.
      const finalistsBySourceSession = {};
      for (const r of startupsRes.data || []) {
        if ((r.status === 'finaliste' || r.status === 'laureat') && r.session_id) {
          finalistsBySourceSession[r.session_id] = true;
        }
      }

      // Sessions par club.
      const sessionsByClub = {};
      const finaleSessions = [];
      for (const s of sessionsWithCfg || []) {
        if (s.kind === 'finale' && !s.club_id) {
          finaleSessions.push(s);
          continue;
        }
        const cid = s.club_id || '__none__';
        if (!sessionsByClub[cid]) sessionsByClub[cid] = [];
        sessionsByClub[cid].push(s);
      }

      return {
        edition: edition.data,
        clubs: (editionClubs || []).map((ec) => ({
          ...ec.club,
          attachment: { eligibility_rules: ec.eligibility_rules, attached_at: ec.attached_at },
        })),
        sessions_by_club: sessionsByClub,
        finale_sessions: finaleSessions,
        startups_by_club: startupsByClub,
        startups_by_session: startupsBySession,
        jurors_by_session: jurorsBySession,
        finalists_by_source_session: finalistsBySourceSession,
        finalists_count: finalistsCount,
        prizes: prizesRes.data || [],
      };
    },
    enabled: !!editionId,
    staleTime: 30 * 1000,
  });
}

// ── Détail d'une session ──────────────────────────────────────────────────────
// Appelé à l'ouverture du drawer ; on essaie l'RPC dédié puis fallback client.
export function useSessionDetail(sessionId, enabled = true) {
  return useQuery({
    queryKey: CONCOURS_KEYS.sessionDetail(sessionId),
    queryFn: async () => {
      if (!sessionId) return null;

      try {
        const { data, error } = await supabase.rpc('rsa_concours_session_detail', {
          p_session_id: sessionId,
        });
        if (!error && data) {
          return Array.isArray(data) ? data[0] : data;
        }
        if (error && error.code !== '42883' && error.code !== 'PGRST202') {
          // eslint-disable-next-line no-console
          console.warn('[useSessionDetail] RPC error, falling back', error);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[useSessionDetail] RPC threw, falling back', e);
      }

      // Fallback : compose depuis les tables (RLS s'applique).
      const [sessionRes, cfgRes, startupsRes, assignmentsRes] = await Promise.all([
        supabase.from('sessions').select('*').eq('id', sessionId).maybeSingle(),
        supabase.from('session_config').select('*').eq('session_id', sessionId).maybeSingle(),
        supabase.from('startups')
          .select('id, name, pitch_deck_path, exec_summary_path, status, session_id')
          .eq('session_id', sessionId),
        supabase.from('platform_jury_assignments')
          .select('jury_user_id, session_id')
          .eq('session_id', sessionId),
      ]);

      if (sessionRes.error) throw sessionRes.error;

      const jurorIds = (assignmentsRes.data || []).map((a) => a.jury_user_id);
      let jurorProfiles = [];
      if (jurorIds.length > 0) {
        const [profilesRes, platformJP] = await Promise.all([
          supabase.from('profiles').select('id, full_name').in('id', jurorIds),
          supabase.from('platform_jury_profiles')
            .select('user_id, qualite, organisation, photo_path')
            .in('user_id', jurorIds),
        ]);
        const byId = new Map((profilesRes.data || []).map((p) => [p.id, p]));
        const pjpById = new Map((platformJP.data || []).map((p) => [p.user_id, p]));
        jurorProfiles = jurorIds.map((id) => {
          const prof = byId.get(id) || {};
          const pjp = pjpById.get(id) || {};
          return {
            user_id: id,
            full_name: prof.full_name || null,
            qualite: pjp.qualite || null,
            organisation: pjp.organisation || null,
            photo_path: pjp.photo_path || null,
          };
        });
      }

      return {
        session: sessionRes.data,
        config: cfgRes.data || null,
        startups: startupsRes.data || [],
        jurors: jurorProfiles,
      };
    },
    enabled: enabled && !!sessionId,
    staleTime: 30 * 1000,
  });
}
