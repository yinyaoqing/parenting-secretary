// 體制內進度對照表（純函式，可用 node 測試）。規劃 v1.0 第 5.3 節。
// 只呈現官方定義的參考，家長自己勾「會了、還沒、沒教過」；不計分、不算百分比、不和別人比。
export type Mark = 'yes' | 'not_yet' | 'not_taught';
export interface ProgressItem { id: string; grade: number; subject: string; text: string; ref?: string }
export interface ProgressBundle { version: string; source: { name: string; url: string; license: string }; checkedAt: string; items: ProgressItem[] }

export const MARK_LABEL: Record<Mark, string> = { yes: '會了', not_yet: '還沒', not_taught: '沒教過' };

// 體制內年級：9 月 1 日前滿 6 歲者當年 9 月入小一（國民教育法施行細則）。未滿入學年齡回傳 0，超過國小回傳 7。
export function gradeFor(birthDate: string, now: Date): number {
  const [y, m, d] = birthDate.slice(0, 10).split('-').map(Number);
  const schoolYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1; // 學年從 9 月開始
  const entryYear = (m < 9 || (m === 9 && d === 1)) ? y + 6 : y + 7; // 9/1 以前出生，滿 6 歲那年入學
  const g = schoolYear - entryYear + 1;
  return Math.max(0, Math.min(7, g));
}

export function itemsFor(b: ProgressBundle, grade: number): Record<string, ProgressItem[]> {
  const out: Record<string, ProgressItem[]> = {};
  for (const it of b.items) if (it.grade === grade) (out[it.subject] ??= []).push(it);
  return out;
}

// 入口只在有內容、而且孩子在國小年齡時出現；家長關掉就整組不出現。
export function showEntry(b: ProgressBundle, grade: number, enabled: boolean): boolean {
  return enabled && grade >= 1 && grade <= 6 && b.items.some((it) => it.grade === grade);
}
