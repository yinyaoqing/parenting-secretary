#!/usr/bin/env node
// 把 content/cards/**/*.json 打包成 src/content/cards.generated.json，供 APP 離線載入。
//
// 用法：
//   node scripts/build-content.mjs            開發與測試版：全部卡片（含 draft）
//   node scripts/build-content.mjs --release  送審版：只打包 review 或 published、且翻譯卡已譯審的卡（紅線 R9、R17）
//
// 送審版若有任何安全層卡被排除就失敗（紅線 R13：安全層必須完整）。加 --allow-missing-safety 可略過，只在本機試算時用。
// EAS 的 production 建置會自動以 --release 重建（scripts/eas-post-install.mjs）。
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const CARDS_DIR = join(ROOT, 'content', 'cards');
const OUT = join(ROOT, 'src', 'content', 'cards.generated.json');
const args = process.argv.slice(2);
const release = args.includes('--release');
const allowMissingSafety = args.includes('--allow-missing-safety');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

// 送審版排除的理由；回傳 null 表示可以打包。
export function releaseBlocker(c) {
  if (c.status !== 'review' && c.status !== 'published') return `狀態 ${c.status}，未複核`;
  if (c.translated && c.translationReviewed !== true) return '翻譯卡未譯審';
  return null;
}

const all = walk(CARDS_DIR).map((p) => JSON.parse(readFileSync(p, 'utf8')))
  .filter((c) => c.id && c.body && Array.isArray(c.sources));

const excluded = release ? all.map((c) => ({ c, why: releaseBlocker(c) })).filter((x) => x.why) : [];
const kept = release ? all.filter((c) => !releaseBlocker(c)) : all;

const cards = kept
  .map((c) => ({ ...c, sources: c.sources.map(({ excerpt, ...s }) => s) })) // 原文摘錄只供產線，不打包進 APP
  .sort((a, b) => a.topicGroup.localeCompare(b.topicGroup) || a.ageMinDays - b.ageMinDays);

mkdirSync(join(ROOT, 'src', 'content'), { recursive: true });
writeFileSync(OUT, JSON.stringify({ builtAt: new Date().toISOString(), release, cards }, null, 0) + '\n', 'utf8');
console.log(`built ${cards.length} cards${release ? '（送審版）' : ''} -> src/content/cards.generated.json`);

if (release) {
  const byGroup = {};
  for (const c of all) { const g = (byGroup[c.topicGroup] ??= { kept: 0, total: 0 }); g.total++; if (!releaseBlocker(c)) g.kept++; }
  for (const [g, v] of Object.entries(byGroup).sort()) console.log(`  ${g.padEnd(12)} ${v.kept}/${v.total}`);
  const missingSafety = excluded.filter((x) => x.c.topicGroup === 'safety');
  if (missingSafety.length) {
    console.error(`\n安全層有 ${missingSafety.length} 張未達送審條件（紅線 R13 要求安全層完整）：`);
    for (const x of missingSafety) console.error(`  ${x.c.id}：${x.why}`);
    if (!allowMissingSafety) process.exit(1);
  }
}
