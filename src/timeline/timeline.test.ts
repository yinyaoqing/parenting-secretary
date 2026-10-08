// 時間軸計畫層與如廁訓練任務的測試。執行：npm run test:timeline
import assert from 'node:assert/strict';
import { anchorDate, occurrencesOn, deriveTemplates, weekdaysLabel, addMonthsIso, scheduleSub, type SleepSeg } from './plan.ts';
import { taskStatus, countAttempts } from '../tasks/toilet.ts';
import { wantsSupport, invitationKey, askMessage } from '../caregiver/resources.ts';
import { planNotifications, medianDelay } from '../notify/plan.ts';
import type { ScheduleItem } from '../db/types';

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed++; console.log('ok', name); }

const item = (p: Partial<ScheduleItem> & { id: string }): ScheduleItem => ({
  childId: 'c1', title: '小睡', kind: 'routine', weekdays: [0, 1, 2, 3, 4, 5, 6], time: '09:00', durationMinutes: 60, leadMinutes: 0,
  syncToDeviceCalendar: false, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', ...p,
});

test('月齡起點至少 6 個月；月底出生的孩子不會跳到下下個月', () => {
  assert.equal(anchorDate({ type: 'age', months: 6 }, { birthDate: '2026-03-15' }), '2026-09-15');
  assert.equal(anchorDate({ type: 'age', months: 3 }, { birthDate: '2026-03-15' }), '2026-09-15');
  assert.equal(addMonthsIso('2026-08-31', 6), '2027-02-28');
});

test('事件起點：沒有日期就是 null，有日期就用該日', () => {
  assert.equal(anchorDate({ type: 'event', event: 'daycare' }, { birthDate: '2026-01-01' }), null);
  assert.equal(anchorDate({ type: 'event', event: 'solids' }, { birthDate: '2026-01-01', firstSolidDate: '2026-07-02' }), '2026-07-02');
  assert.equal(anchorDate({ type: 'event', event: 'school' }, { birthDate: '2020-01-01', schoolFrom: '2026-09-01' }), '2026-09-01');
});

test('範本：開關關閉或未到起點不畫；固定行程照畫', () => {
  const items = [item({ id: 'r1' }), item({ id: 'c1', kind: 'care', title: '托嬰', time: '08:30', durationMinutes: 540, weekdays: [1, 2, 3, 4, 5] })];
  const monday = '2026-10-05';
  const base = { birthDate: '2026-01-01' };
  assert.deepEqual(occurrencesOn(items, monday, { ...base, templatesOn: false, anchorDate: '2026-07-01' }).map((o) => o.item.id), ['c1']);
  assert.deepEqual(occurrencesOn(items, monday, { ...base, templatesOn: true, anchorDate: '2026-10-06' }).map((o) => o.item.id), ['c1']);
  assert.deepEqual(occurrencesOn(items, monday, { ...base, templatesOn: true, anchorDate: '2026-10-05' }).map((o) => o.item.id), ['c1', 'r1']);
  // 週日沒有托嬰
  assert.deepEqual(occurrencesOn(items, '2026-10-04', { ...base, templatesOn: true, anchorDate: '2026-07-01' }).map((o) => o.item.id), ['r1']);
});

test('6 個月前的範本不畫餵食；滿 6 個月後照家長的範本畫', () => {
  const items = [item({ id: 'f', title: '餵奶', time: '10:00', durationMinutes: 20 }), item({ id: 's', title: '小睡' })];
  const o = { templatesOn: true, anchorDate: '2026-03-01', birthDate: '2026-02-01' };
  assert.deepEqual(occurrencesOn(items, '2026-04-01', o).map((x) => x.item.id), ['s']);
  assert.deepEqual(occurrencesOn(items, '2026-09-01', o).map((x) => x.item.id), ['s', 'f']);
});

test('跨午夜的範本切成兩段', () => {
  const items = [item({ id: 'n', title: '夜間睡眠', time: '19:30', durationMinutes: 600 })];
  const occ = occurrencesOn(items, '2026-10-05', { templatesOn: true, anchorDate: '2026-01-01', birthDate: '2025-06-01' });
  assert.deepEqual(occ.map((x) => [x.startMin, x.endMin]), [[0, 330], [1170, 1440]]);
});

test('有效期間：validFrom 前、validTo 後都不畫', () => {
  const items = [item({ id: 'k', kind: 'class', title: '國語', validFrom: '2026-09-01', validTo: '2027-01-20' })];
  const o = { templatesOn: false, anchorDate: null, birthDate: '2019-01-01' };
  assert.equal(occurrencesOn(items, '2026-08-31', o).length, 0);
  assert.equal(occurrencesOn(items, '2026-10-05', o).length, 1);
  assert.equal(occurrencesOn(items, '2027-01-21', o).length, 0);
});

test('從這週產生：取自己紀錄的中位數，凌晨入睡不會被平均到中午', () => {
  const segs: SleepSeg[] = [];
  const days = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'];
  days.forEach((d, i) => {
    segs.push({ day: d, startMin: 8 * 60 + i * 5, durMin: 55 + i });
    segs.push({ day: d, startMin: 12 * 60, durMin: 90 });
    segs.push({ day: d, startMin: i % 2 ? 23 * 60 + 50 : 10, durMin: 600 });
  });
  const t = deriveTemplates(segs);
  assert.ok(t);
  assert.deepEqual(t!.map((x) => x.title), ['小睡', '小睡', '夜間睡眠']);
  assert.equal(t![0].time, '08:10');
  assert.equal(t![1].time, '12:00');
  assert.ok(t![2].time === '00:10' || t![2].time === '23:50', `night ${t![2].time}`);
  assert.equal(t![2].durationMinutes, 600);
});

test('從這週產生：少於 3 天不產生', () => {
  assert.equal(deriveTemplates([{ day: '2026-10-01', startMin: 600, durMin: 60 }, { day: '2026-10-02', startMin: 600, durMin: 60 }]), null);
});

test('星期與行程文字', () => {
  assert.equal(weekdaysLabel([1, 2, 3, 4, 5]), '一到五');
  assert.equal(weekdaysLabel([0, 1, 2, 3, 4, 5, 6]), '每天');
  assert.equal(weekdaysLabel([4, 2]), '二、四');
  assert.equal(scheduleSub(item({ id: 'x', kind: 'visit', title: '早療', weekdays: [2], time: '15:00', durationMinutes: 50, location: '復健科', leadMinutes: 60 })), '二 15:00 到 15:50 · 復健科 · 提前 1 小時提醒');
});

test('如廁訓練：最後一筆生命週期事件決定狀態', () => {
  const ev = (type: string, startAt: string, payload: Record<string, unknown> = { task: 'toilet' }) => ({ type, startAt, payload });
  assert.deepEqual(taskStatus([]), { state: 'none' });
  assert.deepEqual(taskStatus([ev('task.start', '2026-10-01T01:00:00Z')]), { state: 'active', since: '2026-10-01T01:00:00Z' });
  assert.equal(taskStatus([ev('task.start', '2026-10-01T01:00:00Z'), ev('task.pause', '2026-10-03T01:00:00Z')]).state, 'paused');
  assert.equal(taskStatus([ev('task.pause', '2026-10-03T01:00:00Z'), ev('task.start', '2026-10-10T01:00:00Z')]).state, 'active');
  assert.equal(taskStatus([ev('task.start', '2026-10-01T01:00:00Z', { task: 'other' })]).state, 'none');
});

test('如廁訓練：只數次數', () => {
  const a = (outcome: string, startAt: string) => ({ type: 'task.attempt', startAt, payload: { task: 'toilet', outcome } });
  const c = countAttempts([a('pee', '2026-10-05T01:00:00Z'), a('none', '2026-10-05T03:00:00Z'), a('accident', '2026-10-05T05:00:00Z'), a('pee', '2026-09-01T01:00:00Z')], '2026-09-29T00:00:00Z');
  assert.equal(c.total, 3);
  assert.equal(c.byOutcome.pee, 1);
  assert.equal(c.byOutcome.accident, 1);
});

test('照顧者：最近 3 天有 2 天心情很難受才主動放資源；邀請只在產後 2 週與 6 週', () => {
  const c = (mood: 0 | 1 | 2) => ({ sleep: 0 as const, energy: 0 as const, mood });
  const dates = ['2026-10-06', '2026-10-05', '2026-10-04', '2026-10-03'];
  assert.equal(wantsSupport({ '2026-10-06': c(2), '2026-10-05': c(1), '2026-10-04': c(0) }, dates), false);
  assert.equal(wantsSupport({ '2026-10-06': c(2), '2026-10-04': c(2) }, dates), true);
  assert.equal(wantsSupport({ '2026-10-03': c(2), '2026-10-06': c(2) }, dates), false);
  assert.deepEqual([13, 14, 20, 21, 42, 48, 49].map(invitationKey), [null, '2w', '2w', null, '6w', '6w', null]);
  assert.ok(askMessage(['陪我聊一聊'], '').includes('・陪我聊一聊'));
});

test('通知規劃：暫停時不排；安全網只在 1 歲前；只排未來；依優先序截斷', () => {
  const now = new Date('2026-10-06T10:00:00+08:00').getTime();
  const base = { paused: false, safetyNet: true, medication: true, timer: true, schedule: true, publicSchedule: true };
  const child = {
    id: 'c1', name: '小米', ageDays: 100, lastFeedAt: new Date(now - 60 * 60000).toISOString(), safetyNetMinutes: 150,
    meds: [{ name: '退燒藥', lastAt: new Date(now - 2 * 3600000).toISOString(), intervalHours: 6 }, { name: '舊藥', lastAt: new Date(now - 10 * 3600000).toISOString(), intervalHours: 6 }],
    occurrences: [{ title: '早療', start: now + 3 * 3600000, leadMinutes: 60, location: '復健科' }, { title: '親子館', start: now + 3600000, leadMinutes: 0 }],
    publicOpens: [{ title: '第 3 次預防保健', category: '兒童預防保健', window: '2 到 4 個月', opensOn: now + 2 * 86400000 }],
  };
  assert.equal(planNotifications([child], { ...base, paused: true }, now).length, 0);
  const p = planNotifications([child], base, now);
  assert.deepEqual(p.map((x) => x.kind), ['safetyNet', 'schedule', 'medication', 'public']);
  assert.equal(p[0].at, now + 90 * 60000);
  assert.ok(p.find((x) => x.kind === 'medication')!.body.includes('不建議劑量'));
  assert.equal(planNotifications([{ ...child, ageDays: 400 }], base, now).filter((x) => x.kind === 'safetyNet').length, 0);
  const many = { ...child, occurrences: Array.from({ length: 80 }, (_, i) => ({ title: `課${i}`, start: now + (i + 2) * 3600000, leadMinutes: 15 })) };
  const capped = planNotifications([many], base, now);
  assert.equal(capped.length, 60);
  assert.ok(capped.some((x) => x.kind === 'safetyNet') && capped.some((x) => x.kind === 'medication'));
  assert.equal(medianDelay([3, 1, 2, 10]), 2.5);
  // 倒數提醒：通知標題只重複使用者的字，關閉設定就不排。
  const withTimer = { ...child, timers: [{ id: 't1', title: '奶瓶消毒好了', at: now + 40 * 60000 }, { id: 't2', title: '過期', at: now - 60000 }] };
  const timers = planNotifications([withTimer], base, now).filter((x) => x.kind === 'timer');
  assert.equal(timers.length, 1);
  assert.equal(timers[0].title, '奶瓶消毒好了');
  assert.equal(planNotifications([withTimer], { ...base, timer: false }, now).filter((x) => x.kind === 'timer').length, 0);
});

console.log(`\n${passed} passed`);
