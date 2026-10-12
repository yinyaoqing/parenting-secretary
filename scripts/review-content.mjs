#!/usr/bin/env node
// 內容卡人工複核（R9）：列出待審、輸出審核表、把審核結果匯回卡片狀態。不改 body；只改 status。
//
// 用法：
//   node scripts/review-content.mjs --list [--status draft] [--group health] [--band 3-6]   列出卡片
//   node scripts/review-content.mjs --show health.p-vision-3-to-6                            終端機並列主文與原文摘錄、來源網址
//   node scripts/review-content.mjs --sheet docs/review/review-2026-10-12.csv [--status draft] [--band 6-12]
//                                                                                             輸出審核表（CSV，Excel 或 Google 試算表可開）
//   node scripts/review-content.mjs --apply docs/review/review-2026-10-12.csv [--dry-run]    依「結果」欄改狀態
//   node scripts/review-content.mjs --set review --ids health.p-vision-3-to-6,health.p-checkup-3-to-7
//
// 審核表欄位：id、主題群、標題、年齡、授權、狀態、主文、原文摘錄、來源網址、
//   核對一：主文每句都能在原文找到依據（Y/N）、核對二：沒有原文沒有的建議或數字（Y/N）、
//   核對三：沒有診斷、劑量、評分、趴睡字樣（Y/N）、核對四：來源網址在瀏覽器打得開（Y/N）、
//   結果（review / published / 退回）、備註。
// 匯回規則：結果為 review 或 published 才改狀態；published 的翻譯卡需 translationReviewed=true，否則退為 review 並提示；
//   「退回」不改狀態，只把備註印出來。寫回後請跑 npm run content:check 與 npm run content:build。
import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const BANDS = { '0-1': [0, 365], '1-3': [365, 1095], '3-6': [1095, 2190], '6-12': [2190, 4380], '12-18': [4380, 6570] };

const walk = (d) => readdirSync(d).flatMap((n) => { const q = join(d, n); return statSync(q).isDirectory() ? walk(q) : q.endsWith('.json') ? [q] : []; });
const files = walk(join(ROOT, 'content', 'cards'));
const cards = files.map((f) => ({ file: f, card: JSON.parse(readFileSync(f, 'utf8')) }));
const bandLabel = (c) => Object.entries(BANDS).filter(([, [a, z]]) => c.ageMinDays < z && c.ageMaxDays > a).map(([k]) => k).join(' ');

let list = cards;
if (opt('--status')) list = list.filter((x) => x.card.status === opt('--status'));
if (opt('--group')) list = list.filter((x) => x.card.topicGroup === opt('--group'));
if (opt('--band')) { const [a, z] = BANDS[opt('--band')] || [0, 99999]; list = list.filter((x) => x.card.ageMinDays < z && x.card.ageMaxDays > a); }
list.sort((p, q) => p.card.ageMinDays - q.card.ageMinDays || p.card.id.localeCompare(q.card.id));

const csvCell = (v) => '"' + String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, '\n') + '"';
const parseCsv = (text) => {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ''));
};
const save = (x) => writeFileSync(x.file, JSON.stringify(x.card, null, 2) + '\n');

if (has('--list')) {
  console.log(`${list.length} 張`);
  for (const { card: c } of list) console.log(`${c.status.padEnd(9)} ${bandLabel(c).padEnd(9)} ${c.sources.map((s) => s.license).join('/').padEnd(6)} ${c.id}  ${c.title}`);
  const st = {}; for (const { card: c } of list) st[c.status] = (st[c.status] || 0) + 1; console.log(st);
} else if (opt('--show')) {
  const x = cards.find((y) => y.card.id === opt('--show')); if (!x) { console.error('找不到 ' + opt('--show')); process.exit(1); }
  const c = x.card;
  console.log(`# ${c.title}\n${c.id}  ${c.ageMinDays}-${c.ageMaxDays} 天  status=${c.status}  translated=${c.translated}\n\n## 主文\n${c.body}\n`);
  c.sources.forEach((s, i) => console.log(`## 來源 ${i + 1}（${s.license} ${s.trust}）${s.name}\n${s.url}\n--- 原文摘錄 ---\n${s.excerpt || '（無）'}\n`));
  (c.readMore || []).forEach((r) => console.log(`延伸：${r.label} ${r.url}`));
} else if (opt('--sheet')) {
  const out = join(ROOT, opt('--sheet'));
  mkdirSync(dirname(out), { recursive: true });
  const head = ['id', '主題群', '標題', '年齡（天）', '授權', '狀態', '主文', '原文摘錄', '來源網址', '核對一 原文有依據', '核對二 無新增建議', '核對三 無紅線字樣', '核對四 網址可開', '結果', '備註'];
  const rows = list.map(({ card: c }) => [c.id, c.topicGroup, c.title, `${c.ageMinDays}-${c.ageMaxDays}`, c.sources.map((s) => s.license).join('/'), c.status + (c.translated ? (c.translationReviewed ? '（已譯審）' : '（待譯審）') : ''), c.body, c.sources.map((s, i) => `[${i + 1}] ${s.excerpt || ''}`).join('\n\n'), c.sources.map((s) => s.url).join('\n'), '', '', '', '', '', ''].map(csvCell).join(','));
  writeFileSync(out, '﻿' + [head.map(csvCell).join(','), ...rows].join('\r\n') + '\r\n');
  console.log(`${rows.length} 張 → ${opt('--sheet')}`);
} else if (opt('--apply')) {
  const rows = parseCsv(readFileSync(join(ROOT, opt('--apply')), 'utf8').replace(/^﻿/, ''));
  const head = rows[0]; const idI = head.indexOf('id'); const resI = head.indexOf('結果'); const noteI = head.indexOf('備註');
  if (idI < 0 || resI < 0) { console.error('CSV 需要 id 與 結果 欄'); process.exit(1); }
  const dry = has('--dry-run'); let changed = 0;
  for (const r of rows.slice(1)) {
    const id = r[idI]; let res = (r[resI] || '').trim(); const note = noteI >= 0 ? r[noteI] : '';
    if (!res) continue;
    const x = cards.find((y) => y.card.id === id); if (!x) { console.log(`?  ${id} 找不到`); continue; }
    if (res === '退回') { console.log(`↩  ${id} 退回：${note}`); continue; }
    if (!['review', 'published'].includes(res)) { console.log(`?  ${id} 結果「${res}」不認得，只接受 review / published / 退回`); continue; }
    if (res === 'published' && x.card.translated && x.card.translationReviewed !== true) { console.log(`!  ${id} 翻譯卡未譯審，改為 review`); res = 'review'; }
    if (x.card.status === res) continue;
    console.log(`${dry ? '（試算）' : '✓'} ${id} ${x.card.status} → ${res}${note ? '  ' + note : ''}`);
    if (!dry) { x.card.status = res; save(x); }
    changed++;
  }
  console.log(`${changed} 張${dry ? '會' : '已'}改狀態。接著執行 npm run content:check 與 npm run content:build。`);
} else if (opt('--set')) {
  const res = opt('--set'); const ids = (opt('--ids') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!['draft', 'review', 'published'].includes(res) || !ids.length) { console.error('用法：--set review --ids a,b'); process.exit(1); }
  for (const id of ids) { const x = cards.find((y) => y.card.id === id); if (!x) { console.log(`?  ${id} 找不到`); continue; } if (res === 'published' && x.card.translated && x.card.translationReviewed !== true) { console.log(`!  ${id} 翻譯卡未譯審，不能 published`); continue; } x.card.status = res; save(x); console.log(`✓ ${id} → ${res}`); }
} else {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
}
