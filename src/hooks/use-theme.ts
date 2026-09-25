import { useColorScheme } from 'react-native';

import { rgb, type ColorScheme, type ColorToken } from '@/lib/theme';
import { useAppearance } from '@/store/appearance';

export function useColorSchemeResolved(): ColorScheme {
  const system = useColorScheme();
  const preference = useAppearance((state) => state.preference);
  if (preference !== 'system') return preference;
  return system === 'light' ? 'light' : 'dark';
}

/** For places that need raw colour values (SVG, icons, navigator options). */
export function useTheme() {
  const scheme = useColorSchemeResolved();
  return {
    scheme,
    color: (token: ColorToken, alpha?: number) => rgb(scheme, token, alpha),
  };
}
