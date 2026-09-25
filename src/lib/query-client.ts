import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import Storage from 'expo-sqlite/kv-store';
import { AppState, Platform } from 'react-native';

import { ApiError } from '@/services/api/errors';

import { sqliteAvailable } from './db';

const DAY_MS = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Must be at least the persister's maxAge, or restored data is garbage-collected immediately.
      gcTime: 7 * DAY_MS,
      // Serve cached data offline and try the network once, instead of pausing forever.
      networkMode: 'offlineFirst',
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

/** Server-state cache persisted to SQLite, so the app opens instantly and works offline. */
export const queryPersister = createAsyncStoragePersister({
  // kv-store is SQLite-backed (native); web uses localStorage.
  storage: sqliteAvailable ? Storage : globalThis.localStorage,
  key: 'rally.query-cache.v1',
  throttleTime: 1000,
});

export const PERSIST_MAX_AGE = 7 * DAY_MS;

/**
 * Persisted data is restored without re-validation, so bump this whenever the shape of a
 * cached API response changes. A mismatch discards the whole persisted cache on launch.
 */
export const PERSIST_BUSTER = 'v4';

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
);

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => focusManager.setFocused(status === 'active'));
}
