import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { ErrorState, LoadingState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { Screen, SectionHeader } from '@/components/screen';
import { ProfileView, shareProfile } from '@/features/profile/components/profile-view';
import { FeedList } from '@/features/social/components/feed-list';
import { FollowButton } from '@/features/social/components/follow-button';
import { useProfile } from '@/features/social/hooks';
import { firstName } from '@/lib/format';

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const profile = useProfile(username);
  const data = profile.data;

  if (!data) {
    return (
      <View className="flex-1 justify-center bg-canvas">
        {profile.isError ? (
          <ErrorState title="This profile isn’t available" error={profile.error} onRetry={() => void profile.refetch()} />
        ) : (
          <LoadingState />
        )}
      </View>
    );
  }

  const name = firstName(data.user.displayName);

  return (
    <>
      <Stack.Screen
        options={{
          title: `@${data.user.username}`,
          headerRight: data.canView
            ? () => (
                <IconButton icon="share-outline" label="Share profile" variant="plain" onPress={() => shareProfile(data)} />
              )
            : undefined,
        }}
      />
      <Screen topInset={false} refreshing={profile.isRefetching} onRefresh={() => void profile.refetch()}>
        <ProfileView
          profile={data}
          action={
            data.isMe ? (
              <Button label="Edit profile" variant="secondary" size="sm" icon="create-outline" onPress={() => router.push('/settings')} />
            ) : (
              <FollowButton user={data.user} followState={data.followState} />
            )
          }>
          {data.canView ? (
            <View>
              <SectionHeader title="Activity" />
              <FeedList
                userId={data.user.id}
                empty={{ icon: 'pulse-outline', title: 'Nothing shared yet', message: `${name}’s milestones will show up here.` }}
              />
            </View>
          ) : null}
        </ProfileView>
      </Screen>
    </>
  );
}
