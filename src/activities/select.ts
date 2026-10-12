// 本週活動（純函式，可用 node 測試）：3 歲以上每週依年齡、月份挑一個親子活動。規劃 v1.0 第 5 章。
// 只推薦政府網站來源的活動；同一個孩子同一週固定同一個，換週才換。
export type ActivitySetting = 'outdoor' | 'indoor' | 'either';
export interface Activity {
  id: string; title: string; body: string; ageMinDays: number; ageMaxDays: number; months: number[] | null;
  setting: ActivitySetting; durationMinutes?: number; cost: 'free' | 'low' | 'ticket'; tips?: string;
  source: { name: string; url: string; license: string }; checkedAt: string;
}
export interface ActivityBundle { version: string; checkedAt: string; items: Activity[] }

export const ACTIVITY_MIN_AGE_DAYS = 1095;

export function fitsActivity(a: Activity, ageDays: number, month: number): boolean {
  return ageDays >= a.ageMinDays && ageDays <= a.ageMaxDays && (!a.months || a.months.includes(month));
}

// ISO 週鍵：同一週（週一起算）同一個值。
export function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - start.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

// 挑一個：先在適合這個月份的裡面挑，沒有就不限月份；雜湊決定，不隨機。
export function pickWeekly(b: ActivityBundle, opts: { ageDays: number; now: Date; seed: string }): Activity | null {
  if (opts.ageDays < ACTIVITY_MIN_AGE_DAYS) return null;
  const month = opts.now.getMonth() + 1;
  const fits = b.items.filter((a) => fitsActivity(a, opts.ageDays, month));
  const pool = fits.length ? fits : b.items.filter((a) => opts.ageDays >= a.ageMinDays && opts.ageDays <= a.ageMaxDays);
  if (!pool.length) return null;
  return pool[hash(`${opts.seed}|${weekKey(opts.now)}`) % pool.length];
}

export const SETTING_LABEL: Record<ActivitySetting, string> = { outdoor: '戶外', indoor: '室內', either: '室內外都行' };
export const COST_LABEL: Record<Activity['cost'], string> = { free: '免費', low: '少量費用', ticket: '門票' };
