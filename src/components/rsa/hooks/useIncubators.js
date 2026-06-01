import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Incubator, setEditionIncubators } from '@/lib/rsa/entities/incubators';
import { supabase } from '@/lib/supabase';

export function useEditionIncubators(editionId) {
  return useQuery({
    queryKey: ['rsa', 'incubators', 'edition', editionId],
    queryFn: () => Incubator.listForEdition(editionId),
    enabled: !!editionId,
    staleTime: 5 * 60 * 1000,
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

export function useSetEditionIncubators(editionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (incubatorIds) => setEditionIncubators(editionId, incubatorIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rsa', 'incubators', 'edition', editionId] }),
  });
}

export function useSourcingStats(editionId) {
  return useQuery({
    queryKey: ['rsa', 'incubators', 'sourcing', editionId],
    enabled: !!editionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startups')
        .select('incubator_id, incubator_other')
        .eq('edition_id', editionId)
        .neq('status', 'brouillon');
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
