// 今天一句的資料層：算處境（昨晚起來幾次、連續一週夜間都有紀錄、檔案裡的處境），挑卡，記住看過的。
import { getSetting, setSetting } from '../db/repo';
import { listEvents } from '../db/events';
import type { Child } from '../db/types';
import { daysSince } from '../util/age';
import { ENCOURAGE } from './bundle';
import { pickCard, type Context, type EncourageCard } from './pick';

const NIGHT_TYPES = ['feed.breast', 'feed.bottle', 'sleep'];
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 昨晚 22:00 到今早 06:00 之間的餵奶次數與醒來（睡眠結束）次數。
function nightWindow(now: Date): [number, number] {
  const end = new Date(now); end.setHours(6, 0, 0, 0);
  if (now.getTime() < end.getTime()) end.setDate(end.getDate() - 1);
  const start = new Date(end); start.setHours(22, 0, 0, 0); start.setDate(start.getDate() - 1);
  return [start.getTime(), end.getTime()];
}

export async function todayCard(child: Child, now = new Date()): Promise<{ card: EncourageCard; nightWakes: number } | null> {
  const today = isoDay(now);
  if (await getSetting('encourage') === '0') return null;
  if (await getSetting(`encourage:dismissed:${child.id}`) === today) return null;

  const since = new Date(now.getTime() - 8 * 86400000).toISOString();
  const evs = await listEvents(child.id, { types: NIGHT_TYPES, from: since, limit: 1000 });
  const [ws, we] = nightWindow(now);
  let nightWakes = 0;
  const nightDays = new Set<string>();
  for (const e of evs) {
    const t = e.type === 'sleep' ? (e.endAt ? new Date(e.endAt).getTime() : null) : new Date(e.startAt).getTime();
    if (t === null) continue;
    if (t >= ws && t < we) nightWakes++;
    const d = new Date(t);
    const h = d.getHours();
    if (h >= 22 || h < 6) { if (h < 6) d.setDate(d.getDate() - 1); nightDays.add(isoDay(d)); }
  }
  const contexts: Context[] = [];
  if (nightWakes >= 4) contexts.push('night');
  if (nightDays.size >= 7) contexts.push('streak');
  for (const k of child.specialContexts) if (k === 'preterm' || k === 'multiple' || k === 'grandparent') contexts.push(k);
  if (child.location === 'daycare' || (child.daycareFrom && daysSince(child.daycareFrom) >= 0 && daysSince(child.daycareFrom) <= 60)) contexts.push('work');

  let recent: string[] = [];
  try { recent = JSON.parse((await getSetting(`encourage:recent:${child.id}`)) || '[]'); } catch { recent = []; }
  const card = pickCard({ ageDays: daysSince(child.birthDate), contexts, nightWakes, date: today, seed: child.id, recent }, ENCOURAGE.cards);
  if (!card) return null;
  const last = await getSetting(`encourage:last:${child.id}`);
  if (last !== `${today}|${card.id}`) {
    await setSetting(`encourage:last:${child.id}`, `${today}|${card.id}`);
    await setSetting(`encourage:recent:${child.id}`, JSON.stringify([card.id, ...recent.filter((x) => x !== card.id)].slice(0, 10)));
  }
  return { card, nightWakes };
}

export async function dismissToday(childId: string, now = new Date()): Promise<void> {
  await setSetting(`encourage:dismissed:${childId}`, isoDay(now));
}
