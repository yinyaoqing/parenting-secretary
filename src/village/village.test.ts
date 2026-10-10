import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planLww, encodeGroupJoin, parseGroupJoin, encodeGroupFile, decodeGroupFile, groupFileText, splitGroupFileText, upcomingItems, buildHandoverText, type GroupItem } from './model.ts';
import type { SyncCrypto } from '../sync/codec.ts';

// 測試用的「加密」：XOR 固定位元組，只驗證流程，不驗證強度。
const fake = (k: number): SyncCrypto => ({
  encrypt: async (b) => b.map((x) => x ^ k),
  decrypt: async (b) => { if (k !== 7) throw new Error('bad key'); return b.map((x) => x ^ k); },
});

test('育村：同 id 以較晚的更新為準，同時間墓碑優先', () => {
  const local = [{ id: 'a', updatedAt: '2026-10-01', name: '阿嬤' }, { id: 'b', updatedAt: '2026-10-05', name: '保母' }];
  const incoming = [
    { id: 'a', updatedAt: '2026-10-03', name: '外婆' },
    { id: 'b', updatedAt: '2026-10-04', name: '舊' },
    { id: 'c', updatedAt: '2026-10-02', name: '爸爸' },
    { id: 'b', updatedAt: '2026-10-05', name: '保母', deletedAt: 'x' },
  ];
  assert.deepEqual(planLww(local, incoming).map((x) => `${x.id}:${x.name}${x.deletedAt ? '×' : ''}`), ['a:外婆', 'c:爸爸', 'b:保母×']);
});

test('鄰里小組：加入碼可還原，特殊字元不破壞格式', () => {
  const code = encodeGroupJoin({ id: 'g1', key: 'k+/=', name: '週三共學|森林組' });
  assert.deepEqual(parseGroupJoin(code), { id: 'g1', key: 'k+/=', name: '週三共學|森林組' });
  assert.equal(parseGroupJoin('PSPAIR1|x'), null);
});

test('鄰里小組：小組檔加解密往返；金鑰不對就失敗；檔案開頭帶小組 id', async () => {
  const items: GroupItem[] = [{ id: 'i1', groupId: 'g1', date: '2026-10-15', time: '09:00', title: '森林共學', assignee: '小米家', updatedAt: '2026-10-08' }];
  const sealed = await encodeGroupFile({ v: 1, groupId: 'g1', groupName: '週三共學', from: '小米家', createdAt: '2026-10-08', items }, fake(7));
  const back = await decodeGroupFile(sealed, fake(7));
  assert.equal(back.items[0].title, '森林共學');
  await assert.rejects(decodeGroupFile(sealed, fake(9)), /還沒加入/);
  const parts = splitGroupFileText(groupFileText('g1', sealed));
  assert.equal(parts?.groupId, 'g1');
  assert.equal(splitGroupFileText('PS1.abc'), null);
});

test('鄰里小組：只列今天以後、未刪除的行程，依日期時間排序', () => {
  const it = (id: string, date: string, time?: string, deletedAt?: string): GroupItem => ({ id, groupId: 'g', date, time, title: id, updatedAt: 'x', deletedAt });
  const list = upcomingItems([it('c', '2026-10-20', '08:00'), it('a', '2026-10-10', '10:00'), it('b', '2026-10-10', '09:00'), it('old', '2026-10-01'), it('del', '2026-10-30', undefined, 'x')], '2026-10-08');
  assert.deepEqual(list.map((x) => x.id), ['b', 'a', 'c']);
});

test('交班卡：注意事項、有電話的聯絡人、紀錄摘要依序出現', () => {
  const t = buildHandoverText('小米', '午睡前要喝水', [{ name: '媽媽', role: 'primary', phone: '0912' }, { name: '阿公', role: 'helper' }], '今天：餵奶 3 次');
  assert.match(t, /^【小米 交班卡】/);
  assert.ok(t.indexOf('注意事項') < t.indexOf('聯絡人') && t.indexOf('聯絡人') < t.indexOf('今天：餵奶'));
  assert.ok(t.includes('媽媽（主要照顧者）0912'));
  assert.ok(!t.includes('阿公'));
});
