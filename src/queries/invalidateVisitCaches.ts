import type {QueryClient} from '@tanstack/react-query';
import {queryKeys} from './queryKeys';

export interface InvalidateVisitCachesOptions {
  /** Refetch case list when at least one visit reached the server. */
  serverPushSucceeded?: boolean;
}

export function invalidateVisitCaches(
  queryClient: QueryClient,
  options: InvalidateVisitCachesOptions = {},
): void {
  void queryClient.invalidateQueries({queryKey: queryKeys.pendingVisits});

  if (options.serverPushSucceeded) {
    void queryClient.invalidateQueries({queryKey: queryKeys.ccCasesPrefix});
  }
}
