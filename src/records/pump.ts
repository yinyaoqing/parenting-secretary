// 擠奶與母乳庫存（純函式，可用 node 測試）。庫存 = 存進冷藏或冷凍、還沒標「用掉」的擠奶紀錄。
// 只顯示袋數與最早一袋的日期與存放天數；不發提醒。存放天數旁附國健署 333 原則（室溫 3 小時、冷藏 3 天、冷凍 3 個月）。
export type Store = 'feed' | 'fridge' | 'freezer';
export const STORE_LABEL: Record<Store, string> = { feed: '直接餵', fridge: '冷藏', freezer: '冷凍' };
export const STORE_GUIDE_DAYS: Record<'fridge' | 'freezer', number> = { fridge: 3, freezer: 90 };

export interface PumpLike { id: string; type: string; startAt: string; payload: Record<string, unknown> }
export interface Bag { id: string; ml: number; store: 'fridge' | 'freezer'; at: string; days: number; pastGuide: boolean }

export function inventory(events: PumpLike[], now = Date.now()): Record<'fridge' | 'freezer', Bag[]> {
  const used = new Set(events.filter((e) => e.type === 'pump.use').map((e) => String(e.payload.pumpId)));
  const out: Record<'fridge' | 'freezer', Bag[]> = { fridge: [], freezer: [] };
  for (const e of events) {
    if (e.type !== 'feed.pump') continue;
    const store = e.payload.store as Store;
    if (store !== 'fridge' && store !== 'freezer') continue;
    if (used.has(e.id)) continue;
    const days = Math.floor((now - new Date(e.startAt).getTime()) / 86400000);
    out[store].push({ id: e.id, ml: Number(e.payload.ml) || 0, store, at: e.startAt, days, pastGuide: days > STORE_GUIDE_DAYS[store] });
  }
  out.fridge.sort((a, b) => a.at.localeCompare(b.at));
  out.freezer.sort((a, b) => a.at.localeCompare(b.at));
  return out;
}

// 最近用過的奶量，當快捷鍵（不重複，最多 3 個）。
export function recentAmounts(events: { type: string; payload: Record<string, unknown> }[], type: string, fallback: number[], n = 3): number[] {
  const out: number[] = [];
  for (const e of events) {
    if (e.type !== type) continue;
    const ml = Number(e.payload.ml);
    if (ml > 0 && !out.includes(ml)) out.push(ml);
    if (out.length >= n) break;
  }
  for (const f of fallback) { if (out.length >= n) break; if (!out.includes(f)) out.push(f); }
  return out.sort((a, b) => a - b);
}
