import Storage from 'expo-sqlite/kv-store';
import { Appearance, Platform } from 'react-native';
import { create } from 'zustand';

import { sqliteAvailable } from '@/lib/db';

export type AppearancePreference = 'system' | 'light' | 'dark';

const KEY = 'rally.appearance';

function read(): AppearancePreference {
  try {
    const value = sqliteAvailable ? Storage.getItemSync(KEY) : globalThis.localStorage?.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function write(value: AppearancePreference) {
  try {
    if (sqliteAvailable) Storage.setItemSync(KEY, value);
    else globalThis.localStorage?.setItem(KEY, value);
  } catch {
    // A preference that doesn't persist is still applied for this session.
  }
}

/** Native controls (switches, alerts, the keyboard) follow the app's choice too. */
function applyNative(value: AppearancePreference) {
  if (Platform.OS === 'web') return;
  Appearance.setColorScheme(value === 'system' ? 'unspecified' : value);
}

type AppearanceState = {
  preference: AppearancePreference;
  setPreference: (value: AppearancePreference) => void;
};

const initial = read();
applyNative(initial);

/** Light, dark, or follow the system. Read synchronously at launch so there's no flash. */
export const useAppearance = create<AppearanceState>()((set) => ({
  preference: initial,
  setPreference: (preference) => {
    write(preference);
    applyNative(preference);
    set({ preference });
  },
}));
