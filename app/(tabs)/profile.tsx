import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { ErrorState, LoadingState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { ProfileView, shareProfile } from '@/features/profile/components/profile-view';
import { useMe } from '@/features/profile/hooks';
import { useProfile } from '@/features/social/hooks';

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const me = useMe();
  const profile = useProfile(me.data?.username ?? '');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all(
      [['me'], ['profile'], ['achievements']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
    setRefreshing(false);
  };

  const data = profile.data;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      title="Profile"
      right={
        <View className="flex-row gap-2">
          {data ? <IconButton icon="share-outline" label="Share profile" onPress={() => shareProfile(data)} /> : null}
          <IconButton icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
        </View>
      }>
      {data ? (
        <ProfileView
          profile={data}
          action={<Button label="Edit profile" variant="secondary" size="sm" icon="create-outline" onPress={() => router.push('/settings')} />}
        />
      ) : (
        profile.isError ? (
          <ErrorState title="Couldn’t load your profile" error={profile.error} onRetry={() => void refresh()} />
        ) : (
          <LoadingState />
        )
      )}
    </Screen>
  );
}
