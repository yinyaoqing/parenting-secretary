// SQLite schema。事件表 append-only：修正以 supersedes 指向舊事件，刪除以 deleted_at 墓碑。
// v2：事件加 seq（每個記錄裝置自己的單調序號）、updated_at（結束或刪除時更新，供交接差量）、tz_offset_min；新增 peers（配對過的裝置）。
// v3：children 加 archived_at（封存孩子，紀錄保留不顯示）。
// v4：children 加 daycare_from、school_from（作息範本的事件起點）；schedule_items 補時間軸欄位與墓碑。
// v5：children 加 county（戶籍縣市，決定地方補助與縣市資源；規劃 v1.0 第 6.3 節）。
// v6：育村第一、二層（規劃 v1.0 第 4 章）：village_members（我的村，隨家庭交接同步）、village_groups 與 group_items（鄰里小組，與其他家庭以小組金鑰交換）。
export const SCHEMA_VERSION = 6;

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  due_date TEXT,
  feeding_method TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'home',
  location_until TEXT,
  special_contexts TEXT NOT NULL DEFAULT '[]',
  county TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  daycare_from TEXT,
  school_from TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id),
  type TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  recorded_by TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'home',
  supersedes TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  seq INTEGER,
  updated_at TEXT,
  tz_offset_min INTEGER
);
CREATE INDEX IF NOT EXISTS idx_events_child_type_time ON events(child_id, type, start_at);

CREATE TABLE IF NOT EXISTS peers (
  device_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  last_sent_seq INTEGER NOT NULL DEFAULT 0,
  last_sent_at TEXT,
  last_received_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  due_at TEXT NOT NULL,
  interval_minutes INTEGER,
  source_card_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  snoozed_until TEXT,
  fired_at TEXT,
  dismissed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(enabled, due_at);

CREATE TABLE IF NOT EXISTS village_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS village_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  my_label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  left_at TEXT
);

CREATE TABLE IF NOT EXISTS group_items (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  title TEXT NOT NULL,
  assignee TEXT,
  location TEXT,
  note TEXT,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_group_items_group ON group_items(group_id, date);

CREATE TABLE IF NOT EXISTS schedule_items (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id),
  title TEXT NOT NULL,
  weekdays TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT,
  lead_minutes INTEGER NOT NULL DEFAULT 30,
  note TEXT,
  sync_to_device_calendar INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'care',
  duration_minutes INTEGER,
  valid_from TEXT,
  valid_to TEXT,
  period INTEGER,
  template_source TEXT,
  updated_at TEXT,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_schedule_child ON schedule_items(child_id);

CREATE TABLE IF NOT EXISTS style_profiles (
  child_id TEXT PRIMARY KEY REFERENCES children(id),
  preset TEXT NOT NULL,
  axes TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 內容卡快取：隨 APP 打包的 JSON 與遠端投放的 JSON 皆寫入此表，供離線查詢與檢索。
CREATE TABLE IF NOT EXISTS content_cards (
  id TEXT PRIMARY KEY,
  topic_group TEXT NOT NULL,
  age_min_days INTEGER NOT NULL,
  age_max_days INTEGER NOT NULL,
  style_tags TEXT NOT NULL DEFAULT '[]',
  evidence_tag TEXT,
  trust_level TEXT NOT NULL,
  license_level TEXT NOT NULL,
  body TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_cards_age ON content_cards(age_min_days, age_max_days);

-- 公費資源時程：由遠端 JSON 更新。
CREATE TABLE IF NOT EXISTS resource_timeline (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  age_min_days INTEGER NOT NULL,
  age_max_days INTEGER NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  effective_from TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
