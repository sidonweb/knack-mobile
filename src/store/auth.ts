import { create } from 'zustand';

import { deviceTimezone } from '@/lib/dates';
import { queryClient, queryPersister } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import * as authService from '@/services/auth';
import { isNetworkError } from '@/services/api/errors';
import { hasStoredSession, onSessionExpired, onSessionRefreshed, refreshSession } from '@/services/session';
import { clearOutbox } from '@/services/sync/outbox';
import { usersApi } from '@/services/users';
import type { Me } from '@/types/api';

/**
 * Only *whether* the user is signed in lives here. The user's profile is server state and
 * lives in the query cache under `queryKeys.me`, so it is persisted and refetched like
 * everything else.
 */
type AuthStatus = 'booting' | 'signedOut' | 'signedIn';

type AuthState = {
  status: AuthStatus;
  bootstrap: () => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (input: Parameters<typeof authService.signUp>[0]) => Promise<void>;
  signOut: () => Promise<void>;
};

async function wipeLocalData() {
  clearOutbox();
  queryClient.clear();
  await queryPersister.removeClient();
}

function syncTimezone(user: Me) {
  const timezone = deviceTimezone();
  if (user.timezone !== timezone) {
    usersApi
      .updateMe({ timezone })
      .then((updated) => queryClient.setQueryData(queryKeys.me, updated))
      .catch(() => {});
  }
}

export const useAuth = create<AuthState>()((set) => ({
  status: 'booting',

  bootstrap: async () => {
    if (!(await hasStoredSession())) {
      set({ status: 'signedOut' });
      return;
    }
    // Optimistically signed in: cached data renders immediately, even offline.
    set({ status: 'signedIn' });
    try {
      const session = await refreshSession();
      syncTimezone(session.user);
    } catch (error) {
      // Offline is fine. A rejected session is handled by the onSessionExpired listener.
      if (!isNetworkError(error)) console.warn('Session refresh failed', error);
    }
  },

  signIn: async (identifier, password) => {
    await wipeLocalData();
    await authService.signIn(identifier, password);
    set({ status: 'signedIn' });
  },

  signUp: async (input) => {
    await wipeLocalData();
    await authService.signUp(input);
    set({ status: 'signedIn' });
  },

  signOut: async () => {
    await authService.signOut();
    await wipeLocalData();
    set({ status: 'signedOut' });
  },
}));

onSessionRefreshed((user) => queryClient.setQueryData(queryKeys.me, user));

onSessionExpired(() => {
  void wipeLocalData();
  useAuth.setState({ status: 'signedOut' });
});
