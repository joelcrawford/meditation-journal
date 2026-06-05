import {open, type DB} from '@op-engineering/op-sqlite';
import {MIGRATIONS} from './migrations';
import {storage, STORAGE_KEYS} from '../storage/mmkv';

let realDb: DB;
let testDb: DB | undefined;

export interface Chip {
  id: number;
  list_name: string;
  label: string;
  sort_order: number;
  valence_group?: 'settled' | 'unsettled' | 'mixed';
}

export const chipMap = new Map<number, Chip>();

function bootstrapMeta(database: DB): void {
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  database.executeSync(
    `INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '0');`,
  );
}

function runMigrations(database: DB): void {
  const result = database.executeSync(
    "SELECT value FROM meta WHERE key = 'schema_version'",
  );
  const current = parseInt(
    (result.rows[0] as {value: string} | undefined)?.value ?? '0',
    10,
  );

  const pending = MIGRATIONS.filter(m => m.version > current);
  for (const migration of pending) {
    migration.up(database);
    database.executeSync(
      "UPDATE meta SET value = ? WHERE key = 'schema_version'",
      [migration.version.toString()],
    );
  }
}

function loadChipsFrom(database: DB): void {
  chipMap.clear();
  const result = database.executeSync(
    'SELECT * FROM chips ORDER BY list_name, sort_order',
  );
  (result.rows as unknown as Chip[]).forEach(row => chipMap.set(row.id, row));
}

export function initializeDatabase(): void {
  realDb = open({name: 'journal.db'});
  realDb.executeSync('PRAGMA journal_mode=WAL;');
  bootstrapMeta(realDb);
  runMigrations(realDb);
  loadChipsFrom(realDb);
}

export function initializeTestDatabase(): DB {
  if (!testDb) {
    testDb = open({name: 'journal_test.db'});
    testDb.executeSync('PRAGMA journal_mode=WAL;');
  }
  bootstrapMeta(testDb);
  runMigrations(testDb);
  return testDb;
}

export function getDb(): DB {
  if (storage.getString(STORAGE_KEYS.ACTIVE_PROFILE)) {
    // testDb must exist — set by initializeTestDatabase() before ACTIVE_PROFILE is written
    return testDb!;
  }
  return realDb;
}

export function reloadChips(): void {
  loadChipsFrom(getDb());
}
