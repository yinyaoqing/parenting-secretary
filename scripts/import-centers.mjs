#!/usr/bin/env node
// 匯入衛福部社家署「全國親子館(托育資源中心)名冊」（data.gov.tw 160907，政府資料開放授權條款第 1 版）。
// 用法：node scripts/import-centers.mjs <下載的 CSV 路徑>
// 下載：https://data.gov.tw/dataset/160907 的 CSV（UTF-8 含 BOM）。輸出 content/resources/parent-child-centers.json。
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const src = process.argv[2];
if (!src) { console.error('用法：node scripts/import-centers.mjs <CSV 路徑>'); process.exit(1); }

const COUNTIES = ['臺北市', '新北市', '桃園市', '臺中市', '臺南市', '高雄市', '基隆市', '新竹市', '嘉義市', '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '澎湖縣', '金門縣', '連江縣'];
const text = readFileSync(src, 'utf8').replace(/^\uFEFF/, '');
const rows = text.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(',').map((c) => c.trim()));
const head = rows.shift();
const col = (name) => head.findIndex((h) => h.includes(name));
const ci = { county: col('縣市'), district: col('區域'), name: col('名稱'), address: col('地址'), phone: col('電話'), since: col('成立') };
if (Object.values(ci).some((i) => i < 0)) { console.error('欄位不符：', head.join(',')); process.exit(1); }

const items = [];
for (const r of rows) {
  const county = (r[ci.county] || '').replace(/^台/, '臺');
  if (!COUNTIES.includes(county)) { console.warn('略過（縣市不明）：', r.join(',')); continue; }
  items.push({ county, district: r[ci.district] || '', name: r[ci.name] || '', address: r[ci.address] || '', phone: r[ci.phone] || '', since: r[ci.since] || '' });
}
const counties = COUNTIES.filter((c) => items.some((i) => i.county === c));
const out = {
  source: { name: '衛生福利部社會及家庭署：全國親子館（托育資源中心）名冊', url: 'https://data.gov.tw/dataset/160907', license: '政府資料開放授權條款第 1 版' },
  dataAsOf: '2022-12',
  checkedAt: new Date().toISOString().slice(0, 10),
  counties,
  items,
};
writeFileSync(join(ROOT, 'content', 'resources', 'parent-child-centers.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`寫入 ${items.length} 筆，${counties.length} 個縣市 -> content/resources/parent-child-centers.json`);
