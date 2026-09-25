import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Text } from '@/components/text';
import { useTheme } from '@/hooks/use-theme';
import { weekdayInitial } from '@/lib/dates';
import { scheduleLabel } from '@/lib/habits';
import { habitToken } from '@/lib/theme';
import type { HabitDay } from '@/types/api';

import { HabitIcon } from './habit-icon';

type Props = { habit: HabitDay; onCheckIn: () => void; onOpen: () => void };

function progressLabel(habit: HabitDay) {
  if (habit.frequency === 'WEEKLY') return `${habit.weekCount}/${habit.timesPerWeek} this week`;
  if (habit.targetCount > 1) return `${habit.count}/${habit.targetCount}`;
  return null;
}

/** Tap to check in; the chevron (or a long press) opens the habit's history. */
export function HabitCard({ habit, onCheckIn, onOpen }: Props) {
  const theme = useTheme();
  const tint = theme.color(habitToken(habit.color));

  const counter = progressLabel(habit);
  const unit = habit.streak.unit === 'week' ? 'wk' : 'd';

  return (
    <>
      <PressableScale
        // Not due today: a tap opens the habit rather than doing nothing.
        onPress={habit.scheduled ? onCheckIn : onOpen}
        onLongPress={onOpen}
        accessibilityRole={habit.scheduled ? 'checkbox' : 'button'}
        accessibilityState={habit.scheduled ? { checked: habit.completed } : undefined}
        accessibilityHint={habit.scheduled ? 'Double tap to check in. Long press for history.' : 'Not due today. Opens history.'}
        accessibilityLabel={`${habit.name}, ${habit.completed ? 'done' : (counter ?? (habit.scheduled ? 'not done' : 'not due today'))}`}
        className={`gap-4 rounded-card border border-hairline bg-surface p-5 ${habit.scheduled ? '' : 'opacity-55'}`}>
        <View className="flex-row items-center gap-3.5">
          <HabitIcon icon={habit.icon} color={habit.color} filled={habit.completed} size={40} />
          <View className="flex-1 gap-0.5">
            <Text variant="headline">{habit.name}</Text>
            <View className="flex-row items-center gap-2">
              <Text variant="footnote" tone="subtle">
                {habit.scheduled ? scheduleLabel(habit) : 'Not today'}
              </Text>
              {habit.streak.current > 0 ? (
                <View className="flex-row items-center gap-0.5">
                  <Icon name="flame" size={11} color="ember" />
                  <Text variant="footnote" tone="muted" className="font-inter-semibold tabular-nums">
                    {habit.streak.current}
                    {unit}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          {counter ? (
            <Text variant="numeral" tone={habit.completed ? 'subtle' : 'default'}>
              {counter}
            </Text>
          ) : null}
          <Pressable
            onPress={onOpen}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`${habit.name} details`}
            className="-mr-2 h-8 w-8 items-center justify-center">
            <Icon name="chevron-forward" size={18} color="subtle" />
          </Pressable>
        </View>

        <View className="flex-row justify-between" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {habit.history.map((entry) => (
            <View key={entry.date} className="items-center gap-1.5">
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: entry.completed
                    ? tint
                    : entry.scheduled && habit.frequency === 'DAILY'
                      ? theme.color('fg', 0.06)
                      : 'transparent',
                  borderWidth: entry.completed || (entry.scheduled && habit.frequency === 'DAILY') ? 0 : 1,
                  borderColor: theme.color('hairline'),
                }}
              />
              <Text variant="overline" tone="subtle" className="tracking-normal">
                {weekdayInitial(entry.date)}
              </Text>
            </View>
          ))}
        </View>
      </PressableScale>
    </>
  );
}
