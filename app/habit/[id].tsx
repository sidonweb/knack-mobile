import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorState, LoadingState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { StatGrid } from '@/components/stat-grid';
import { Text } from '@/components/text';
import { HabitIcon } from '@/features/habits/components/habit-icon';
import { useArchiveHabit, useHabitActions, useHabitDetail, useHabitsForDay } from '@/features/habits/hooks';
import { useStackScreenOptions } from '@/features/navigation/stack-options';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthDay, parseDay, today } from '@/lib/dates';
import { categoryInfo } from '@/lib/categories';
import { scheduleLabel } from '@/lib/habits';
import { habitToken } from '@/lib/theme';
import { errorMessage } from '@/services/api/errors';
import type { HabitDetail } from '@/types/api';

const PRIORITY_TEXT = { LOW: 'Low priority', NONE: 'Normal priority', MEDIUM: 'Medium priority', HIGH: 'High priority' } as const;

/** Twelve weeks, one column per week (Monday at the top), shaded by completion. */
function Heatmap({ detail }: { detail: HabitDetail }) {
  const { color } = useTheme();
  const tint = habitToken(detail.habit.color);
  const weeks = Array.from({ length: detail.history.length / 7 }, (_, index) => detail.history.slice(index * 7, index * 7 + 7));
  const monthLabel = (week: HabitDetail['history']) => {
    const first = week[0];
    if (!first) return '';
    const date = parseDay(first.date);
    return date.getDate() <= 7 ? formatMonthDay(first.date).split(' ')[0] : '';
  };

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="overline" tone="subtle">
          Last 12 weeks
        </Text>
        <View className="flex-row items-center gap-1.5">
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color('fg', 0.07) }} />
          <Text variant="footnote" tone="subtle">
            Due
          </Text>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color(tint), marginLeft: 6 }} />
          <Text variant="footnote" tone="subtle">
            Done
          </Text>
        </View>
      </View>
      <View className="flex-row gap-1">
        {weeks.map((week) => (
          <View key={week[0]?.date} className="flex-1 gap-1">
            {/* Month names overhang their narrow column rather than truncating. */}
            <View className="h-[14px]">
              <Text variant="overline" tone="subtle" className="absolute left-0 top-0 w-12 tracking-normal">
                {monthLabel(week)}
              </Text>
            </View>
            {week.map((entry) => (
              <View
                key={entry.date}
                accessibilityLabel={`${entry.date}: ${entry.completed ? 'done' : entry.scheduled ? 'missed' : 'not scheduled'}`}
                style={{
                  aspectRatio: 1,
                  borderRadius: 4,
                  backgroundColor: entry.completed
                    ? color(tint)
                    : entry.future
                      ? 'transparent'
                      : entry.count > 0
                        ? color(tint, 0.35)
                        : entry.scheduled && detail.habit.frequency === 'DAILY'
                          ? color('fg', 0.07)
                          : color('fg', 0.025),
                  borderWidth: entry.date === today() ? 1.5 : entry.future ? 1 : 0,
                  borderColor: entry.date === today() ? color('fg', 0.5) : color('hairline'),
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </Card>
  );
}

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const stackOptions = useStackScreenOptions();
  const detail = useHabitDetail(id);
  const todayHabit = useHabitsForDay(today()).data?.find((habit) => habit.id === id);
  const actions = useHabitActions(today());
  const archive = useArchiveHabit();

  const data = detail.data;
  const habit = data?.habit;
  // Prefer the live, optimistic streak from today's list; the detail catches up on sync.
  const streak = todayHabit?.streak ?? data?.stats.streak;
  const unit = (n: number) => `${streak?.unit ?? 'day'}${n === 1 ? '' : 's'}`;

  const confirmArchive = () => {
    if (!habit) return;
    Alert.alert(`Archive “${habit.name}”?`, 'It stops counting from today. Its history stays in your past scores, and you can restore it any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () =>
          archive.mutate(habit.id, {
            onSuccess: () => router.back(),
            onError: (error) => Alert.alert('Could not archive', errorMessage(error)),
          }),
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ ...stackOptions, headerShown: true, title: '', headerBackTitle: 'Back' }} />
      <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 px-5 pb-16 pt-2" contentInsetAdjustmentBehavior="automatic">
        {!habit ? (
          detail.isError ? (
            <ErrorState title="Couldn’t load this habit" error={detail.error} onRetry={() => void detail.refetch()} />
          ) : (
            <LoadingState />
          )
        ) : (
          <>
            <Animated.View entering={FadeIn} className="flex-row items-center gap-4">
              <HabitIcon icon={habit.icon} color={habit.color} size={56} filled={todayHabit?.completed} />
              <View className="flex-1 gap-1">
                <Text variant="title" accessibilityRole="header">
                  {habit.name}
                </Text>
                <Text variant="footnote" tone="muted">
                  {habit.category === 'GENERAL' ? '' : `${categoryInfo(habit.category).label} · `}
                  {scheduleLabel(habit)}
                  {habit.targetCount > 1 ? ` · ${habit.targetCount}× a day` : ''} · {PRIORITY_TEXT[habit.priority]}
                </Text>
              </View>
            </Animated.View>

            {habit.archivedAt ? (
              <View className="flex-row items-center gap-3 rounded-card bg-raised px-4 py-3.5">
                <Icon name="archive-outline" size={18} color="subtle" />
                <Text variant="callout" tone="muted" className="flex-1">
                  Archived. Restore it from the Habits tab.
                </Text>
              </View>
            ) : todayHabit?.scheduled ? (
              <Button
                label={
                  todayHabit.completed
                    ? 'Done today'
                    : todayHabit.targetCount > 1
                      ? `Check in · ${todayHabit.count}/${todayHabit.targetCount}`
                      : 'Check in today'
                }
                accessibilityHint={todayHabit.completed ? 'Double tap to undo' : undefined}
                icon={todayHabit.completed ? 'checkmark-circle' : 'add-circle-outline'}
                variant={todayHabit.completed ? 'secondary' : 'primary'}
                onPress={() => actions.checkIn(todayHabit)}
              />
            ) : null}

            <StatGrid
              stats={[
                { icon: 'flame', tint: 'ember', label: 'Current streak', value: streak?.current ?? 0, caption: unit(streak?.current ?? 0) },
                { icon: 'trophy-outline', tint: 'amber', label: 'Best streak', value: streak?.longest ?? 0, caption: unit(streak?.longest ?? 0) },
                {
                  icon: 'pie-chart-outline',
                  tint: 'mint',
                  label: 'Completion',
                  value: data.stats.completionRate === null ? '–' : Math.round(data.stats.completionRate * 100),
                  suffix: data.stats.completionRate === null ? undefined : '%',
                  caption: 'Last 12 weeks',
                },
                habit.frequency === 'WEEKLY'
                  ? { icon: 'checkmark-done', tint: 'iris', label: 'This week', value: `${data.stats.thisWeek}/${habit.timesPerWeek}` }
                  : { icon: 'checkmark-done', tint: 'iris', label: 'Total', value: data.stats.totalCompletions, caption: 'completions' },
              ]}
            />

            <Heatmap detail={data} />

            {!habit.archivedAt ? (
              <View className="gap-2 pt-2">
                <Button
                  label="Edit habit"
                  icon="create-outline"
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/habit-editor', params: { id: habit.id } })}
                />
                <Button label="Archive" icon="archive-outline" variant="ghost" loading={archive.isPending} onPress={confirmArchive} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </>
  );
}
