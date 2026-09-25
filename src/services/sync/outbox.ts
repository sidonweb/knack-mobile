import type { Outcome, Task } from '@/types/api';

import { ApiError, isNetworkError } from '../api/errors';
import { habitsApi, type CreateHabitInput, type UpdateHabitInput } from '../habits';
import { progressApi } from '../progress';
import { tasksApi, type CreateTaskInput, type UpdateTaskInput } from '../tasks';
import { outboxStore, type OutboxRow } from './outbox-store';

/**
 * Durable queue of writes to the core loop (tasks, habits, check-ins). Every write goes
 * through here, online or not: it is persisted first, applied optimistically by the
 * caller, then replayed to the server in order. All operations are idempotent server-side,
 * so replaying after a crash mid-flush is safe.
 */
export type OutboxOp =
  | { kind: 'task.create'; payload: CreateTaskInput }
  | {
      kind: 'task.update';
      /** `snapshot` (never sent) lets a task moved to another day appear in that day's cache. */
      payload: { id: string; patch: UpdateTaskInput; snapshot?: Task };
    }
  | { kind: 'task.delete'; payload: { id: string } }
  | { kind: 'task.reorder'; payload: { date: string; ids: string[] } }
  | { kind: 'habit.create'; payload: CreateHabitInput }
  | { kind: 'habit.update'; payload: { id: string; patch: UpdateHabitInput } }
  | { kind: 'habitLog.set'; payload: { habitId: string; date: string; count: number } }
  | { kind: 'day.finish'; payload: { date: string } }
  | { kind: 'day.reopen'; payload: { date: string } };

/**
 * Ops that carry absolute state, so a newer one makes older ones with the same key obsolete.
 * Collapsing them keeps the queue short after a long offline stretch.
 */
function supersedeKey(kind: string, payload: unknown): string | null {
  const value = payload as { habitId?: string; date?: string };
  switch (kind) {
    case 'habitLog.set':
      return `log:${value.habitId}:${value.date}`;
    case 'task.reorder':
      return `order:${value.date}`;
    case 'day.finish':
    case 'day.reopen':
      return `finish:${value.date}`;
    default:
      return null;
  }
}

type Listeners = {
  onOutcome?: (outcome: Outcome) => void;
  /** Fired when the queue empties after a flush that sent at least one op. */
  onDrained?: () => void;
  onChange?: (pending: number) => void;
  onDropped?: (op: OutboxOp, error: ApiError) => void;
};

let listeners: Listeners = {};
let flushing: Promise<void> | null = null;

export function setOutboxListeners(next: Listeners) {
  listeners = next;
}

const rows = () => outboxStore.all();

function toOp(row: OutboxRow): OutboxOp {
  return { kind: row.kind, payload: JSON.parse(row.payload) } as OutboxOp;
}

/** Pending ops, oldest first. Synchronous so query functions can rebase onto them. */
export function pendingOps(): OutboxOp[] {
  return rows().map(toOp);
}

export function pendingCount(): number {
  return rows().length;
}

export function enqueue(op: OutboxOp) {
  outboxStore.transaction(() => {
    const key = supersedeKey(op.kind, op.payload);
    if (key) {
      for (const row of rows()) {
        if (supersedeKey(row.kind, JSON.parse(row.payload)) === key) outboxStore.remove(row.id);
      }
    }
    outboxStore.insert(op.kind, JSON.stringify(op.payload));
  });
  listeners.onChange?.(pendingCount());
  void flush();
}

async function execute(op: OutboxOp): Promise<Outcome | null> {
  switch (op.kind) {
    case 'task.create':
      return (await tasksApi.create(op.payload)).outcome;
    case 'task.update':
      return (await tasksApi.update(op.payload.id, op.payload.patch)).outcome;
    case 'task.delete':
      return (await tasksApi.remove(op.payload.id)).outcome;
    case 'task.reorder':
      await tasksApi.reorder(op.payload.date, op.payload.ids);
      return null;
    case 'habit.create':
      return (await habitsApi.create(op.payload)).outcome;
    case 'habit.update':
      return (await habitsApi.update(op.payload.id, op.payload.patch)).outcome;
    case 'habitLog.set':
      return (await habitsApi.setLog(op.payload.habitId, op.payload.date, op.payload.count)).outcome;
    case 'day.finish':
      await progressApi.finishDay(op.payload.date);
      return null;
    case 'day.reopen':
      await progressApi.reopenDay(op.payload.date);
      return null;
  }
}

async function drain() {
  let sent = 0;
  for (let row = rows()[0]; row; row = rows()[0]) {
    const op = toOp(row);
    try {
      const outcome = await execute(op);
      outboxStore.remove(row.id);
      sent++;
      if (outcome) listeners.onOutcome?.(outcome);
    } catch (error) {
      const permanent =
        error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 429;
      if (permanent) {
        // The server will never accept this op (e.g. the task was deleted elsewhere). Drop it
        // so it doesn't block everything behind it; the drain refetch restores true state.
        outboxStore.remove(row.id);
        listeners.onDropped?.(op, error);
        sent++;
        continue;
      }
      if (__DEV__ && !isNetworkError(error)) console.warn(`Outbox: ${op.kind} failed, will retry`, error);
      outboxStore.markFailed(row.id, isNetworkError(error) ? 'offline' : String(error));
      break;
    } finally {
      listeners.onChange?.(pendingCount());
    }
  }
  if (sent > 0 && pendingCount() === 0) listeners.onDrained?.();
}

/** Sends queued ops in order. Stops at the first transient failure and retries on the next flush. */
export function flush(): Promise<void> {
  // Clear the handle in .finally(), never inside drain(): with an empty queue drain() finishes
  // synchronously, and resetting it there would run *before* this assignment, leaving a
  // settled promise behind that turns every later flush into a no-op.
  flushing ??= drain().finally(() => {
    flushing = null;
  });
  return flushing;
}

export function clearOutbox() {
  outboxStore.clear();
  listeners.onChange?.(0);
}
