import { z } from 'zod';

import type { Day } from '@/lib/dates';
import { outcomeSchema, taskSchema, type TaskPriority } from '@/types/api';

import { request } from './api/client';

const taskResult = z.object({ task: taskSchema, outcome: outcomeSchema.nullable() });

export type CreateTaskInput = {
  id: string;
  title: string;
  date: Day;
  priority?: TaskPriority;
  notes?: string | null;
  sortOrder?: number;
  /** Set when restoring a deleted task (undo). */
  completed?: boolean;
};

export type UpdateTaskInput = Partial<{
  title: string;
  notes: string | null;
  date: Day;
  priority: TaskPriority;
  sortOrder: number;
  completed: boolean;
}>;

export const tasksApi = {
  list: async (from: Day, to: Day = from) =>
    (await request('/tasks', { query: { from, to }, schema: z.object({ tasks: z.array(taskSchema) }) })).tasks,

  create: (input: CreateTaskInput) => request('/tasks', { method: 'POST', body: input, schema: taskResult }),

  update: (id: string, patch: UpdateTaskInput) =>
    request(`/tasks/${id}`, { method: 'PATCH', body: patch, schema: taskResult }),

  remove: (id: string) =>
    request(`/tasks/${id}`, { method: 'DELETE', schema: z.object({ outcome: outcomeSchema.nullable() }) }),

  /** Sets a day's full order. Idempotent; unknown ids are ignored. */
  reorder: (date: Day, ids: string[]) =>
    request('/tasks/reorder', { method: 'POST', body: { date, ids }, schema: z.object({ tasks: z.array(taskSchema) }) }),
};
