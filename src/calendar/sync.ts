// 同步到手機行事曆（正式安裝版才有；Expo Go 沒有 expo-calendar 原生模組）。
// 開關是「這支手機」的設定，不隨交接同步：家人各自決定要不要寫進自己的行事曆。
// 設定鍵：cal:on（開啟同步的行程 id 陣列）、cal:map（行程 id → 事件 id 與內容指紋）、cal:calendarId。
import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import { listChildren, getSetting, setSetting } from '../db/repo';
import { listScheduleItems } from '../db/schedule';
import { emitDataChange, onDataChange } from '../db/changes';
import { isExpoGo } from '../util/runtime';
import { canSync, reconcile, specHash, toEventSpec, type CalMap } from './plan';

export const CAL_TITLE = '育村';
const CAL_COLOR = '#2F6F5E';

export const calendarSupported = !isExpoGo && (Platform.OS === 'ios' || Platform.OS === 'android');

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try { const v = await getSetting(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}

export async function calSyncIds(): Promise<string[]> { return readJson<string[]>('cal:on', []); }
async function readMap(): Promise<CalMap> { return readJson<CalMap>('cal:map', {}); }

// 已經寫進行事曆的行程：本地通知不再為它們排提前提醒，由行事曆負責（避免響兩次）。
export async function calendarManagedIds(): Promise<Set<string>> {
  if (!calendarSupported) return new Set();
  const map = await readMap();
  return new Set(Object.entries(map).filter(([, m]) => m.eventId && !m.gone).map(([id]) => id));
}

export async function calendarPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (!calendarSupported) return 'denied';
  const p = await Calendar.getCalendarPermissions();
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

// 打開或關閉一筆行程的同步。打開時才請求權限；被拒絕回傳 false。
export async function setItemCalendarSync(itemId: string, on: boolean): Promise<boolean> {
  if (!calendarSupported) return false;
  if (on) {
    const p = await Calendar.requestCalendarPermissions();
    if (!p.granted) return false;
  }
  const ids = new Set(await calSyncIds());
  if (on) ids.add(itemId); else ids.delete(itemId);
  await setSetting('cal:on', JSON.stringify([...ids]));
  await syncCalendar();
  return true;
}

async function ensureCalendar(): Promise<Calendar.ExpoCalendar | 'missing' | null> {
  const id = await getSetting('cal:calendarId');
  if (id) {
    try { return await Calendar.ExpoCalendar.get(id); } catch { return 'missing'; }
  }
  const cal = Platform.OS === 'ios'
    ? await Calendar.createCalendar({ title: CAL_TITLE, color: CAL_COLOR, entityType: Calendar.EntityTypes.EVENT })
    : await Calendar.createCalendar({
      title: CAL_TITLE, name: 'parenting-secretary', color: CAL_COLOR, ownerAccount: CAL_TITLE,
      accessLevel: Calendar.CalendarAccessLevel.OWNER, source: { isLocalAccount: true, name: CAL_TITLE, type: Calendar.SourceType.LOCAL },
    });
  await setSetting('cal:calendarId', cal.id);
  return cal;
}

async function eventExists(eventId: string): Promise<Calendar.ExpoCalendarEvent | null> {
  try { return await Calendar.ExpoCalendarEvent.get(eventId); } catch { return null; }
}

let running: Promise<void> | null = null;

// 對齊行事曆與行程：新增、改了就刪掉重建、關掉或刪除的行程移除事件。
// 使用者在行事曆刪掉的事件不重建；整個「育村」行事曆被刪掉，視為她不要同步了，全部關閉。
export async function syncCalendar(now = new Date()): Promise<void> {
  if (!calendarSupported) return;
  if (running) return running;
  running = (async () => {
    const [ids, map] = await Promise.all([calSyncIds(), readMap()]);
    if (!ids.length && !Object.keys(map).length) return;
    if ((await calendarPermission()) !== 'granted') return;
    const cal = await ensureCalendar();
    if (!cal) return;
    if (cal === 'missing') {
      await Promise.all([setSetting('cal:on', '[]'), setSetting('cal:map', '{}'), setSetting('cal:calendarId', ''), setSetting('cal:notice', 'calendar-deleted')]);
      emitDataChange();
      return;
    }
    const on = new Set(ids);
    const wanted: { item: Parameters<typeof canSync>[0]; childName: string }[] = [];
    for (const c of await listChildren()) {
      for (const it of await listScheduleItems(c.id)) if (on.has(it.id) && canSync(it)) wanted.push({ item: it, childName: c.nickname });
    }
    const byId = new Map(wanted.map((w) => [w.item.id, w]));
    let changed = false;
    const create = async (itemId: string) => {
      const w = byId.get(itemId)!;
      const spec = toEventSpec(w.item, w.childName, now);
      if (!spec) { delete map[itemId]; changed = true; return; } // 已過結束日
      const ev = await cal.createEvent({
        title: spec.title, startDate: spec.startDate, endDate: spec.endDate, location: spec.location, notes: spec.notes,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        alarms: spec.alarmMinutes ? [{ relativeOffset: -spec.alarmMinutes }] : [],
        recurrenceRule: { frequency: Calendar.Frequency.WEEKLY, interval: 1, daysOfTheWeek: spec.weekdays.map((d) => ({ dayOfTheWeek: d + 1 })), endDate: spec.until },
      });
      map[itemId] = { eventId: ev.id, hash: specHash(w.item, w.childName) };
      changed = true;
    };
    for (const a of reconcile(wanted, map)) {
      try {
        if (a.op === 'create') await create(a.itemId);
        else if (a.op === 'update') { const ev = await eventExists(a.eventId); if (ev) await ev.delete(); await create(a.itemId); }
        else if (a.op === 'delete') { if (a.eventId) { const ev = await eventExists(a.eventId); if (ev) await ev.delete(); } delete map[a.itemId]; changed = true; }
        else {
          const m = map[a.itemId];
          if (m?.eventId && !m.gone && !(await eventExists(m.eventId))) { map[a.itemId] = { hash: m.hash, gone: true }; changed = true; }
        }
      } catch { /* 單筆失敗不影響其他行程，下次重試 */ }
    }
    if (changed) { await setSetting('cal:map', JSON.stringify(map)); emitDataChange(); }
  })();
  try { await running; } finally { running = null; }
}

let debounce: ReturnType<typeof setTimeout> | null = null;
export function startAutoCalendarSync(): () => void {
  if (!calendarSupported) return () => undefined;
  const off = onDataChange(() => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => { void syncCalendar().catch(() => undefined); }, 2000);
  });
  void syncCalendar().catch(() => undefined);
  return off;
}

// 行事曆被刪掉後，行程頁顯示一次說明。
export async function takeCalendarNotice(): Promise<string | null> {
  const v = await getSetting('cal:notice');
  if (v) await setSetting('cal:notice', '');
  return v || null;
}
