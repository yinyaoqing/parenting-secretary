// 時間軸計畫層的純函式（不碰資料庫與 RN，可用 node 測試）。
// 規則來源：設計稿 4 時間軸、docs/dev/timeline-and-tasks.md 擁有者決定（2026-10-06）：
// - 作息範本（routine）須先選起點：滿 N 個月（N ≥ 6）或三種事件之一（開始上托嬰、副食品開始、入園或入學）。
// - 起點之前不畫範本；6 個月前範本只畫睡眠與托育，不排餵奶時間。
// - 範本是參考，不是目標；總時數只顯示紀錄的數字，不評分。
import type { ScheduleItem, ScheduleKind } from '../db/types';

export const MIN_ANCHOR_MONTHS = 6;
export const ANCHOR_MONTH_CHOICES = [6, 9, 12, 18, 24, 36];
export const SIX_MONTHS_DAYS = 183;

export type AnchorEvent = 'daycare' | 'solids' | 'school';
export type Anchor = { type: 'age'; months: number } | { type: 'event'; event: AnchorEvent };
export interface AnchorFacts { birthDate: string; daycareFrom?: string; schoolFrom?: string; firstSolidDate?: string }

export const EVENT_LABEL: Record<AnchorEvent, string> = { daycare: '開始上托嬰', solids: '副食品開始', school: '入園或入學' };

// ---------- 日期 ----------
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function parseDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function addMonthsIso(date: string, months: number): string {
  const d = parseDate(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return isoDate(d);
}
export function addDaysIso(date: string, n: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);
}

// 起點日期；事件還不知道（沒填日期、還沒有副食品紀錄）時回傳 null。
export function anchorDate(anchor: Anchor | null, f: AnchorFacts): string | null {
  if (!anchor) return null;
  if (anchor.type === 'age') return addMonthsIso(f.birthDate, Math.max(MIN_ANCHOR_MONTHS, anchor.months));
  if (anchor.event === 'daycare') return f.daycareFrom ?? null;
  if (anchor.event === 'school') return f.schoolFrom ?? null;
  return f.firstSolidDate ?? null;
}

export function anchorLabel(anchor: Anchor): string {
  return anchor.type === 'age' ? `滿 ${anchor.months} 個月` : EVENT_LABEL[anchor.event];
}

// 事件起點：只列 APP 自己知道的三個（擁有者決定）。
export function eventAnchorOptions(f: AnchorFacts): { event: AnchorEvent; date: string | null; missing: string }[] {
  return [
    { event: 'daycare', date: f.daycareFrom ?? null, missing: '到孩子檔案填入「開始上托嬰的日期」後可選' },
    { event: 'solids', date: f.firstSolidDate ?? null, missing: '記下第一筆副食品後可選' },
    { event: 'school', date: f.schoolFrom ?? null, missing: '到孩子檔案填入「入園或入學的日期」後可選' },
  ];
}

// ---------- 某一天的計畫 ----------
export interface PlanOptions { templatesOn: boolean; anchorDate: string | null; birthDate: string }
export interface Occurrence { item: ScheduleItem; startMin: number; endMin: number } // 當天 0 到 1440 的分鐘；跨午夜的切段

export function hmToMin(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
export function minToHm(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// 範本在這一天是否畫出：開關打開、已到起點；6 個月前不畫任何餵食字樣的範本（0 到 6 個月不排餵奶時間）。
function routineAllowed(item: ScheduleItem, date: string, o: PlanOptions): boolean {
  if (!o.templatesOn || !o.anchorDate || date < o.anchorDate) return false;
  if (daysBetween(o.birthDate, date) < SIX_MONTHS_DAYS && /餵|奶|喝/.test(item.title)) return false;
  return true;
}

function occursOn(item: ScheduleItem, date: string, o: PlanOptions): boolean {
  if (item.deletedAt) return false;
  if (item.validFrom && date < item.validFrom) return false;
  if (item.validTo && date > item.validTo) return false;
  if (!item.weekdays.includes(parseDate(date).getDay())) return false;
  if (item.kind === 'routine' && !routineAllowed(item, date, o)) return false;
  return true;
}

export function occurrencesOn(items: ScheduleItem[], date: string, o: PlanOptions): Occurrence[] {
  const out: Occurrence[] = [];
  const prev = addDaysIso(date, -1);
  for (const item of items) {
    const s = hmToMin(item.time);
    const dur = item.durationMinutes ?? 0;
    if (occursOn(item, date, o)) out.push({ item, startMin: s, endMin: Math.min(1440, s + dur) });
    // 前一天開始、跨過午夜的（例如夜間睡眠 19:30 起 10 小時）
    if (s + dur > 1440 && occursOn(item, prev, o)) out.push({ item, startMin: 0, endMin: s + dur - 1440 });
  }
  return out.sort((a, b) => a.startMin - b.startMin);
}

// ---------- 顯示文字 ----------
const WD = ['日', '一', '二', '三', '四', '五', '六'];
export function weekdaysLabel(days: number[]): string {
  const s = [...new Set(days)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // 週一排第一
  if (s.length === 7) return '每天';
  if (s.length === 0) return '未選星期';
  const key = s.join(',');
  if (key === '1,2,3,4,5') return '一到五';
  if (key === '6,0') return '週末';
  return s.map((d) => WD[d]).join('、');
}
export function weekdayChar(d: number): string { return WD[d]; }

export function durationText(min?: number): string {
  if (!min) return '';
  if (min < 60) return `${min} 分`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} 小時 ${m} 分` : `${h} 小時`;
}

export function leadText(min: number): string {
  if (!min) return '';
  if (min >= 1440) return '前一天提醒';
  return `提前 ${durationText(min)}提醒`;
}

export function scheduleSub(it: ScheduleItem): string {
  const time = it.durationMinutes ? `${it.time} 到 ${minToHm(hmToMin(it.time) + it.durationMinutes)}` : it.time;
  const when = it.kind === 'routine' ? (durationText(it.durationMinutes) || '時間點') : `${weekdaysLabel(it.weekdays)} ${time}`;
  return [when, it.location, leadText(it.leadMinutes)].filter(Boolean).join(' · ');
}

export const KIND_LABEL: Record<ScheduleKind, string> = { routine: '作息', care: '托育', visit: '回診復健', class: '課程', activity: '才藝補習', medication: '服藥' };

// ---------- 從這週產生範本 ----------
export interface SleepSeg { day: string; startMin: number; durMin: number } // startMin 為入睡當天的分鐘
export interface DerivedTemplate { title: string; time: string; durationMinutes: number }

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const round = (n: number, step: number) => Math.round(n / step) * step;

function isNight(s: SleepSeg): boolean {
  const eveningStart = s.startMin >= 18 * 60 || s.startMin < 4 * 60;
  return (eveningStart && s.durMin >= 180) || s.durMin >= 300;
}

// 只取自己紀錄的中位數，不和任何常模比較。少於 3 天有睡眠紀錄就不產生。
export function deriveTemplates(segs: SleepSeg[]): DerivedTemplate[] | null {
  const days = [...new Set(segs.map((s) => s.day))];
  if (days.length < 3) return null;
  const out: DerivedTemplate[] = [];

  // 小睡：每天依入睡時間排序，取最常見的次數，再逐個位置取中位數。
  const napsByDay = days.map((d) => segs.filter((s) => s.day === d && !isNight(s) && s.durMin >= 15 && s.startMin >= 6 * 60 && s.startMin < 19 * 60).sort((a, b) => a.startMin - b.startMin));
  const k = Math.round(median(napsByDay.map((n) => n.length)));
  if (k > 0) {
    let pool = napsByDay.filter((n) => n.length === k);
    if (pool.length < 2) pool = napsByDay.filter((n) => n.length >= k).map((n) => n.slice(0, k));
    if (pool.length >= 2) {
      for (let i = 0; i < k; i++) {
        out.push({ title: '小睡', time: minToHm(round(median(pool.map((n) => n[i].startMin)), 5)), durationMinutes: Math.max(15, round(median(pool.map((n) => n[i].durMin)), 5)) });
      }
    }
  }

  // 夜間睡眠：每天最長的一段；凌晨入睡的加 24 小時再取中位數，避免 23:50 與 00:10 平均成中午。
  const nights = days.map((d) => segs.filter((s) => s.day === d && isNight(s)).sort((a, b) => b.durMin - a.durMin)[0]).filter(Boolean);
  if (nights.length >= 2) {
    const start = median(nights.map((n) => (n.startMin < 12 * 60 ? n.startMin + 1440 : n.startMin)));
    out.push({ title: '夜間睡眠', time: minToHm(round(start, 5)), durationMinutes: round(median(nights.map((n) => n.durMin)), 15) });
  }
  return out.length ? out : null;
}
