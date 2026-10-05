#!/usr/bin/env node
// 譯審匯入（規劃 v0.8 D7-6）：讀 scripts/export-bilingual.mjs 輸出的 CSV，
// 把譯者填在「修訂譯文」欄的文字寫回對應卡片的 body，並設 translationReviewed=true。
//
// 用法：
//   node scripts/import-translation.mjs docs/translation/bilingual-2026-10-05.csv            # 實際寫入
//   node scripts/import-translation.mjs docs/translation/bilingual-2026-10-05.csv --dry-run  # 只列出會改哪些卡
//
// 規則：
//   - 「修訂譯文」為空的列跳過（譯者沒改）。
//   - 「修訂譯文」與原「譯文」相同時只標記 translationReviewed=true，不改 body。
//   - 「譯者備註」不寫入卡片，只印出來給人看。
//   - 寫回後請跑 npm run content:check；published 狀態仍由人工決定。
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const CARDS_DIR = join(ROOT, 'content', 'cards');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const csvPath = args.find((a) => !a.startsWith('--'));
if (!csvPath) {
  console.error('用法：node scripts/import-translation.mjs <bilingual.csv> [--dry-run]');
  process.exit(1);
}

// ---------- CSV 解析（RFC 4180：雙引號包覆、"" 跳脫、欄位內可含換行）----------
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some((f) => f !== '')) rows.push(row); }
  return rows;
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

// ---------- 讀 CSV ----------
const raw = readFileSync(resolve(ROOT, csvPath), 'utf8').replace(/^﻿/, '');
const rows = parseCsv(raw);
if (rows.length < 2) { console.error('CSV 沒有資料列'); process.exit(1); }
const header = rows[0];
const col = (name) => {
  const i = header.indexOf(name);
  if (i === -1) { console.error(`CSV 缺欄位「${name}」，欄位有：${header.join('、')}`); process.exit(1); }
  return i;
};
const C_ID = col('卡片編號');
const C_ZH = col('譯文');
const C_REV = col('修訂譯文');
const C_NOTE = col('譯者備註');

// ---------- 卡片索引 ----------
const cardFiles = new Map();
for (const p of walk(CARDS_DIR)) {
  const c = JSON.parse(readFileSync(p, 'utf8'));
  if (c.id) cardFiles.set(c.id, p);
}

// ---------- 套用 ----------
const norm = (s) => String(s ?? '').replace(/\r\n/g, '\n').trim();
let changed = 0;
let markedOnly = 0;
let skipped = 0;
const problems = [];

for (const r of rows.slice(1)) {
  const id = norm(r[C_ID]);
  const revised = norm(r[C_REV]);
  const note = norm(r[C_NOTE]);
  if (!revised) { skipped++; continue; }

  const path = cardFiles.get(id);
  if (!path) { problems.push(`${id}：找不到對應卡片`); continue; }
  const card = JSON.parse(readFileSync(path, 'utf8'));
  if (!card.translated) { problems.push(`${id}：不是翻譯卡（translated=false），略過`); continue; }

  const rel = relative(ROOT, path);
  const sameAsExported = revised === norm(r[C_ZH]);
  const sameAsCurrent = revised === norm(card.body);

  if (sameAsExported || sameAsCurrent) {
    markedOnly++;
    console.log(`標記  ${rel}  譯文未改，只設 translationReviewed=true${note ? `  備註：${note}` : ''}`);
  } else {
    changed++;
    console.log(`寫入  ${rel}  body ${norm(card.body).length} 字 -> ${revised.length} 字${note ? `  備註：${note}` : ''}`);
    card.body = revised;
  }
  card.translationReviewed = true;
  card.updatedAt = new Date().toISOString().slice(0, 10);
  if (!DRY) writeFileSync(path, JSON.stringify(card, null, 2) + '\n', 'utf8');
}

for (const p of problems) console.log(`問題  ${p}`);
console.log(`\n${DRY ? '[dry-run] ' : ''}改寫 ${changed} 張、僅標記 ${markedOnly} 張、未填修訂譯文 ${skipped} 列、問題 ${problems.length} 項`);
if (!DRY && (changed || markedOnly)) console.log('接著執行：npm run content:check && npm run content:build');
process.exit(problems.length ? 1 : 0);
