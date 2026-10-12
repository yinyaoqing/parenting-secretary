import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageStage, searchHint, diaryKinds, splitSafety, safetySummary } from './stage.ts';
import { pickWeekly, weekKey, fitsActivity, type Activity } from '../activities/select.ts';
import { homeLabel, relevantHomeKeys, defaultHome } from '../home/buttons.ts';

test('年齡階段：用字與清單跟著換', () => {
  assert.equal(ageStage(100), 'baby');
  assert.equal(ageStage(2000), 'preschool');
  assert.equal(ageStage(5000), 'teen');
  assert.ok(searchHint(100).includes('吐奶'));
  assert.ok(searchHint(3000).includes('課後照顧'));
  assert.ok(searchHint(5000).includes('會考'));
  assert.ok(diaryKinds(5000).includes('學校與升學'));
  assert.ok(!diaryKinds(5000).includes('分離焦慮'));
  assert.equal(homeLabel('solid', 200), '副食品');
  assert.equal(homeLabel('solid', 400), '吃飯');
});

test('首頁按鈕：尿布到 4 歲，吃飯不設上限，3C 到 12 歲，設定頁只列適用鍵', () => {
  const h = defaultHome('formula', 1200);
  assert.equal(h.diaper, true);
  assert.equal(h.solid, true);
  assert.equal(h.bottle, false);
  assert.equal(defaultHome('formula', 1500).diaper, false);
  assert.equal(defaultHome('formula', 5000).screen, false);
  assert.equal(defaultHome('formula', 3000).screen, true);
  const keys = relevantHomeKeys(5000);
  assert.ok(!keys.includes('breast') && !keys.includes('diaper') && keys.includes('solid') && keys.includes('timer'));
  assert.ok(relevantHomeKeys(5000, { breast: '1' }).includes('breast'));
});

test('安全層：依年齡分現在與較小的孩子，入口副標取標題主詞', () => {
  const c = (id: string, a: number, z: number, title: string) => ({ id, ageMinDays: a, ageMaxDays: z, title, topicGroup: 'safety' } as never);
  const cards = [c('a', 0, 365, '安全睡眠：仰睡'), c('b', 0, 1825, '腸病毒：洗手'), c('x', 0, 60, '新生兒攝取：喝多少')];
  const s = splitSafety(cards, 1000);
  assert.deepEqual(s.current.map((x: { id: string }) => x.id), ['b']);
  assert.deepEqual(s.past.map((x: { id: string }) => x.id), ['a', 'x']);
  assert.ok(safetySummary(s.current).startsWith('腸病毒'));
  assert.equal(splitSafety(cards, null).past.length, 0);
});

test('本週活動：3 歲前不推；依月份與年齡挑；同一週固定、換週可能不同', () => {
  const a = (id: string, min: number, max: number, months: number[] | null): Activity => ({ id, title: id, body: '', ageMinDays: min, ageMaxDays: max, months, setting: 'outdoor', cost: 'free', source: { name: 's', url: 'https://x.gov.tw/', license: 'A1' }, checkedAt: '' });
  const b = { version: 'v', checkedAt: 'c', items: [a('spring', 1095, 4380, [4, 5]), a('any', 1095, 4380, null), a('teen', 4380, 6570, null)] };
  assert.equal(pickWeekly(b, { ageDays: 800, now: new Date(2026, 3, 10), seed: 'c' }), null);
  const april = pickWeekly(b, { ageDays: 2000, now: new Date(2026, 3, 10), seed: 'c' });
  assert.ok(april && ['spring', 'any'].includes(april.id));
  const nov = pickWeekly(b, { ageDays: 2000, now: new Date(2026, 10, 10), seed: 'c' });
  assert.equal(nov?.id, 'any');
  assert.equal(pickWeekly(b, { ageDays: 5000, now: new Date(2026, 10, 10), seed: 'c' })?.id, 'teen');
  assert.equal(weekKey(new Date(2026, 9, 12)), weekKey(new Date(2026, 9, 18)));
  assert.notEqual(weekKey(new Date(2026, 9, 12)), weekKey(new Date(2026, 9, 19)));
  assert.equal(fitsActivity(b.items[0], 2000, 6), false);
});
