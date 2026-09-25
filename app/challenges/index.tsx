import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState, ErrorState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { Screen, SectionHeader } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { SkeletonRows } from '@/components/skeleton';
import { ChallengeCard } from '@/features/challenges/components/challenge-card';
import { InviteCard } from '@/features/challenges/components/invite-card';
import { useChallengeInvites, useChallenges } from '@/features/challenges/hooks';

const SCOPES = [
  { value: 'joined', label: 'Yours' },
  { value: 'discover', label: 'Discover' },
] as const;

export default function ChallengesScreen() {
  const [scope, setScope] = useState<'joined' | 'discover'>('joined');
  const challenges = useChallenges(scope);
  const invites = useChallengeInvites();
  const list = challenges.data ?? [];
  const pending = invites.data ?? [];

  const live = list.filter((challenge) => challenge.status !== 'ENDED');
  const ended = list.filter((challenge) => challenge.status === 'ENDED');

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <IconButton icon="add" label="New challenge" variant="plain" onPress={() => router.push('/challenges/new')} />,
        }}
      />
      <Screen
        topInset={false}
        refreshing={challenges.isRefetching}
        onRefresh={() => {
          void challenges.refetch();
          void invites.refetch();
        }}>
        {pending.length > 0 ? (
          <View className="gap-3 pt-2">
            <SectionHeader title={`Invites · ${pending.length}`} />
            {pending.map((invite, index) => (
              <InviteCard key={invite.challenge.id} invite={invite} index={index} />
            ))}
          </View>
        ) : null}

        <View className="pt-2">
          <SegmentedControl options={SCOPES} value={scope} onChange={setScope} />
        </View>

        {challenges.isLoading && !challenges.data ? (
          <Card padded={false} className="py-2">
            <SkeletonRows count={3} avatar />
          </Card>
        ) : challenges.isError && !challenges.data ? (
          <ErrorState title="Couldn’t load challenges" error={challenges.error} onRetry={() => void challenges.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="flag-outline"
            title={scope === 'joined' ? 'No challenges yet' : 'Nothing to discover'}
            message={
              scope === 'joined'
                ? 'Start one with friends: 30 day workout, no zero days, a month of reading.'
                : 'Public challenges and ones started by people you follow appear here.'
            }
            action={<Button label="Start a challenge" icon="flag" size="sm" onPress={() => router.push('/challenges/new')} />}
          />
        ) : (
          <Animated.View key={scope} entering={FadeIn.duration(200)} className="gap-3">
            {live.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
            {ended.length > 0 ? (
              <>
                <View className="pt-3">
                  <SectionHeader title="Finished" />
                </View>
                {ended.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </>
            ) : null}
          </Animated.View>
        )}
      </Screen>
    </>
  );
}
