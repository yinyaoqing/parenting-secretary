// 事件資料層：append-only。修正以 supersedes 指向舊事件；刪除以 deleted_at 墓碑。
// 查詢預設排除已被取代與已刪除的事件。

import { getDb, newId, nowIso } from './index';
import type { Event, EventType } from './types';

type EventRow = {
  id: string;
  child_id: string;
  type: string;
  start_at: string;
  end_at: string | null;
  payload: string;
  recorded_by: string;
  source: 'home' | 'institution';
  supersedes: string | null;
  deleted_at: string | null;
  created_at: string;
};

function rowToEvent(r: EventRow): Event {
  return {
    id: r.id,
    childId: r.child_id,
    type: r.type,
    startAt: r.start_at,
    endAt: r.end_at ?? undefined,
    payload: JSON.parse(r.payload || '{}'),
    recordedBy: r.recorded_by,
    source: r.source,
    supersedes: r.supersedes ?? undefined,
    deletedAt: r.deleted_at ?? undefined,
    createdAt: r.created_at,
  };
}

// 有效事件：未刪除，且沒有被其他有效事件取代。
const ACTIVE_SQL = `
  e.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM events s WHERE s.supersedes = e.id AND s.deleted_at IS NULL)
`;

export interface AddEventInput {
  childId: string;
  type: EventType;
  startAt?: string;
  endAt?: string;
  payload?: Record<string, unknown>;
  recordedBy: string;
  source?: 'home' | 'institution';
  supersedes?: string;
}

export async function addEvent(input: AddEventInput): Promise<Event> {
  const db = await getDb();
  const ev: Event = {
    id: newId(),
    childId: input.childId,
    type: input.type,
    startAt: input.startAt ?? nowIso(),
    endAt: input.endAt,
    payload: input.payload ?? {},
    recordedBy: input.recordedBy,
    source: input.source ?? 'home',
    supersedes: input.supersedes,
    createdAt: nowIso(),
  };
  await db.runAsync(
    `INSERT INTO events (id, child_id, type, start_at, end_at, payload, recorded_by, source, supersedes, deleted_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    ev.id, ev.childId, ev.type, ev.startAt, ev.endAt ?? null, JSON.stringify(ev.payload), ev.recordedBy, ev.source, ev.supersedes ?? null, ev.createdAt,
  );
  return ev;
}

// 補登修正：以新事件取代舊事件，保留歷史。
export async function correctEvent(originalId: string, changes: Partial<Pick<Event, 'startAt' | 'endAt' | 'payload' | 'type'>>, recordedBy: string): Promise<Event> {
  const db = await getDb();
  const row = await db.getFirstAsync<EventRow>('SELECT * FROM events WHERE id = ?', originalId);
  if (!row) throw new Error('event not found');
  const orig = rowToEvent(row);
  return addEvent({
    childId: orig.childId,
    type: changes.type ?? orig.type,
    startAt: changes.startAt ?? orig.startAt,
    endAt: changes.endAt ?? orig.endAt,
    payload: changes.payload ?? orig.payload,
    recordedBy,
    source: orig.source,
    supersedes: orig.id,
  });
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE events SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL', nowIso(), id);
}

// 進行中的事件（例如睡眠、親餵計時）：有 start 沒有 end。同一孩子同一型別只允許一個進行中（計時器單一擁有者）。
export async function openEvent(childId: string, type: EventType): Promise<Event | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<EventRow>(
    `SELECT e.* FROM events e WHERE e.child_id = ? AND e.type = ? AND e.end_at IS NULL AND ${ACTIVE_SQL} ORDER BY e.start_at DESC LIMIT 1`,
    childId, type,
  );
  return row ? rowToEvent(row) : null;
}

export async function closeEvent(id: string, endAt?: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE events SET end_at = ? WHERE id = ? AND end_at IS NULL', endAt ?? nowIso(), id);
}

export interface ListOptions {
  types?: EventType[];
  from?: string;
  to?: string;
  limit?: number;
}

export async function listEvents(childId: string, opts: ListOptions = {}): Promise<Event[]> {
  const db = await getDb();
  const where: string[] = ['e.child_id = ?', ACTIVE_SQL];
  const params: (string | number)[] = [childId];
  if (opts.types?.length) {
    where.push(`e.type IN (${opts.types.map(() => '?').join(',')})`);
    params.push(...opts.types);
  }
  if (opts.from) { where.push('e.start_at >= ?'); params.push(opts.from); }
  if (opts.to) { where.push('e.start_at < ?'); params.push(opts.to); }
  const limit = opts.limit ?? 200;
  const rows = await db.getAllAsync<EventRow>(
    `SELECT e.* FROM events e WHERE ${where.join(' AND ')} ORDER BY e.start_at DESC LIMIT ${Number(limit)}`,
    ...params,
  );
  return rows.map(rowToEvent);
}

export async function lastEvent(childId: string, types: EventType[]): Promise<Event | null> {
  const list = await listEvents(childId, { types, limit: 1 });
  return list[0] ?? null;
}

// 給安全網規則用：最近 N 筆「自發」事件的間隔（分鐘），排除提醒引發的事件。
export async function recentIntervalsMinutes(childId: string, types: EventType[], n = 20): Promise<number[]> {
  const list = await listEvents(childId, { types, limit: n + 1 });
  const spontaneous = list.filter((e) => (e.payload as { startReason?: string }).startReason !== 'reminder');
  const out: number[] = [];
  for (let i = 0; i < spontaneous.length - 1; i++) {
    const a = new Date(spontaneous[i].startAt).getTime();
    const b = new Date(spontaneous[i + 1].startAt).getTime();
    out.push(Math.round((a - b) / 60000));
  }
  return out;
}
