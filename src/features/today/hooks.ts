import { useMutation, useQuery } from '@tanstack/react-query';

import { addDays, today, type Day } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { newId } from '@/lib/id';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { DEFAULT_RULES, scoreDay, type DayProgress } from '@/lib/scoring';
import { progressApi } from '@/services/progress';
import { pendingOps } from '@/services/sync/outbox';
import { rebaseSummary, rebaseTasks } from '@/services/sync/rebase';
import type { UpdateTaskInput } from '@/services/tasks';
import { tasksApi } from '@/services/tasks';
import { useToast } from '@/store/toast';
import type { Summary, Task, TaskPriority } from '@/types/api';

import { useHabitsForDay } from '../habits/hooks';
import { useMe } from '../profile/hooks';
import { applyOutcome } from '../sync/apply-outcome';
import { commit } from '../sync/commit';

/** The user's order. Completed tasks stay where they are rather than sinking. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

export function useTasks(day: Day) {
  return useQuery({
    queryKey: queryKeys.tasks(day),
    queryFn: async () => rebaseTasks(await tasksApi.list(day), day, pendingOps()),
    select: sortTasks,
  });
}

export function useSummary(day: Day) {
  return useQuery({
    queryKey: queryKeys.summary(day),
    queryFn: async () => rebaseSummary(await progressApi.summary(day), day, pendingOps()),
  });
}

/**
 * The day's score computed locally with the server's formula and weights, so the ring
 * reacts on tap and offline. The server's value replaces it once writes sync.
 */
export function useDayProgress(day: Day): DayProgress {
  const tasks = useTasks(day).data ?? [];
  const habits = useHabitsForDay(day).data ?? [];
  const summary = useSummary(day).data;
  return scoreDay(tasks, habits, summary?.rules ?? DEFAULT_RULES, summary?.deferred ?? []);
}

export type StreakDisplay = {
  /** The streak including today's local progress. */
  current: number;
  /** What the streak would be without today. */
  base: number;
  longest: number;
  /** Today already counts towards the streak. */
  secured: boolean;
  /** Today is a rest day (only meaningful until it's secured). */
  resting: boolean;
  minScore: number;
};

/**
 * The server's streak with today's optimistic progress folded in: crossing the threshold
 * lights the streak up immediately, before (or without) a round trip.
 */
export function useStreakDisplay(day: Day, progress: DayProgress): StreakDisplay {
  const summary = useSummary(day).data;
  const me = useMe().data;
  const minScore = summary?.rules.minScore ?? DEFAULT_RULES.minScore;
  const serverCurrent = summary?.streak.current ?? me?.currentStreak ?? 0;
  const longest = summary?.streak.longest ?? me?.longestStreak ?? 0;

  if (day !== today() || !summary) {
    return { current: serverCurrent, base: serverCurrent, longest, secured: false, resting: false, minScore };
  }
  const base = Math.max(0, serverCurrent - (summary.day.qualifies ? 1 : 0));
  const current = base + (progress.qualifies ? 1 : 0);
  return {
    current,
    base,
    longest: Math.max(longest, current),
    secured: progress.qualifies,
    resting: summary.restDay !== null,
    minScore,
  };
}

function cachedTasks(day: Day) {
  return queryClient.getQueryData<Task[]>(queryKeys.tasks(day)) ?? [];
}

export function useTaskActions(day: Day) {
  const showToast = useToast((state) => state.show);

  const remove = (task: Task) => {
    haptics.impact();
    commit({ kind: 'task.delete', payload: { id: task.id } });
    showToast({
      message: 'Task deleted',
      actionLabel: 'Undo',
      // Recreating with the same id is safe: creates are idempotent, and the delete has
      // either already landed or is ahead of this in the queue.
      onAction: () =>
        commit({
          kind: 'task.create',
          payload: {
            id: task.id,
            title: task.title,
            notes: task.notes,
            date: task.date,
            priority: task.priority,
            sortOrder: task.sortOrder,
            completed: task.completed,
          },
        }),
    });
  };

  return {
    add: (title: string, priority: TaskPriority = 'NONE') => {
      haptics.tap();
      const sortOrder = cachedTasks(day).reduce((max, task) => Math.max(max, task.sortOrder), -1) + 1;
      commit({ kind: 'task.create', payload: { id: newId(), title, date: day, priority, sortOrder } });
    },
    toggle: (task: Task) => {
      if (task.completed) haptics.tap();
      else haptics.light();
      commit({ kind: 'task.update', payload: { id: task.id, patch: { completed: !task.completed } } });
    },
    update: (task: Task, patch: UpdateTaskInput) => {
      if (patch.date && patch.date !== task.date) {
        const target = cachedTasks(patch.date);
        const sortOrder = target.reduce((max, other) => Math.max(max, other.sortOrder), -1) + 1;
        commit({ kind: 'task.update', payload: { id: task.id, patch: { sortOrder, ...patch }, snapshot: task } });
        return;
      }
      commit({ kind: 'task.update', payload: { id: task.id, patch } });
    },
    /** `ids` is the new order of all the day's tasks. */
    reorder: (ids: string[]) => {
      commit({ kind: 'task.reorder', payload: { date: day, ids } });
    },
    remove,
  };
}

export function useDayActions(day: Day) {
  return {
    /** Closes the day, optionally carrying unfinished tasks to the top of tomorrow. */
    finish: ({ rollover }: { rollover: Task[] }) => {
      haptics.success();
      const tomorrow = addDays(day, 1);
      rollover.forEach((task, index) =>
        commit({
          kind: 'task.update',
          payload: { id: task.id, patch: { date: tomorrow, sortOrder: index - rollover.length }, snapshot: task },
        }),
      );
      commit({ kind: 'day.finish', payload: { date: day } });
    },
    reopen: () => {
      haptics.tap();
      commit({ kind: 'day.reopen', payload: { date: day } });
    },
  };
}

/** Rest days are planned deliberately and rarely, so they're online and server-confirmed. */
export function useRestDay(day: Day) {
  const refresh = (restDaysLeftThisWeek: number, restDay: Summary['restDay']) => {
    queryClient.setQueryData<Summary>(queryKeys.summary(day), (old) =>
      old ? { ...old, restDay, restDaysLeftThisWeek } : old,
    );
    void queryClient.invalidateQueries({ queryKey: queryKeys.streaks });
  };
  return useMutation({
    mutationFn: ({ rest }: { rest: boolean }) => (rest ? progressApi.planRestDay(day) : progressApi.cancelRestDay(day)),
    onSuccess: (result, { rest }) => {
      haptics.success();
      refresh(result.restDaysLeftThisWeek, rest ? { kind: 'REST' } : null);
      applyOutcome(result.outcome);
    },
  });
}
