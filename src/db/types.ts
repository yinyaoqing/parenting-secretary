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
}

export type ReminderKind = 'safety_net' | 'schedule' | 'medication' | 'public_resource' | 'vaccine' | 'calendar';

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

export interface ScheduleItem {
  id: string;
  childId: ChildId;
  title: string;
  weekdays: number[]; // 0–6
  time: string; // HH:mm
  location?: string;
  leadMinutes: number;
  note?: string;
  syncToDeviceCalendar: boolean;
  createdAt: string;
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
