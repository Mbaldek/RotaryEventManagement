import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Incubator, setEditionIncubators } from '@/lib/rsa/entities/incubators';

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
