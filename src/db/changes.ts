// 資料變動通知：寫入紀錄、行程、設定後發出，通知排程器重算（debounce 在訂閱端）。
type Fn = () => void;
const subs = new Set<Fn>();

export function onDataChange(fn: Fn): () => void {
  subs.add(fn);
  return () => { subs.delete(fn); };
}

export function emitDataChange(): void {
  for (const fn of subs) {
    try { fn(); } catch { /* 訂閱者自己處理錯誤 */ }
  }
}
