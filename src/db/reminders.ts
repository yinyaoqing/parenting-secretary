// 倒數提醒（kind = 'timer'）：標題、起算時間與間隔都由使用者輸入，APP 不解讀標題內容、不給任何範本。
// 時間一到發一則通知；過期的在下次重排時刪除，不留歷史（送審版型 personal 的設計，見 src/release/profile.ts）。
import { getDb, newId, nowIso } from './index';
import { emitDataChange } from './changes';
import type { Reminder } from './types';

type Row = { id: string; child_id: string; kind: string; title: string; body: string; due_at: string; interval_minutes: number | null; enabled: number; created_at: string };

const rowToReminder = (r: Row): Reminder => ({
  id: r.id, childId: r.child_id, kind: r.kind as Reminder['kind'], title: r.title, body: r.body, dueAt: r.due_at,
  intervalMinutes: r.interval_minutes ?? undefined, enabled: r.enabled === 1, createdAt: r.created_at,
});

export async function addTimer(childId: string, title: string, fromIso: string, intervalMinutes: number): Promise<Reminder> {
  if (!(intervalMinutes > 0)) throw new Error('interval must be positive');
  const db = await getDb();
  const dueAt = new Date(new Date(fromIso).getTime() + intervalMinutes * 60000).toISOString();
  const r: Reminder = { id: newId(), childId, kind: 'timer', title: title.trim(), body: '', dueAt, intervalMinutes, enabled: true, createdAt: nowIso() };
  await db.runAsync(
    'INSERT INTO reminders (id, child_id, kind, title, body, due_at, interval_minutes, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)',
    r.id, r.childId, r.kind, r.title, r.body, r.dueAt, r.intervalMinutes ?? null, r.createdAt,
  );
  emitDataChange();
  return r;
}

// 還沒到時間的倒數，近的在前。
export async function listTimers(childId: string, now = Date.now()): Promise<Reminder[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>('SELECT * FROM reminders WHERE child_id = ? AND kind = ? AND enabled = 1 AND due_at > ? ORDER BY due_at ASC', childId, 'timer', new Date(now).toISOString());
  return rows.map(rowToReminder);
}

export async function deleteReminder(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM reminders WHERE id = ?', id);
  emitDataChange();
}

// 已到時間的倒數直接刪掉。回傳刪了幾筆；不觸發變動通知，因為呼叫端就是排程器。
export async function purgeDueTimers(now = Date.now()): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync('DELETE FROM reminders WHERE kind = ? AND due_at <= ?', 'timer', new Date(now).toISOString());
  return res.changes ?? 0;
}
