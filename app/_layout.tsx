import '../src/global.css';
import '../src/lib/nativewind-interop';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CelebrationHost } from '@/components/celebration-host';
import { ToastHost } from '@/components/toast-host';
import { useSyncEngine } from '@/features/sync/use-sync-engine';
import { useTheme } from '@/hooks/use-theme';
import { PERSIST_BUSTER, PERSIST_MAX_AGE, queryClient, queryPersister } from '@/lib/query-client';
import { themeVars } from '@/lib/theme';
import { useAuth } from '@/store/auth';

void SplashScreen.preventAutoHideAsync();

function useNavigationTheme() {
  const { scheme, color } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: color('canvas'),
      card: color('canvas'),
      text: color('fg'),
      border: color('hairline'),
      primary: color('fg'),
    },
  };
}

function RootNavigator() {
  const status = useAuth((state) => state.status);
  const signedIn = status === 'signedIn';
  useSyncEngine();

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="challenges" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="users/[username]" options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
        <Stack.Screen name="achievements" options={{ headerShown: true, title: 'Achievements', headerBackTitle: 'Back' }} />
        <Stack.Screen name="connections" options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
        <Stack.Screen name="habit/[id]" />
        <Stack.Screen name="habit-editor" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="task/[id]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.72, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
        {/* The end-of-day moment rises in over Today rather than pushing a new page. */}
        <Stack.Screen
          name="day-complete"
          options={{ presentation: 'fullScreenModal', animation: 'fade_from_bottom', gestureEnabled: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const { scheme, color } = useTheme();
  const canvas = color('canvas');
  const navigationTheme = useNavigationTheme();
  const status = useAuth((state) => state.status);
  const bootstrap = useAuth((state) => state.bootstrap);
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // The window behind every screen, so modal transitions and keyboard gaps never flash white.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(canvas).catch(() => {});
  }, [canvas]);

  const ready = fontsLoaded && status !== 'booting';
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: queryPersister, maxAge: PERSIST_MAX_AGE, buster: PERSIST_BUSTER }}>
          <ThemeProvider value={navigationTheme}>
            {/* CSS variables for every NativeWind colour token live here. */}
            <View style={themeVars[scheme]} className="flex-1 bg-canvas">
              <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
              <RootNavigator />
              <CelebrationHost />
              <ToastHost />
            </View>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
