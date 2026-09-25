import { Stack } from 'expo-router';

import { useStackScreenOptions } from '@/features/navigation/stack-options';

export default function ChallengesLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Challenges' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
      <Stack.Screen name="new" options={{ title: 'New challenge', presentation: 'modal' }} />
      <Stack.Screen name="invite" options={{ title: 'Invite friends', presentation: 'modal' }} />
    </Stack>
  );
}
