import { getDb, newId, nowIso } from './index';
import type { Child, StyleProfile, StyleAxis } from './types';
import { emitDataChange } from './changes';

type ChildRow = {
  id: string;
  nickname: string;
  birth_date: string;
  due_date: string | null;
  feeding_method: Child['feedingMethod'];
  location: Child['location'];
  location_until: string | null;
  special_contexts: string;
  created_at: string;
  updated_at: string;
  daycare_from?: string | null;
  school_from?: string | null;
  county?: string | null;
};

function rowToChild(r: ChildRow): Child {
  return {
    id: r.id,
    nickname: r.nickname,
    birthDate: r.birth_date,
    dueDate: r.due_date ?? undefined,
    feedingMethod: r.feeding_method,
    location: r.location,
    locationUntil: r.location_until ?? undefined,
    specialContexts: JSON.parse(r.special_contexts || '[]'),
    daycareFrom: r.daycare_from ?? undefined,
    schoolFrom: r.school_from ?? undefined,
    county: r.county ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// 只列未封存的孩子。封存的孩子與其紀錄仍在資料庫，不顯示。
export async function listChildren(): Promise<Child[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ChildRow>('SELECT * FROM children WHERE archived_at IS NULL ORDER BY created_at ASC');
  return rows.map(rowToChild);
}

export async function getChild(id: string): Promise<Child | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ChildRow>('SELECT * FROM children WHERE id = ?', id);
  return row ? rowToChild(row) : null;
}

export async function updateChild(id: string, patch: Partial<Omit<Child, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  const db = await getDb();
  const cur = await getChild(id);
  if (!cur) throw new Error('child not found');
  const next = { ...cur, ...patch };
  await db.runAsync(
    `UPDATE children SET nickname = ?, birth_date = ?, due_date = ?, feeding_method = ?, location = ?, location_until = ?, special_contexts = ?, daycare_from = ?, school_from = ?, county = ?, updated_at = ? WHERE id = ?`,
    next.nickname, next.birthDate, next.dueDate ?? null, next.feedingMethod, next.location, next.locationUntil ?? null, JSON.stringify(next.specialContexts ?? []), next.daycareFrom ?? null, next.schoolFrom ?? null, next.county ?? null, nowIso(), id,
  );
  emitDataChange();
}

export async function archiveChild(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE children SET archived_at = ?, updated_at = ? WHERE id = ?', nowIso(), nowIso(), id);
  emitDataChange();
}

export async function listArchivedChildren(): Promise<Child[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ChildRow>('SELECT * FROM children WHERE archived_at IS NOT NULL ORDER BY archived_at DESC');
  return rows.map(rowToChild);
}

export async function unarchiveChild(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE children SET archived_at = NULL, updated_at = ? WHERE id = ?', nowIso(), id);
  emitDataChange();
}

export async function createChild(input: Omit<Child, 'id' | 'createdAt' | 'updatedAt'>): Promise<Child> {
  const db = await getDb();
  const id = newId();
  const ts = nowIso();
  await db.runAsync(
    `INSERT INTO children (id, nickname, birth_date, due_date, feeding_method, location, location_until, special_contexts, county, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.nickname,
    input.birthDate,
    input.dueDate ?? null,
    input.feedingMethod,
    input.location,
    input.locationUntil ?? null,
    JSON.stringify(input.specialContexts ?? []),
    input.county ?? null,
    ts,
    ts,
  );
  emitDataChange();
  return { ...input, id, createdAt: ts, updatedAt: ts };
}

export async function getStyleProfile(childId: string): Promise<StyleProfile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ child_id: string; preset: StyleProfile['preset']; axes: string; updated_at: string }>(
    'SELECT * FROM style_profiles WHERE child_id = ?',
    childId,
  );
  if (!row) return null;
  return { childId: row.child_id, preset: row.preset, axes: JSON.parse(row.axes), updatedAt: row.updated_at };
}

export async function saveStyleProfile(childId: string, preset: StyleProfile['preset'], axes: Record<StyleAxis, number>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO style_profiles (child_id, preset, axes, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(child_id) DO UPDATE SET preset = excluded.preset, axes = excluded.axes, updated_at = excluded.updated_at`,
    childId,
    preset,
    JSON.stringify(axes),
    nowIso(),
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
  if (key === 'pausedUntil' || key === 'activeChildId' || key.startsWith('notify:') || key.startsWith('templateMode:')) emitDataChange();
}
