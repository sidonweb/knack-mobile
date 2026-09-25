import { z } from 'zod';

import type { Day } from '@/lib/dates';
import type { HabitColor } from '@/lib/theme';
import {
  habitDaySchema,
  habitDetailSchema,
  habitSchema,
  outcomeSchema,
  type HabitCategory,
  type HabitFrequency,
  type TaskPriority,
} from '@/types/api';

import { request } from './api/client';

export type HabitFields = {
  name: string;
  description?: string | null;
  icon: string;
  color: HabitColor;
  category: HabitCategory;
  frequency: HabitFrequency;
  daysOfWeek: number[];
  timesPerWeek: number;
  targetCount: number;
  priority: TaskPriority;
};

export type CreateHabitInput = HabitFields & { id: string };
export type UpdateHabitInput = Partial<HabitFields>;

const habitResult = z.object({ habit: habitSchema, outcome: outcomeSchema.nullable() });

export const habitsApi = {
  list: async (date: Day) =>
    (await request('/habits', { query: { date }, schema: z.object({ habits: z.array(habitDaySchema) }) })).habits,

  listArchived: async () =>
    (await request('/habits', { query: { archived: 'true' }, schema: z.object({ habits: z.array(habitSchema) }) }))
      .habits,

  detail: (id: string) => request(`/habits/${id}`, { schema: habitDetailSchema }),

  create: (input: CreateHabitInput) => request('/habits', { method: 'POST', body: input, schema: habitResult }),

  update: (id: string, patch: UpdateHabitInput) =>
    request(`/habits/${id}`, { method: 'PATCH', body: patch, schema: habitResult }),

  archive: (id: string) =>
    request(`/habits/${id}`, { method: 'DELETE', schema: z.object({ outcome: outcomeSchema.nullable() }) }),

  restore: (id: string) => request(`/habits/${id}/restore`, { method: 'POST', schema: habitResult }),

  /** Sets the absolute check-in count for a day (0 clears it). Idempotent. */
  setLog: (habitId: string, date: Day, count: number) =>
    request(`/habits/${habitId}/logs/${date}`, {
      method: 'PUT',
      body: { count },
      schema: z.object({
        log: z.object({ habitId: z.string(), date: z.string(), count: z.number(), completed: z.boolean() }),
        outcome: outcomeSchema,
      }),
    }),
};
