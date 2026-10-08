import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toEventSpec, firstOccurrence, reconcile, specHash, canSync } from './plan.ts';
import type { ScheduleItem } from '../db/types.ts';

const base: ScheduleItem = { id: 'i1', childId: 'c1', title: '早療', kind: 'visit', weekdays: [2, 4], time: '14:30', durationMinutes: 50, location: '復健科', leadMinutes: 60, syncToDeviceCalendar: false, createdAt: '', updatedAt: '' };

test('行事曆：第一次發生落在選定星期，開始日與結束日生效', () => {
  const mon = new Date(2026, 9, 5, 10, 0); // 2026-10-05 週一
  const d = firstOccurrence(base, mon)!;
  assert.equal(d.getDay(), 2);
  assert.equal(d.getDate(), 6);
  assert.equal(d.getHours(), 14);
  const later = firstOccurrence({ ...base, validFrom: '2026-10-09' }, mon)!;
  assert.equal(later.getDate(), 13); // 10-09 週五起，下一個週二是 10-13
  assert.equal(firstOccurrence({ ...base, validTo: '2026-10-05' }, mon), null);
});

test('行事曆：事件內容含孩子名字、時長、提醒；作息範本與已刪除不同步', () => {
  const now = new Date(2026, 9, 5, 10, 0);
  const s = toEventSpec(base, '小米', now)!;
  assert.equal(s.title, '小米：早療');
  assert.equal((s.endDate.getTime() - s.startDate.getTime()) / 60000, 50);
  assert.equal(s.alarmMinutes, 60);
  assert.equal(toEventSpec({ ...base, durationMinutes: undefined, leadMinutes: 0 }, '小米', now)!.alarmMinutes, undefined);
  assert.equal(canSync({ ...base, kind: 'routine' }), false);
  assert.equal(canSync({ ...base, deletedAt: 'x' }), false);
});

test('行事曆：比對產生新增、更新、刪除；行事曆端刪掉的不重建，改了行程才重建', () => {
  const b = { ...base, id: 'i2', title: '游泳' };
  const map = {
    i1: { eventId: 'e1', hash: specHash(base, '小米') },
    i2: { eventId: 'e2', hash: 'old' },
    i3: { eventId: 'e3', hash: 'x' },
  };
  const acts = reconcile([{ item: base, childName: '小米' }, { item: b, childName: '小米' }, { item: { ...base, id: 'i4' }, childName: '小米' }], map);
  assert.deepEqual(acts.map((a) => `${a.op}:${a.itemId}`).sort(), ['create:i4', 'delete:i3', 'skip:i1', 'update:i2'].sort());
  const gone = { i1: { hash: specHash(base, '小米'), gone: true } };
  assert.equal(reconcile([{ item: base, childName: '小米' }], gone)[0].op, 'skip');
  assert.equal(reconcile([{ item: { ...base, time: '15:00' }, childName: '小米' }], gone)[0].op, 'create');
});
