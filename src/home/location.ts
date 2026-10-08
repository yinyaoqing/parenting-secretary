// 主要照顧地點（規劃 v1.0 第 3 章）：依年齡列出可選項，建檔與編輯共用。
// 0 到 3 歲：家裡、月子中心、托嬰；2 歲起多幼兒園與共學團；5 歲半起學校（自學生也設籍學校，選共學團或自學）。
import type { Location } from '../db/types';

export const LOCATION_OPTIONS: { key: Location; label: string; minDays?: number; maxDays?: number }[] = [
  { key: 'home', label: '在家' },
  { key: 'postnatal_center', label: '產後護理之家', maxDays: 365 },
  { key: 'daycare', label: '托嬰中心或保母', maxDays: 1095 },
  { key: 'kindergarten', label: '幼兒園', minDays: 730, maxDays: 2557 },
  { key: 'coop', label: '共學團或自學', minDays: 730 },
  { key: 'school', label: '學校', minDays: 2000 },
];

export const LOCATION_LABEL: Record<Location, string> = { home: '在家', postnatal_center: '產後護理之家', daycare: '托嬰中心或保母', kindergarten: '幼兒園', coop: '共學團或自學', school: '學校', other: '其他' };

// 不知道年齡時全部列出；已選的值即使超出年齡也保留，避免編輯時選項消失。
export function locationsForAge(ageDays: number | null, current?: Location) {
  return LOCATION_OPTIONS.filter((l) => l.key === current || ageDays === null || ((l.minDays ?? 0) <= ageDays && ageDays <= (l.maxDays ?? Infinity)));
}
