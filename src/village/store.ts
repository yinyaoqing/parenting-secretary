// 育村第一、二層的資料存取。村民名冊隨家庭交接同步（src/sync/store.ts）；鄰里小組用各自的小組金鑰，與其他家庭交換。
import { getDb, newId, nowIso } from '../db/index';
import { emitDataChange } from '../db/changes';
import { makeCrypto, generateFamilyKey } from '../sync/crypto';
import { planLww, encodeGroupFile, decodeGroupFile, groupFileText, splitGroupFileText, type GroupItem, type MemberRole, type VillageGroup, type VillageMember } from './model';

// ---------- 村民 ----------
type MemberRow = { id: string; name: string; role: string; phone: string | null; note: string | null; created_at: string; updated_at: string; deleted_at: string | null };
export const rowToMember = (r: MemberRow): VillageMember => ({ id: r.id, name: r.name, role: r.role as MemberRole, phone: r.phone ?? undefined, note: r.note ?? undefined, createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at ?? undefined });

export async function listMembers(includeDeleted = false): Promise<VillageMember[]> {
  const db = await getDb();
  const where = includeDeleted ? '' : 'WHERE deleted_at IS NULL';
  const rows = await db.getAllAsync<MemberRow>(`SELECT * FROM village_members ${where} ORDER BY created_at ASC`);
  return rows.map(rowToMember);
}

export async function writeMember(m: VillageMember): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO village_members (id, name, role, phone, note, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, role = excluded.role, phone = excluded.phone, note = excluded.note, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at`,
    m.id, m.name, m.role, m.phone ?? null, m.note ?? null, m.createdAt, m.updatedAt, m.deletedAt ?? null,
  );
}

export async function saveMember(input: { name: string; role: MemberRole; phone?: string; note?: string }, id?: string): Promise<VillageMember> {
  const ts = nowIso();
  const cur = id ? (await listMembers(true)).find((m) => m.id === id) : undefined;
  const m: VillageMember = { id: cur?.id ?? newId(), ...input, createdAt: cur?.createdAt ?? ts, updatedAt: ts };
  await writeMember(m);
  emitDataChange();
  return m;
}

export async function deleteMember(id: string): Promise<void> {
  const db = await getDb();
  const ts = nowIso();
  await db.runAsync('UPDATE village_members SET deleted_at = ?, updated_at = ? WHERE id = ?', ts, ts, id);
  emitDataChange();
}

// 交接與備份合併用：回傳實際更新的筆數。
export async function mergeMembers(incoming: VillageMember[] | undefined): Promise<number> {
  if (!incoming?.length) return 0;
  const ups = planLww(await listMembers(true), incoming);
  for (const m of ups) await writeMember(m);
  return ups.length;
}

// ---------- 鄰里小組 ----------
type GroupRow = { id: string; name: string; key: string; my_label: string; created_at: string; left_at: string | null };
type ItemRow = { id: string; group_id: string; date: string; time: string | null; title: string; assignee: string | null; location: string | null; note: string | null; created_by: string | null; updated_at: string; deleted_at: string | null };
const rowToGroup = (r: GroupRow): VillageGroup => ({ id: r.id, name: r.name, key: r.key, myLabel: r.my_label, createdAt: r.created_at, leftAt: r.left_at ?? undefined });
const rowToItem = (r: ItemRow): GroupItem => ({ id: r.id, groupId: r.group_id, date: r.date, time: r.time ?? undefined, title: r.title, assignee: r.assignee ?? undefined, location: r.location ?? undefined, note: r.note ?? undefined, createdBy: r.created_by ?? undefined, updatedAt: r.updated_at, deletedAt: r.deleted_at ?? undefined });

export async function listGroups(): Promise<VillageGroup[]> {
  const db = await getDb();
  return (await db.getAllAsync<GroupRow>('SELECT * FROM village_groups WHERE left_at IS NULL ORDER BY created_at ASC')).map(rowToGroup);
}

export async function getGroup(id: string): Promise<VillageGroup | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<GroupRow>('SELECT * FROM village_groups WHERE id = ?', id);
  return r ? rowToGroup(r) : null;
}

export async function createGroup(name: string, myLabel: string): Promise<VillageGroup> {
  const db = await getDb();
  const g: VillageGroup = { id: `grp-${newId()}`, name: name.trim(), key: await generateFamilyKey(), myLabel: myLabel.trim(), createdAt: nowIso() };
  await db.runAsync('INSERT INTO village_groups (id, name, key, my_label, created_at) VALUES (?, ?, ?, ?, ?)', g.id, g.name, g.key, g.myLabel, g.createdAt);
  emitDataChange();
  return g;
}

// 掃到加入碼：已加入過就更新名稱與金鑰並恢復；我在小組裡的稱呼由使用者填。
export async function joinGroup(code: { id: string; key: string; name: string }, myLabel: string): Promise<VillageGroup> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO village_groups (id, name, key, my_label, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, key = excluded.key, my_label = excluded.my_label, left_at = NULL`,
    code.id, code.name, code.key, myLabel.trim(), nowIso(),
  );
  emitDataChange();
  return (await getGroup(code.id))!;
}

export async function setMyLabel(groupId: string, myLabel: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE village_groups SET my_label = ? WHERE id = ?', myLabel.trim(), groupId);
  emitDataChange();
}

// 離開小組：刪掉這支手機上的金鑰與行程，其他家庭不受影響。
export async function leaveGroup(groupId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM group_items WHERE group_id = ?', groupId);
  await db.runAsync('DELETE FROM village_groups WHERE id = ?', groupId);
  emitDataChange();
}

export async function listGroupItems(groupId: string, includeDeleted = false): Promise<GroupItem[]> {
  const db = await getDb();
  const extra = includeDeleted ? '' : 'AND deleted_at IS NULL';
  const rows = await db.getAllAsync<ItemRow>(`SELECT * FROM group_items WHERE group_id = ? ${extra} ORDER BY date ASC, time ASC`, groupId);
  return rows.map(rowToItem);
}

async function writeItem(it: GroupItem): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO group_items (id, group_id, date, time, title, assignee, location, note, created_by, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET date = excluded.date, time = excluded.time, title = excluded.title, assignee = excluded.assignee, location = excluded.location,
       note = excluded.note, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at`,
    it.id, it.groupId, it.date, it.time ?? null, it.title, it.assignee ?? null, it.location ?? null, it.note ?? null, it.createdBy ?? null, it.updatedAt, it.deletedAt ?? null,
  );
}

export async function saveGroupItem(groupId: string, input: { date: string; time?: string; title: string; assignee?: string; location?: string; note?: string }, id?: string): Promise<GroupItem> {
  const g = await getGroup(groupId);
  const cur = id ? (await listGroupItems(groupId, true)).find((x) => x.id === id) : undefined;
  const it: GroupItem = { id: cur?.id ?? newId(), groupId, ...input, createdBy: cur?.createdBy ?? g?.myLabel, updatedAt: nowIso() };
  await writeItem(it);
  emitDataChange();
  return it;
}

export async function deleteGroupItem(groupId: string, id: string): Promise<void> {
  const db = await getDb();
  const ts = nowIso();
  await db.runAsync('UPDATE group_items SET deleted_at = ?, updated_at = ? WHERE id = ? AND group_id = ?', ts, ts, id, groupId);
  emitDataChange();
}

// 產生小組更新檔的文字（第一行是小組 id，第二行起是加密內容）。
export async function buildGroupFile(groupId: string): Promise<{ text: string; count: number }> {
  const g = await getGroup(groupId);
  if (!g) throw new Error('找不到這個小組');
  const items = await listGroupItems(groupId, true);
  const sealed = await encodeGroupFile({ v: 1, groupId, groupName: g.name, from: g.myLabel, createdAt: nowIso(), items }, await makeCrypto(g.key));
  return { text: groupFileText(groupId, sealed), count: items.filter((x) => !x.deletedAt).length };
}

export function looksLikeGroupFileText(text: string): boolean { return !!splitGroupFileText(text); }

// 合併收到的小組檔：沒加入過這個小組就無法解密。
export async function applyGroupFile(text: string): Promise<{ group: VillageGroup; from: string; updated: number }> {
  const parts = splitGroupFileText(text);
  if (!parts) throw new Error('這不是育村的小組檔');
  const g = await getGroup(parts.groupId);
  if (!g || g.leftAt) throw new Error('這支手機還沒加入這個小組：請先掃對方的小組加入碼');
  const pkg = await decodeGroupFile(parts.sealed, await makeCrypto(g.key));
  const ups = planLww(await listGroupItems(g.id, true), pkg.items.map((x) => ({ ...x, groupId: g.id })));
  for (const it of ups) await writeItem(it);
  if (pkg.groupName && pkg.groupName !== g.name) {
    const db = await getDb();
    await db.runAsync('UPDATE village_groups SET name = ? WHERE id = ?', pkg.groupName, g.id);
  }
  emitDataChange();
  return { group: g, from: pkg.from, updated: ups.length };
}
