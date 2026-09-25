import type { Habit, TaskPriority } from '@/types/api';

import { isoWeekday, type Day } from './dates';

/** Local copy of the server's schedule rule, for optimistic edits. */
export function isScheduledOn(habit: Pick<Habit, 'frequency' | 'daysOfWeek'>, day: Day): boolean {
  if (habit.frequency === 'WEEKLY') return true;
  return habit.daysOfWeek.length === 0 || habit.daysOfWeek.includes(isoWeekday(day));
}

const WEEKDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function scheduleLabel(habit: Pick<Habit, 'frequency' | 'daysOfWeek' | 'timesPerWeek'>): string {
  if (habit.frequency === 'WEEKLY') {
    return habit.timesPerWeek === 7 ? 'Every day this week' : `${habit.timesPerWeek}× a week`;
  }
  const days = habit.daysOfWeek;
  if (days.length === 0 || days.length === 7) return 'Every day';
  if (days.join() === '1,2,3,4,5') return 'Weekdays';
  if (days.join() === '6,7') return 'Weekends';
  return days.map((day) => WEEKDAY[day - 1]).join(' · ');
}

export const PRIORITY_OPTIONS: readonly { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'NONE', label: 'Normal' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];
