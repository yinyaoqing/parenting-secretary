// 公費時程：讀隨 APP 打包的 content/schedule/timeline.json，依孩子出生日算出每一項的時間窗與狀態。
// 之後遠端 JSON 投放時，同一格式覆蓋 bundled 即可（版本比較用 version 欄位）。
import bundled from '../../content/schedule/timeline.json';

export type ScheduleCategory = 'checkup' | 'development' | 'vaccine' | 'dental' | 'school';
export interface ScheduleItem {
  id: string;
  category: ScheduleCategory;
  title: string;
  ageMinDays: number;
  ageMaxDays: number;
  window: string;
  note?: string;
  source: string;
  effectiveFrom?: string;
}
export interface ScheduleSource { name: string; url: string; license: string }
export interface ScheduleBundle { version: string; checkedAt: string; sources: Record<string, ScheduleSource>; items: ScheduleItem[] }

export const BUNDLED_SCHEDULE = bundled as unknown as ScheduleBundle;
let override: ScheduleBundle | null = null;
// 遠端（GitHub Pages）版本較新時由 remote/sync.ts 設定。
export function setScheduleOverride(b: ScheduleBundle | null): void { override = b; }
function activeBundle(): ScheduleBundle { return override && override.version > BUNDLED_SCHEDULE.version ? override : BUNDLED_SCHEDULE; }

export const CATEGORY_LABEL: Record<ScheduleCategory, string> = {
  checkup: '兒童預防保健',
  development: '兒童發展篩檢',
  vaccine: '公費疫苗',
  dental: '牙齒保健',
  school: '學校健康服務',
};

export type ItemStatus = 'open' | 'upcoming' | 'past';

export interface ScheduledEntry {
  item: ScheduleItem;
  status: ItemStatus;
  opensOn: Date; // 時間窗開始的日曆日
  closesOn: Date; // 時間窗結束（不含）的日曆日
  daysUntilOpen: number; // 負數代表已開始
  daysUntilClose: number;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// 以實際出生日計算（疫苗與公費健檢都依實際月齡，不用矯正月齡）。
export function scheduleFor(birthDate: string, now = new Date()): ScheduledEntry[] {
  const birth = new Date(birthDate);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const ageDays = Math.floor((today.getTime() - new Date(birth.getFullYear(), birth.getMonth(), birth.getDate()).getTime()) / 86400000);
  return activeBundle().items
    .filter((it) => !it.effectiveFrom || new Date(it.effectiveFrom).getTime() <= now.getTime())
    .map((item) => {
      const status: ItemStatus = ageDays < item.ageMinDays ? 'upcoming' : ageDays >= item.ageMaxDays ? 'past' : 'open';
      return {
        item,
        status,
        opensOn: addDays(birth, item.ageMinDays),
        closesOn: addDays(birth, item.ageMaxDays),
        daysUntilOpen: item.ageMinDays - ageDays,
        daysUntilClose: item.ageMaxDays - ageDays,
      };
    })
    .sort((a, b) => a.item.ageMinDays - b.item.ageMinDays || a.item.ageMaxDays - b.item.ageMaxDays);
}

export function scheduleMeta(): { version: string; checkedAt: string; sources: ScheduleSource[] } {
  const b = activeBundle();
  return { version: b.version, checkedAt: b.checkedAt, sources: Object.values(b.sources) };
}
