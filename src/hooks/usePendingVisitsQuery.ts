import {useQuery} from '@tanstack/react-query';
import {getPendingVisits} from '../services/storage';
import {queryKeys} from '../queries/queryKeys';

export function usePendingVisitsQuery() {
  return useQuery({
    queryKey: queryKeys.pendingVisits,
    queryFn: getPendingVisits,
    staleTime: 30 * 1000,
  });
}

export function usePendingVisitCount(): number {
  const {data} = usePendingVisitsQuery();
  return data?.length ?? 0;
}
