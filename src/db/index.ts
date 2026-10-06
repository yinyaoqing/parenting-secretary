import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';

const DB_NAME = 'parenting-secretary.db';
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(SCHEMA_SQL);
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

async function hasColumn(db: SQLite.SQLiteDatabase, table: string, column: string): Promise<boolean> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    'schema_version',
  );
  const current = row ? Number(row.value) : 0;
  if (current >= SCHEMA_VERSION) return;

  if (current < 2) {
    // v2：事件加 seq、updated_at、tz_offset_min。全新安裝時 SCHEMA_SQL 已含這些欄位，舊資料庫才需要 ALTER。
    for (const [col, type] of [['seq', 'INTEGER'], ['updated_at', 'TEXT'], ['tz_offset_min', 'INTEGER']] as const) {
      if (!(await hasColumn(db, 'events', col))) await db.execAsync(`ALTER TABLE events ADD COLUMN ${col} ${type}`);
    }
    // 既有事件依建立順序補序號（都是本機記的），updated_at 以 created_at 回填。
    await db.execAsync(`
      UPDATE events SET seq = (
        SELECT COUNT(*) FROM events e2
        WHERE e2.created_at < events.created_at OR (e2.created_at = events.created_at AND e2.id < events.id)
      ) + 1 WHERE seq IS NULL;
      UPDATE events SET updated_at = COALESCE(deleted_at, end_at, created_at) WHERE updated_at IS NULL;
    `);
  }

  if (current < 3) {
    if (!(await hasColumn(db, 'children', 'archived_at'))) await db.execAsync('ALTER TABLE children ADD COLUMN archived_at TEXT');
  }

  await db.runAsync(
    'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
    'schema_version',
    String(SCHEMA_VERSION),
  );
}

export function newId(): string {
  // 無帳號、無伺服器：以時間戳加亂數即可，之後若加同步再換 ULID。
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
