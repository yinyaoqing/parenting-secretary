// 進度對照的勾選只存這支手機（設定鍵 progress:<孩子 id>），不隨交接傳出。
import bundled from '../../content/progress/checklist.json';
import { getSetting, setSetting } from '../db/repo';
import type { Mark, ProgressBundle } from './select';

export const PROGRESS = bundled as unknown as ProgressBundle;

export async function progressEnabled(): Promise<boolean> { return (await getSetting('progressOn')) !== '0'; }
export async function setProgressEnabled(on: boolean): Promise<void> { await setSetting('progressOn', on ? '1' : '0'); }

export async function readMarks(childId: string): Promise<Record<string, Mark>> {
  try { return JSON.parse((await getSetting(`progress:${childId}`)) || '{}'); } catch { return {}; }
}
export async function writeMark(childId: string, itemId: string, mark: Mark | null): Promise<Record<string, Mark>> {
  const marks = await readMarks(childId);
  if (mark) marks[itemId] = mark; else delete marks[itemId];
  await setSetting(`progress:${childId}`, JSON.stringify(marks));
  return marks;
}
