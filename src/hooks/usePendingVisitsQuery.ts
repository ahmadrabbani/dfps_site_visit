import {useQuery} from '@tanstack/react-query';
import {getPendingVisits} from '../services/storage';
import {getPendingPropertySealVisits} from '../services/propertySealStorage';
import {queryKeys} from '../queries/queryKeys';

export function usePendingVisitsQuery() {
  return useQuery({
    queryKey: queryKeys.pendingVisits,
    queryFn: getPendingVisits,
    staleTime: 30 * 1000,
  });
}

export function usePendingPropertySealVisitsQuery() {
  return useQuery({
    queryKey: queryKeys.pendingPropertySealVisits,
    queryFn: getPendingPropertySealVisits,
    staleTime: 30 * 1000,
  });
}

/** Combined CC site visits + Property Seal / Deseal pending uploads. */
export function usePendingVisitCount(): number {
  const site = usePendingVisitsQuery();
  const seal = usePendingPropertySealVisitsQuery();
  return (site.data?.length ?? 0) + (seal.data?.length ?? 0);
}
