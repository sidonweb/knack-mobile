import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { AnimatedView } from '@/components/animated-view';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { ProgressBar } from '@/components/progress-bar';
import { Text } from '@/components/text';
import { formatMonthDay, toDay } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import type { AchievementWithProgress } from '@/types/api';

import { AchievementBadge, TierPips } from './achievement-badge';

const FAMILY_TITLES: Record<string, string> = {
  consistency: 'Good days',
  streak: 'Streaks',
  perfect_day: 'Perfect days',
  perfect_week: 'Perfect weeks',
  month: '90%+ months',
  tasks: 'Tasks',
  habits: 'Habits',
  reading: 'Reading',
  workout: 'Workouts',
  mindfulness: 'Mindfulness',
  early_morning: 'Early mornings',
  learning: 'Learning',
  level: 'Levels',
  challenges: 'Challenges',
};

const familyTitle = (family: string) =>
  FAMILY_TITLES[family] ?? family.replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());

function rarityText(rarity: number) {
  if (rarity === 0) return 'No one yet';
  if (rarity < 1) return 'Held by under 1%';
  return `Held by ${Math.round(rarity)}%`;
}

/** Groups the catalogue into ladders, keeping the server's order. */
export function groupByFamily(achievements: AchievementWithProgress[]) {
  const families = new Map<string, AchievementWithProgress[]>();
  for (const achievement of achievements) {
    const rungs = families.get(achievement.family) ?? [];
    rungs.push(achievement);
    families.set(achievement.family, rungs);
  }
  return [...families].map(([family, rungs]) => ({ family, rungs: rungs.sort((a, b) => a.tier - b.tier) }));
}

function Rung({ achievement }: { achievement: AchievementWithProgress }) {
  const unlocked = achievement.unlockedAt !== null;
  return (
    <View className="flex-row items-center gap-3 py-2.5">
      <AchievementBadge icon={achievement.icon} tier={achievement.tier} unlocked={unlocked} size={36} />
      <View className="flex-1 gap-0.5">
        <Text variant="callout" tone={unlocked ? 'default' : 'muted'}>
          {achievement.name}
        </Text>
        <Text variant="footnote" tone="subtle" numberOfLines={2}>
          {achievement.description}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text variant="footnote" tone={unlocked ? 'mint' : 'muted'} className="tabular-nums">
          {unlocked ? formatMonthDay(toDay(new Date(achievement.unlockedAt!))) : `${achievement.current}/${achievement.threshold}`}
        </Text>
        <Text variant="caption" tone="subtle">
          {rarityText(achievement.rarity)}
        </Text>
      </View>
    </View>
  );
}

function Ladder({ family, rungs, index }: { family: string; rungs: AchievementWithProgress[]; index: number }) {
  const [open, setOpen] = useState(false);
  const earned = rungs.filter((rung) => rung.unlockedAt);
  const best = earned.at(-1);
  const next = rungs.find((rung) => !rung.unlockedAt);
  const shown = best ?? rungs[0]!;
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: withTiming(open ? '90deg' : '0deg', { duration: 180 }) }] }));

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 35).duration(220)}
      layout={LinearTransition.duration(220)}
      className={`gap-3 px-5 py-4 ${index > 0 ? 'border-t border-hairline' : ''}`}>
        <Pressable
          onPress={() => {
            haptics.tap();
            setOpen((value) => !value);
          }}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          className="flex-row items-center gap-4">
          <AchievementBadge icon={shown.icon} tier={best?.tier ?? 1} unlocked={Boolean(best)} size={48} />
          <View className="flex-1 gap-1.5">
            <View className="flex-row items-center justify-between">
              <Text variant="headline">{familyTitle(family)}</Text>
              <TierPips tier={earned.length} total={rungs.length} />
            </View>
            {next ? (
              <>
                <View className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <ProgressBar progress={next.current / next.threshold} color={best ? 'amber' : 'steel'} height={5} />
                  </View>
                  <Text variant="caption" tone="muted" className="tabular-nums">
                    {next.current.toLocaleString()}/{next.threshold.toLocaleString()}
                  </Text>
                </View>
                <Text variant="footnote" tone="subtle" numberOfLines={1}>
                  Next: {next.name}
                </Text>
              </>
            ) : (
              <Text variant="footnote" tone="mint">
                Every milestone earned
              </Text>
            )}
          </View>
          <AnimatedView style={chevron}>
            <Icon name="chevron-forward" size={16} color="subtle" />
          </AnimatedView>
        </Pressable>
        {open ? (
          <Animated.View entering={FadeIn.duration(180)} className="border-t border-hairline pt-1">
            {rungs.map((rung) => (
              <Rung key={rung.id} achievement={rung} />
            ))}
          </Animated.View>
        ) : null}
    </Animated.View>
  );
}

/** Achievements as milestone ladders: the highest rung earned, and how far to the next. */
export function AchievementLadders({ achievements }: { achievements: AchievementWithProgress[] }) {
  const families = groupByFamily(achievements);
  // Ladders in progress first, untouched ones last.
  const started = families.filter(({ rungs }) => rungs.some((rung) => rung.unlockedAt || rung.current > 0));
  const untouched = families.filter((family) => !started.includes(family));
  return (
    <Card padded={false} className="overflow-hidden">
      {[...started, ...untouched].map(({ family, rungs }, index) => (
        <Ladder key={family} family={family} rungs={rungs} index={index} />
      ))}
    </Card>
  );
}
