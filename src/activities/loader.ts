// 本週活動：內建一份，遠端（GitHub Pages）較新時由 remote/sync.ts 覆蓋。
import bundled from '../../content/activities/activities.json';
import { pickWeekly, type Activity, type ActivityBundle } from './select';

export type { Activity, ActivityBundle };
export const BUNDLED_ACTIVITIES = bundled as unknown as ActivityBundle;
let override: ActivityBundle | null = null;
export function setActivitiesOverride(b: ActivityBundle | null): void { override = b; }
export function activitiesBundle(): ActivityBundle { return override && override.version > BUNDLED_ACTIVITIES.version ? override : BUNDLED_ACTIVITIES; }

export function weeklyActivity(childId: string, ageDays: number, now = new Date()): Activity | null {
  return pickWeekly(activitiesBundle(), { ageDays, now, seed: childId });
}
