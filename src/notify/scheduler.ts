// 本地通知排程（Expo Go 可用；推播才需要 development build，本 APP 不用推播）。
// 每次資料變動（debounce 1.5 秒）或回到前景時：取消本 APP 排的全部通知，再依 plan.ts 重排。
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { listChildren, getSetting, setSetting } from '../db/repo';
import { firstEventDate, lastEvent, listEvents, recentIntervalsMinutes } from '../db/events';
import { listScheduleItems, getTemplateMode } from '../db/schedule';
import { onDataChange } from '../db/changes';
import { listTimers, purgeDueTimers } from '../db/reminders';
import { calendarManagedIds } from '../calendar/sync';
import { FEATURES } from '../release/profile';
import { safetyNetUpperBound, FEED_TYPES, FEED_CAP_MIN, FEED_PRIOR_MIN, NET_RECENT } from '../records/quick';
import { anchorDate, occurrencesOn, addDaysIso, isoDate, parseDate } from '../timeline/plan';
import { scheduleFor, CATEGORY_LABEL } from '../schedule/loader';
import { daysSince } from '../util/age';
import { planNotifications, firedToday, ignoredStreak, NET_DAILY_CAP, WINDOW_DAYS, type ChildNotifyInput, type FireLog, type NotifyKind, type NotifySettings, type Planned } from './plan';

export const CHANNEL_ID = 'reminders';
const DELAYS_KEY = 'notifyDelays';

export async function getNotifySettings(): Promise<NotifySettings> {
  const [p, a, b, t, c, d] = await Promise.all([getSetting('pausedUntil'), getSetting('notify:safetyNet'), getSetting('notify:medication'), getSetting('notify:timer'), getSetting('notify:schedule'), getSetting('notify:public')]);
  // 用藥間隔通知只在開啟用藥紀錄的版型才存在（src/release/profile.ts）。
  return { paused: !!p && new Date(p).getTime() > Date.now(), safetyNet: a !== '0', medication: FEATURES.medicationLog && b !== '0', timer: t !== '0', schedule: c !== '0', publicSchedule: d !== '0' };
}

async function gather(now: number): Promise<ChildNotifyInput[]> {
  const children = await listChildren();
  const out: ChildNotifyInput[] = [];
  const today = isoDate(new Date(now));
  await purgeDueTimers(now); // 響過的倒數不留
  const inCalendar = await calendarManagedIds(); // 已寫進手機行事曆的行程由行事曆提醒，這裡不重複排
  for (const c of children) {
    const ageDays = daysSince(c.birthDate);
    const [lastFeed, intervals, meds, timers, items, mode, firstSolid] = await Promise.all([
      lastEvent(c.id, FEED_TYPES),
      recentIntervalsMinutes(c.id, FEED_TYPES, NET_RECENT),
      FEATURES.medicationLog ? listEvents(c.id, { types: ['medication'], from: new Date(now - 3 * 86400000).toISOString(), limit: 50 }) : Promise.resolve([]),
      listTimers(c.id, now),
      listScheduleItems(c.id),
      getTemplateMode(c.id),
      firstEventDate(c.id, 'feed.solid'),
    ]);
    // 每種藥只看最後一筆，且有輸入間隔才倒數。
    const lastByName = new Map<string, { name: string; lastAt: string; intervalHours: number }>();
    for (const e of meds) {
      const p = e.payload as { name?: string; intervalHours?: number };
      if (!p.name || !(Number(p.intervalHours) > 0) || lastByName.has(p.name)) continue;
      lastByName.set(p.name, { name: p.name, lastAt: e.startAt, intervalHours: Number(p.intervalHours) });
    }
    const anchorAt = anchorDate(mode.anchor, { birthDate: c.birthDate, daycareFrom: c.daycareFrom, schoolFrom: c.schoolFrom, firstSolidDate: firstSolid ?? undefined });
    const opts = { templatesOn: mode.enabled && !!anchorAt, anchorDate: anchorAt, birthDate: c.birthDate.slice(0, 10) };
    const occurrences: ChildNotifyInput['occurrences'] = [];
    for (let i = 0; i <= WINDOW_DAYS; i++) {
      const date = addDaysIso(today, i);
      const base = parseDate(date).getTime();
      for (const o of occurrencesOn(items, date, opts)) {
        if (o.item.kind === 'routine' || inCalendar.has(o.item.id) || o.startMin !== Number(o.item.time.slice(0, 2)) * 60 + Number(o.item.time.slice(3, 5))) continue;
        occurrences.push({ title: o.item.title, start: base + o.startMin * 60000, leadMinutes: o.item.leadMinutes, location: o.item.location });
      }
    }
    const publicOpens = scheduleFor(c.birthDate, new Date(now)).filter((e) => e.status === 'upcoming').map((e) => {
      const d = new Date(e.opensOn); d.setHours(0, 0, 0, 0);
      return { title: e.item.title, category: CATEGORY_LABEL[e.item.category], window: e.item.window, opensOn: d.getTime() };
    });
    out.push({
      id: c.id, name: c.nickname, ageDays, lastFeedAt: lastFeed?.startAt,
      safetyNetMinutes: safetyNetUpperBound(intervals, FEED_PRIOR_MIN, FEED_CAP_MIN),
      meds: [...lastByName.values()], timers: timers.map((t) => ({ id: t.id, title: t.title, at: new Date(t.dueAt).getTime() })), occurrences, publicOpens,
    });
  }
  return out;
}

export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, { name: '提醒', importance: Notifications.AndroidImportance.HIGH, sound: 'default' });
}

export async function permissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const p = await Notifications.getPermissionsAsync();
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestPermission(): Promise<boolean> {
  await ensureChannel();
  const p = await Notifications.requestPermissionsAsync();
  if (p.granted) void reschedule();
  return p.granted;
}

let running: Promise<Planned[]> | null = null;

// 重排全部通知，回傳排了哪些（通知健康檢查頁用）。
export async function reschedule(): Promise<Planned[]> {
  if (running) return running;
  running = (async () => {
    const now = Date.now();
    // 上一輪排的、時間已過的，視為已響過，記進紀錄（提醒疲勞與每日上限用）。
    const fired = await readLog('notify:fired');
    let last: FireLog[] = [];
    try { last = JSON.parse((await getSetting('notify:lastPlan')) || '[]'); } catch { last = []; }
    const newly = last.filter((x) => x.at <= now && !fired.some((f) => f.kind === x.kind && f.at === x.at));
    const allFired = [...fired, ...newly].slice(-80);
    if (newly.length) await setSetting('notify:fired', JSON.stringify(allFired));
    const settings = await getNotifySettings();
    settings.netCapped = firedToday(allFired, 'safetyNet', now) >= NET_DAILY_CAP;
    const plan = planNotifications(await gather(now), settings, now);
    await setSetting('notify:lastPlan', JSON.stringify(plan.map((x) => ({ kind: x.kind, at: x.at }))));
    if ((await permissionStatus()) !== 'granted') return plan;
    await ensureChannel();
    // 只取消本排程器排的（測試通知保留，才能量準時度）。
    for (const n of await Notifications.getAllScheduledNotificationsAsync()) {
      if ((n.content.data as { kind?: string } | undefined)?.kind !== 'test') await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    for (const p of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: p.key.replace(/[^A-Za-z0-9:_-]/g, '_').slice(0, 120),
        content: { title: p.title, body: p.body, data: { url: p.url, at: p.at, kind: p.kind }, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: CHANNEL_ID },
      });
    }
    return plan;
  })();
  try { return await running; } finally { running = null; }
}

// 送達時記錄延遲（秒），只在 APP 開著時收得到；通知健康檢查頁顯示中位數。
export async function recordDelay(scheduledAt: number): Promise<void> {
  const d = Math.round((Date.now() - scheduledAt) / 1000);
  let list: number[] = [];
  try { list = JSON.parse((await getSetting(DELAYS_KEY)) || '[]'); } catch { list = []; }
  list.push(d);
  await setSetting(DELAYS_KEY, JSON.stringify(list.slice(-50)));
}

export async function getDelays(): Promise<number[]> {
  try { return JSON.parse((await getSetting(DELAYS_KEY)) || '[]'); } catch { return []; }
}

export async function sendTest(seconds = 10): Promise<void> {
  await ensureChannel();
  const at = Date.now() + seconds * 1000;
  await Notifications.scheduleNotificationAsync({
    content: { title: '測試通知', body: `預定 ${new Date(at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 送達。`, data: { url: '/notify', at, kind: 'test' }, sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
  });
}

let debounce: ReturnType<typeof setTimeout> | null = null;
export function startAutoReschedule(): () => void {
  const off = onDataChange(() => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => { void reschedule().catch(() => undefined); }, 1500);
  });
  void reschedule().catch(() => undefined);
  return off;
}

async function readLog(key: string): Promise<FireLog[]> {
  try { return JSON.parse((await getSetting(key)) || '[]'); } catch { return []; }
}

// 點開通知時記一筆，提醒疲勞就從這裡重新計算。
export async function recordTap(kind: string): Promise<void> {
  if (!['safetyNet', 'medication', 'timer', 'schedule', 'public'].includes(kind)) return;
  const tapped = await readLog('notify:tapped');
  await setSetting('notify:tapped', JSON.stringify([...tapped, { kind, at: Date.now() }].slice(-40)));
}

// 連續兩次沒點開、而且還沒問過的提醒種類，首頁問一次要不要關。
export async function fatigueToAsk(): Promise<NotifyKind | null> {
  const [fired, tapped, s] = await Promise.all([readLog('notify:fired'), readLog('notify:tapped'), getNotifySettings()]);
  const on: Record<NotifyKind, boolean> = { safetyNet: s.safetyNet, medication: s.medication, timer: s.timer, schedule: s.schedule, public: s.publicSchedule };
  // 倒數提醒是使用者一則一則自己設的，不問疲勞。
  for (const k of ['safetyNet', 'schedule', 'public', 'medication'] as NotifyKind[]) {
    if (!on[k] || (await getSetting(`notify:asked:${k}`)) === '1') continue;
    if (ignoredStreak(fired, tapped, k) >= 2) return k;
  }
  return null;
}

export const KIND_SETTING: Record<NotifyKind, string> = { safetyNet: 'notify:safetyNet', medication: 'notify:medication', timer: 'notify:timer', schedule: 'notify:schedule', public: 'notify:public' };
export const KIND_NAME: Record<NotifyKind, string> = { safetyNet: '餵奶安全網', medication: '用藥間隔', timer: '倒數提醒', schedule: '行程提前', public: '公費健檢與疫苗' };
