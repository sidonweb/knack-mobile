import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_URL } from '@/lib/config';
import { sessionSchema, type Me, type Session } from '@/types/api';

import { ApiError, NetworkError } from './api/errors';

/**
 * Token custody. The access token lives only in memory; the refresh token lives in the
 * OS keychain/keystore. Nothing else in the app touches tokens directly.
 */
const REFRESH_KEY = 'rally.refreshToken';

let accessToken: string | null = null;
let refreshInFlight: Promise<Session> | null = null;
const expiredListeners = new Set<() => void>();
const sessionListeners = new Set<(user: Me) => void>();

// SecureStore has no web implementation; fall back to localStorage there (dev only).
const storage = {
  get: (key: string) =>
    Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(key) ?? null) : SecureStore.getItemAsync(key),
  set: (key: string, value: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(globalThis.localStorage?.setItem(key, value))
      : SecureStore.setItemAsync(key, value),
  delete: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(globalThis.localStorage?.removeItem(key))
      : SecureStore.deleteItemAsync(key),
};

export function getAccessToken() {
  return accessToken;
}

export async function hasStoredSession() {
  return (await storage.get(REFRESH_KEY)) !== null;
}

export async function getRefreshToken() {
  return storage.get(REFRESH_KEY);
}

export async function saveSession(session: Session) {
  accessToken = session.tokens.accessToken;
  await storage.set(REFRESH_KEY, session.tokens.refreshToken);
  sessionListeners.forEach((listener) => listener(session.user));
}

export async function clearSession() {
  accessToken = null;
  await storage.delete(REFRESH_KEY);
}

/** Called when the server definitively rejects the session (not on network errors). */
export function onSessionExpired(listener: () => void) {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
}

/** Called whenever a fresh session (and therefore fresh user profile) arrives. */
export function onSessionRefreshed(listener: (user: Me) => void) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

/**
 * Exchanges the stored refresh token for a new pair. Single-flight: the server rotates
 * refresh tokens and treats reuse as theft, so two concurrent refreshes would log the
 * user out everywhere.
 */
export function refreshSession(): Promise<Session> {
  // Reset in .finally() so the handle is cleared only after it has been assigned.
  refreshInFlight ??= exchangeRefreshToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function exchangeRefreshToken(): Promise<Session> {
  const refreshToken = await storage.get(REFRESH_KEY);
  if (!refreshToken) throw new ApiError(401, 'UNAUTHORIZED', 'Not signed in');

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    throw new NetworkError();
  }

  if (response.status === 401) {
    await clearSession();
    expiredListeners.forEach((listener) => listener());
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
  }
  if (!response.ok) throw new ApiError(response.status, 'REFRESH_FAILED', 'Could not refresh session');

  const session = sessionSchema.parse(await response.json());
  await saveSession(session);
  return session;
}
