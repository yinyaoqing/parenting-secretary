#!/usr/bin/env node
// 追蹤縣市「育兒資源網」類標案（規劃 v1.0 第 6.3 節）。資料來自 g0v 政府採購 API（https://pcc-api.openfun.app）。
// 用法：npm run b2g:tenders            輸出 docs/dev/b2g-tenders.md
//       npm run b2g:tenders -- --since 2026-01-01   只列這天以後的公告
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const API = 'https://pcc-api.openfun.app/api/searchbytitle';
const KEYWORDS = ['育兒資源網', '育兒資訊網', '育兒親職網', '托育資源網', '親子資源網'];
const i = process.argv.indexOf('--since');
const since = i > 0 ? process.argv[i + 1].replace(/-/g, '') : '00000000';

async function search(q) {
  const out = [];
  for (let page = 1; page <= 5; page++) {
    const r = await fetch(`${API}?query=${encodeURIComponent(q)}&page=${page}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`${q} HTTP ${r.status}`);
    const j = await r.json();
    out.push(...(j.records ?? []));
    if (!j.total_pages || page >= j.total_pages) break;
  }
  return out;
}

const seen = new Map();
for (const q of KEYWORDS) {
  for (const rec of await search(q)) {
    const key = `${rec.unit_id}|${rec.job_number}|${rec.date}|${rec.brief?.type ?? ''}`;
    if (!seen.has(key) && String(rec.date) >= since) seen.set(key, { ...rec, keyword: q });
  }
}
const rows = [...seen.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
const fmt = (d) => `${String(d).slice(0, 4)}-${String(d).slice(4, 6)}-${String(d).slice(6, 8)}`;
const md = [
  '# 育兒資源網類標案追蹤',
  '',
  `產生時間：${new Date().toISOString().slice(0, 10)}。來源：g0v 政府採購 API（${API}），關鍵字：${KEYWORDS.join('、')}。決標金額與得標廠商請點案號查詢（https://pcc-api.openfun.app/api/tender?unit_id=…&job_number=…）。`,
  '',
  '| 日期 | 機關 | 案號 | 案名 | 公告類型 |',
  '|---|---|---|---|---|',
  ...rows.map((r) => `| ${fmt(r.date)} | ${r.unit_name} | ${r.job_number} | ${(r.brief?.title ?? '').replace(/\|/g, '／')} | ${r.brief?.type ?? ''} |`),
  '',
  `共 ${rows.length} 筆。`,
  '',
].join('\n');
writeFileSync(join(ROOT, 'docs', 'dev', 'b2g-tenders.md'), md);
console.log(`寫入 ${rows.length} 筆 -> docs/dev/b2g-tenders.md`);
