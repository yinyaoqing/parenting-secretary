// 育村第一、二層的資料與規則（純函式，可用 node 測試）。規劃 v1.0 第 4 章。
// 第一層「我的村」：孩子身邊的照顧者名冊，隨家庭交接同步。
// 第二層「鄰里小組」：幾個家庭共用的行程表（共學團排班、接送輪值），用小組金鑰加密後以 QR code 或檔案交換。
// 小組只交換行程，不交換任何孩子的紀錄。
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { base64ToBytes, bytesToBase64, type SyncCrypto } from '../sync/codec.ts';

// ---------- 第一層：村民 ----------
export type MemberRole = 'primary' | 'shift' | 'helper' | 'professional';
export const ROLE_LABEL: Record<MemberRole, string> = { primary: '主要照顧者', shift: '輪班照顧者', helper: '偶爾幫忙', professional: '保母或老師' };
export interface VillageMember { id: string; name: string; role: MemberRole; phone?: string; note?: string; createdAt: string; updatedAt: string; deletedAt?: string }

// 同 id 以較晚的更新為準；墓碑在同時間點時優先（與行程合併規則一致）。
export function planLww<T extends { id: string; updatedAt: string; deletedAt?: string }>(local: T[], incoming: T[]): T[] {
  const byId = new Map(local.map((x) => [x.id, x]));
  return incoming.filter((r) => { const l = byId.get(r.id); return !l || r.updatedAt > l.updatedAt || (r.updatedAt === l.updatedAt && !!r.deletedAt && !l.deletedAt); });
}

// ---------- 第二層：鄰里小組 ----------
export interface VillageGroup { id: string; name: string; key: string; myLabel: string; createdAt: string; leftAt?: string }
export interface GroupItem { id: string; groupId: string; date: string; time?: string; title: string; assignee?: string; location?: string; note?: string; createdBy?: string; updatedAt: string; deletedAt?: string }

export const GROUP_JOIN_PREFIX = 'PSGRP1|';
export const GROUP_FILE_PREFIX = 'PG1.';

// 加入碼（QR code，未加密，內容就是小組金鑰）：只給要加入的家庭當面掃。
export function encodeGroupJoin(g: { id: string; name: string; key: string }): string {
  return GROUP_JOIN_PREFIX + [g.id, g.key, g.name].map(encodeURIComponent).join('|');
}
export function parseGroupJoin(data: string): { id: string; key: string; name: string } | null {
  if (!data.startsWith(GROUP_JOIN_PREFIX)) return null;
  const [id, key, name] = data.slice(GROUP_JOIN_PREFIX.length).split('|').map(decodeURIComponent);
  if (!id || !key) return null;
  return { id, key, name: name || '鄰里小組' };
}

// 小組更新檔：誰送的、小組名稱、全部行程（含墓碑）。行程筆數少，每次全送。
export interface GroupPackage { v: 1; groupId: string; groupName: string; from: string; createdAt: string; items: GroupItem[] }

export async function encodeGroupFile(pkg: GroupPackage, crypto: SyncCrypto): Promise<string> {
  const sealed = await crypto.encrypt(deflateSync(strToU8(JSON.stringify(pkg)), { level: 9 }));
  return GROUP_FILE_PREFIX + bytesToBase64(sealed);
}
export function looksLikeGroupFile(text: string): boolean { return text.trimStart().startsWith(GROUP_FILE_PREFIX); }
export async function decodeGroupFile(text: string, crypto: SyncCrypto): Promise<GroupPackage> {
  const t = text.trim();
  if (!t.startsWith(GROUP_FILE_PREFIX)) throw new Error('不是小組檔');
  let packed: Uint8Array;
  try { packed = await crypto.decrypt(base64ToBytes(t.slice(GROUP_FILE_PREFIX.length))); } catch { throw new Error('解密失敗：這支手機還沒加入這個小組'); }
  const pkg = JSON.parse(strFromU8(inflateSync(packed))) as GroupPackage;
  if (pkg.v !== 1 || !pkg.groupId || !Array.isArray(pkg.items)) throw new Error('小組檔格式不支援');
  return pkg;
}

// 小組檔的明文開頭附上小組 id，收到時才知道要用哪一把金鑰解密（id 不是秘密）。
export function groupFileText(groupId: string, sealed: string): string { return `${groupId}\n${sealed}`; }
export function splitGroupFileText(text: string): { groupId: string; sealed: string } | null {
  const [first, ...rest] = text.trim().split('\n');
  const sealed = rest.join('\n').trim();
  if (!first || !looksLikeGroupFile(sealed)) return null;
  return { groupId: first.trim(), sealed };
}

// 接下來的小組行程：今天起，依日期與時間排序。
export function upcomingItems(items: GroupItem[], today: string): GroupItem[] {
  return items.filter((x) => !x.deletedAt && x.date >= today).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
}

// ---------- 交班卡 ----------
// 交給下一位照顧者的純文字：注意事項、聯絡人，加上近期紀錄摘要（由 records/share.ts 產生）。
export function buildHandoverText(childName: string, notes: string, contacts: { name: string; role: MemberRole; phone?: string }[], recordSummary: string): string {
  const lines = [`【${childName} 交班卡】`];
  if (notes.trim()) lines.push('', '注意事項', notes.trim());
  const withPhone = contacts.filter((c) => c.phone);
  if (withPhone.length) lines.push('', '聯絡人', ...withPhone.map((c) => `${c.name}（${ROLE_LABEL[c.role]}）${c.phone}`));
  if (recordSummary.trim()) lines.push('', recordSummary.trim());
  return lines.join('\n');
}
