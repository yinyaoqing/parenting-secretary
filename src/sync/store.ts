// 交接資料層：配對身分、已配對裝置、組交接包、套用交接包。
import { getDb, nowIso } from '../db/index';
import { getSetting, setSetting } from '../db/repo';
import { deviceId } from '../db/device';
import { rowToEvent, type EventRow } from '../db/events';
import { planMerge, planChildren, remapEvents, planSchedule, type SyncChild, type SyncEvent, type SyncScheduleItem } from './merge';
import { rowToScheduleItem, writeScheduleRow, type ScheduleRow } from '../db/schedule';
import type { ScheduleItem } from '../db/types';
import { encodePackage, decodePackage, type SyncPackage } from './codec';
import { makeCrypto, generateFamilyKey, newFamilyId } from './crypto';

export interface Identity { deviceId: string; deviceName: string; familyId: string | null; key: string | null }
export interface Peer { deviceId: string; name: string; lastSentSeq: number; lastSentAt?: string; lastReceivedAt?: string }
export interface ApplyReport {
  from: string; fromName: string;
  inserted: number; updated: number; tombstones: number; duplicates: number;
  childrenInserted: number; childrenRemapped: number; schedule: number;
}

// ---------- 身分與配對 ----------
export async function getIdentity(): Promise<Identity> {
  const [id, name, familyId, key] = await Promise.all([deviceId(), getSetting('deviceName'), getSetting('familyId'), getSetting('familyKey')]);
  return { deviceId: id, deviceName: name || '這支手機', familyId: familyId || null, key: key || null };
}

export async function setDeviceName(name: string): Promise<void> {
  await setSetting('deviceName', name.trim() || '這支手機');
}

// 第一支手機：還沒有家庭金鑰就產生一把。
export async function ensureFamily(): Promise<{ familyId: string; key: string }> {
  const cur = await getIdentity();
  if (cur.familyId && cur.key) return { familyId: cur.familyId, key: cur.key };
  const familyId = newFamilyId();
  const key = await generateFamilyKey();
  await setSetting('familyId', familyId);
  await setSetting('familyKey', key);
  return { familyId, key };
}

// 掃到別人的配對 QR code：採用對方的家庭金鑰（覆蓋自己的），並登記對方為已配對裝置。
export async function adoptPairing(p: { familyId: string; key: string; deviceId: string; deviceName: string }): Promise<void> {
  await setSetting('familyId', p.familyId);
  await setSetting('familyKey', p.key);
  await upsertPeer(p.deviceId, p.deviceName);
}

export async function listPeers(): Promise<Peer[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ device_id: string; name: string; last_sent_seq: number; last_sent_at: string | null; last_received_at: string | null }>('SELECT * FROM peers ORDER BY created_at ASC');
  return rows.map((r) => ({ deviceId: r.device_id, name: r.name, lastSentSeq: r.last_sent_seq, lastSentAt: r.last_sent_at ?? undefined, lastReceivedAt: r.last_received_at ?? undefined }));
}

export async function upsertPeer(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO peers (device_id, name, created_at) VALUES (?, ?, ?)
     ON CONFLICT(device_id) DO UPDATE SET name = excluded.name`,
    id, name, nowIso(),
  );
}

export async function removePeer(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM peers WHERE device_id = ?', id);
}

// ---------- 組交接包 ----------
type ChildRow = { id: string; nickname: string; birth_date: string; due_date: string | null; feeding_method: string; location: string; location_until: string | null; special_contexts: string; created_at: string; updated_at: string; daycare_from: string | null; school_from: string | null };
const rowToChild = (r: ChildRow): SyncChild => ({ id: r.id, nickname: r.nickname, birthDate: r.birth_date, dueDate: r.due_date ?? undefined, feedingMethod: r.feeding_method, location: r.location, locationUntil: r.location_until ?? undefined, specialContexts: JSON.parse(r.special_contexts || '[]'), daycareFrom: r.daycare_from ?? undefined, schoolFrom: r.school_from ?? undefined, createdAt: r.created_at, updatedAt: r.updated_at });

// peerId 為空代表「給任何已配對裝置」，會打包全部事件（合併是冪等的，重複送不會壞）。
export async function buildPackage(peerId?: string): Promise<{ text: string; events: number; delta: boolean }> {
  const me = await getIdentity();
  if (!me.familyId || !me.key) throw new Error('尚未配對');
  const db = await getDb();
  const children = (await db.getAllAsync<ChildRow>('SELECT * FROM children WHERE archived_at IS NULL')).map(rowToChild);
  const peer = peerId ? (await listPeers()).find((p) => p.deviceId === peerId) : undefined;
  let rows: EventRow[];
  if (peer) {
    rows = await db.getAllAsync<EventRow>(
      `SELECT * FROM events WHERE (recorded_by = ? AND seq > ?) OR (updated_at > ?) ORDER BY created_at ASC`,
      me.deviceId, peer.lastSentSeq, peer.lastSentAt ?? '',
    );
  } else {
    rows = await db.getAllAsync<EventRow>('SELECT * FROM events ORDER BY created_at ASC');
  }
  const events: SyncEvent[] = rows.map(rowToEvent).map((e) => ({ ...e }));
  // 行程筆數少，每次全送（含墓碑），合併以 updatedAt 為準。
  const schedule: SyncScheduleItem[] = (await db.getAllAsync<ScheduleRow>('SELECT s.* FROM schedule_items s JOIN children c ON c.id = s.child_id WHERE c.archived_at IS NULL')).map(rowToScheduleItem);
  const pkg: SyncPackage = { v: 1, familyId: me.familyId, from: me.deviceId, fromName: me.deviceName, createdAt: nowIso(), children, events, schedule };
  const text = await encodePackage(pkg, await makeCrypto(me.key));
  return { text, events: events.length, delta: !!peer };
}

// 對方確認收到後呼叫：記錄送到哪一筆，下次只送差量。
export async function markSent(peerId: string): Promise<void> {
  const me = await getIdentity();
  const db = await getDb();
  const row = await db.getFirstAsync<{ m: number }>('SELECT COALESCE(MAX(seq), 0) AS m FROM events WHERE recorded_by = ?', me.deviceId);
  await db.runAsync('UPDATE peers SET last_sent_seq = ?, last_sent_at = ? WHERE device_id = ?', row?.m ?? 0, nowIso(), peerId);
}

// ---------- 套用交接包 ----------
export async function applyPackageText(text: string): Promise<ApplyReport> {
  const me = await getIdentity();
  if (!me.key) throw new Error('尚未配對：先掃描對方的配對 QR code');
  const pkg = await decodePackage(text, await makeCrypto(me.key));
  return applyPackage(pkg);
}

export async function applyPackage(pkg: SyncPackage): Promise<ApplyReport> {
  const db = await getDb();
  const report: ApplyReport = { from: pkg.from, fromName: pkg.fromName, inserted: 0, updated: 0, tombstones: 0, duplicates: 0, childrenInserted: 0, childrenRemapped: 0, schedule: 0 };

  await db.withTransactionAsync(async () => {
    // 1. 孩子檔案：插入、更新、或把兩邊各自建的同一個孩子收斂到同一個 id。
    const localChildren = (await db.getAllAsync<ChildRow>('SELECT * FROM children')).map(rowToChild);
    const cp = planChildren(localChildren, pkg.children);
    const insertChild = (c: SyncChild) => db.runAsync(
      `INSERT INTO children (id, nickname, birth_date, due_date, feeding_method, location, location_until, special_contexts, daycare_from, school_from, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      c.id, c.nickname, c.birthDate, c.dueDate ?? null, c.feedingMethod, c.location, c.locationUntil ?? null, JSON.stringify(c.specialContexts), c.daycareFrom ?? null, c.schoolFrom ?? null, c.createdAt, c.updatedAt,
    );
    for (const c of cp.insert) { await insertChild(c); report.childrenInserted++; }
    for (const c of cp.update) {
      await db.runAsync('UPDATE children SET nickname = ?, due_date = ?, feeding_method = ?, location = ?, location_until = ?, special_contexts = ?, daycare_from = ?, school_from = ?, updated_at = ? WHERE id = ?',
        c.nickname, c.dueDate ?? null, c.feedingMethod, c.location, c.locationUntil ?? null, JSON.stringify(c.specialContexts), c.daycareFrom ?? null, c.schoolFrom ?? null, c.updatedAt, c.id);
    }
    for (const m of cp.remapLocal) {
      // 本機 id 讓位給對方較小的 id：先插入正本，改掉所有參照，再刪本機舊檔。
      await insertChild(m.child);
      for (const table of ['events', 'reminders', 'schedule_items']) await db.runAsync(`UPDATE ${table} SET child_id = ? WHERE child_id = ?`, m.to, m.from);
      await db.runAsync('UPDATE OR IGNORE style_profiles SET child_id = ? WHERE child_id = ?', m.to, m.from);
      await db.runAsync('DELETE FROM style_profiles WHERE child_id = ?', m.from);
      await db.runAsync('DELETE FROM children WHERE id = ?', m.from);
      report.childrenRemapped++;
    }
    const incomingEvents = remapEvents(pkg.events, cp.remapIncoming);

    // 2. 事件：聯集與不變量。
    const localEvents: SyncEvent[] = (await db.getAllAsync<EventRow>('SELECT * FROM events')).map(rowToEvent);
    const plan = planMerge(localEvents, incomingEvents);
    for (const e of plan.inserts) {
      await db.runAsync(
        `INSERT OR IGNORE INTO events (id, child_id, type, start_at, end_at, payload, recorded_by, source, supersedes, deleted_at, created_at, seq, updated_at, tz_offset_min)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        e.id, e.childId, e.type, e.startAt, e.endAt ?? null, JSON.stringify(e.payload ?? {}), e.recordedBy, e.source ?? 'home', e.supersedes ?? null, e.deletedAt ?? null, e.createdAt, e.seq ?? null, e.updatedAt ?? e.createdAt, e.tzOffsetMin ?? null,
      );
      report.inserted++;
    }
    const ts = nowIso();
    for (const u of plan.updates) {
      if (u.endAt) await db.runAsync('UPDATE events SET end_at = ?, updated_at = ? WHERE id = ? AND end_at IS NULL', u.endAt, ts, u.id);
      if (u.deletedAt) await db.runAsync('UPDATE events SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL', u.deletedAt, ts, u.id);
      report.updated++;
    }
    for (const t of plan.tombstones) {
      await db.runAsync('UPDATE events SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL', ts, ts, t.id);
      report.tombstones++;
    }
    report.duplicates = plan.duplicates.length;

    // 3. 行程：同 id 以較晚的更新為準。
    if (pkg.schedule?.length) {
      const localSchedule = (await db.getAllAsync<ScheduleRow>('SELECT * FROM schedule_items')).map(rowToScheduleItem);
      for (const s of planSchedule(localSchedule, pkg.schedule, cp.remapIncoming)) {
        await writeScheduleRow(s as ScheduleItem);
        report.schedule++;
      }
    }

    // 4. 記住對方。
    await db.runAsync(
      `INSERT INTO peers (device_id, name, last_received_at, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(device_id) DO UPDATE SET name = excluded.name, last_received_at = excluded.last_received_at`,
      pkg.from, pkg.fromName, ts, ts,
    );
  });

  return report;
}
