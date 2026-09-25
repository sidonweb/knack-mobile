import type { HabitDay, ScoringRules, Task } from '@/types/api';

/**
 * The server's scoring formula, run locally so the score reacts on tap and offline. The
 * server stays authoritative: its result replaces this one once writes sync, and it sends
 * its current weights with every summary (`rules`), so the two can't drift apart.
 */
export const DEFAULT_RULES: ScoringRules = {
  minScore: 60,
  weights: { LOW: 1, NONE: 2, MEDIUM: 3, HIGH: 4 },
};

/** XP per completed task, and how many tasks a day earn it. Mirrors the server's `game.xp`. */
export const TASK_XP = 10;
export const TASK_XP_CAP = 12;

export type DayProgress = {
  /** Weighted 0–100. */
  score: number;
  /** Unweighted share of items fully done, 0–100. */
  percentage: number;
  completed: number;
  total: number;
  /** Tasks not done plus habits due today and not done. */
  remaining: number;
  tasksPlanned: number;
  tasksCompleted: number;
  habitsScheduled: number;
  habitsCompleted: number;
  qualifies: boolean;
  empty: boolean;
};

type ScoredHabit = Pick<HabitDay, 'priority' | 'frequency' | 'scheduled' | 'count' | 'targetCount'>;

export function scoreDay(
  tasks: Pick<Task, 'priority' | 'completed'>[],
  habits: ScoredHabit[],
  rules: ScoringRules = DEFAULT_RULES,
  /** Unfinished tasks carried off the day: planned, never done, and no longer "remaining". */
  deferred: Pick<Task, 'priority'>[] = [],
): DayProgress {
  let earned = 0;
  let possible = 0;

  for (const task of deferred) possible += rules.weights[task.priority];
  for (const task of tasks) {
    const weight = rules.weights[task.priority];
    possible += weight;
    if (task.completed) earned += weight;
  }

  let habitsScheduled = 0;
  let habitsCompleted = 0;
  let habitsDue = 0;
  for (const habit of habits) {
    if (!habit.scheduled) continue;
    const progress = Math.min(habit.count / habit.targetCount, 1);
    // Weekly habits aren't due on any given day; they only count on days they're done.
    if (habit.frequency === 'WEEKLY' && progress < 1) continue;
    const weight = rules.weights[habit.priority];
    habitsScheduled += 1;
    if (progress >= 1) habitsCompleted += 1;
    else habitsDue += 1;
    possible += weight;
    earned += weight * progress;
  }

  const tasksCompleted = tasks.filter((task) => task.completed).length;
  const tasksPlanned = tasks.length + deferred.length;
  const total = tasksPlanned + habitsScheduled;
  const completed = tasksCompleted + habitsCompleted;
  const score = possible === 0 ? 0 : Math.floor((100 * earned) / possible + 1e-9);

  return {
    score,
    percentage: total === 0 ? 0 : Math.floor((100 * completed) / total),
    completed,
    total,
    remaining: tasks.length - tasksCompleted + habitsDue,
    tasksPlanned,
    tasksCompleted,
    habitsScheduled,
    habitsCompleted,
    qualifies: score >= rules.minScore,
    empty: total === 0,
  };
}
