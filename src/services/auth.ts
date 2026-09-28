import Constants, { ExecutionEnvironment } from 'expo-constants';

import { GOOGLE_WEB_CLIENT_ID } from '@/lib/config';
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

/** Emails a 6-digit reset code. Succeeds whether or not the email has an account. */
export async function requestPasswordReset(email: string) {
  await request('/auth/password/forgot', { method: 'POST', auth: false, body: { email } });
}

/** Sets the new password and signs in; every other device is signed out. */
export async function resetPassword(input: { email: string; code: string; password: string }) {
  const session = await request('/auth/password/reset', {
    method: 'POST',
    auth: false,
    body: input,
    schema: sessionSchema,
  });
  await saveSession(session);
  return session.user;
}

/** Permanently deletes the account on the server, then drops the local session. */
export async function deleteAccount(password?: string) {
  await request('/users/me', { method: 'DELETE', body: { password } });
  await clearSession();
}

/** Expo Go doesn't ship Google Sign-In's native module; it needs a development or release build. */
export const googleSignInAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/** A failure on the Google side (before our API is called), with a message safe to show. */
export class GoogleSignInError extends Error {}

/** Returns null when the user dismisses the Google account picker. */
export async function signInWithGoogle() {
  // Loaded on demand so a binary without the native module (Expo Go) still boots.
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = await import(
    '@react-native-google-signin/google-signin'
  );
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

  let idToken: string | null;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Sign out of the native Google session first so the account picker always shows.
    await GoogleSignin.signOut().catch(() => {});
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    idToken = response.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return null;
    if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new GoogleSignInError('Google Play services is not available on this device');
    }
    throw new GoogleSignInError('Google sign-in failed. Try again.');
  }
  if (!idToken) throw new GoogleSignInError('Google sign-in failed. Try again.');

  const session = await request('/auth/google', {
    method: 'POST',
    auth: false,
    body: { idToken, timezone: deviceTimezone() },
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
