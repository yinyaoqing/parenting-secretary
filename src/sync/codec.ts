// 交接包的打包與拆包（純函式）。JSON → UTF-8 → deflate → AES-GCM（由呼叫端注入）→ base64。
// 同一包位元組可走 QR code（切成多張連續切換）、檔案（AirDrop、Quick Share、LINE）。
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import type { SyncChild, SyncScheduleItem, SyncEvent } from './merge';
import type { VillageMember } from '../village/model';

export interface SyncCrypto {
  encrypt(plain: Uint8Array): Promise<Uint8Array>;
  decrypt(cipher: Uint8Array): Promise<Uint8Array>;
}

export interface SyncPackage {
  v: 1;
  familyId: string;
  from: string; // 裝置 id
  fromName: string;
  createdAt: string;
  children: SyncChild[];
  events: SyncEvent[];
  schedule?: SyncScheduleItem[]; // v4 起：行程與範本；舊版交接檔沒有這欄
  members?: VillageMember[]; // v6 起：育村村民名冊（含墓碑）；舊版沒有這欄
}

export const PACKAGE_PREFIX = 'PS1.';
export const FRAME_PREFIX = 'PSQ1|';
export const PAIR_PREFIX = 'PSPAIR1|';
export const FILE_EXTENSION = 'psync';

// ---------- base64（不依賴 btoa，node 與 Hermes 都可用）----------
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (b === undefined ? '=' : B64[(n >> 6) & 63]) + (c === undefined ? '=' : B64[n & 63]);
  }
  return out;
}
export function base64ToBytes(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) | ((B64.indexOf(clean[i + 2]) & 63) << 6) | (B64.indexOf(clean[i + 3]) & 63);
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (clean[i + 2] !== undefined && o < out.length) out[o++] = (n >> 8) & 255;
    if (clean[i + 3] !== undefined && o < out.length) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}

// ---------- 交接包 ----------
export async function encodePackage(pkg: SyncPackage, crypto: SyncCrypto): Promise<string> {
  const json = strToU8(JSON.stringify(pkg));
  const packed = deflateSync(json, { level: 9 });
  const sealed = await crypto.encrypt(packed);
  return PACKAGE_PREFIX + bytesToBase64(sealed);
}

// 不解密，只看開頭：從其他 APP 收到的檔案先確認是交接檔再請使用者按合併。
export function looksLikePackage(text: string): boolean {
  return text.trimStart().startsWith(PACKAGE_PREFIX);
}

export async function decodePackage(text: string, crypto: SyncCrypto): Promise<SyncPackage> {
  const t = text.trim();
  if (!t.startsWith(PACKAGE_PREFIX)) throw new Error('不是交接檔');
  const sealed = base64ToBytes(t.slice(PACKAGE_PREFIX.length));
  let packed: Uint8Array;
  try { packed = await crypto.decrypt(sealed); } catch { throw new Error('解密失敗：兩支手機的配對金鑰不同，請先重新配對'); }
  const pkg = JSON.parse(strFromU8(inflateSync(packed))) as SyncPackage;
  if (pkg.v !== 1 || !Array.isArray(pkg.events) || !Array.isArray(pkg.children)) throw new Error('交接檔格式不支援');
  return pkg;
}

// ---------- QR code 多張切換 ----------
// 每張：PSQ1|序號|總數|指紋|片段。指紋取自整包前 8 個 base64 字元，掃描端用來分辨不同的包。
export function splitFrames(encoded: string, chunkSize = 1100): string[] {
  const fp = fingerprint(encoded);
  const chunks: string[] = [];
  for (let i = 0; i < encoded.length; i += chunkSize) chunks.push(encoded.slice(i, i + chunkSize));
  return chunks.map((c, i) => `${FRAME_PREFIX}${i + 1}|${chunks.length}|${fp}|${c}`);
}

function fingerprint(encoded: string): string {
  let h = 0;
  for (let i = 0; i < encoded.length; i++) h = (h * 31 + encoded.charCodeAt(i)) >>> 0;
  return h.toString(36).padStart(7, '0').slice(0, 7);
}

export class FrameCollector {
  private parts = new Map<number, string>();
  private total = 0;
  private fp = '';

  // 回傳 null 表示這不是交接 QR code；否則回傳進度。
  add(data: string): { received: number; total: number; done: boolean } | null {
    if (!data.startsWith(FRAME_PREFIX)) return null;
    const [, idx, total, fp, ...rest] = data.split('|');
    const i = Number(idx), n = Number(total);
    if (!Number.isInteger(i) || !Number.isInteger(n) || i < 1 || i > n) return null;
    if (fp !== this.fp) { this.parts.clear(); this.fp = fp; this.total = n; }
    this.parts.set(i, rest.join('|'));
    return { received: this.parts.size, total: this.total, done: this.parts.size === this.total };
  }

  result(): string {
    const out: string[] = [];
    for (let i = 1; i <= this.total; i++) {
      const p = this.parts.get(i);
      if (p === undefined) throw new Error('QR code 尚未掃完');
      out.push(p);
    }
    return out.join('');
  }
}

// ---------- 配對 QR code（未加密，內容就是金鑰本身）----------
export interface Pairing { familyId: string; key: string; deviceId: string; deviceName: string }
export function encodePairing(p: Pairing): string {
  return `${PAIR_PREFIX}${[p.familyId, p.key, p.deviceId, p.deviceName].map(encodeURIComponent).join('|')}`;
}
export function parsePairing(data: string): Pairing | null {
  if (!data.startsWith(PAIR_PREFIX)) return null;
  const [familyId, key, deviceId, deviceName] = data.slice(PAIR_PREFIX.length).split('|').map(decodeURIComponent);
  if (!familyId || !key || !deviceId) return null;
  return { familyId, key, deviceId, deviceName: deviceName || '另一支手機' };
}
