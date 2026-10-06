// 備份檔：一個檔案，存到自己的雲端或電腦。和交接檔同樣是 deflate + AES-256-GCM，
// 但金鑰由備份密碼以 PBKDF2-HMAC-SHA256 推導（換手機、沒有配對也能還原）。不含家庭配對金鑰。
// 純函式（AES 由呼叫端注入），可用 node 測試。
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToBase64, base64ToBytes, type SyncCrypto } from './codec.ts';
import type { SyncChild, SyncEvent, SyncScheduleItem } from './merge.ts';

export const BACKUP_PREFIX = 'PSB1.';
export const BACKUP_EXTENSION = 'psbackup';
export const PBKDF2_ITERATIONS = 100_000;
export const MIN_PASSWORD = 6;

export type BackupChild = SyncChild;
export interface BackupData {
  v: 1;
  kind: 'backup';
  createdAt: string;
  appVersion: string;
  children: BackupChild[];
  events: SyncEvent[];
  schedule: SyncScheduleItem[];
  styleProfiles: { childId: string; preset: string; axes: Record<string, number>; updatedAt: string }[];
  settings: Record<string, string>; // 目前孩子、範本設定、如廁準備度等；不含配對金鑰與裝置 id
}

export type CryptoFactory = (key: Uint8Array) => Promise<SyncCrypto>;

export async function deriveKey(password: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS): Promise<Uint8Array> {
  return pbkdf2Async(sha256, strToU8(password.normalize('NFC')), salt, { c: iterations, dkLen: 32, asyncTick: 20 });
}

// 格式：PSB1. + base64( salt[16] | iterations[4, big-endian] | AES-GCM(deflate(JSON)) )
export async function encodeBackup(data: BackupData, password: string, salt: Uint8Array, makeCrypto: CryptoFactory, iterations = PBKDF2_ITERATIONS): Promise<string> {
  if (password.length < MIN_PASSWORD) throw new Error(`備份密碼至少 ${MIN_PASSWORD} 個字`);
  const key = await deriveKey(password, salt, iterations);
  const sealed = await (await makeCrypto(key)).encrypt(deflateSync(strToU8(JSON.stringify(data)), { level: 9 }));
  const out = new Uint8Array(16 + 4 + sealed.length);
  out.set(salt.subarray(0, 16), 0);
  new DataView(out.buffer).setUint32(16, iterations);
  out.set(sealed, 20);
  return BACKUP_PREFIX + bytesToBase64(out);
}

export async function decodeBackup(text: string, password: string, makeCrypto: CryptoFactory): Promise<BackupData> {
  const t = text.trim();
  if (!t.startsWith(BACKUP_PREFIX)) throw new Error(t.startsWith('PS1.') ? '這是交接檔，請到「同步與交接」匯入' : '不是育兒秘書的備份檔');
  const bytes = base64ToBytes(t.slice(BACKUP_PREFIX.length));
  if (bytes.length < 40) throw new Error('備份檔已損壞');
  const salt = bytes.subarray(0, 16);
  const iterations = new DataView(bytes.buffer, bytes.byteOffset).getUint32(16);
  if (iterations < 10_000 || iterations > 10_000_000) throw new Error('備份檔已損壞');
  const key = await deriveKey(password, salt, iterations);
  let packed: Uint8Array;
  try { packed = await (await makeCrypto(key)).decrypt(bytes.subarray(20)); } catch { throw new Error('密碼不對，或備份檔已損壞'); }
  const data = JSON.parse(strFromU8(inflateSync(packed))) as BackupData;
  if (data.v !== 1 || data.kind !== 'backup' || !Array.isArray(data.events)) throw new Error('備份檔格式不支援');
  return data;
}

// 備份要帶走的設定：只留使用偏好，不帶配對金鑰、裝置 id、已配對裝置。
const KEEP = [/^activeChildId$/, /^templateMode:/, /^toiletReady:/, /^themeMode$/, /^textScale$/, /^deviceName$/];
export function pickSettings(all: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(all).filter(([k]) => KEEP.some((r) => r.test(k))));
}
