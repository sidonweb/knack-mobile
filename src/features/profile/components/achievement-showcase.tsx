import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { ProgressBar } from '@/components/progress-bar';
import { Text } from '@/components/text';
import type { Achievement } from '@/types/api';

import { AchievementBadge } from './achievement-badge';

type Props = { username: string; unlocked: number; total: number; showcase: Achievement[] };

/** The best badge from each ladder, with a way into the full collection. */
export function AchievementShowcase({ username, unlocked, total, showcase }: Props) {
  return (
    <Link href={{ pathname: '/achievements', params: { username } }} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`Achievements, ${unlocked} of ${total} unlocked`}>
        <Card className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text variant="headline">Achievements</Text>
            <View className="flex-row items-center gap-1">
              <Text variant="footnote" tone="subtle" className="tabular-nums">
                {unlocked} / {total}
              </Text>
              <Icon name="chevron-forward" size={15} color="subtle" />
            </View>
          </View>
          <ProgressBar progress={total === 0 ? 0 : unlocked / total} color="amber" height={4} />
          {showcase.length > 0 ? (
            <View className="flex-row flex-wrap gap-x-2 gap-y-4">
              {showcase.map((achievement, index) => (
                <Animated.View
                  key={achievement.id}
                  entering={FadeIn.delay(index * 60).duration(220)}
                  className="w-[31%] items-center gap-1.5">
                  <AchievementBadge icon={achievement.icon} tier={achievement.tier} unlocked size={50} />
                  <Text variant="caption" className="text-center font-inter-medium" numberOfLines={2}>
                    {achievement.name}
                  </Text>
                </Animated.View>
              ))}
            </View>
          ) : (
            <Text variant="footnote" tone="muted">
              No badges yet. The first one is a single good day away.
            </Text>
          )}
        </Card>
      </Pressable>
    </Link>
  );
}
