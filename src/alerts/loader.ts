// 官方疫情提醒（規劃 v0.8 決定 D6-2、紅線 R14）：只轉述疾管署已發布的內容，不自設門檻。
// 內建一份，遠端（GitHub Pages）較新時由 remote/sync.ts 覆蓋。
import bundled from '../../content/alerts/alerts.json';

export interface Alert { id: string; date: string; title: string; quote: string; ageMinDays?: number; ageMaxDays?: number; showDays?: number; source: { name: string; url: string } }
export interface AlertBundle { version: string; checkedAt: string; items: Alert[] }

export const BUNDLED_ALERTS = bundled as unknown as AlertBundle;
let override: AlertBundle | null = null;
export function setAlertsOverride(b: AlertBundle | null): void { override = b; }
export function alertsBundle(): AlertBundle { return override && override.version > BUNDLED_ALERTS.version ? override : BUNDLED_ALERTS; }

// 依孩子年齡與發布日期挑出還在顯示期間的提醒（預設 30 天）。
export function activeAlerts(ageDays: number | null, now = Date.now()): Alert[] {
  return alertsBundle().items.filter((a) => {
    const age = (now - new Date(a.date).getTime()) / 86400000;
    if (age < 0 || age > (a.showDays ?? 30)) return false;
    if (ageDays === null) return true;
    return ageDays >= (a.ageMinDays ?? 0) && ageDays <= (a.ageMaxDays ?? 99999);
  });
}
