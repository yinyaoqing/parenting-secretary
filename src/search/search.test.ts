// 「問問看」檢索與「今天一句」挑卡的測試。執行：npm run test:search
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tokenize, expand, isEmergency, search, type SearchDoc } from './index.ts';
import { pickCard, stageOf, shareText, type EncourageCard } from '../encouragement/pick.ts';
import { resolveHome } from '../home/buttons.ts';
import { inventory, recentAmounts } from '../records/pump.ts';
import { buildShareText } from '../records/share.ts';
import { ignoredStreak, firedToday } from '../notify/plan.ts';
import { firstLine, sections } from '../content/summary.ts';
import { eventsToCsv } from '../records/csv.ts';

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed++; console.log('ok', name); }

const bundle = JSON.parse(readFileSync(new URL('../content/cards.generated.json', import.meta.url), 'utf8')) as { cards: SearchDoc[] };
const docs = bundle.cards;
const CARDS = (JSON.parse(readFileSync(new URL('../../content/encouragement/cards.json', import.meta.url), 'utf8')) as { cards: EncourageCard[] }).cards;

test('斷詞：去停用詞、切二字詞、辨認同義詞鍵', () => {
  const t = tokenize('寶寶一直吐奶怎麼辦？');
  assert.ok(t.includes('吐奶'));
  assert.ok(!t.includes('怎麼'));
  assert.deepEqual(tokenize('   '), []);
  assert.ok(tokenize('rsv 疫苗').includes('rsv'));
});

test('同義詞展開：拉肚子找得到腹瀉', () => {
  const terms = expand(tokenize('拉肚子')).map((x) => x.term);
  assert.ok(terms.includes('腹瀉'));
  const r = search('拉肚子', docs, 200);
  assert.ok(r.hits.length > 0);
  assert.ok(r.hits.some((h) => h.title.includes('腹瀉') || h.snippet.includes('腹瀉')));
});

test('危急字詞固定顯示 119；一般查詢不顯示', () => {
  assert.equal(isEmergency('寶寶發燒 38.5'), true);
  assert.equal(isEmergency('叫不醒'), true);
  assert.equal(isEmergency('副食品怎麼開始'), false);
  assert.equal(search('發燒', docs, 100).emergency, true);
});

test('安全層與符合年齡的卡排前面；不符合年齡的仍會出現', () => {
  const r = search('安全睡眠', docs, 30);
  assert.equal(r.hits[0].topicGroup, 'safety');
  const r2 = search('如廁', docs, 30);
  assert.ok(r2.hits.length > 0);
  assert.ok(r2.hits.some((h) => !h.inAge));
});

test('沒有結果時回空陣列，不報錯', () => {
  assert.deepEqual(search('zzzz', docs, 100).hits, []);
});

test('今天一句：依階段挑，同一天同一張，處境卡優先，夜起 4 次才套 night', () => {
  assert.equal(stageOf(0), 'newborn');
  assert.equal(stageOf(400), 'toddler');
  assert.equal(stageOf(9000), null);
  const a = pickCard({ ageDays: 30, contexts: [], date: '2026-10-08', seed: 'c1' }, CARDS);
  const b = pickCard({ ageDays: 30, contexts: [], date: '2026-10-08', seed: 'c1' }, CARDS);
  assert.ok(a && b && a.id === b.id);
  assert.ok(a!.stages.includes('newborn'));
  const n3 = pickCard({ ageDays: 30, contexts: ['night'], nightWakes: 3, date: '2026-10-08', seed: 'c1' }, CARDS);
  assert.ok(!n3!.contexts?.includes('night'));
  const n5 = pickCard({ ageDays: 30, contexts: ['night'], nightWakes: 5, date: '2026-10-08', seed: 'c1' }, CARDS);
  assert.ok(n5!.contexts?.includes('night'));
  if (n5!.template === 'night') assert.ok(n5!.body.includes('5 次'));
  const single = pickCard({ ageDays: 500, contexts: ['single'], date: '2026-10-08', seed: 'c2' }, CARDS);
  assert.ok(single!.contexts?.includes('single'));
});

test('今天一句：避免近期重複；分享文字標示模擬', () => {
  const first = pickCard({ ageDays: 800, contexts: [], date: '2026-10-08', seed: 'c3' }, CARDS)!;
  const next = pickCard({ ageDays: 800, contexts: [], date: '2026-10-08', seed: 'c3', recent: [first.id] }, CARDS)!;
  assert.notEqual(first.id, next.id);
  const thought = pickCard({ ageDays: 800, contexts: [], date: '2026-10-09', seed: 'x', recent: [] }, CARDS)!;
  const text = shareText({ ...thought, kind: 'thought', voice: '如果是老子', source: { name: '《老子》', license: 'C' } });
  assert.ok(text.includes('模擬'));
});

test('首頁按鈕：依餵養方式與年齡，自訂覆蓋預設', () => {
  const bottle = resolveHome('formula', 150, {});
  assert.equal(bottle.breast, false);
  assert.equal(bottle.bottle, true);
  assert.equal(bottle.pump, false);
  assert.equal(bottle.solid, true);
  const breast = resolveHome('breast', 30, {});
  assert.equal(breast.breast, true);
  assert.equal(breast.bottle, false);
  assert.equal(breast.pump, true);
  assert.equal(breast.solid, false);
  const older = resolveHome('breast', 800, { breast: '1', diaper: '0' });
  assert.equal(older.breast, true);
  assert.equal(older.diaper, false);
  assert.equal(older.tummy, false);
});

test('母乳庫存：存進冷藏冷凍、未用掉的才算；超過 333 期限標示', () => {
  const now = new Date('2026-10-08T12:00:00Z').getTime();
  const ev = (id: string, type: string, daysAgo: number, payload: Record<string, unknown>) => ({ id, type, startAt: new Date(now - daysAgo * 86400000).toISOString(), payload });
  const inv = inventory([ev('a', 'feed.pump', 4, { ml: 100, store: 'fridge' }), ev('b', 'feed.pump', 1, { ml: 120, store: 'fridge' }), ev('c', 'feed.pump', 10, { ml: 90, store: 'freezer' }), ev('d', 'feed.pump', 0, { ml: 80, store: 'feed' }), ev('u', 'pump.use', 0, { pumpId: 'b' })], now);
  assert.deepEqual(inv.fridge.map((x) => x.id), ['a']);
  assert.equal(inv.fridge[0].pastGuide, true);
  assert.deepEqual(inv.freezer.map((x) => x.id), ['c']);
  assert.equal(inv.freezer[0].pastGuide, false);
  assert.deepEqual(recentAmounts([{ type: 'feed.bottle', payload: { ml: 150 } }, { type: 'feed.bottle', payload: { ml: 120 } }, { type: 'feed.bottle', payload: { ml: 150 } }], 'feed.bottle', [90]), [90, 120, 150]);
});

test('分享今天：只有紀錄，數字正確，沒有評語', () => {
  const day = new Date('2026-10-08T00:00:00').getTime();
  const at = (h: number, m = 0) => new Date(day + (h * 60 + m) * 60000).toISOString();
  const text = buildShareText('小米', [
    { type: 'feed.bottle', startAt: at(7, 10), payload: { ml: 150 } },
    { type: 'feed.breast', startAt: at(10), payload: { side: 'L' } },
    { type: 'diaper.wet', startAt: at(8), payload: {} },
    { type: 'diaper.both', startAt: at(11), payload: {} },
    { type: 'sleep', startAt: at(12), endAt: at(13, 30), payload: {} },
    { type: 'medication', startAt: at(9), payload: { name: '退燒藥', doseText: '5ml', intervalHours: 6 } },
  ], day, day + 15 * 3600000, '10/8');
  assert.ok(text.includes('餵奶 2 次（瓶餵共 150 ml）'));
  assert.ok(text.includes('尿布 2 片：濕 2、便 1'));
  assert.ok(text.includes('睡眠 1 次，共 1 時 30 分'));
  assert.ok(text.includes('退燒藥 5ml（間隔 6 小時）'));
  assert.ok(!/應該|建議|太少|太多|正常/.test(text));
});

test('提醒疲勞：點開後歸零；每日上限只算今天', () => {
  const now = new Date('2026-10-08T20:00:00').getTime();
  const fired = [{ kind: 'safetyNet' as const, at: now - 5 * 3600000 }, { kind: 'safetyNet' as const, at: now - 3 * 3600000 }, { kind: 'safetyNet' as const, at: now - 1 * 3600000 }, { kind: 'safetyNet' as const, at: now - 30 * 3600000 }];
  assert.equal(ignoredStreak(fired, [], 'safetyNet'), 4);
  assert.equal(ignoredStreak(fired, [{ kind: 'safetyNet', at: now - 4 * 3600000 }], 'safetyNet'), 2);
  assert.equal(ignoredStreak(fired, [], 'medication'), 0);
  assert.equal(firedToday(fired, 'safetyNet', now), 3);
});

test('卡片一句話與分段：取第一句，段首標題當折疊標題', () => {
  const body = '這週的樣子：多數寶寶會翻身了。眼神更靈活。\n\n玩具：多種顏色。\n\n哺乳：仍以奶為主。';
  assert.equal(firstLine({ body }), '多數寶寶會翻身了。');
  assert.deepEqual(sections(body).map((s) => s.title), ['這週的樣子', '玩具', '哺乳']);
});

test('CSV 匯出：有 BOM、逗號與換行會加引號、依時間排序', () => {
  const csv = eventsToCsv([
    { childId: 'c1', type: 'symptom', startAt: '2026-10-08T10:00:00Z', payload: { note: '咳嗽, 晚上多' }, recordedBy: 'd' },
    { childId: 'c1', type: 'feed.bottle', startAt: '2026-10-08T08:00:00Z', payload: { ml: 120 }, recordedBy: 'd' },
  ], { c1: '小米' }, (t) => t, () => '');
  assert.ok(csv.startsWith('﻿孩子,開始'));
  const lines = csv.trim().split('\r\n');
  assert.ok(lines[1].includes('feed.bottle'));
  assert.ok(lines[2].includes('"{""note"":""咳嗽, 晚上多""}"'));
});

console.log(`\n${passed} passed`);
