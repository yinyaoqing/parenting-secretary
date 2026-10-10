// 遠端資料的安全檢查（純函式，可用 node 測試）。MAS L1 自我檢查（docs/dev/mas-l1-checklist.md）。
// 遠端 JSON 來自 GitHub Pages；萬一倉庫或帳號被入侵，這裡擋住非政府網址與奇怪的檔案路徑，整包不採用、沿用手機上的版本。
// gov.taipei 是臺北市政府的正式網域。
export const isGovUrl = (u: unknown): boolean => typeof u === 'string' && (/^https:\/\/([a-z0-9-]+\.)*(gov|edu)\.tw\//.test(u) || /^https:\/\/([a-z0-9-]+\.)*gov\.taipei\//.test(u));
export const isCdcUrl = (u: unknown): boolean => typeof u === 'string' && /^https:\/\/www\.cdc\.gov\.tw\//.test(u);
export const isSafeDataPath = (p: unknown): boolean => typeof p === 'string' && /^[a-z0-9_-]+\.json$/.test(p);

type WithSource = { source?: { url?: unknown } };
export function policyUrlsSafe(b: { items: WithSource[]; todos: WithSource[] }): boolean {
  return [...b.items, ...b.todos].every((x) => isGovUrl(x.source?.url));
}
export function scheduleUrlsSafe(b: { sources: Record<string, { url?: unknown }> }): boolean {
  return Object.values(b.sources).every((s) => isGovUrl(s.url));
}
export function alertUrlsSafe(b: { items: WithSource[] }): boolean {
  return b.items.every((x) => isCdcUrl(x.source?.url));
}

// 村長公告：每則都要政府網址，且有發布機關與標題。
export function noticeUrlsSafe(b: { items: { url?: unknown; publisher?: unknown; title?: unknown }[] }): boolean {
  return b.items.every((n) => isGovUrl(n.url) && typeof n.publisher === 'string' && !!n.publisher && typeof n.title === 'string' && !!n.title);
}
