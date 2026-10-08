// 首頁按鈕要顯示哪些（媽媽視角自檢：按鈕跟著餵養方式與年齡變，她也可以自己勾）。純函式，可用 node 測試。
// 安全內容入口不在這裡，任何設定都關不掉（R7）。
// 體溫與用藥入口受送審版型控制（src/release/profile.ts）：personal 版型下不存在，設定頁也不列出。
import { FEATURES } from '../release/profile.ts';

export type HomeKey = 'breast' | 'bottle' | 'pump' | 'solid' | 'diaper' | 'tummy' | 'outdoor' | 'temp' | 'med' | 'timer';
const ALL_HOME_KEYS: HomeKey[] = ['breast', 'bottle', 'pump', 'solid', 'diaper', 'tummy', 'outdoor', 'temp', 'med', 'timer'];
export const KEY_FEATURE: Partial<Record<HomeKey, boolean>> = { temp: FEATURES.healthRecords, med: FEATURES.medicationLog };
export const HOME_KEYS: HomeKey[] = ALL_HOME_KEYS.filter((k) => KEY_FEATURE[k] !== false);
export const HOME_LABEL: Record<HomeKey, string> = { breast: '親餵', bottle: '瓶餵', pump: '擠奶', solid: '副食品', diaper: '尿布', tummy: '清醒趴臥', outdoor: '戶外活動', temp: '體溫', med: '用藥', timer: '倒數提醒' };

export function defaultHome(feeding: string, ageDays: number): Record<HomeKey, boolean> {
  const breastfed = feeding === 'breast' || feeding === 'mixed' || feeding === 'bottle_breastmilk';
  return {
    breast: (feeding === 'breast' || feeding === 'mixed') && ageDays < 730,
    bottle: feeding !== 'breast' && ageDays < 1095,
    pump: breastfed && ageDays < 730,
    solid: ageDays >= 120 && ageDays < 1095,
    diaper: ageDays < 1095,
    tummy: ageDays < 365,
    outdoor: ageDays >= 730, // 國健署近視防治從 2 歲起建議每天戶外活動；只記時間
    temp: FEATURES.healthRecords,
    med: FEATURES.medicationLog,
    timer: true,
  };
}

export function defaultHint(key: HomeKey): string {
  return ({ breast: '親餵或混合餵養、2 歲前', bottle: '瓶餵或配方、3 歲前', pump: '有餵母乳、2 歲前', solid: '滿 4 個月到 3 歲', diaper: '3 歲前', tummy: '1 歲前', outdoor: '滿 2 歲起', temp: '一直顯示', med: '一直顯示', timer: '一直顯示' } as Record<HomeKey, string>)[key];
}

// overrides 來自設定 home:<key>，'1' 顯示、'0' 隱藏、沒有就用預設。版型關閉的鍵不受覆蓋影響，永遠隱藏。
export function resolveHome(feeding: string, ageDays: number, overrides: Partial<Record<HomeKey, string | null>>): Record<HomeKey, boolean> {
  const d = defaultHome(feeding, ageDays);
  const out = { ...d };
  for (const k of HOME_KEYS) { const v = overrides[k]; if (v === '1') out[k] = true; else if (v === '0') out[k] = false; }
  return out;
}
