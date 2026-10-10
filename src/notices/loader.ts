// 村長公告：內建一份，遠端（GitHub Pages）較新時由 remote/sync.ts 覆蓋。
import bundled from '../../content/notices/notices.json';
import { selectNotices, type Notice, type NoticeBundle } from './select';

export type { Notice, NoticeBundle };
export const BUNDLED_NOTICES = bundled as unknown as NoticeBundle;
let override: NoticeBundle | null = null;
export function setNoticesOverride(b: NoticeBundle | null): void { override = b; }
export function noticesBundle(): NoticeBundle { return override && override.version > BUNDLED_NOTICES.version ? override : BUNDLED_NOTICES; }

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function activeNotices(county: string | undefined, ageDays: number | null, now = new Date()): Notice[] {
  return selectNotices(noticesBundle(), { today: ymd(now), county, ageDays });
}
