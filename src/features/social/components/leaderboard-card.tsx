import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import type { Leaderboard } from '@/types/api';

export function LeaderboardCard({ leaderboard }: { leaderboard: Leaderboard }) {
  const entries = leaderboard.entries.slice(0, 5);

  return (
    <Card className="gap-1">
      <View className="mb-2 flex-row items-baseline justify-between">
        <Text variant="headline">This week</Text>
        <Text variant="footnote" tone="subtle">
          XP · last 7 days
        </Text>
      </View>
      {entries.map((entry, index) => (
        <Animated.View key={entry.user.id} entering={FadeInDown.delay(index * 50).duration(220)}>
          <Pressable
            onPress={() => router.push({ pathname: '/users/[username]', params: { username: entry.user.username } })}
            className={`flex-row items-center gap-3 rounded-xl px-2 py-2.5 active:opacity-70 ${entry.isMe ? 'bg-raised' : ''}`}>
            <Text variant="numeral" tone={entry.rank === 1 ? 'ember' : 'subtle'} className="w-5 text-center">
              {entry.rank}
            </Text>
            <Avatar name={entry.user.displayName} url={entry.user.avatarUrl} size={32} />
            <View className="flex-1">
              <Text variant="callout" numberOfLines={1}>
                {entry.isMe ? 'You' : entry.user.displayName}
              </Text>
              <Text variant="caption" tone="subtle">
                {entry.averageScore}% avg
              </Text>
            </View>
            {entry.user.currentStreak > 0 ? (
              <View className="flex-row items-center gap-0.5">
                <Icon name="flame" size={12} color="ember" />
                <Text variant="footnote" tone="muted" className="tabular-nums">
                  {entry.user.currentStreak}
                </Text>
              </View>
            ) : null}
            <Text variant="numeral" className="w-14 text-right">
              {entry.xp.toLocaleString()}
            </Text>
          </Pressable>
        </Animated.View>
      ))}
      {leaderboard.entries.length <= 1 ? (
        <Text variant="footnote" tone="muted" className="mt-2">
          Follow friends to see how your week stacks up.
        </Text>
      ) : null}
    </Card>
  );
}
