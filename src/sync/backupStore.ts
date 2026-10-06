// 備份與刪除全部資料（資料層）。還原用交接的合併規則，不覆蓋本機已有的紀錄，可以重複匯入。
import { AESEncryptionKey, AESSealedData, aesEncryptAsync, aesDecryptAsync, getRandomBytes } from 'expo-crypto';
import { getDb, nowIso } from '../db/index';
import { rowToEvent, type EventRow } from '../db/events';
import { rowToScheduleItem, type ScheduleRow } from '../db/schedule';
import { applyPackage, type ApplyReport } from './store';
import { encodeBackup, decodeBackup, pickSettings, type BackupData, type BackupChild, type CryptoFactory } from './backup';
import type { SyncCrypto } from './codec';
import appConfig from '../../app.json';
import { emitDataChange } from '../db/changes';

const aesFactory: CryptoFactory = async (keyBytes) => {
  const key = await AESEncryptionKey.import(keyBytes);
  const c: SyncCrypto = {
    async encrypt(plain) { return (await aesEncryptAsync(plain, key)).combined(); },
    async decrypt(cipher) { return aesDecryptAsync(AESSealedData.fromCombined(cipher), key); },
  };
  return c;
};

type ChildRow = { id: string; nickname: string; birth_date: string; due_date: string | null; feeding_method: string; location: string; location_until: string | null; special_contexts: string; created_at: string; updated_at: string; daycare_from: string | null; school_from: string | null; archived_at: string | null };

export async function buildBackup(password: string): Promise<{ text: string; children: number; events: number }> {
  const db = await getDb();
  const children: BackupChild[] = (await db.getAllAsync<ChildRow>('SELECT * FROM children')).map((r) => ({
    id: r.id, nickname: r.nickname, birthDate: r.birth_date, dueDate: r.due_date ?? undefined, feedingMethod: r.feeding_method, location: r.location,
    locationUntil: r.location_until ?? undefined, specialContexts: JSON.parse(r.special_contexts || '[]'), daycareFrom: r.daycare_from ?? undefined,
    schoolFrom: r.school_from ?? undefined, archivedAt: r.archived_at ?? undefined, createdAt: r.created_at, updatedAt: r.updated_at,
  }));
  const events = (await db.getAllAsync<EventRow>('SELECT * FROM events ORDER BY created_at ASC')).map(rowToEvent);
  const schedule = (await db.getAllAsync<ScheduleRow>('SELECT * FROM schedule_items')).map(rowToScheduleItem);
  const styleProfiles = (await db.getAllAsync<{ child_id: string; preset: string; axes: string; updated_at: string }>('SELECT * FROM style_profiles'))
    .map((r) => ({ childId: r.child_id, preset: r.preset, axes: JSON.parse(r.axes), updatedAt: r.updated_at }));
  const settingsRows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings = pickSettings(Object.fromEntries(settingsRows.map((r) => [r.key, r.value])));
  const data: BackupData = { v: 1, kind: 'backup', createdAt: nowIso(), appVersion: appConfig.expo.version, children, events, schedule, styleProfiles, settings };
  const text = await encodeBackup(data, password, getRandomBytes(16), aesFactory);
  return { text, children: children.length, events: events.length };
}

export interface RestoreReport extends ApplyReport { profiles: number; backupDate: string }

export async function restoreBackup(text: string, password: string): Promise<RestoreReport> {
  const data = await decodeBackup(text, password, aesFactory);
  const report = await applyPackage({ v: 1, familyId: 'backup', from: 'backup', fromName: '備份檔', createdAt: data.createdAt, children: data.children, events: data.events, schedule: data.schedule }, { fromBackup: true });

  // 風格與設定：孩子 id 可能已收斂到本機的 id（以出生日判斷同一個孩子），只補本機沒有的。
  const db = await getDb();
  const local = await db.getAllAsync<{ id: string; birth_date: string }>('SELECT id, birth_date FROM children');
  const mapId = (id: string) => {
    if (local.some((c) => c.id === id)) return id;
    const b = data.children.find((c) => c.id === id);
    return b ? local.find((c) => c.birth_date === b.birthDate)?.id ?? id : id;
  };
  let profiles = 0;
  for (const p of data.styleProfiles) {
    const r = await db.runAsync('INSERT OR IGNORE INTO style_profiles (child_id, preset, axes, updated_at) VALUES (?, ?, ?, ?)', mapId(p.childId), p.preset, JSON.stringify(p.axes), p.updatedAt);
    profiles += r.changes;
  }
  for (const [k, v] of Object.entries(data.settings)) {
    const m = /^(templateMode|toiletReady):(.+)$/.exec(k);
    const key = m ? `${m[1]}:${mapId(m[2])}` : k;
    const value = k === 'activeChildId' ? mapId(v) : v;
    await db.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', key, value);
  }
  return { ...report, profiles, backupDate: data.createdAt };
}

// 刪除全部資料：紀錄、孩子、行程、配對與設定全部清空。只保留裝置 id（交接序號需要不重複）。
export async function deleteAllData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of ['events', 'schedule_items', 'reminders', 'style_profiles', 'peers', 'content_cards', 'resource_timeline', 'children']) {
      await db.runAsync(`DELETE FROM ${t}`);
    }
    await db.runAsync("DELETE FROM settings WHERE key <> 'deviceId'");
  });
  emitDataChange();
}
