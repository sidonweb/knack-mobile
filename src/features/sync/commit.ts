import type { QueryKey } from '@tanstack/react-query';

import { queryClient } from '@/lib/query-client';
import { enqueue, type OutboxOp } from '@/services/sync/outbox';
import { applyHabitOp, applySummaryOp, applyTaskOp } from '@/services/sync/rebase';
import type { HabitDay, Summary, Task } from '@/types/api';

const dayOf = (key: QueryKey) => String(key[1]);

/**
 * The single entry point for writes to the core loop: apply optimistically to every
 * cached day, then queue for the server. Works identically online and offline.
 */
export function commit(op: OutboxOp) {
  for (const [key, tasks] of queryClient.getQueriesData<Task[]>({ queryKey: ['tasks'] })) {
    if (tasks) queryClient.setQueryData(key, applyTaskOp(tasks, dayOf(key), op));
  }
  for (const [key, habits] of queryClient.getQueriesData<HabitDay[]>({ queryKey: ['habits'] })) {
    if (habits) queryClient.setQueryData(key, applyHabitOp(habits, dayOf(key), op));
  }
  for (const [key, summary] of queryClient.getQueriesData<Summary>({ queryKey: ['summary'] })) {
    if (summary) queryClient.setQueryData(key, applySummaryOp(summary, dayOf(key), op));
  }
  enqueue(op);
}
