// useOtherClubsOfEdition — hook TanStack pour la vue "Autres clubs participants"
// du Club Cockpit (équipe D, plateforme RSA).
//
// Permet à un club_admin de voir d'un coup d'œil les autres clubs participants
// à la même compétition multiclub (lecture seule). Pour les rôles master_admin
// et competition_admin, l'information complète est déjà disponible dans leurs
// cockpits dédiés — ils n'ont donc pas besoin de ce hook.
//
// Repose sur la RPC `rsa_list_clubs_for_edition_with_counts` (équipe A) qui
// retourne pour chaque club rattaché :
//   { id, name, country, contact_name, contact_email, startups_count,
//     sessions_count, finalists_count }
//
// Le hook filtre ensuite côté client pour exclure le club courant.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const OTHER_CLUBS_KEY = (editionId) =>
  ['rsa', 'club', 'other-clubs', editionId];

export function useOtherClubsOfEdition({ editionId, clubId }) {
  const q = useQuery({
    queryKey: OTHER_CLUBS_KEY(editionId),
    enabled: !!editionId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!editionId) return [];
      const { data, error } = await supabase.rpc(
        'rsa_list_clubs_for_edition_with_counts',
        { p_edition_id: editionId },
      );
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  // On exclut le club courant et on garde l'ordre alphabétique par nom (au cas
  // où la RPC ne le ferait pas explicitement).
  const otherClubs = useMemo(() => {
    const list = q.data || [];
    return list
      .filter((row) => row?.id && row.id !== clubId)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [q.data, clubId]);

  return {
    ...q,
    otherClubs,
  };
}
