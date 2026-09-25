import { router } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState, ErrorState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { Screen, SectionHeader } from '@/components/screen';
import { SkeletonRows } from '@/components/skeleton';
import { Text } from '@/components/text';
import { HabitCard } from '@/features/habits/components/habit-card';
import { HabitIcon } from '@/features/habits/components/habit-icon';
import { useArchivedHabits, useHabitActions, useHabitsForDay, useRestoreHabit } from '@/features/habits/hooks';
import { today } from '@/lib/dates';
import { scheduleLabel } from '@/lib/habits';
import { errorMessage } from '@/services/api/errors';

export default function HabitsScreen() {
  const day = today();
  const habits = useHabitsForDay(day);
  const archived = useArchivedHabits();
  const actions = useHabitActions(day);
  const restore = useRestoreHabit();

  const list = habits.data ?? [];
  const done = list.filter((habit) => habit.scheduled && habit.completed).length;
  const due = list.filter((habit) => habit.scheduled && (habit.frequency === 'DAILY' || habit.completed)).length;
  const archivedList = archived.data ?? [];

  return (
    <Screen
      eyebrow={due > 0 ? `${done} of ${due} done today` : 'Your rituals'}
      title="Habits"
      refreshing={habits.isRefetching}
      onRefresh={() => {
        void habits.refetch();
        void archived.refetch();
      }}
      right={
        <IconButton icon="add" label="New habit" onPress={() => router.push('/habit-editor')} />
      }>
      {habits.isLoading && !habits.data ? (
        <Card padded={false} className="py-2">
          <SkeletonRows count={3} avatar />
        </Card>
      ) : habits.isError && !habits.data ? (
        <ErrorState title="Couldn’t load your habits" error={habits.error} onRetry={() => void habits.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="leaf-outline"
          title="Build your first ritual"
          message="Small things, done daily or a few times a week. Habits count towards your score on the days they're due."
          action={<Button label="New habit" icon="add" size="sm" onPress={() => router.push('/habit-editor')} />}
        />
      ) : (
        <View className="gap-3">
          {list.map((habit, index) => (
            <Animated.View key={habit.id} entering={FadeInDown.delay(index * 40).duration(220)} layout={LinearTransition.duration(220)}>
              <HabitCard
                habit={habit}
                onCheckIn={() => actions.checkIn(habit)}
                onOpen={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
              />
            </Animated.View>
          ))}
        </View>
      )}

      {archivedList.length > 0 ? (
        <View className="gap-3">
          <SectionHeader title="Archived" />
          <Card padded={false} className="px-5 py-1">
            {archivedList.map((habit, index) => (
              <View key={habit.id} className={`flex-row items-center gap-3.5 py-3 ${index > 0 ? 'border-t border-hairline' : ''}`}>
                <View className="opacity-60">
                  <HabitIcon icon={habit.icon} color={habit.color} size={32} />
                </View>
                <Pressable
                  className="flex-1 active:opacity-60"
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}>
                  <Text variant="callout">{habit.name}</Text>
                  <Text variant="footnote" tone="subtle">
                    {scheduleLabel(habit)}
                  </Text>
                </Pressable>
                <Button
                  label="Restore"
                  size="sm"
                  variant="secondary"
                  loading={restore.isPending && restore.variables === habit.id}
                  onPress={() =>
                    restore.mutate(habit.id, { onError: (error) => Alert.alert('Could not restore', errorMessage(error)) })
                  }
                />
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
