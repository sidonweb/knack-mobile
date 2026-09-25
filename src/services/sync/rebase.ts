import { today, weekStart, type Day } from '@/lib/dates';
import { isScheduledOn } from '@/lib/habits';
import type { HabitDay, Summary, Task } from '@/types/api';

import type { OutboxOp } from './outbox';

/**
 * Re-applies not-yet-synced local writes on top of fresh server data. Without this, a
 * refetch that lands while the outbox is non-empty would visibly undo the user's taps.
 * These are also the optimistic reducers, so optimistic UI and rebasing never disagree.
 */
export function applyTaskOp(tasks: Task[], day: Day, op: OutboxOp): Task[] {
  const now = new Date().toISOString();
  switch (op.kind) {
    case 'task.create': {
      if (op.payload.date !== day || tasks.some((task) => task.id === op.payload.id)) return tasks;
      const completed = op.payload.completed ?? false;
      return [
        ...tasks,
        {
          id: op.payload.id,
          title: op.payload.title,
          notes: op.payload.notes ?? null,
          date: op.payload.date,
          priority: op.payload.priority ?? 'NONE',
          sortOrder: op.payload.sortOrder ?? 0,
          completed,
          completedAt: completed ? now : null,
          createdAt: now,
          updatedAt: now,
        },
      ];
    }
    case 'task.update': {
      const { id, patch, snapshot } = op.payload;
      const { completed, ...rest } = patch;
      const update = (task: Task): Task => ({
        ...task,
        ...rest,
        ...(completed === undefined ? {} : { completed, completedAt: completed ? (task.completedAt ?? now) : null }),
        updatedAt: now,
      });
      // Moved here from another day: the snapshot is all this day's cache knows about it.
      if (snapshot && patch.date === day && !tasks.some((task) => task.id === id)) {
        return [...tasks, update(snapshot)];
      }
      return tasks.map((task) => (task.id === id ? update(task) : task)).filter((task) => task.date === day);
    }
    case 'task.delete':
      return tasks.filter((task) => task.id !== op.payload.id);
    case 'task.reorder': {
      if (op.payload.date !== day) return tasks;
      const position = new Map(op.payload.ids.map((id, index) => [id, index]));
      // Tasks created after the order was captured keep their relative place at the end.
      return tasks.map((task) => ({ ...task, sortOrder: position.get(task.id) ?? op.payload.ids.length + task.sortOrder }));
    }
    default:
      return tasks;
  }
}

/** A check-in flips completion: nudge the habit's streak and week count to match. */
function withCompletion(habit: HabitDay, date: Day, count: number): HabitDay {
  const wasCompleted = date === habit.date ? habit.completed : habit.history.find((entry) => entry.date === date)?.completed;
  const completed = count >= habit.targetCount;
  const next: HabitDay = {
    ...habit,
    ...(date === habit.date ? { count, completed } : {}),
    history: habit.history.map((entry) => (entry.date === date ? { ...entry, completed } : entry)),
  };
  if (wasCompleted === undefined || wasCompleted === completed) return next;

  const delta = completed ? 1 : -1;
  const sameWeek = weekStart(date) === weekStart(habit.date);
  const weekCount = sameWeek ? Math.max(0, habit.weekCount + delta) : habit.weekCount;
  let current = habit.streak.current;
  // Only today's (or this week's) outcome is still open; past changes wait for the server.
  if (habit.frequency === 'DAILY' && date === today()) {
    current = Math.max(0, current + delta);
  } else if (habit.frequency === 'WEEKLY' && sameWeek && weekStart(date) === weekStart(today())) {
    const wasMet = habit.weekCount >= habit.timesPerWeek;
    const isMet = weekCount >= habit.timesPerWeek;
    if (wasMet !== isMet) current = Math.max(0, current + (isMet ? 1 : -1));
  }
  return {
    ...next,
    weekCount,
    streak: { ...habit.streak, current, longest: Math.max(habit.streak.longest, current) },
  };
}

export function applyHabitOp(habits: HabitDay[], day: Day, op: OutboxOp): HabitDay[] {
  switch (op.kind) {
    case 'habitLog.set':
      return habits.map((habit) =>
        habit.id === op.payload.habitId ? withCompletion(habit, op.payload.date, op.payload.count) : habit,
      );
    case 'habit.create': {
      if (habits.some((habit) => habit.id === op.payload.id)) return habits;
      const now = new Date().toISOString();
      return [
        ...habits,
        {
          ...op.payload,
          // Creates queued before categories existed carry none; the server defaults them too.
          category: op.payload.category ?? 'GENERAL',
          description: op.payload.description ?? null,
          sortOrder: habits.length,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
          date: day,
          scheduled: isScheduledOn(op.payload, day),
          count: 0,
          completed: false,
          weekCount: 0,
          streak: { current: 0, longest: 0, unit: op.payload.frequency === 'WEEKLY' ? 'week' : 'day', startedOn: null },
          history: [],
        },
      ];
    }
    case 'habit.update':
      return habits.map((habit) => {
        if (habit.id !== op.payload.id) return habit;
        const next = { ...habit, ...op.payload.patch, updatedAt: new Date().toISOString() };
        return {
          ...next,
          scheduled: isScheduledOn(next, next.date),
          completed: next.count >= next.targetCount,
          streak:
            next.frequency === habit.frequency
              ? next.streak
              : { current: 0, longest: 0, unit: next.frequency === 'WEEKLY' ? 'week' : 'day', startedOn: null },
          history: next.history.map((entry) => ({ ...entry, scheduled: isScheduledOn(next, entry.date) })),
        };
      });
    default:
      return habits;
  }
}

export function applySummaryOp(summary: Summary, day: Day, op: OutboxOp): Summary {
  // Mirrors the server's deferral rule: unfinished work leaving a day that has started
  // still counts against it; coming back cancels that.
  const movedTo = op.kind === 'task.update' ? op.payload.patch.date : undefined;
  if (op.kind === 'task.update' && op.payload.snapshot && movedTo) {
    const { snapshot } = op.payload;
    const rest = summary.deferred.filter((entry) => entry.taskId !== snapshot.id);
    if (movedTo === day) return { ...summary, deferred: rest };
    if (snapshot.date === day && !snapshot.completed && day <= today()) {
      return {
        ...summary,
        deferred: [...rest, { taskId: snapshot.id, title: snapshot.title, priority: snapshot.priority, movedTo }],
      };
    }
    return summary;
  }
  if ((op.kind !== 'day.finish' && op.kind !== 'day.reopen') || op.payload.date !== day) return summary;
  const finishedAt = op.kind === 'day.finish' ? (summary.day.finishedAt ?? new Date().toISOString()) : null;
  return { ...summary, day: { ...summary.day, finishedAt } };
}

export const rebaseTasks = (tasks: Task[], day: Day, ops: OutboxOp[]) =>
  ops.reduce((current, op) => applyTaskOp(current, day, op), tasks);

export const rebaseHabits = (habits: HabitDay[], day: Day, ops: OutboxOp[]) =>
  ops.reduce((current, op) => applyHabitOp(current, day, op), habits);

export const rebaseSummary = (summary: Summary, day: Day, ops: OutboxOp[]) =>
  ops.reduce((current, op) => applySummaryOp(current, day, op), summary);
