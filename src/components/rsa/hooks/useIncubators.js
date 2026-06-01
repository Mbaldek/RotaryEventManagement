import { useQuery } from '@tanstack/react-query';
import { Incubator } from '@/lib/rsa/entities/incubators';

export function useEditionIncubators(editionId) {
  return useQuery({
    queryKey: ['rsa', 'incubators', 'edition', editionId],
    queryFn: () => Incubator.listForEdition(editionId),
    enabled: !!editionId,
    staleTime: 5 * 60 * 1000,
  });
}
