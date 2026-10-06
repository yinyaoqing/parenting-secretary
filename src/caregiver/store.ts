// 照顧者打卡只存在這支手機（settings），不交接、不備份：是照顧者自己的狀態，不是孩子的紀錄。
import { getDb } from '../db/index';
import { getSetting, setSetting } from '../db/repo';
import type { CheckIn } from './resources';

const KEY = 'checkin:';

export async function getCheckIns(days = 7): Promise<Record<string, CheckIn>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM settings WHERE key LIKE 'checkin:%' ORDER BY key DESC LIMIT ?", days);
  const out: Record<string, CheckIn> = {};
  for (const r of rows) { try { out[r.key.slice(KEY.length)] = JSON.parse(r.value); } catch { /* 略過壞資料 */ } }
  return out;
}

export async function saveCheckIn(date: string, c: CheckIn): Promise<void> {
  await setSetting(KEY + date, JSON.stringify(c));
}

export async function isPaused(): Promise<boolean> {
  const v = await getSetting('pausedUntil');
  return !!v && new Date(v).getTime() > Date.now();
}

export async function seenInvitation(childId: string, k: string): Promise<boolean> {
  return !!(await getSetting(`careInvite:${childId}:${k}`));
}
export async function markInvitation(childId: string, k: string): Promise<void> {
  await setSetting(`careInvite:${childId}:${k}`, '1');
}
