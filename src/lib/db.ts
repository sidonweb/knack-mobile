import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

/**
 * Local SQLite database for data the app owns outright. Server data is cached through
 * the TanStack Query persister (see query-client.ts); this file holds the outbox of
 * writes made while offline.
 *
 * Migrations are append-only: add a new entry, never edit a shipped one.
 */
const MIGRATIONS = [
  `CREATE TABLE outbox (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     kind        TEXT    NOT NULL,
     payload     TEXT    NOT NULL,
     created_at  INTEGER NOT NULL,
     attempts    INTEGER NOT NULL DEFAULT 0,
     last_error  TEXT
   );`,
];

/**
 * Durable local storage is a native feature. expo-sqlite on web is alpha, needs a
 * cross-origin-isolated page, and its synchronous API (which the outbox relies on) can time
 * out, so web, a development convenience here, uses in-memory/localStorage fallbacks.
 */
export const sqliteAvailable = Platform.OS !== 'web';

let database: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (database) return database;
  const db = SQLite.openDatabaseSync('rally.db');
  db.execSync('PRAGMA journal_mode = WAL;');

  const version = db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  for (let index = version; index < MIGRATIONS.length; index++) {
    db.withTransactionSync(() => {
      db.execSync(MIGRATIONS[index]!);
      db.execSync(`PRAGMA user_version = ${index + 1}`);
    });
  }
  database = db;
  return db;
}
