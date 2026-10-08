// 紀錄匯出成 CSV（規劃 4.10）：給自己保存或給醫師看。未加密，畫面上會說明。純函式，可用 node 測試。
export interface CsvEvent { childId: string; type: string; startAt: string; endAt?: string; payload: Record<string, unknown>; recordedBy: string }

const esc = (v: unknown): string => {
  const s = v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function eventsToCsv(events: CsvEvent[], names: Record<string, string>, label: (type: string) => string, summary: (e: CsvEvent) => string): string {
  const head = ['孩子', '開始', '結束', '種類', '摘要', '原始資料', '記錄的裝置'];
  const rows = [...events].sort((a, b) => a.startAt.localeCompare(b.startAt)).map((e) => [names[e.childId] ?? e.childId, e.startAt, e.endAt ?? '', label(e.type), summary(e), e.payload, e.recordedBy].map(esc).join(','));
  // 開頭加 BOM，Excel 開中文才不會亂碼。
  return '﻿' + [head.join(','), ...rows].join('\r\n') + '\r\n';
}
