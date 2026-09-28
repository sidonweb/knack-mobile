import Constants from 'expo-constants';

/**
 * Resolution order:
 * 1. EXPO_PUBLIC_API_URL (set it for staging/production builds).
 * 2. In development, the machine running Metro on port 4000. That works on a physical
 *    device on the same network and on emulators, with no localhost/10.0.2.2 juggling.
 * 3. localhost.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (__DEV__ && devHost) return `http://${devHost}:4000/api/v1`;

  return 'http://localhost:4000/api/v1';
}

export const API_URL = resolveApiUrl();

/**
 * Google OAuth *Web* client ID. Google issues the app's ID tokens for this audience, and the
 * backend verifies against it. Android is matched by package name + signing SHA-1 instead.
 * Not a secret.
 */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  '815831613615-rpqqf5ei29jt0b4604qhi1ll8rtgqoem.apps.googleusercontent.com';
