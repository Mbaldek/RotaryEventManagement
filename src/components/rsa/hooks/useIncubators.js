import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Incubator, setClubIncubators } from '@/lib/rsa/entities/incubators';
import { supabase } from '@/lib/supabase';

// Funnel candidat : UNION des opt-in de tous les clubs de l'édition.
export function useEditionIncubators(editionId) {
  return useQuery({
    queryKey: ['rsa', 'incubators', 'edition', editionId],
    queryFn: () => Incubator.listForEdition(editionId),
    enabled: !!editionId,
    staleTime: 5 * 60 * 1000,
  });
}

// Master multi-club : tous les liens club×incubateur d'une édition (agrégat).
export function useEditionClubLinks(editionId) {
  return useQuery({
    queryKey: ['rsa', 'incubators', 'edition-links', editionId],
    queryFn: () => Incubator.listEditionClubLinks(editionId),
    enabled: !!editionId,
    staleTime: 60 * 1000,
  });
}

// Admin / cockpit : opt-in + contact d'UN club pour une édition.
export function useClubIncubators(editionId, clubId) {
  return useQuery({
    queryKey: ['rsa', 'incubators', 'club', editionId, clubId],
    queryFn: () => Incubator.listForClub(editionId, clubId),
    enabled: !!editionId && !!clubId,
    staleTime: 60 * 1000,
  });
}

export function useAllIncubators() {
  return useQuery({
    queryKey: ['rsa', 'incubators', 'all'],
    queryFn: () => Incubator.listAll(),
    staleTime: 60 * 1000,
  });
}

export function useSaveIncubator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch, isNew }) =>
      isNew ? Incubator.create({ id, ...patch }) : Incubator.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rsa', 'incubators'] }),
  });
}

export function useDeleteIncubator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => Incubator.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rsa', 'incubators'] }),
  });
}

// Set complet de l'opt-in + contact d'un club. rows : [{ incubator_id, contact_name, contact_email }].
export function useSetClubIncubators(editionId, clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows) => setClubIncubators(editionId, clubId, rows),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rsa', 'incubators'] }),
  });
}

export function useSourcingStats(editionId, clubId = null) {
  return useQuery({
    queryKey: ['rsa', 'incubators', 'sourcing', editionId, clubId],
    enabled: !!editionId,
    queryFn: async () => {
      let query = supabase
        .from('startups')
        .select('incubator_id, incubator_other')
        .eq('edition_id', editionId)
        .neq('status', 'brouillon');
      if (clubId) query = query.eq('club_id', clubId);
      const { data, error } = await query;
      if (error) throw error;
      const counts = {};
      let other = 0;
      let none = 0;
      for (const row of data || []) {
        if (row.incubator_id) counts[row.incubator_id] = (counts[row.incubator_id] || 0) + 1;
        else if (row.incubator_other) other += 1;
        else none += 1;
      }
      return { counts, other, none, total: (data || []).length };
    },
  });
}
