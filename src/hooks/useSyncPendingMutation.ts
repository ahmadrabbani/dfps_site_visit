import {useMutation, useQueryClient} from '@tanstack/react-query';
import {syncPending, type SyncPendingResult} from '../services/syncService';
import {invalidateVisitCaches} from '../queries/invalidateVisitCaches';

export function useSyncPendingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => syncPending(),
    onSuccess: (result: SyncPendingResult) => {
      invalidateVisitCaches(queryClient, {
        serverPushSucceeded: result.uploaded > 0,
      });
    },
  });
}
