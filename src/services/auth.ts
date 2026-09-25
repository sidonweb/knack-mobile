import { deviceTimezone } from '@/lib/dates';
import { sessionSchema } from '@/types/api';

import { request } from './api/client';
import { clearSession, getRefreshToken, saveSession } from './session';

export async function signIn(identifier: string, password: string) {
  const session = await request('/auth/login', {
    method: 'POST',
    auth: false,
    body: { identifier, password },
    schema: sessionSchema,
  });
  await saveSession(session);
  return session.user;
}

export async function signUp(input: { email: string; username: string; displayName: string; password: string }) {
  const session = await request('/auth/register', {
    method: 'POST',
    auth: false,
    body: { ...input, timezone: deviceTimezone() },
    schema: sessionSchema,
  });
  await saveSession(session);
  return session.user;
}

/** Revokes the session server-side when reachable; always clears it locally. */
export async function signOut() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    await request('/auth/logout', { method: 'POST', auth: false, body: { refreshToken } }).catch(() => {});
  }
  await clearSession();
}
