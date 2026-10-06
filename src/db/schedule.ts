// 行程（計畫層）資料層。刪除用墓碑（deleted_at），交接時讓對方也刪掉；查詢預設排除已刪除。
import { getDb, newId, nowIso } from './index';
import { getSetting, setSetting } from './repo';
import type { ScheduleItem, ScheduleKind } from './types';
import type { Anchor } from '../timeline/plan';

export type ScheduleRow = {
  id: string;
  child_id: string;
  title: string;
  weekdays: string;
  time: string;
  location: string | null;
  lead_minutes: number;
  note: string | null;
  sync_to_device_calendar: number;
  created_at: string;
  kind: string;
  duration_minutes: number | null;
  valid_from: string | null;
  valid_to: string | null;
  period: number | null;
  template_source: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

export function rowToScheduleItem(r: ScheduleRow): ScheduleItem {
  return {
    id: r.id,
    childId: r.child_id,
    title: r.title,
    kind: (r.kind || 'care') as ScheduleKind,
    weekdays: JSON.parse(r.weekdays || '[]'),
    time: r.time,
    durationMinutes: r.duration_minutes ?? undefined,
    location: r.location ?? undefined,
    leadMinutes: r.lead_minutes,
    note: r.note ?? undefined,
    syncToDeviceCalendar: !!r.sync_to_device_calendar,
    validFrom: r.valid_from ?? undefined,
    validTo: r.valid_to ?? undefined,
    period: r.period ?? undefined,
    templateSource: (r.template_source ?? undefined) as ScheduleItem['templateSource'],
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? r.created_at,
    deletedAt: r.deleted_at ?? undefined,
  };
}

export async function listScheduleItems(childId: string): Promise<ScheduleItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ScheduleRow>('SELECT * FROM schedule_items WHERE child_id = ? AND deleted_at IS NULL ORDER BY time ASC', childId);
  return rows.map(rowToScheduleItem);
}

export async function getScheduleItem(id: string): Promise<ScheduleItem | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ScheduleRow>('SELECT * FROM schedule_items WHERE id = ?', id);
  return row ? rowToScheduleItem(row) : null;
}

export type ScheduleInput = Omit<ScheduleItem, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export async function writeScheduleRow(it: ScheduleItem): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO schedule_items (id, child_id, title, weekdays, time, location, lead_minutes, note, sync_to_device_calendar, created_at, kind, duration_minutes, valid_from, valid_to, period, template_source, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET child_id = excluded.child_id, title = excluded.title, weekdays = excluded.weekdays, time = excluded.time, location = excluded.location,
       lead_minutes = excluded.lead_minutes, note = excluded.note, sync_to_device_calendar = excluded.sync_to_device_calendar, kind = excluded.kind,
       duration_minutes = excluded.duration_minutes, valid_from = excluded.valid_from, valid_to = excluded.valid_to, period = excluded.period,
       template_source = excluded.template_source, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at`,
    it.id, it.childId, it.title, JSON.stringify(it.weekdays), it.time, it.location ?? null, it.leadMinutes, it.note ?? null, it.syncToDeviceCalendar ? 1 : 0, it.createdAt,
    it.kind, it.durationMinutes ?? null, it.validFrom ?? null, it.validTo ?? null, it.period ?? null, it.templateSource ?? null, it.updatedAt, it.deletedAt ?? null,
  );
}

export async function saveScheduleItem(input: ScheduleInput, id?: string): Promise<ScheduleItem> {
  const ts = nowIso();
  const cur = id ? await getScheduleItem(id) : null;
  const it: ScheduleItem = { ...input, id: cur?.id ?? newId(), createdAt: cur?.createdAt ?? ts, updatedAt: ts };
  await writeScheduleRow(it);
  return it;
}

export async function deleteScheduleItem(id: string): Promise<void> {
  const db = await getDb();
  const ts = nowIso();
  await db.runAsync('UPDATE schedule_items SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL', ts, ts, id);
}

// 「從這週產生」：先刪掉上一次產生的範本，再寫入新的，家長自建的不動。
export async function replaceDerivedTemplates(childId: string, items: ScheduleInput[]): Promise<void> {
  const db = await getDb();
  const ts = nowIso();
  await db.runAsync("UPDATE schedule_items SET deleted_at = ?, updated_at = ? WHERE child_id = ? AND kind = 'routine' AND template_source = 'derived' AND deleted_at IS NULL", ts, ts, childId);
  for (const i of items) await saveScheduleItem(i);
}

// ---------- 範本顯示設定（每支手機各自決定，不交接） ----------
export interface TemplateMode { enabled: boolean; anchor: Anchor | null }

const key = (childId: string) => `templateMode:${childId}`;

export async function getTemplateMode(childId: string): Promise<TemplateMode> {
  const raw = await getSetting(key(childId));
  if (!raw) return { enabled: false, anchor: null };
  try { return JSON.parse(raw) as TemplateMode; } catch { return { enabled: false, anchor: null }; }
}

export async function setTemplateMode(childId: string, mode: TemplateMode): Promise<void> {
  await setSetting(key(childId), JSON.stringify(mode));
}
