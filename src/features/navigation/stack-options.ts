import { useTheme } from '@/hooks/use-theme';

/** Native stack header styled to match the app: flat, canvas-coloured, Inter titles. */
export function useStackScreenOptions() {
  const { color } = useTheme();
  return {
    headerShadowVisible: false,
    headerStyle: { backgroundColor: color('canvas') },
    headerTintColor: color('fg'),
    headerTitleStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
    headerLargeTitleStyle: { fontFamily: 'Inter_700Bold' },
    headerBackButtonDisplayMode: 'minimal' as const,
    contentStyle: { backgroundColor: color('canvas') },
  };
}
