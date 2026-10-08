#!/usr/bin/env node
// 遠端資料（GitHub Pages）：檢查 content/policy/policy.json、content/schedule/timeline.json、content/alerts/alerts.json，
// 再複製到 docs/data/ 並產生 manifest.json。APP 內建同一份作為離線預設，遠端版本較新時覆蓋。
// 用法：node scripts/build-data.mjs [--check]   --check 只檢查不寫檔。
// 紅線 R11：政策數字標年度與查核日期；查核超過 90 天即不通過。
// 紅線 R14：疫情提醒只轉述疾管署；查核超過 14 天時警告。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const CHECK_ONLY = process.argv.includes('--check');
const MAX_AGE_DAYS = 90;
const ALERT_MAX_AGE_DAYS = 14;
const today = new Date();
const fails = [];

const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const policy = read('content/policy/policy.json');
const schedule = read('content/schedule/timeline.json');
const alerts = read('content/alerts/alerts.json');

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

if (!/^\d{4}-\d{2}-\d{2}/.test(alerts.version ?? '') || !Array.isArray(alerts.items)) fails.push('alerts 格式錯誤');
for (const a of alerts.items ?? []) {
  for (const k of ['id', 'date', 'title', 'quote', 'source']) if (!a[k]) fails.push(`alert ${a.id ?? '(無 id)'} 缺少 ${k}`);
  if (a.source && !/^https:\/\/www\.cdc\.gov\.tw\//.test(a.source.url)) fails.push(`alert ${a.id} 來源必須是疾管署（R14）：${a.source.url}`);
}
if (alerts.checkedAt && ageDays(alerts.checkedAt) > ALERT_MAX_AGE_DAYS) console.warn(`WARN 疫情提醒上次查核 ${alerts.checkedAt}，已超過 ${ALERT_MAX_AGE_DAYS} 天，請查疾管署新聞稿後更新 content/alerts/alerts.json`);

if (fails.length) {
  console.error(fails.map((f) => `FAIL ${f}`).join('\n'));
  console.error(`\n${fails.length} 項未通過`);
  process.exit(1);
}
console.log(`policy ${policy.version}：${policy.items.length} 項、行政待辦 ${policy.todos.length} 項；schedule ${schedule.version}：${schedule.items.length} 項；alerts ${alerts.version}：${alerts.items.length} 則，全部通過`);
if (CHECK_ONLY) process.exit(0);

const OUT = join(ROOT, 'docs', 'data');
mkdirSync(OUT, { recursive: true });
const dump = (o) => JSON.stringify(o, null, 2) + '\n';
writeFileSync(join(OUT, 'policy.json'), dump(policy));
writeFileSync(join(OUT, 'schedule.json'), dump(schedule));
writeFileSync(join(OUT, 'alerts.json'), dump(alerts));
writeFileSync(join(OUT, 'manifest.json'), dump({
  v: 1,
  policy: { version: policy.version, path: 'policy.json' },
  schedule: { version: schedule.version, path: 'schedule.json' },
  alerts: { version: alerts.version, path: 'alerts.json' },
}));
writeFileSync(join(OUT, 'index.html'), '<!doctype html><meta charset="utf-8"><title>育兒秘書資料</title><p>育兒秘書 APP 的公開資料（政策、公費時程、官方疫情提醒），來源見各檔案。</p>\n');
console.log('wrote docs/data/{manifest,policy,schedule,alerts}.json');
