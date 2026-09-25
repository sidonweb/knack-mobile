import { Stack } from 'expo-router';

import { useStackScreenOptions } from '@/features/navigation/stack-options';

export default function SettingsLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
    </Stack>
  );
}
