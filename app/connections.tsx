import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { SkeletonRows } from '@/components/skeleton';
import { SegmentedControl } from '@/components/segmented-control';
import { Text } from '@/components/text';
import { useMe } from '@/features/profile/hooks';
import { UserRow } from '@/features/social/components/user-row';
import { useConnections, useFollowRequests, useRemoveFollower, useRespondToRequest } from '@/features/social/hooks';
import { timeAgo } from '@/lib/dates';
import type { SocialUser } from '@/types/api';

type Tab = 'followers' | 'following' | 'requests';

function Requests() {
  const requests = useFollowRequests();
  const respond = useRespondToRequest();
  const list = requests.data ?? [];

  if (requests.isLoading) return <SkeletonRows count={4} avatar inset={false} />;
  if (list.length === 0) {
    return <EmptyState icon="mail-open-outline" title="No requests" message="When your account is private, people who ask to follow you appear here." />;
  }
  return (
    <View>
      {list.map((request) => (
        <Animated.View key={request.user.id} exiting={FadeOut.duration(180)} layout={LinearTransition.duration(220)}>
          <UserRow
            user={request.user}
            action={
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => respond.mutate({ userId: request.user.id, accept: false })}
                  accessibilityLabel={`Decline ${request.user.displayName}`}
                  hitSlop={4}
                  accessibilityRole="button"
                  className="h-10 w-10 items-center justify-center rounded-full bg-raised active:opacity-60">
                  <Icon name="close" size={16} color="muted" />
                </Pressable>
                <Button size="sm" label="Accept" onPress={() => respond.mutate({ userId: request.user.id, accept: true })} />
              </View>
            }
          />
          <Text variant="caption" tone="subtle" className="-mt-1.5 mb-1 pl-[54px]">
            Wants to follow you · {timeAgo(request.requestedAt)}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}

function People({ username, direction, isMe }: { username: string; direction: 'followers' | 'following'; isMe: boolean }) {
  const people = useConnections(username, direction);
  const removeFollower = useRemoveFollower();
  const meId = useMe().data?.id;
  const list = people.data ?? [];

  const confirmRemove = (user: SocialUser) =>
    Alert.alert(`Remove ${user.displayName}?`, 'They won’t be told. They can follow you again unless your account is private.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFollower.mutate(user.id) },
    ]);

  if (people.isLoading) return <SkeletonRows count={4} avatar inset={false} />;
  if (people.isError) return <EmptyState icon="lock-closed-outline" title="Not visible" message="This account is private." />;
  if (list.length === 0) {
    return (
      <EmptyState
        icon="people-outline"
        title={direction === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
        message={isMe ? 'Consistency is more fun with company. Find friends from the Friends tab.' : undefined}
      />
    );
  }
  return (
    <View>
      {list.map((user) => (
        <Animated.View key={user.id} exiting={FadeOut.duration(180)} layout={LinearTransition.duration(220)}>
          <UserRow
            user={user}
            plain={user.id === meId}
            action={
              isMe && direction === 'followers' ? (
                <Pressable
                  onPress={() => confirmRemove(user)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${user.displayName}`}
                  className="min-h-10 justify-center px-3">
                  <Text variant="footnote" tone="muted">
                    Remove
                  </Text>
                </Pressable>
              ) : undefined
            }
          />
        </Animated.View>
      ))}
    </View>
  );
}

export default function ConnectionsScreen() {
  const params = useLocalSearchParams<{ username?: string; tab?: Tab }>();
  const me = useMe();
  const username = params.username ?? me.data?.username ?? '';
  const isMe = username === me.data?.username;
  const [tab, setTab] = useState<Tab>(params.tab ?? 'followers');

  const tabs = [
    { value: 'followers' as const, label: 'Followers' },
    { value: 'following' as const, label: 'Following' },
    ...(isMe ? [{ value: 'requests' as const, label: 'Requests' }] : []),
  ];

  return (
    <>
      <Stack.Screen options={{ title: isMe ? 'Your people' : `@${username}` }} />
      <Screen topInset={false}>
        <View className="pt-2">
          <SegmentedControl options={tabs} value={tab} onChange={setTab} />
        </View>
        {tab === 'requests' ? <Requests /> : username ? <People key={tab} username={username} direction={tab} isMe={isMe} /> : null}
      </Screen>
    </>
  );
}
