// 行程轉成手機行事曆的週期事件（純函式，可用 node 測試）。實際寫入在 sync.ts。
// 只同步固定行程；每天作息範本不同步，否則行事曆會被洗版。
import type { ScheduleItem } from '../db/types.ts';

export interface CalendarEventSpec {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes: string;
  weekdays: number[]; // 0–6，0 = 週日；寫入時換成 expo-calendar 的 1–7
  until?: Date; // 週期結束（含當天）
  alarmMinutes?: number; // 提前幾分鐘提醒
}

export const DEFAULT_DURATION_MIN = 30;
export const CAL_NOTES = '由育兒秘書同步。要修改請回 APP 的行程頁，在這裡改的內容下次同步會被蓋過。';

export function canSync(it: ScheduleItem): boolean {
  return it.kind !== 'routine' && !it.deletedAt && it.weekdays.length > 0;
}

const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

// 第一次發生：從今天或開始日（取晚者）起，第一個落在選定星期的日子。
export function firstOccurrence(it: ScheduleItem, now: Date): Date | null {
  const from = new Date(now); from.setHours(0, 0, 0, 0);
  if (it.validFrom) { const vf = parseYmd(it.validFrom); if (vf > from) from.setTime(vf.getTime()); }
  const [h, m] = it.time.split(':').map(Number);
  for (let i = 0; i < 7; i++) {
    const d = new Date(from); d.setDate(from.getDate() + i);
    if (!it.weekdays.includes(d.getDay())) continue;
    d.setHours(h, m, 0, 0);
    if (it.validTo && d > endOfDay(parseYmd(it.validTo))) return null;
    return d;
  }
  return null;
}

const endOfDay = (d: Date) => { const e = new Date(d); e.setHours(23, 59, 59, 0); return e; };

export function toEventSpec(it: ScheduleItem, childName: string, now: Date): CalendarEventSpec | null {
  if (!canSync(it)) return null;
  const start = firstOccurrence(it, now);
  if (!start) return null;
  const dur = it.durationMinutes && it.durationMinutes > 0 ? it.durationMinutes : DEFAULT_DURATION_MIN;
  return {
    title: `${childName}：${it.title}`,
    startDate: start,
    endDate: new Date(start.getTime() + dur * 60000),
    location: it.location,
    notes: CAL_NOTES,
    weekdays: [...it.weekdays].sort(),
    until: it.validTo ? endOfDay(parseYmd(it.validTo)) : undefined,
    alarmMinutes: it.leadMinutes > 0 ? it.leadMinutes : undefined,
  };
}

// 內容指紋：行程或孩子名字變了才需要更新行事曆事件。不含「今天」，避免每天都重寫。
export function specHash(it: ScheduleItem, childName: string): string {
  return JSON.stringify([childName, it.title, it.time, [...it.weekdays].sort(), it.durationMinutes ?? 0, it.location ?? '', it.leadMinutes, it.validFrom ?? '', it.validTo ?? '']);
}

export interface CalMapEntry { eventId?: string; hash: string; gone?: boolean }
export type CalMap = Record<string, CalMapEntry>;
export type CalAction = { op: 'create'; itemId: string } | { op: 'update'; itemId: string; eventId: string } | { op: 'delete'; itemId: string; eventId?: string } | { op: 'skip'; itemId: string };

// 比對：要同步的行程、目前對應表 → 要做的動作。
// 使用者在行事曆端刪掉的事件（gone）不重建，直到她在 APP 改了那筆行程。
export function reconcile(wanted: { item: ScheduleItem; childName: string }[], map: CalMap): CalAction[] {
  const out: CalAction[] = [];
  const seen = new Set<string>();
  for (const { item, childName } of wanted) {
    seen.add(item.id);
    const h = specHash(item, childName);
    const m = map[item.id];
    if (!m) out.push({ op: 'create', itemId: item.id });
    else if (m.gone) out.push(m.hash === h ? { op: 'skip', itemId: item.id } : { op: 'create', itemId: item.id });
    else if (m.hash !== h && m.eventId) out.push({ op: 'update', itemId: item.id, eventId: m.eventId });
    else out.push({ op: 'skip', itemId: item.id });
  }
  for (const [itemId, m] of Object.entries(map)) if (!seen.has(itemId)) out.push({ op: 'delete', itemId, eventId: m.eventId });
  return out;
}
