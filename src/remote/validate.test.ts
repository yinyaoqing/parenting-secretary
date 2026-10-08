import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isGovUrl, isSafeDataPath, policyUrlsSafe, scheduleUrlsSafe, alertUrlsSafe } from './validate.ts';
import { selectPolicy } from '../policy/select.ts';
import { gradeFor, showEntry } from '../progress/select.ts';

test('遠端資料：只接受政府網址與單純檔名', () => {
  assert.equal(isGovUrl('https://www.hpa.gov.tw/x'), true);
  assert.equal(isGovUrl('https://priori.moe.gov.tw/'), true);
  assert.equal(isGovUrl('https://stats.moe.edu.tw/a'), true);
  assert.equal(isGovUrl('http://www.hpa.gov.tw/x'), false);
  assert.equal(isGovUrl('https://gov.tw.evil.com/x'), false);
  assert.equal(isGovUrl('https://evil.com/?a=gov.tw/'), false);
  assert.equal(isSafeDataPath('policy.json'), true);
  assert.equal(isSafeDataPath('../x.json'), false);
  assert.equal(isSafeDataPath('https://evil.com/p.json'), false);
  const ok = { items: [{ source: { url: 'https://www.mohw.gov.tw/a' } }], todos: [{ source: { url: 'https://law.moj.gov.tw/b' } }] };
  assert.equal(policyUrlsSafe(ok), true);
  assert.equal(policyUrlsSafe({ ...ok, todos: [{ source: { url: 'https://example.com' } }] }), false);
  assert.equal(scheduleUrlsSafe({ sources: { a: { url: 'https://www.cdc.gov.tw/x' } } }), true);
  assert.equal(alertUrlsSafe({ items: [{ source: { url: 'https://www.hpa.gov.tw/x' } }] }), false);
});

test('政策：地方項目只給同縣市，沒填縣市只看到中央', () => {
  const src = { name: 'x', url: 'https://x.gov.tw/' };
  const base = { version: '2026-10-08', year: 2026, checkedAt: '2026-10-08' };
  const item = (id: string, county?: string) => ({ id, category: 'money', title: id, who: '', amounts: [], notes: [], apply: '', ageMinDays: 0, ageMaxDays: 365, source: src, checkedAt: '2026-10-08', county });
  const b = { ...base, items: [item('central'), item('yilan', '宜蘭縣'), item('taipei', '臺北市')], todos: [] };
  assert.deepEqual(selectPolicy(b, 30).items.map((i) => i.id), ['central']);
  assert.deepEqual(selectPolicy(b, 30, '宜蘭縣').items.map((i) => i.id), ['central', 'yilan']);
  assert.deepEqual(selectPolicy(b, 400, '宜蘭縣').items.map((i) => i.id), []);
});

test('進度對照：9 月 1 日前出生滿 6 歲當年入小一；沒有內容不顯示入口', () => {
  const now = new Date(2026, 9, 8); // 2026-10-08，115 學年
  assert.equal(gradeFor('2020-09-01', now), 1); // 9/1 出生，2026 年 9 月入學
  assert.equal(gradeFor('2020-09-02', now), 0); // 9/2 出生，晚一年
  assert.equal(gradeFor('2017-03-15', now), 4);
  assert.equal(gradeFor('2010-01-01', now), 7);
  assert.equal(gradeFor('2020-03-01', new Date(2026, 6, 1)), 0); // 7 月還是上一學年
  const empty = { version: 'x', source: { name: '', url: '', license: '' }, checkedAt: '', items: [] };
  assert.equal(showEntry(empty, 1, true), false);
  const one = { ...empty, items: [{ id: 'a', grade: 1, subject: '數學', text: '10 以內加法' }] };
  assert.equal(showEntry(one, 1, true), true);
  assert.equal(showEntry(one, 1, false), false);
  assert.equal(showEntry(one, 2, true), false);
});
