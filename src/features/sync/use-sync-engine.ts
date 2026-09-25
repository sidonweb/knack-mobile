import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';

import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { flush, pendingCount, setOutboxListeners } from '@/services/sync/outbox';
import { useAuth } from '@/store/auth';
import { useSync } from '@/store/sync';

import { applyOutcome } from './apply-outcome';

/** Mount once, inside the signed-in tree. Flushes the outbox whenever connectivity returns. */
export function useSyncEngine() {
  const signedIn = useAuth((state) => state.status === 'signedIn');

  useEffect(() => {
    if (!signedIn) return;
    const { setOnline, setPending } = useSync.getState();

    setOutboxListeners({
      onOutcome: applyOutcome,
      onChange: setPending,
      onDropped: (op, error) => console.warn(`Dropped ${op.kind}: ${error.message}`),
      // Reconcile with the server once everything local has landed.
      onDrained: () => {
        void queryClient.invalidateQueries({ queryKey: ['tasks'] });
        void queryClient.invalidateQueries({ queryKey: ['habits'] });
        void queryClient.invalidateQueries({ queryKey: ['summary'] });
        void queryClient.invalidateQueries({ queryKey: ['habit'] });
        void queryClient.invalidateQueries({ queryKey: queryKeys.streaks });
      },
    });
    setPending(pendingCount());
    void flush();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false;
      setOnline(online);
      if (online) void flush();
    });
    return () => {
      unsubscribe();
      setOutboxListeners({});
    };
  }, [signedIn]);
}
