import { getDb, sqliteAvailable } from '@/lib/db';

export type OutboxRow = { id: number; kind: string; payload: string; attempts: number };

/** Storage behind the outbox: SQLite when available, memory otherwise (non-isolated web). */
type OutboxStore = {
  all(): OutboxRow[];
  insert(kind: string, payload: string): void;
  remove(id: number): void;
  markFailed(id: number, error: string): void;
  clear(): void;
  transaction(fn: () => void): void;
};

const sqliteStore: OutboxStore = {
  all: () => getDb().getAllSync<OutboxRow>('SELECT id, kind, payload, attempts FROM outbox ORDER BY id'),
  insert: (kind, payload) =>
    getDb().runSync('INSERT INTO outbox (kind, payload, created_at) VALUES (?, ?, ?)', kind, payload, Date.now()),
  remove: (id) => getDb().runSync('DELETE FROM outbox WHERE id = ?', id),
  markFailed: (id, error) =>
    getDb().runSync('UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?', error, id),
  clear: () => getDb().runSync('DELETE FROM outbox'),
  transaction: (fn) => getDb().withTransactionSync(fn),
};

function createMemoryStore(): OutboxStore {
  let rows: OutboxRow[] = [];
  let nextId = 1;
  return {
    all: () => [...rows],
    insert: (kind, payload) => void rows.push({ id: nextId++, kind, payload, attempts: 0 }),
    remove: (id) => void (rows = rows.filter((row) => row.id !== id)),
    markFailed: (id) => void (rows = rows.map((row) => (row.id === id ? { ...row, attempts: row.attempts + 1 } : row))),
    clear: () => void (rows = []),
    transaction: (fn) => fn(),
  };
}

export const outboxStore: OutboxStore = sqliteAvailable ? sqliteStore : createMemoryStore();
