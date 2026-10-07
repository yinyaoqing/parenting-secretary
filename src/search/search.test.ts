// 「問問看」檢索與「今天一句」挑卡的測試。執行：npm run test:search
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tokenize, expand, isEmergency, search, type SearchDoc } from './index.ts';
import { pickCard, stageOf, shareText, type EncourageCard } from '../encouragement/pick.ts';

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

console.log(`\n${passed} passed`);
