// 日期時間顯示與換算（台灣用語）。所有時間以裝置本地時間呈現，儲存仍為 ISO。

export function fmtDateZh(d: Date): string {
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export function fmtMonthDay(d: Date): string {
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export function fmtHm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// 「今天」「昨天」或「10/3」
export function dayLabel(d: Date, now = new Date()): string {
  if (isSameDay(d, now)) return '今天';
  if (isSameDay(d, addDays(now, -1))) return '昨天';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 「今天 14:40」「昨天 23:10」「10 月 3 日 09:00」
export function fmtWhen(d: Date, now = new Date()): string {
  if (isSameDay(d, now)) return `今天 ${fmtHm(d)}`;
  if (isSameDay(d, addDays(now, -1))) return `昨天 ${fmtHm(d)}`;
  return `${fmtMonthDay(d)} ${fmtHm(d)}`;
}

export function minutesAgo(iso: string, now = new Date()): number {
  return Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
}

// 狀態格用的短格式：「剛剛」「35 分前」「2 時 10 分前」
export function sinceShort(iso: string, now = new Date()): string {
  const mins = minutesAgo(iso, now);
  if (mins < 1) return '剛剛';
  if (mins < 60) return `${mins} 分前`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} 時 ${String(m).padStart(2, '0')} 分前` : `${h} 時前`;
}

// 把「時間選擇器」選到的時分套到既有日期上；若結果在未來，視為前一天（半夜補登常見）。
export function applyTime(base: Date, picked: Date, now = new Date()): Date {
  const d = new Date(base);
  d.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  if (d.getTime() > now.getTime() + 60000) d.setDate(d.getDate() - 1);
  return d;
}

// 把「日期選擇器」選到的年月日套到既有時間上。
export function applyDate(base: Date, picked: Date): Date {
  const d = new Date(base);
  d.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
  return d;
}

export function minutesBefore(mins: number, now = new Date()): Date {
  return new Date(now.getTime() - mins * 60000);
}
