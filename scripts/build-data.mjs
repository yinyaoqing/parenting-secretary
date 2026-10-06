#!/usr/bin/env node
// 遠端資料（GitHub Pages）：檢查 content/policy/policy.json 與 content/schedule/timeline.json，
// 再複製到 docs/data/ 並產生 manifest.json。APP 內建同一份作為離線預設，遠端版本較新時覆蓋。
// 用法：node scripts/build-data.mjs [--check]   --check 只檢查不寫檔。
// 紅線 R11：政策數字標年度與查核日期；查核超過 90 天即不通過。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const CHECK_ONLY = process.argv.includes('--check');
const MAX_AGE_DAYS = 90;
const today = new Date();
const fails = [];

const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const policy = read('content/policy/policy.json');
const schedule = read('content/schedule/timeline.json');

const ageDays = (iso) => Math.floor((today.getTime() - new Date(iso).getTime()) / 86400000);
const isGov = (url) => /^https:\/\/([a-z0-9-]+\.)*gov\.tw\//.test(url) || /^https:\/\/([a-z0-9-]+\.)*edu\.tw\//.test(url);

if (!/^\d{4}-\d{2}-\d{2}/.test(policy.version ?? '')) fails.push('policy.version 須為 YYYY-MM-DD');
if (!policy.year) fails.push('policy.year 缺少');
for (const it of [...(policy.items ?? []), ...(policy.todos ?? [])]) {
  const tag = `policy ${it.id ?? '(無 id)'}`;
  for (const k of ['id', 'title', 'ageMinDays', 'ageMaxDays', 'source', 'checkedAt']) if (it[k] === undefined) fails.push(`${tag} 缺少 ${k}`);
  if (it.source && !isGov(it.source.url)) fails.push(`${tag} 來源不是政府網站（R16）：${it.source.url}`);
  if (it.checkedAt && ageDays(it.checkedAt) > MAX_AGE_DAYS) fails.push(`${tag} 查核日期 ${it.checkedAt} 已超過 ${MAX_AGE_DAYS} 天，請重新查核`);
}
for (const it of policy.items ?? []) {
  if (!Array.isArray(it.amounts) || it.amounts.length === 0) fails.push(`policy ${it.id} 沒有 amounts`);
}
if (!schedule.version || !Array.isArray(schedule.items)) fails.push('schedule 格式錯誤');

if (fails.length) {
  console.error(fails.map((f) => `FAIL ${f}`).join('\n'));
  console.error(`\n${fails.length} 項未通過`);
  process.exit(1);
}
console.log(`policy ${policy.version}：${policy.items.length} 項、行政待辦 ${policy.todos.length} 項；schedule ${schedule.version}：${schedule.items.length} 項，全部通過`);
if (CHECK_ONLY) process.exit(0);

const OUT = join(ROOT, 'docs', 'data');
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'policy.json'), JSON.stringify(policy, null, 2) + '\n');
writeFileSync(join(OUT, 'schedule.json'), JSON.stringify(schedule, null, 2) + '\n');
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({
  v: 1,
  policy: { version: policy.version, path: 'policy.json' },
  schedule: { version: schedule.version, path: 'schedule.json' },
}, null, 2) + '\n');
writeFileSync(join(OUT, 'index.html'), '<!doctype html><meta charset="utf-8"><title>育兒秘書資料</title><p>育兒秘書 APP 的公開資料（政策與公費時程），來源見各檔案。</p>\n');
console.log('wrote docs/data/{manifest,policy,schedule}.json');
