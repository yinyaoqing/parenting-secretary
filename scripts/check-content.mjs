#!/usr/bin/env node
// 產線檢查腳本：規劃文件 v0.9 第 5 章十項檢查。
// 用法：node scripts/check-content.mjs [--net] [--strict]
//   --net    另外檢查來源 URL 是否存活（需網路）
//   --strict 待複查項目也視為失敗

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const CARDS_DIR = join(ROOT, 'content', 'cards');
const WHITELIST = JSON.parse(readFileSync(join(ROOT, 'content', 'whitelist.json'), 'utf8')).terms;

const NET = process.argv.includes('--net');
const STRICT = process.argv.includes('--strict');

const REQUIRED = ['id', 'topicGroup', 'title', 'ageMinDays', 'ageMaxDays', 'styleTags', 'evidence', 'body', 'sources', 'translated', 'foreignOnly', 'policyNumbers', 'updatedAt', 'status'];
const SOURCE_REQUIRED = ['name', 'url', 'lang', 'trust', 'license', 'checkedAt'];
const DIRECTIVE_WORDS = ['建議', '應該', '可以', '不要', '最好', '請'];
const FOREIGN_ONLY_GROUPS = new Set(['behavior']);
const MAX_COMMON = 10;
const SUPPLEMENT_MAX_CHARS = 80;
const SUPPLEMENT_MAX_RATIO = 0.3;
const POLICY_MAX_AGE_DAYS = 90;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

function stripWhitelist(text) {
  let t = text;
  for (const term of WHITELIST) t = t.split(term).join(' ');
  return t.replace(/\s+/g, '');
}

function longestCommonSubstring(a, b) {
  // O(n*m) 動態規劃，內容卡與摘錄都短，夠用。
  let best = 0;
  let prev = new Uint16Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Uint16Array(b.length + 1);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > best) best = cur[j];
      }
    }
    prev = cur;
  }
  return best;
}

function daysBetween(isoDate, now = new Date()) {
  return Math.floor((now - new Date(isoDate)) / 86400000);
}

async function urlAlive(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (res.ok) return true;
    const res2 = await fetch(url, { method: 'GET', redirect: 'follow' });
    return res2.ok;
  } catch {
    return false;
  }
}

async function checkCard(path) {
  const rel = relative(ROOT, path);
  const fail = [];
  const warn = [];
  let card;
  try {
    card = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    return { rel, fail: [`JSON 解析失敗：${e.message}`], warn };
  }

  // 1 必備欄位
  for (const k of REQUIRED) if (card[k] === undefined || card[k] === null || card[k] === '') fail.push(`缺必備欄位 ${k}`);
  if (!Array.isArray(card.sources) || card.sources.length === 0) fail.push('至少需要一個來源');
  else card.sources.forEach((s, i) => {
    for (const k of SOURCE_REQUIRED) if (!s[k]) fail.push(`來源 ${i + 1} 缺 ${k}`);
  });

  // 3 可信度與授權級已標（格式）
  for (const s of card.sources ?? []) {
    if (s.trust && !['T1', 'T2', 'T3'].includes(s.trust)) fail.push(`來源 ${s.name} 可信度 ${s.trust} 不合法`);
    if (s.license && !['A1', 'A2', 'B', 'C'].includes(s.license)) fail.push(`來源 ${s.name} 授權級 ${s.license} 不合法`);
    if (s.trust === 'T3') warn.push(`來源 ${s.name} 為 T3，只能作線索，不得為唯一來源`);
  }
  const bLinks = (card.sources ?? []).filter((s) => s.license === 'B').length;
  if (bLinks > 1) fail.push(`B 級來源 ${bLinks} 個，每卡最多 1 個`);

  // 4 連續相同字數（中文 B 級重述；A2 英文來源跳過）
  for (const s of card.sources ?? []) {
    if (s.license === 'B' && s.lang === 'zh-TW') {
      if (!s.excerpt || s.excerpt.startsWith('TODO')) {
        (card.status === 'draft' ? warn : fail).push(`B 級來源 ${s.name} 缺原文摘錄，草稿可暫缺，進入 review 前必須補上`);
        continue;
      }
      const lcs = longestCommonSubstring(stripWhitelist(card.body ?? ''), stripWhitelist(s.excerpt));
      if (lcs > MAX_COMMON) fail.push(`與來源 ${s.name} 連續相同 ${lcs} 字，超過 ${MAX_COMMON} 字`);
    }
  }

  // 5 段落順序（啟發式：主文段落數與摘錄段落數相同且每段首句關鍵詞順序一致時警告）
  // 第一版只提醒，不擋下；由譯審與人工確認。
  for (const s of card.sources ?? []) {
    if ((s.license === 'B' || s.license === 'A2') && s.excerpt) {
      const bodyParas = (card.body ?? '').split(/\n{2,}/).filter(Boolean).length;
      const srcParas = s.excerpt.split(/\n{2,}/).filter(Boolean).length;
      if (bodyParas > 1 && bodyParas === srcParas) warn.push(`段落數與來源 ${s.name} 相同（${bodyParas}），請確認段落順序未一一對應`);
    }
  }

  // 6、7 補充區塊
  if (card.supplement) {
    const sup = card.supplement.replace(/\s+/g, '');
    const body = (card.body ?? '').replace(/\s+/g, '');
    if (sup.length > SUPPLEMENT_MAX_CHARS) fail.push(`補充區塊 ${sup.length} 字，超過 ${SUPPLEMENT_MAX_CHARS} 字`);
    if (body.length && sup.length > body.length * SUPPLEMENT_MAX_RATIO) fail.push(`補充區塊超過主文 ${SUPPLEMENT_MAX_RATIO * 100}%`);
    for (const w of DIRECTIVE_WORDS) if (sup.includes(w)) fail.push(`補充區塊含指示語氣「${w}」`);
  }

  // 8 外國來源主題固定標示
  if (FOREIGN_ONLY_GROUPS.has(card.topicGroup) && card.foreignOnly !== true) fail.push(`主題群 ${card.topicGroup} 須設 foreignOnly=true 以加固定標示`);

  // A2 翻譯卡進入 review 前必須有原文摘錄
  for (const s of card.sources ?? []) {
    if (s.license === 'A2' && card.status !== 'draft' && (!s.excerpt || s.excerpt.startsWith('TODO'))) fail.push(`A2 來源 ${s.name} 缺原文摘錄`);
  }

  // 9 譯審
  if (card.translated && card.status === 'published' && card.translationReviewed !== true) fail.push('翻譯卡片未完成譯審，不得發布');
  const hasEn = (card.sources ?? []).some((s) => s.lang === 'en');
  if (hasEn && !card.translated) warn.push('有英文來源但 translated=false，請確認是否為翻譯卡');

  // 10 政策數字查核日期
  if (card.policyNumbers) {
    const newest = Math.min(...(card.sources ?? []).map((s) => daysBetween(s.checkedAt)));
    if (newest > POLICY_MAX_AGE_DAYS) (STRICT ? fail : warn).push(`政策數字查核已 ${newest} 天，超過 ${POLICY_MAX_AGE_DAYS} 天，列入待複查`);
  }

  // 2 URL 存活（可選）
  if (NET) {
    for (const s of card.sources ?? []) {
      if (s.url && !(await urlAlive(s.url))) (STRICT ? fail : warn).push(`來源 URL 無法存取：${s.url}`);
    }
  }

  return { rel, fail, warn };
}

const files = walk(CARDS_DIR);
let failed = 0;
for (const f of files) {
  const r = await checkCard(f);
  const status = r.fail.length ? 'FAIL' : r.warn.length ? 'WARN' : 'OK  ';
  console.log(`${status} ${r.rel}`);
  for (const m of r.fail) console.log(`     ✗ ${m}`);
  for (const m of r.warn) console.log(`     ! ${m}`);
  if (r.fail.length) failed++;
}
console.log(`\n${files.length} 張卡片，${failed} 張未通過`);
process.exit(failed ? 1 : 0);
