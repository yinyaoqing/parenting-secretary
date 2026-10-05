#!/usr/bin/env node
// 對照稿輸出（規劃 v0.8 D7-6）：把翻譯卡片的原文、譯文、來源輸出成 Markdown 與 CSV，交給譯者。
// 譯者在 CSV 的「修訂譯文」欄填寫後，用 npm run content:import -- <csv> 匯回（scripts/import-translation.mjs）。
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const CARDS_DIR = join(ROOT, 'content', 'cards');
const OUT_DIR = join(ROOT, 'docs', 'translation');
mkdirSync(OUT_DIR, { recursive: true });

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

const rows = [];
for (const p of walk(CARDS_DIR)) {
  const c = JSON.parse(readFileSync(p, 'utf8'));
  if (!c.translated) continue;
  const src = c.sources.find((s) => s.lang === 'en' && s.excerpt && !String(s.excerpt).startsWith('TODO'));
  if (!src) continue;
  rows.push({ id: c.id, title: c.title, source: src.name, url: src.url, en: src.excerpt, zh: c.body, supplement: c.supplement ?? '', reviewed: c.translationReviewed ? 'yes' : 'no' });
}

const stamp = new Date().toISOString().slice(0, 10);
const csvEsc = (s) => '"' + String(s).replace(/"/g, '""').replace(/\r?\n/g, '\n') + '"';
const csv = ['卡片編號,標題,來源,原文連結,原文,譯文,本產品補充,已譯審,修訂譯文,譯者備註']
  .concat(rows.map((r) => [r.id, r.title, r.source, r.url, r.en, r.zh, r.supplement, r.reviewed, '', ''].map(csvEsc).join(',')))
  .join('\n');
writeFileSync(join(OUT_DIR, `bilingual-${stamp}.csv`), '﻿' + csv, 'utf8');

const md = [`# 對照稿 ${stamp}`, '', `共 ${rows.length} 張卡。譯者只需核對「譯文」是否忠實於「原文」且中文通順；醫療正確性不在譯審範圍。`, '']
  .concat(rows.flatMap((r) => [
    `## ${r.id}：${r.title}`, '',
    `來源：${r.source}（${r.url}）`, '',
    '| 原文 | 譯文 |', '|---|---|',
    `| ${r.en.replace(/\|/g, '\\|').replace(/\n+/g, '<br>')} | ${r.zh.replace(/\|/g, '\\|').replace(/\n+/g, '<br>')} |`, '',
    r.supplement ? `本產品補充：${r.supplement}` : '', r.supplement ? '' : '',
    `已譯審：${r.reviewed}`, '',
  ]))
  .join('\n');
writeFileSync(join(OUT_DIR, `bilingual-${stamp}.md`), md, 'utf8');
console.log(`exported ${rows.length} cards -> docs/translation/bilingual-${stamp}.{csv,md}`);
