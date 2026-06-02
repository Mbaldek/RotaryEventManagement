// src/components/rsa/admin/platform/hub/useHubCompetitions.js
// Liste des compétitions visibles dans le hub, filtrée par rôle via le helper
// pur filterHubCompetitions. master_admin voit tout ; sinon competition_admin +
// clubs (ids d'éditions dérivés des clubMemberships via edition_clubs).

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useAllCompetitions } from '@/components/rsa/admin/platform/master/useMaster';
import { filterHubCompetitions } from '@/lib/platform/competitionShell';

export function useHubCompetitions() {
  const { isMasterAdmin, competitionAdminEditions, clubMemberships } = usePlatformAuth();
  const competitionsQ = useAllCompetitions();

  const clubIds = useMemo(
    () => (clubMemberships || []).map((m) => m && m.club_id).filter(Boolean),
    [clubMemberships],
  );

  // Éditions où l'user a un club (junction edition_clubs). Inutile pour master.
  const clubEditionsQ = useQuery({
    queryKey: ['rsa', 'hub', 'club-editions', clubIds.slice().sort().join(',')],
    enabled: !isMasterAdmin && clubIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edition_clubs')
        .select('edition_id')
        .in('club_id', clubIds);
      if (error) throw error;
      return [...new Set((data || []).map((r) => r.edition_id))];
    },
  });

  const competitions = useMemo(
    () => filterHubCompetitions({
      competitions: competitionsQ.data || [],
      isMasterAdmin,
      competitionAdminEditions,
      adminClubEditionIds: clubEditionsQ.data || [],
    }),
    [competitionsQ.data, isMasterAdmin, competitionAdminEditions, clubEditionsQ.data],
  );

  // isLoading gate AUSSI sur clubEditionsQ : sinon un user club-scopé (club_admin)
  // verrait une liste incomplète/vide pendant la fenêtre de chargement du 2e fetch
  // (competitionsQ résolu mais editions-clubs pas encore). Cf. review Lot 1.
  return {
    competitions,
    isLoading: competitionsQ.isLoading || clubEditionsQ.isLoading,
    isError: competitionsQ.isError || clubEditionsQ.isError,
  };
}
