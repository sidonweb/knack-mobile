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
