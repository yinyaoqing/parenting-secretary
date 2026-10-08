// 合併引擎（純函式，不碰資料庫，可用 node 測試）。
// 規則：事件取聯集；刪除與結束時間只能單向補上；同筆被兩邊修正時以較晚建立者為有效；
// 合併後同一孩子只留一筆進行中的睡眠；一分鐘內同類重複記錄只標示不刪。

export interface SyncEvent {
  id: string;
  childId: string;
  type: string;
  startAt: string;
  endAt?: string;
  payload: Record<string, unknown>;
  recordedBy: string;
  source: 'home' | 'institution';
  supersedes?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt?: string;
  seq?: number;
  tzOffsetMin?: number;
}

export interface MergePlan {
  inserts: SyncEvent[]; // 本機沒有的事件，原樣寫入
  updates: { id: string; endAt?: string; deletedAt?: string }[]; // 既有事件補上結束或刪除
  tombstones: { id: string; reason: 'duplicate-open-sleep' | 'superseded-conflict' }[]; // 合併後為維持不變量而加的墓碑
  duplicates: { a: string; b: string; type: string }[]; // 可能重複，只回報
}

const DUP_WINDOW_MS = 60_000;

function active(e: SyncEvent, supersededIds: Set<string>): boolean {
  return !e.deletedAt && !supersededIds.has(e.id);
}

export function planMerge(local: SyncEvent[], incoming: SyncEvent[]): MergePlan {
  const byId = new Map<string, SyncEvent>();
  for (const e of local) byId.set(e.id, e);

  const inserts: SyncEvent[] = [];
  const updates: MergePlan['updates'] = [];

  for (const r of incoming) {
    const l = byId.get(r.id);
    if (!l) {
      inserts.push(r);
      byId.set(r.id, r);
      continue;
    }
    const u: MergePlan['updates'][number] = { id: r.id };
    let changed = false;
    if (r.endAt && !l.endAt) { u.endAt = r.endAt; changed = true; }
    if (r.deletedAt && !l.deletedAt) { u.deletedAt = r.deletedAt; changed = true; }
    if (changed) {
      updates.push(u);
      byId.set(r.id, { ...l, endAt: u.endAt ?? l.endAt, deletedAt: u.deletedAt ?? l.deletedAt });
    }
  }

  const all = Array.from(byId.values());
  const tombstones: MergePlan['tombstones'] = [];

  // 同一筆原始事件被兩邊各自修正：保留 createdAt 較晚的修正，其餘修正加墓碑。
  const bySupersedes = new Map<string, SyncEvent[]>();
  for (const e of all) if (e.supersedes && !e.deletedAt) {
    const list = bySupersedes.get(e.supersedes) ?? [];
    list.push(e);
    bySupersedes.set(e.supersedes, list);
  }
  const tombstoned = new Set<string>();
  for (const list of bySupersedes.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => (a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt)));
    for (const loser of list.slice(0, -1)) {
      tombstones.push({ id: loser.id, reason: 'superseded-conflict' });
      tombstoned.add(loser.id);
    }
  }

  const supersededIds = new Set<string>();
  for (const e of all) if (e.supersedes && !e.deletedAt && !tombstoned.has(e.id)) supersededIds.add(e.supersedes);

  // 單一進行中的睡眠：每個孩子只留最早開始的那筆。
  const openSleeps = new Map<string, SyncEvent[]>();
  for (const e of all) {
    if (e.type !== 'sleep' || e.endAt || tombstoned.has(e.id) || !active(e, supersededIds)) continue;
    const list = openSleeps.get(e.childId) ?? [];
    list.push(e);
    openSleeps.set(e.childId, list);
  }
  for (const list of openSleeps.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    for (const extra of list.slice(1)) {
      tombstones.push({ id: extra.id, reason: 'duplicate-open-sleep' });
      tombstoned.add(extra.id);
    }
  }

  // 可能重複：不同裝置記的同類事件，開始時間相差一分鐘內。
  const duplicates: MergePlan['duplicates'] = [];
  const insertedIds = new Set(inserts.map((e) => e.id));
  const candidates = all.filter((e) => active(e, supersededIds) && !tombstoned.has(e.id));
  candidates.sort((a, b) => a.startAt.localeCompare(b.startAt));
  for (let i = 0; i < candidates.length; i++) {
    const a = candidates[i];
    for (let j = i + 1; j < candidates.length; j++) {
      const b = candidates[j];
      const gap = new Date(b.startAt).getTime() - new Date(a.startAt).getTime();
      if (gap > DUP_WINDOW_MS) break;
      if (a.childId !== b.childId || a.type !== b.type || a.recordedBy === b.recordedBy) continue;
      if (!insertedIds.has(a.id) && !insertedIds.has(b.id)) continue; // 只回報這次合併新產生的重複
      duplicates.push({ a: a.id, b: b.id, type: a.type });
    }
  }

  return { inserts, updates, tombstones, duplicates };
}

// ---------- 孩子檔案 ----------
export interface SyncChild {
  id: string;
  nickname: string;
  birthDate: string;
  dueDate?: string;
  feedingMethod: string;
  location: string;
  locationUntil?: string;
  specialContexts: string[];
  daycareFrom?: string;
  schoolFrom?: string;
  county?: string;
  archivedAt?: string; // 只有備份檔會帶；交接不傳封存的孩子
  createdAt: string;
  updatedAt: string;
}

export interface ChildPlan {
  insert: SyncChild[]; // 本機沒有、也沒有同一個孩子的紀錄
  remapLocal: { from: string; to: string; child: SyncChild }[]; // 本機的孩子要改用對方的 id（對方 id 較小）
  remapIncoming: { from: string; to: string }[]; // 對方事件的 childId 要改成本機 id（本機 id 較小）
  update: SyncChild[]; // 同 id，對方較新
}

// 同一個孩子的判定：出生日相同。兩邊各自建檔時 id 不同，取字串較小者為正本，雙方收斂到同一個 id。
export function planChildren(local: SyncChild[], incoming: SyncChild[]): ChildPlan {
  const plan: ChildPlan = { insert: [], remapLocal: [], remapIncoming: [], update: [] };
  const localById = new Map(local.map((c) => [c.id, c]));
  for (const r of incoming) {
    const same = localById.get(r.id);
    if (same) {
      if (r.updatedAt > same.updatedAt) plan.update.push(r);
      continue;
    }
    const match = local.find((c) => c.birthDate === r.birthDate && !plan.remapLocal.some((m) => m.from === c.id));
    if (!match) { plan.insert.push(r); continue; }
    if (r.id < match.id) plan.remapLocal.push({ from: match.id, to: r.id, child: r.updatedAt > match.updatedAt ? r : { ...match, id: r.id } });
    else plan.remapIncoming.push({ from: r.id, to: match.id });
  }
  return plan;
}

export function remapEvents(events: SyncEvent[], map: { from: string; to: string }[]): SyncEvent[] {
  if (map.length === 0) return events;
  const m = new Map(map.map((x) => [x.from, x.to]));
  return events.map((e) => (m.has(e.childId) ? { ...e, childId: m.get(e.childId)! } : e));
}

// ---------- 行程（計畫層） ----------
// 行程是可編輯的設定，不是 append-only 紀錄：同一個 id 以 updatedAt 較晚者為準（刪除也是一次更新）；
// 時間相同時刪除優先，避免一邊刪、一邊又被救回。
export interface SyncScheduleItem {
  id: string;
  childId: string;
  title: string;
  kind: string;
  weekdays: number[];
  time: string;
  durationMinutes?: number;
  location?: string;
  leadMinutes: number;
  note?: string;
  syncToDeviceCalendar: boolean;
  validFrom?: string;
  validTo?: string;
  period?: number;
  templateSource?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export function planSchedule(local: SyncScheduleItem[], incoming: SyncScheduleItem[], childMap: { from: string; to: string }[] = []): SyncScheduleItem[] {
  const m = new Map(childMap.map((x) => [x.from, x.to]));
  const byId = new Map(local.map((s) => [s.id, s]));
  const upserts: SyncScheduleItem[] = [];
  for (const raw of incoming) {
    const r = m.has(raw.childId) ? { ...raw, childId: m.get(raw.childId)! } : raw;
    const l = byId.get(r.id);
    if (!l || r.updatedAt > l.updatedAt || (r.updatedAt === l.updatedAt && r.deletedAt && !l.deletedAt)) upserts.push(r);
  }
  return upserts;
}
