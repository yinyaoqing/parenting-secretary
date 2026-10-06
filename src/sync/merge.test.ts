// 合併引擎測試。執行：node --experimental-strip-types src/sync/merge.test.ts
import assert from 'node:assert/strict';
import { planMerge, planChildren, remapEvents, planSchedule, type SyncEvent, type SyncChild, type SyncScheduleItem } from './merge.ts';

const ev = (p: Partial<SyncEvent> & { id: string }): SyncEvent => ({
  childId: 'c1', type: 'diaper.wet', startAt: '2026-10-05T10:00:00.000Z', payload: {}, recordedBy: 'A', source: 'home', createdAt: '2026-10-05T10:00:00.000Z', ...p,
});

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed++; console.log('ok', name); }

test('聯集：本機沒有的事件插入，已有的不重複', () => {
  const local = [ev({ id: 'a1' })];
  const incoming = [ev({ id: 'a1' }), ev({ id: 'b1', recordedBy: 'B', startAt: '2026-10-05T12:00:00.000Z' })];
  const p = planMerge(local, incoming);
  assert.deepEqual(p.inserts.map((e) => e.id), ['b1']);
  assert.equal(p.updates.length, 0);
});

test('刪除與結束時間只能單向補上', () => {
  const local = [ev({ id: 's1', type: 'sleep' }), ev({ id: 'd1' })];
  const incoming = [ev({ id: 's1', type: 'sleep', endAt: '2026-10-05T11:00:00.000Z' }), ev({ id: 'd1', deletedAt: '2026-10-05T13:00:00.000Z' })];
  const p = planMerge(local, incoming);
  assert.deepEqual(p.updates, [{ id: 's1', endAt: '2026-10-05T11:00:00.000Z' }, { id: 'd1', deletedAt: '2026-10-05T13:00:00.000Z' }]);
  // 反向：本機已有結束時間，對方沒有 → 不動
  const p2 = planMerge(incoming, local);
  assert.equal(p2.updates.length, 0);
});

test('同筆被兩邊修正：保留較晚的修正，另一筆加墓碑', () => {
  const orig = ev({ id: 'o', startAt: '2026-10-05T09:00:00.000Z' });
  const fixA = ev({ id: 'fa', supersedes: 'o', startAt: '2026-10-05T09:10:00.000Z', createdAt: '2026-10-05T09:30:00.000Z' });
  const fixB = ev({ id: 'fb', supersedes: 'o', recordedBy: 'B', startAt: '2026-10-05T09:05:00.000Z', createdAt: '2026-10-05T09:40:00.000Z' });
  const p = planMerge([orig, fixA], [orig, fixB]);
  assert.deepEqual(p.inserts.map((e) => e.id), ['fb']);
  assert.deepEqual(p.tombstones, [{ id: 'fa', reason: 'superseded-conflict' }]);
});

test('兩邊各自開始睡眠：只留最早開始的那筆', () => {
  const sA = ev({ id: 'sa', type: 'sleep', startAt: '2026-10-05T20:00:00.000Z' });
  const sB = ev({ id: 'sb', type: 'sleep', recordedBy: 'B', startAt: '2026-10-05T20:03:00.000Z' });
  const p = planMerge([sA], [sB]);
  assert.deepEqual(p.tombstones, [{ id: 'sb', reason: 'duplicate-open-sleep' }]);
  // 已結束的睡眠不受影響
  const p2 = planMerge([ev({ id: 'x', type: 'sleep', endAt: '2026-10-05T21:00:00.000Z' })], [sB]);
  assert.equal(p2.tombstones.length, 0);
});

test('一分鐘內不同裝置記的同類事件回報為可能重複，不刪', () => {
  const a = ev({ id: 'a', startAt: '2026-10-05T10:00:00.000Z' });
  const b = ev({ id: 'b', recordedBy: 'B', startAt: '2026-10-05T10:00:40.000Z' });
  const c = ev({ id: 'c', recordedBy: 'B', type: 'diaper.dirty', startAt: '2026-10-05T10:00:50.000Z' });
  const p = planMerge([a], [b, c]);
  assert.deepEqual(p.duplicates, [{ a: 'a', b: 'b', type: 'diaper.wet' }]);
  assert.equal(p.tombstones.length, 0);
  // 同一裝置自己連記兩筆不算
  const p2 = planMerge([a], [ev({ id: 'a2', startAt: '2026-10-05T10:00:30.000Z' })]);
  assert.equal(p2.duplicates.length, 0);
});

test('合併是冪等的：同一包套用兩次不再產生變更', () => {
  const local = [ev({ id: 'a1' })];
  const incoming = [ev({ id: 'b1', recordedBy: 'B' })];
  const p1 = planMerge(local, incoming);
  const after = [...local, ...p1.inserts];
  const p2 = planMerge(after, incoming);
  assert.equal(p2.inserts.length + p2.updates.length + p2.tombstones.length + p2.duplicates.length, 0);
});

const child = (p: Partial<SyncChild> & { id: string }): SyncChild => ({
  nickname: '小米', birthDate: '2026-06-23', feedingMethod: 'breast', location: 'home', specialContexts: [], createdAt: '2026-06-24T00:00:00.000Z', updatedAt: '2026-06-24T00:00:00.000Z', ...p,
});

test('孩子：兩邊各自建檔同一個孩子，雙方收斂到較小的 id', () => {
  const pA = planChildren([child({ id: 'zzz' })], [child({ id: 'aaa' })]);
  assert.deepEqual(pA.remapLocal.map((m) => [m.from, m.to]), [['zzz', 'aaa']]);
  assert.equal(pA.insert.length, 0);
  const pB = planChildren([child({ id: 'aaa' })], [child({ id: 'zzz' })]);
  assert.deepEqual(pB.remapIncoming, [{ from: 'zzz', to: 'aaa' }]);
  assert.deepEqual(remapEvents([ev({ id: 'e', childId: 'zzz' })], pB.remapIncoming)[0].childId, 'aaa');
});

test('孩子：不同出生日視為不同孩子，直接插入；同 id 以較新者更新', () => {
  const p = planChildren([child({ id: 'a' })], [child({ id: 'b', birthDate: '2024-01-01' }), child({ id: 'a', nickname: '米米', updatedAt: '2026-09-01T00:00:00.000Z' })]);
  assert.deepEqual(p.insert.map((c) => c.id), ['b']);
  assert.deepEqual(p.update.map((c) => c.nickname), ['米米']);
});

test('行程：同 id 以較晚的更新為準，刪除在同時間時優先，孩子 id 會跟著收斂', () => {
  const it = (p: Partial<SyncScheduleItem> & { id: string }): SyncScheduleItem => ({ childId: 'c1', title: '托嬰', kind: 'care', weekdays: [1], time: '08:30', leadMinutes: 0, syncToDeviceCalendar: false, createdAt: 't0', updatedAt: '2026-10-01T00:00:00Z', ...p });
  const local = [it({ id: 's1' }), it({ id: 's2', updatedAt: '2026-10-05T00:00:00Z' }), it({ id: 's3' })];
  const incoming = [
    it({ id: 's1', title: '托嬰中心', updatedAt: '2026-10-02T00:00:00Z' }),
    it({ id: 's2', title: '舊的', updatedAt: '2026-10-03T00:00:00Z' }),
    it({ id: 's3', deletedAt: '2026-10-01T00:00:00Z' }),
    it({ id: 's4', childId: 'cB' }),
  ];
  const up = planSchedule(local, incoming, [{ from: 'cB', to: 'c1' }]);
  assert.deepEqual(up.map((x) => x.id), ['s1', 's3', 's4']);
  assert.equal(up.find((x) => x.id === 's4')!.childId, 'c1');
});

console.log(`\n${passed} tests passed`);
