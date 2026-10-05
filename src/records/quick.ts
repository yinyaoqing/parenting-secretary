// 快速紀錄輔助：把常見的一鍵操作包成函式，畫面層只需呼叫。
// 體溫必填量測部位（安全層規則）；餵食可附開始原因（安全網規則用）。
// 每個函式最後一個參數 startAt 可選，供表單補登時間；省略即為現在。

import { addEvent, openEvent, closeEvent } from '../db/events';
import type { Event, FeedStartReason } from '../db/types';

export type TempSite = 'rectal' | 'ear' | 'oral' | 'forehead' | 'axillary';

const by = (recordedBy: string) => ({ recordedBy });

export async function logBreastFeed(childId: string, side: 'L' | 'R' | 'both', minutes: number | undefined, startReason: FeedStartReason, recordedBy: string, startAt?: string): Promise<Event> {
  return addEvent({ childId, type: 'feed.breast', payload: { side, minutes, startReason }, startAt, ...by(recordedBy) });
}

export async function logBottle(childId: string, ml: number, kind: 'breastmilk' | 'formula' | 'cow_milk', startReason: FeedStartReason, recordedBy: string, startAt?: string): Promise<Event> {
  return addEvent({ childId, type: 'feed.bottle', payload: { ml, kind, startReason }, startAt, ...by(recordedBy) });
}

export async function logSolid(childId: string, foods: string[], acceptance: 'ate' | 'tasted' | 'refused', newFood: boolean, recordedBy: string, startAt?: string): Promise<Event> {
  return addEvent({ childId, type: 'feed.solid', payload: { foods, acceptance, newFood }, startAt, ...by(recordedBy) });
}

export async function logDiaper(childId: string, kind: 'wet' | 'dirty' | 'both', recordedBy: string, stoolColor?: string, startAt?: string): Promise<Event> {
  const type = kind === 'wet' ? 'diaper.wet' : kind === 'dirty' ? 'diaper.dirty' : 'diaper.both';
  return addEvent({ childId, type, payload: stoolColor ? { stoolColor } : {}, startAt, ...by(recordedBy) });
}

// 睡眠計時：單一擁有者。已有進行中的睡眠就回傳它，不另開。
export async function startSleep(childId: string, recordedBy: string, startAt?: string): Promise<{ event: Event; alreadyRunning: boolean }> {
  const running = await openEvent(childId, 'sleep');
  if (running) return { event: running, alreadyRunning: true };
  const event = await addEvent({ childId, type: 'sleep', startAt, ...by(recordedBy) });
  return { event, alreadyRunning: false };
}

export async function endSleep(childId: string, wakeReason?: 'self' | 'woken' | 'night_waking'): Promise<Event | null> {
  const running = await openEvent(childId, 'sleep');
  if (!running) return null;
  await closeEvent(running.id);
  return { ...running, endAt: new Date().toISOString(), payload: { ...running.payload, wakeReason } };
}

export async function logTummyTime(childId: string, minutes: number, recordedBy: string, startAt?: string): Promise<Event> {
  return addEvent({ childId, type: 'tummy_time', payload: { minutes }, startAt, ...by(recordedBy) });
}

// 體溫：只記錄數字與部位，不產生任何判斷（紅線 R1）。
export async function logTemperature(childId: string, celsius: number, site: TempSite, recordedBy: string, startAt?: string): Promise<Event> {
  if (!Number.isFinite(celsius) || celsius < 30 || celsius > 45) throw new Error('temperature out of range');
  return addEvent({ childId, type: 'temperature', payload: { celsius, site }, startAt, ...by(recordedBy) });
}

export async function logGrowth(childId: string, kg?: number, cm?: number, headCm?: number, recordedBy = 'device', startAt?: string): Promise<Event> {
  return addEvent({ childId, type: 'growth', payload: { kg, cm, headCm }, startAt, ...by(recordedBy) });
}

// 用藥：藥名與間隔由使用者輸入；APP 不建議劑量（紅線 R6）。
export async function logMedication(childId: string, name: string, doseText: string, intervalHours: number | undefined, recordedBy: string, startAt?: string): Promise<Event> {
  return addEvent({ childId, type: 'medication', payload: { name, doseText, intervalHours }, startAt, ...by(recordedBy) });
}

// 安全網上界：最近間隔的第 90 百分位，與安全上限取較小者（規劃 v0.4 第 6.1 節）。
export function safetyNetUpperBound(intervalsMinutes: number[], priorMinutes: number, safetyCapMinutes: number): number {
  const PRIOR_N = 5;
  const sample = [...intervalsMinutes, ...Array(PRIOR_N).fill(priorMinutes)].sort((a, b) => a - b);
  const idx = Math.min(sample.length - 1, Math.floor(sample.length * 0.9));
  return Math.min(sample[idx], safetyCapMinutes);
}
