import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Day } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { newId } from '@/lib/id';
import { queryKeys } from '@/lib/query-keys';
import { habitsApi, type HabitFields, type UpdateHabitInput } from '@/services/habits';
import { pendingOps } from '@/services/sync/outbox';
import { rebaseHabits } from '@/services/sync/rebase';
import type { HabitDay } from '@/types/api';

import { applyOutcome } from '../sync/apply-outcome';
import { commit } from '../sync/commit';

export function useHabitsForDay(day: Day) {
  return useQuery({
    queryKey: queryKeys.habits(day),
    queryFn: async () => rebaseHabits(await habitsApi.list(day), day, pendingOps()),
  });
}

export function useHabitDetail(id: string) {
  return useQuery({ queryKey: queryKeys.habit(id), queryFn: () => habitsApi.detail(id), enabled: Boolean(id) });
}

export function useArchivedHabits() {
  return useQuery({ queryKey: queryKeys.archivedHabits, queryFn: habitsApi.listArchived });
}

export function useHabitActions(day: Day) {
  return {
    /** Tap to add a check-in; tapping a completed habit resets it. */
    checkIn: (habit: HabitDay) => {
      const count = habit.completed ? 0 : habit.count + 1;
      if (count === 0) haptics.tap();
      else haptics.light();
      commit({ kind: 'habitLog.set', payload: { habitId: habit.id, date: day, count } });
    },
    create: (input: HabitFields) => {
      haptics.success();
      commit({ kind: 'habit.create', payload: { ...input, id: newId() } });
    },
    update: (id: string, patch: UpdateHabitInput) => {
      haptics.success();
      commit({ kind: 'habit.update', payload: { id, patch } });
    },
  };
}

/** Archiving is rare and destructive-feeling, so it's online-only and confirmed by the server. */
export function useArchiveHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => habitsApi.archive(id),
    onSuccess: ({ outcome }, id) => {
      queryClient.setQueriesData<HabitDay[]>({ queryKey: ['habits'] }, (old) => old?.filter((habit) => habit.id !== id));
      void queryClient.invalidateQueries({ queryKey: queryKeys.archivedHabits });
      void queryClient.invalidateQueries({ queryKey: queryKeys.habit(id) });
      if (outcome) applyOutcome(outcome);
    },
  });
}

export function useRestoreHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => habitsApi.restore(id),
    onSuccess: ({ outcome }, id) => {
      haptics.success();
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.archivedHabits });
      void queryClient.invalidateQueries({ queryKey: queryKeys.habit(id) });
      if (outcome) applyOutcome(outcome);
    },
  });
}
