import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ErrorState, LoadingState } from '@/components/empty-state';
import { ProgressRing } from '@/components/progress-ring';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { AchievementLadders, groupByFamily } from '@/features/profile/components/achievement-ladders';
import { useAchievements, useMe } from '@/features/profile/hooks';
import { useProfileAchievements } from '@/features/social/hooks';

export default function AchievementsScreen() {
  const { username = '' } = useLocalSearchParams<{ username?: string }>();
  const me = useMe();
  const isMe = !username || username === me.data?.username;
  const mine = useAchievements();
  const theirs = useProfileAchievements(isMe ? '' : username);
  const query = isMe ? mine : theirs;
  const achievements = query.data;

  const unlocked = achievements?.filter((achievement) => achievement.unlockedAt).length ?? 0;
  const total = achievements?.length ?? 0;
  const complete = achievements ? groupByFamily(achievements).filter(({ rungs }) => rungs.every((rung) => rung.unlockedAt)).length : 0;

  return (
    <>
      <Stack.Screen options={{ title: isMe ? 'Achievements' : `@${username}` }} />
      <Screen topInset={false} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
        {!achievements ? (
          query.isError ? (
            <ErrorState title="Achievements aren’t available" error={query.error} onRetry={() => void query.refetch()} />
          ) : (
            <LoadingState />
          )
        ) : (
          <>
            <Animated.View entering={FadeIn} className="flex-row items-center gap-5 pt-2">
              <ProgressRing progress={total ? unlocked / total : 0} size={96} strokeWidth={9} from="amber" to="ember">
                <Text variant="numeral" className="text-[22px] leading-[26px]">
                  {unlocked}
                </Text>
                <Text variant="caption" tone="subtle">
                  of {total}
                </Text>
              </ProgressRing>
              <View className="flex-1 gap-1">
                <Text variant="title">{isMe ? 'Your milestones' : 'Milestones'}</Text>
                <Text variant="footnote" tone="muted">
                  Badges unlock on their own when the history behind them is real.
                  {complete > 0 ? ` ${complete} ${complete === 1 ? 'ladder' : 'ladders'} complete.` : ''}
                </Text>
              </View>
            </Animated.View>
            <AchievementLadders achievements={achievements} />
          </>
        )}
      </Screen>
    </>
  );
}
