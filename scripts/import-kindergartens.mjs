#!/usr/bin/env node
// 匯入教育部統計處「幼兒園名錄」（data.gov.tw 6086，政府資料開放授權條款第 1 版），只保留最新學年度。
// 用法：node scripts/import-kindergartens.mjs <下載的 CSV 路徑>
// 下載：https://stats.moe.gov.tw/files/opendata/k1_new.csv（UTF-8 含 BOM）。輸出 content/resources/kindergartens.json。
// 名錄只有公私立；非營利從園名辨識；準公共、收費、評鑑不在名錄裡，畫面連到全國教保資訊網。不排序、不推薦（規劃 v1.0 第 5.1 節）。
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const src = process.argv[2];
if (!src) { console.error('用法：node scripts/import-kindergartens.mjs <CSV 路徑>'); process.exit(1); }
const COUNTIES = ['臺北市', '新北市', '桃園市', '臺中市', '臺南市', '高雄市', '基隆市', '新竹市', '嘉義市', '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '澎湖縣', '金門縣', '連江縣'];

// 支援雙引號欄位的 CSV 切分。
function parseLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const lines = readFileSync(src, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
const head = parseLine(lines.shift());
const col = (n) => head.findIndex((h) => h.includes(n));
const ci = { year: col('學年度'), name: col('學校名稱'), type: col('公/私立'), county: col('縣市'), district: col('鄉鎮'), address: col('地址'), phone: col('電話') };
if (Object.values(ci).some((i) => i < 0)) { console.error('欄位不符：', head.join(',')); process.exit(1); }
const rows = lines.map(parseLine);
const latest = Math.max(...rows.map((r) => Number(r[ci.year]) || 0));

const items = [];
for (const r of rows) {
  if (Number(r[ci.year]) !== latest) continue;
  const county = r[ci.county].replace(/^\[\d+\]/, '').replace(/^台/, '臺');
  if (!COUNTIES.includes(county)) { console.warn('略過（縣市不明）：', r.join(',')); continue; }
  const name = r[ci.name];
  const kind = /非營利/.test(name) ? 'n' : r[ci.type] === '公立' ? 'p' : 'r'; // p 公立、n 非營利、r 私立
  // 精簡格式：[名稱, 類型, 縣市序號, 鄉鎮, 地址（去郵遞區號）, 電話]
  items.push([name, kind, COUNTIES.indexOf(county), r[ci.district], r[ci.address].replace(/^\[\d+\]/, ''), r[ci.phone]]);
}
const out = {
  source: { name: '教育部統計處：幼兒園名錄', url: 'https://data.gov.tw/dataset/6086', license: '政府資料開放授權條款第 1 版' },
  schoolYear: latest,
  checkedAt: new Date().toISOString().slice(0, 10),
  counties: COUNTIES,
  fields: ['name', 'kind', 'countyIndex', 'district', 'address', 'phone'],
  items,
};
writeFileSync(join(ROOT, 'content', 'resources', 'kindergartens.json'), JSON.stringify(out) + '\n');
const by = { p: 0, n: 0, r: 0 }; for (const i of items) by[i[1]]++;
console.log(`${latest} 學年度 ${items.length} 所（公立 ${by.p}、非營利 ${by.n}、私立 ${by.r}）-> content/resources/kindergartens.json`);
