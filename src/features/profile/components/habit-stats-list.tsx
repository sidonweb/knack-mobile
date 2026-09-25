import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { ProgressBar } from '@/components/progress-bar';
import { Text } from '@/components/text';
import { HabitIcon } from '@/features/habits/components/habit-icon';
import { categoryInfo } from '@/lib/categories';
import { plural } from '@/lib/format';
import { habitToken } from '@/lib/theme';
import type { HabitStats } from '@/types/api';

function HabitRow({ habit, index }: { habit: HabitStats; index: number }) {
  const rate = habit.completionRate;
  const unit = habit.streak.unit;
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(220)} className="gap-2.5 py-3.5">
      <View className="flex-row items-center gap-3">
        <HabitIcon icon={habit.icon} color={habit.color} size={38} />
        <View className="flex-1 gap-0.5">
          <Text variant="callout" numberOfLines={1}>
            {habit.name}
          </Text>
          <Text variant="footnote" tone="subtle" numberOfLines={1}>
            {habit.category === 'GENERAL' ? '' : `${categoryInfo(habit.category).label} · `}
            {plural(habit.totalCompletions, 'completion')}
          </Text>
        </View>
        <View className="items-end">
          <View className="flex-row items-center gap-1">
            <Icon name="flame" size={14} color={habit.streak.current > 0 ? 'ember' : 'subtle'} />
            <Text variant="numeral" tone={habit.streak.current > 0 ? 'default' : 'subtle'}>
              {habit.streak.current}
            </Text>
          </View>
          <Text variant="caption" tone="subtle">
            best {plural(habit.streak.longest, unit)}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-3 pl-[50px]">
        <View className="flex-1">
          <ProgressBar progress={rate ?? 0} color={habitToken(habit.color)} height={4} />
        </View>
        <Text variant="caption" tone="muted" className="w-[74px] text-right tabular-nums">
          {rate === null ? 'New' : `${Math.round(rate * 100)}% · 30d`}
        </Text>
      </View>
    </Animated.View>
  );
}

/** Each habit's streak and 30-day completion rate: where the consistency actually comes from. */
export function HabitStatsList({ habits }: { habits: HabitStats[] }) {
  return (
    <Card padded={false} className="px-5 py-1">
      {habits.map((habit, index) => (
        <View key={habit.id} className={index > 0 ? 'border-t border-hairline' : ''}>
          <HabitRow habit={habit} index={index} />
        </View>
      ))}
    </Card>
  );
}
