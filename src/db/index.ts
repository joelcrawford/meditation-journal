import {open, type DB} from '@op-engineering/op-sqlite';
import {MIGRATIONS} from './migrations';

let db: DB;

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

function loadChips(database: DB): void {
  chipMap.clear();
  const result = database.executeSync(
    'SELECT * FROM chips ORDER BY list_name, sort_order',
  );
  (result.rows as unknown as Chip[]).forEach(row => chipMap.set(row.id, row));
}

export function initializeDatabase(): void {
  db = open({name: 'journal.db'});
  db.executeSync('PRAGMA journal_mode=WAL;');
  bootstrapMeta(db);
  runMigrations(db);
  loadChips(db);
}

export function getDb(): DB {
  return db;
}
