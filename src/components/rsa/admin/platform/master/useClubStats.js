// useClubStats — hook TanStack qui retourne les compteurs clés (candidatures,
// sessions, finalistes) pour un couple { clubId, editionId } depuis la RPC
// `rsa_list_clubs_for_edition_with_counts` (équipe DB rôles V3).
//
// Cette RPC retourne TOUS les clubs attachés à l'édition d'un seul appel ; pour
// éviter une volée de requêtes parallèles (une par row du tableau), on partage
// la même queryKey que ClubsTab pour profiter du cache TanStack (staleTime 30s).
//
// Forme RPC (mirror SQL) :
//   { club_id, club_name, region, contact_email, contact_name,
//     startups_count, sessions_count, finalists_count }
//
// Le hook expose des compteurs camelCase pour rester cohérent avec le reste de
// useMaster.js, et renvoie `null` quand l'édition ou le club est manquant.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Une seule queryKey par edition_id — un fetch sert TOUS les clubs de la page.
export const CLUB_STATS_KEY = (editionId) =>
  ['rsa', 'master', 'club-stats-for-edition', editionId];

function fetchClubStatsForEdition(editionId) {
  return async () => {
    if (!editionId) return [];
    const { data, error } = await supabase.rpc(
      'rsa_list_clubs_for_edition_with_counts',
      { p_edition_id: editionId },
    );
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  };
}

/**
 * Retourne les compteurs d'un club pour une édition donnée.
 *
 * @param {object} args
 * @param {string} args.clubId
 * @param {string} args.editionId
 * @returns {{
 *   isLoading: boolean,
 *   isError: boolean,
 *   error: unknown,
 *   data: { startupsCount: number, sessionsCount: number, finalistsCount: number } | null,
 * }}
 */
export default function useClubStats({ clubId, editionId }) {
  const q = useQuery({
    queryKey: CLUB_STATS_KEY(editionId),
    enabled: !!editionId,
    staleTime: 30 * 1000,
    queryFn: fetchClubStatsForEdition(editionId),
  });

  const data = useMemo(() => {
    if (!clubId || !Array.isArray(q.data)) return null;
    const row = q.data.find((r) => r && r.club_id === clubId);
    if (!row) return null;
    return {
      startupsCount:  Number(row.startups_count  || 0),
      sessionsCount:  Number(row.sessions_count  || 0),
      finalistsCount: Number(row.finalists_count || 0),
    };
  }, [q.data, clubId]);

  return {
    isLoading: q.isLoading,
    isError:   q.isError,
    error:     q.error,
    data,
  };
}
