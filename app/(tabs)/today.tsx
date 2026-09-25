import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ListRow } from '@/components/list-row';
import { Screen, SectionHeader } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { SkeletonRows } from '@/components/skeleton';
import { SyncBadge } from '@/components/sync-badge';
import { Text } from '@/components/text';
import { STREAK_MILESTONES } from '@/features/sync/apply-outcome';
import { useHabitActions, useHabitsForDay } from '@/features/habits/hooks';
import { useMe } from '@/features/profile/hooks';
import { AddTask } from '@/features/today/components/add-task';
import { DayScoreCard } from '@/features/today/components/day-score-card';
import { HabitStrip } from '@/features/today/components/habit-strip';
import { StreakPill } from '@/features/today/components/streak-pill';
import { TaskList } from '@/features/today/components/task-list';
import {
  useDayActions,
  useDayProgress,
  useStreakDisplay,
  useSummary,
  useTaskActions,
  useTasks,
} from '@/features/today/hooks';
import { addDays, formatDayLong, greeting, relativeDayName, today } from '@/lib/dates';
import { firstName } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useCelebrations } from '@/store/celebrations';
import type { HabitDay, Task } from '@/types/api';

/** How long after a tap a score change still counts as the user's doing. */
const ACTION_WINDOW_MS = 4000;

export default function TodayScreen() {
  const queryClient = useQueryClient();
  const [day, setDay] = useState(today);
  const tasks = useTasks(day);
  const habits = useHabitsForDay(day);
  const summary = useSummary(day);
  const me = useMe();
  const progress = useDayProgress(day);
  const streak = useStreakDisplay(day, progress);
  const taskActions = useTaskActions(day);
  const habitActions = useHabitActions(day);
  const dayActions = useDayActions(day);
  const pushCelebration = useCelebrations((state) => state.push);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [menuTask, setMenuTask] = useState<Task | null>(null);

  const isToday = day === today();
  const isFuture = day > today();
  const finished = Boolean(summary.data?.day.finishedAt);
  const scheduledHabits = (habits.data ?? []).filter((habit) => habit.scheduled);
  const taskList = tasks.data ?? [];
  const openTasks = taskList.filter((task) => !task.completed).length;
  const name = firstName(me.data?.displayName);

  // Moments on this screen only fire when the user got there by tapping, never because
  // data loaded or synced in.
  const actedAt = useRef(0);

  // Reaching 100 opens the Day Complete moment once the ring has had time to close.
  const lastScore = useRef(progress.score);
  useEffect(() => {
    const reachedPerfect = lastScore.current < 100 && progress.score === 100;
    lastScore.current = progress.score;
    if (reachedPerfect && Date.now() - actedAt.current < ACTION_WINDOW_MS && !finished && !isFuture) {
      actedAt.current = 0;
      haptics.celebrate();
      const timer = setTimeout(() => router.push({ pathname: '/day-complete', params: { date: day, auto: '1' } }), 900);
      return () => clearTimeout(timer);
    }
  }, [progress.score, finished, isFuture, day]);

  // Crossing the streak threshold is the day's first real win. Mark it right away, before
  // sync. Milestone days (7, 30…) get the full reveal from the server instead.
  const secured = streak.secured;
  const streakDays = streak.current;
  const wasSecured = useRef(secured);
  useEffect(() => {
    const justSecured = !wasSecured.current && secured;
    wasSecured.current = secured;
    const byTap = Date.now() - actedAt.current < ACTION_WINDOW_MS;
    if (justSecured && byTap && isToday && progress.score < 100 && !STREAK_MILESTONES.has(streakDays)) {
      pushCelebration({ kind: 'streakSecured', days: streakDays });
    }
  }, [secured, streakDays, isToday, progress.score, pushCelebration]);

  const toggleTask = (task: Task) => {
    actedAt.current = Date.now();
    taskActions.toggle(task);
  };
  const checkIn = (habit: HabitDay) => {
    actedAt.current = Date.now();
    habitActions.checkIn(habit);
  };

  const shiftDay = (amount: number) => setDay((current) => addDays(current, amount));

  const refresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      predicate: (query) => ['tasks', 'habits', 'summary', 'me'].includes(String(query.queryKey[0])),
    });
    setRefreshing(false);
  };

  const firstLoad = tasks.isLoading && !tasks.data;
  const loadFailed = tasks.isError && !tasks.data;

  return (
    <Screen
      eyebrow={formatDayLong(day)}
      title={isToday ? (name ? `${greeting()}, ${name}` : greeting()) : relativeDayName(day)}
      compactTitle
      right={<StreakPill streak={streak} />}
      refreshing={refreshing}
      onRefresh={refresh}
      scrollEnabled={!dragging}>
      <View className="-mt-3 flex-row items-center gap-1">
        <IconButton icon="chevron-back" label="Previous day" size="sm" onPress={() => shiftDay(-1)} />
        <IconButton icon="chevron-forward" label="Next day" size="sm" onPress={() => shiftDay(1)} />
        {!isToday ? (
          <Animated.View entering={FadeIn.duration(150)}>
            <Pressable
              onPress={() => {
                haptics.tap();
                setDay(today());
              }}
              hitSlop={8}
              accessibilityRole="button"
              className="ml-1 min-h-8 justify-center rounded-full bg-raised px-3 active:opacity-60">
              <Text variant="footnote" className="font-inter-medium">
                Today
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
        <View className="flex-1" />
        <SyncBadge />
      </View>

      <DayScoreCard progress={progress} streak={streak} summary={summary.data} isToday={isToday} finished={finished} />

      {scheduledHabits.length > 0 ? (
        <View className="gap-3">
          <SectionHeader
            title="Habits"
            right={
              <Pressable onPress={() => router.push('/habits')} hitSlop={12} accessibilityRole="link">
                <Text variant="footnote" tone="muted">
                  See all
                </Text>
              </Pressable>
            }
          />
          <HabitStrip
            habits={scheduledHabits}
            onCheckIn={checkIn}
            onOpen={(habit) => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
          />
        </View>
      ) : null}

      <View className="gap-3">
        <SectionHeader
          title={isToday ? 'Plan' : `Plan · ${relativeDayName(day)}`}
          right={
            taskList.length > 0 ? (
              <Text variant="footnote" tone={openTasks === 0 ? 'mint' : 'subtle'} className="tabular-nums">
                {openTasks === 0 ? 'All clear' : `${openTasks} left`}
              </Text>
            ) : null
          }
        />
        <Card padded={false} className="overflow-hidden pt-1">
          {firstLoad ? (
            <SkeletonRows count={3} />
          ) : loadFailed ? (
            <ErrorState compact title="Couldn’t load your plan" error={tasks.error} onRetry={() => void tasks.refetch()} />
          ) : (
            <TaskList
              tasks={taskList}
              onToggle={toggleTask}
              onOpen={(task) => router.push({ pathname: '/task/[id]', params: { id: task.id, date: day } })}
              onMore={setMenuTask}
              onReorder={taskActions.reorder}
              onDragChange={setDragging}
            />
          )}
          <AddTask onAdd={taskActions.add} />
        </Card>
        {(summary.data?.deferred.length ?? 0) > 0 ? (
          <View className="flex-row items-center gap-2 px-1">
            <Icon name="arrow-redo-outline" size={13} color="subtle" />
            <Text variant="footnote" tone="subtle" className="flex-1" numberOfLines={2}>
              Moved on, still counted here: {summary.data?.deferred.map((entry) => entry.title).join(', ')}
            </Text>
          </View>
        ) : null}
        {taskList.length === 0 && !tasks.isLoading && !loadFailed ? (
          <Text variant="footnote" tone="subtle" className="px-6 text-center">
            Plan a few things worth doing. Your score is the share you finish, weighted by priority.
          </Text>
        ) : null}
      </View>

      {!isFuture && !progress.empty ? (
        <Animated.View entering={FadeInDown.duration(220)}>
          {finished ? (
            <View className="flex-row items-center gap-3 rounded-card bg-raised py-2 pl-4 pr-2">
              <Icon name="checkmark-circle" size={18} color="mint" />
              <Text variant="callout" className="flex-1">
                Day closed
              </Text>
              <Button
                label="Review"
                size="sm"
                variant="ghost"
                onPress={() => router.push({ pathname: '/day-complete', params: { date: day } })}
              />
              <Button label="Reopen" size="sm" variant="secondary" className="bg-surface" onPress={dayActions.reopen} />
            </View>
          ) : (
            <Pressable
              onPress={() => router.push({ pathname: '/day-complete', params: { date: day } })}
              accessibilityRole="button"
              className="min-h-14 flex-row items-center gap-3 rounded-card border border-hairline bg-raised px-4 active:opacity-70">
              <Icon name="moon" size={18} color="muted" />
              <Text variant="body" className="flex-1 font-inter-semibold">
                {isToday ? 'Finish the day' : `Close out ${relativeDayName(day)}`}
              </Text>
              <Icon name="chevron-forward" size={16} color="subtle" />
            </Pressable>
          )}
        </Animated.View>
      ) : null}

      <Sheet visible={menuTask !== null} onClose={() => setMenuTask(null)} title={menuTask?.title}>
        {menuTask ? (
          <View className="pb-2">
            <ListRow
              icon="create-outline"
              title="Edit"
              onPress={() => {
                setMenuTask(null);
                router.push({ pathname: '/task/[id]', params: { id: menuTask.id, date: day } });
              }}
            />
            <ListRow
              icon={menuTask.completed ? 'ellipse-outline' : 'checkmark-circle-outline'}
              title={menuTask.completed ? 'Mark as not done' : 'Mark as done'}
              onPress={() => {
                toggleTask(menuTask);
                setMenuTask(null);
              }}
            />
            {!menuTask.completed ? (
              <ListRow
                icon="arrow-redo-outline"
                title={isToday ? 'Move to tomorrow' : 'Move to today'}
                onPress={() => {
                  haptics.tap();
                  taskActions.update(menuTask, { date: isToday ? addDays(day, 1) : today() });
                  setMenuTask(null);
                }}
              />
            ) : null}
            <ListRow
              icon="trash-outline"
              title="Delete"
              destructive
              onPress={() => {
                taskActions.remove(menuTask);
                setMenuTask(null);
              }}
            />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}
