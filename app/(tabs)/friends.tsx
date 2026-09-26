import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { CountBadge } from '@/components/badge';
import { Card, Divider } from '@/components/card';
import { EmptyState, ErrorState } from '@/components/empty-state';
import { ListRow } from '@/components/list-row';
import { Screen, SectionHeader } from '@/components/screen';
import { SkeletonRows } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { useChallenges } from '@/features/challenges/hooks';
import { FeedList } from '@/features/social/components/feed-list';
import { LeaderboardCard } from '@/features/social/components/leaderboard-card';
import { UserRow } from '@/features/social/components/user-row';
import { useInbox, useLeaderboard, useUserSearch } from '@/features/social/hooks';

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function FriendsScreen() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const search = useUserSearch(useDebounced(query.trim()));
  const leaderboard = useLeaderboard();
  const inbox = useInbox().data;
  const joined = useChallenges('joined').data ?? [];
  const [refreshing, setRefreshing] = useState(false);

  const searching = query.trim().length >= 2;
  const active = joined.filter((challenge) => challenge.status !== 'ENDED').length;

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all(
      ['feed', 'leaderboard', 'inbox', 'challenges'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    );
    setRefreshing(false);
  };

  return (
    <Screen title="Friends" eyebrow="Your circle" refreshing={refreshing} onRefresh={refresh}>
      <TextField
        icon="search"
        value={query}
        onChangeText={setQuery}
        accessibilityLabel="Search people"
        placeholder="Search by name or @username"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      {searching ? (
        <View className="gap-1">
          <SectionHeader title="People" />
          {search.isLoading ? <SkeletonRows count={3} avatar inset={false} /> : null}
          {search.isError ? <ErrorState compact error={search.error} onRetry={() => void search.refetch()} /> : null}
          {search.data?.map((user) => <UserRow key={user.id} user={user} />)}
          {search.data?.length === 0 ? (
            <EmptyState compact icon="search" title="No one found" message={`No one matches “${query.trim()}”. Try their @username.`} />
          ) : null}
        </View>
      ) : (
        <>
          <Card padded={false} className="overflow-hidden">
            {inbox && inbox.followRequests > 0 ? (
              <>
                <ListRow
                  icon="person-add"
                  iconTint="iris"
                  title="Follow requests"
                  subtitle="People asking to see your progress"
                  right={<CountBadge count={inbox.followRequests} />}
                  onPress={() => router.push({ pathname: '/connections', params: { tab: 'requests' } })}
                />
                <Divider />
              </>
            ) : null}
            <ListRow
              icon="flag"
              iconTint="ember"
              title="Challenges"
              subtitle={
                inbox?.challengeInvites
                  ? `${inbox.challengeInvites} ${inbox.challengeInvites === 1 ? 'invite' : 'invites'} waiting`
                  : active > 0
                    ? `${active} in progress`
                    : 'Compete with friends on what counts'
              }
              right={<CountBadge count={inbox?.challengeInvites ?? 0} />}
              onPress={() => router.push('/challenges')}
            />
          </Card>

          {leaderboard.data ? <LeaderboardCard leaderboard={leaderboard.data} /> : null}

          <View className="gap-1">
            <SectionHeader title="Activity" />
            <FeedList
              empty={{
                icon: 'people-outline',
                title: 'Quiet in here',
                message: 'Close out a day or follow friends. Streaks, perfect weeks and unlocks will show up here.',
              }}
            />
          </View>
        </>
      )}
    </Screen>
  );
}
