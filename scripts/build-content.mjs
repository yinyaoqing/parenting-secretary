#!/usr/bin/env node
// 把 content/cards/**/*.json 打包成 src/content/cards.generated.json，供 APP 離線載入。
// 只納入通過必備欄位檢查的卡片；status 為 draft 的也納入，但畫面會標示「草稿」。
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const CARDS_DIR = join(ROOT, 'content', 'cards');
const OUT = join(ROOT, 'src', 'content', 'cards.generated.json');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

const cards = walk(CARDS_DIR).map((p) => JSON.parse(readFileSync(p, 'utf8')))
  .filter((c) => c.id && c.body && Array.isArray(c.sources))
  .map((c) => ({ ...c, sources: c.sources.map(({ excerpt, ...s }) => s) })) // 原文摘錄只供產線，不打包進 APP
  .sort((a, b) => a.topicGroup.localeCompare(b.topicGroup) || a.ageMinDays - b.ageMinDays);

mkdirSync(join(ROOT, 'src', 'content'), { recursive: true });
writeFileSync(OUT, JSON.stringify({ builtAt: new Date().toISOString(), cards }, null, 0) + '\n', 'utf8');
console.log(`built ${cards.length} cards -> src/content/cards.generated.json`);
