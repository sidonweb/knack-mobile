import { ScrollView, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ProgressRing } from '@/components/progress-ring';
import { Text } from '@/components/text';
import { habitToken } from '@/lib/theme';
import type { HabitDay } from '@/types/api';

import { HabitIcon } from '../../habits/components/habit-icon';

type Props = { habits: HabitDay[]; onCheckIn: (habit: HabitDay) => void; onOpen: (habit: HabitDay) => void };

function subtitle(habit: HabitDay) {
  if (habit.frequency === 'WEEKLY') {
    if (habit.completed) return 'Done today';
    return habit.weekCount >= habit.timesPerWeek ? 'Week complete' : `${habit.weekCount} of ${habit.timesPerWeek} · week`;
  }
  if (habit.completed) return 'Done';
  return habit.targetCount > 1 ? `${habit.count}/${habit.targetCount}` : 'Tap to do';
}

function HabitTile({ habit, onCheckIn, onOpen }: { habit: HabitDay; onCheckIn: () => void; onOpen: () => void }) {
  const tint = habitToken(habit.color);
  const partial = habit.targetCount > 1 && !habit.completed;

  return (
    <>
      <PressableScale
        onPress={onCheckIn}
        onLongPress={onOpen}
        scaleTo={0.94}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: habit.completed }}
        accessibilityHint="Double tap to check in. Long press for details."
        accessibilityLabel={`${habit.name}, ${subtitle(habit)}`}
        className={`w-[120px] gap-3 rounded-card border p-4 ${habit.completed ? 'border-transparent bg-raised' : 'border-hairline bg-surface'}`}>
        <View className="flex-row items-start justify-between">
          {partial ? (
            <ProgressRing progress={habit.count / habit.targetCount} size={40} strokeWidth={3.5} from={tint} to={tint}>
              <HabitIcon icon={habit.icon} color={habit.color} size={30} />
            </ProgressRing>
          ) : (
            <HabitIcon icon={habit.icon} color={habit.color} filled={habit.completed} size={40} />
          )}
          {habit.streak.current > 0 ? (
            <View className="flex-row items-center gap-0.5 pt-0.5">
              <Icon name="flame" size={11} color="ember" />
              <Text variant="footnote" tone="muted" className="font-inter-semibold tabular-nums">
                {habit.streak.current}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="gap-0.5">
          <Text variant="callout" numberOfLines={1}>
            {habit.name}
          </Text>
          <Text variant="footnote" tone={habit.completed ? 'mint' : 'subtle'} className="tabular-nums" numberOfLines={1}>
            {subtitle(habit)}
          </Text>
        </View>
      </PressableScale>
    </>
  );
}

/** Today's habits as tappable tiles; a tap is a check-in, a long press opens the habit. */
export function HabitStrip({ habits, onCheckIn, onOpen }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-5" className="-mx-5 px-5">
      {habits.map((habit) => (
        <HabitTile key={habit.id} habit={habit} onCheckIn={() => onCheckIn(habit)} onOpen={() => onOpen(habit)} />
      ))}
    </ScrollView>
  );
}
