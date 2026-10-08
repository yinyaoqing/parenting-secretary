// 資料模型：對應規劃文件 v0.4 第 7.1 章「18 歲架構」。
// 原則：孩子為根；事件為 append-only 加墓碑；提醒、行程、內容卡、公費資源皆以孩子出生日推算。

export type ChildId = string;
export type EventId = string;

export type FeedingMethod = 'breast' | 'bottle_breastmilk' | 'formula' | 'mixed';
export type Location = 'home' | 'postnatal_center' | 'daycare' | 'other';

export interface Child {
  id: ChildId;
  nickname: string;
  birthDate: string; // ISO date
  dueDate?: string; // 早產兒矯正月齡用
  feedingMethod: FeedingMethod;
  location: Location;
  locationUntil?: string; // 產後護理之家預定出所日，內容與提醒從此日開始
  specialContexts: string[]; // 'preterm' | 'multiple' | 'dev_concern' | 'disability_chronic' | 'new_immigrant' | 'grandparent' | ...
  daycareFrom?: string; // 開始上托嬰的日期（作息範本的事件起點）
  schoolFrom?: string; // 入園或入學的日期（作息範本的事件起點）
  createdAt: string;
  updatedAt: string;
}

// 事件型別以字串列舉，方便 18 歲前擴充（課表、服藥、復健等）。
export type EventType =
  | 'feed.breast'
  | 'feed.bottle'
  | 'feed.solid'
  | 'feed.pump'
  | 'diaper.wet'
  | 'diaper.dirty'
  | 'diaper.both'
  | 'toilet.attempt'
  | 'sleep'
  | 'tummy_time'
  | 'growth'
  | 'temperature'
  | 'symptom'
  | 'medication'
  | 'visit'
  | 'milestone'
  | 'mood_note'
  | 'caregiver.checkin'
  | string;

export type FeedStartReason = 'cue' | 'reminder' | 'schedule' | 'other';

export interface Event {
  id: EventId;
  childId: ChildId;
  type: EventType;
  startAt: string; // ISO datetime, 裝置時間
  endAt?: string;
  payload: Record<string, unknown>; // 各型別自訂欄位，例如 { side: 'L', ml: 120, startReason: 'cue', site: 'rectal', celsius: 37.2 }
  recordedBy: string; // 裝置或使用者識別，無帳號時為裝置 id
  source: 'home' | 'institution';
  supersedes?: EventId; // 補登修正：以新事件取代舊事件
  deletedAt?: string; // 墓碑
  createdAt: string;
  seq?: number; // 記錄裝置自己的單調序號，交接差量用（recordedBy + seq 唯一）
  updatedAt?: string; // 結束或刪除時更新，交接差量用
  tzOffsetMin?: number; // 記錄當下的時區偏移（分鐘），跨時區顯示用
}

export type ReminderKind = 'safety_net' | 'schedule' | 'medication' | 'public_resource' | 'vaccine' | 'calendar' | 'timer';

export interface Reminder {
  id: string;
  childId: ChildId;
  kind: ReminderKind;
  title: string;
  body: string;
  dueAt: string;
  intervalMinutes?: number; // schedule、medication 用；由使用者輸入，APP 不建議劑量
  sourceCardId?: string; // 對應內容卡或時程 JSON 項目
  enabled: boolean;
  snoozedUntil?: string;
  firedAt?: string;
  dismissedAt?: string;
  createdAt: string;
}

// 行程（計畫層）：作息範本、托育、回診復健、課表、才藝補習、服藥都是同一種資料（設計稿 4 時間軸）。
// routine = 每天作息範本：只能家長自建或從自己一週紀錄產生，且須先選起點（滿 6 個月或三種事件之一）。
export type ScheduleKind = 'routine' | 'care' | 'visit' | 'class' | 'activity' | 'medication';

export interface ScheduleItem {
  id: string;
  childId: ChildId;
  title: string;
  kind: ScheduleKind;
  weekdays: number[]; // 0–6，0 = 週日
  time: string; // HH:mm
  durationMinutes?: number; // 沒有就是時間點
  location?: string;
  leadMinutes: number; // 0 = 不提醒；1440 = 前一天
  note?: string;
  syncToDeviceCalendar: boolean; // 需要 development build（expo-calendar 不支援 Expo Go），目前只存設定
  validFrom?: string; // YYYY-MM-DD
  validTo?: string; // YYYY-MM-DD
  period?: number; // 節次，課表格用
  templateSource?: 'user' | 'derived'; // derived = 從一週紀錄產生
  createdAt: string;
  updatedAt: string;
  deletedAt?: string; // 墓碑，交接時讓對方也刪掉
}

export type StyleAxis =
  | 'routine' // 固定時間表 ↔ 跟隨訊號
  | 'cry_response' // 立即回應 ↔ 先觀察
  | 'sleep_arrangement' // 獨立房間 ↔ 同房不同床 ↔ 同床
  | 'feeding_lead' // 大人安排 ↔ 孩子主導
  | 'guidance' // 規則與後果 ↔ 情緒先行
  | 'info_depth'; // 只要做法 ↔ 想看理論

export interface StyleProfile {
  childId: ChildId;
  preset: 'structured' | 'responsive' | 'mixed' | 'custom';
  axes: Record<StyleAxis, number>; // -2..2
  updatedAt: string;
}

export interface Settings {
  pausedUntil?: string; // 暫停模式：一鍵暫停全部提醒與內容
  nightModeAuto: boolean;
  largeText: boolean;
  deviceId: string;
}
