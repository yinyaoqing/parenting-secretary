// SQLite schema。事件表 append-only：修正以 supersedes 指向舊事件，刪除以 deleted_at 墓碑。
// v2：事件加 seq（每個記錄裝置自己的單調序號）、updated_at（結束或刪除時更新，供交接差量）、tz_offset_min；新增 peers（配對過的裝置）。
// v3：children 加 archived_at（封存孩子，紀錄保留不顯示）。
export const SCHEMA_VERSION = 3;

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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
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
  created_at TEXT NOT NULL
);

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
