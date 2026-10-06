// 月齡計算：實際月齡與矯正月齡（早產兒，2 歲前）。

const DAY = 86400000;

export function daysSince(isoDate: string, now = new Date()): number {
  return Math.floor((now.getTime() - new Date(isoDate).getTime()) / DAY);
}

export function ageLabel(days: number): string {
  if (days < 0) return '尚未出生';
  if (days < 14) return `${days} 天`;
  if (days < 90) return `${Math.floor(days / 7)} 週`;
  const months = Math.floor(days / 30.4375);
  if (months < 24) return `${months} 個月`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  // 6 歲以上只顯示歲
  if (years >= 6) return `${years} 歲`;
  return rem ? `${years} 歲 ${rem} 個月` : `${years} 歲`;
}

export function correctedDays(birthDate: string, dueDate: string | undefined, now = new Date()): number | null {
  if (!dueDate) return null;
  const actual = daysSince(birthDate, now);
  const corrected = daysSince(dueDate, now);
  // 2 歲後不再使用矯正月齡。
  if (actual >= 730) return null;
  return corrected;
}
