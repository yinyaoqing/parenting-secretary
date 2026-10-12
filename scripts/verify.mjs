#!/usr/bin/env node
// 整體驗證：型別、lint、測試、內容與資料檢查、expo-doctor、打包，加上幾項專案自己的稽核。
// 用法：npm run verify            全部
//       npm run verify -- --quick 跳過 expo-doctor 與打包
// 每一項印 PASS 或 FAIL，最後列出失敗項；任何一項失敗以非零碼結束。
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const quick = process.argv.includes('--quick');
const results = [];
const run = (name, cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32', ...opts });
  const ok = r.status === 0;
  results.push({ name, ok, out: (r.stdout || '') + (r.stderr || '') });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  return r;
};
const audit = (name, fn) => {
  try { const msg = fn(); results.push({ name, ok: !msg, out: msg || '' }); console.log(`${msg ? 'FAIL' : 'PASS'}  ${name}${msg ? '：' + msg : ''}`); }
  catch (e) { results.push({ name, ok: false, out: String(e) }); console.log(`FAIL  ${name}：${e.message}`); }
};
const walk = (dir, exts) => { const out = []; if (!existsSync(dir)) return out; for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) { if (n !== 'node_modules') out.push(...walk(p, exts)); } else if (exts.some((e) => n.endsWith(e))) out.push(p); } return out; };
const read = (p) => readFileSync(p, 'utf8');

run('typecheck', 'npx', ['tsc', '--noEmit']);
run('lint', 'npx', ['expo', 'lint', '--no-cache']);
run('tests', 'npm', ['test']);
run('content:check', 'npm', ['run', 'content:check']);
run('data:check', 'npm', ['run', 'data:check']);
run('content:build:release 試算（允許安全層未齊）', 'node', ['scripts/build-content.mjs', '--release', '--allow-missing-safety']);
run('content:build 還原為完整版', 'npm', ['run', 'content:build']);

audit('程式與內容沒有舊名稱「育兒秘書」', () => {
  const hits = [...walk(join(ROOT, 'app'), ['.ts', '.tsx']), ...walk(join(ROOT, 'src'), ['.ts', '.tsx']), ...walk(join(ROOT, 'content'), ['.json']), ...walk(join(ROOT, 'docs', 'data'), ['.html'])]
    .filter((p) => !p.includes('cards.generated')).filter((p) => read(p).includes('育兒秘書'));
  return hits.length ? hits.map((p) => p.replace(ROOT, '')).join(', ') : '';
});
audit('APP 沒有佔位文字（即將推出、製作中、還在撰寫）', () => {
  const hits = [...walk(join(ROOT, 'app'), ['.tsx']), ...walk(join(ROOT, 'src'), ['.tsx'])].filter((p) => /即將推出|製作中|還在撰寫/.test(read(p)));
  return hits.length ? hits.map((p) => p.replace(ROOT, '')).join(', ') : '';
});
audit('法務與手冊網頁沒有方括號佔位與草稿字樣', () => {
  const hits = walk(join(ROOT, 'docs', 'data'), ['.html']).filter((p) => /\[[^\]<]{2,20}\]|草稿|內部備註/.test(read(p)));
  return hits.length ? hits.map((p) => p.replace(ROOT, '')).join(', ') : '';
});
audit('內容卡 id 與檔名一致且不重複', () => {
  const seen = new Map(); const bad = [];
  for (const p of walk(join(ROOT, 'content', 'cards'), ['.json'])) {
    const c = JSON.parse(read(p));
    const slug = p.replace(/\\/g, '/').split('/').pop().replace('.json', '');
    if (!c.id.endsWith('.' + slug)) bad.push(`${c.id} ≠ ${slug}`);
    if (seen.has(c.id)) bad.push(`重複 ${c.id}`); seen.set(c.id, p);
  }
  return bad.join('; ');
});
audit('各年齡段內容卡數量（0-1 ≥ 60、1-3 ≥ 30、3-6 ≥ 25、6-12 ≥ 15、12-18 ≥ 20）', () => {
  const cards = walk(join(ROOT, 'content', 'cards'), ['.json']).map((p) => JSON.parse(read(p)));
  const bands = [[0, 365, 60], [365, 1095, 30], [1095, 2190, 25], [2190, 4380, 15], [4380, 6570, 20]];
  const low = bands.map(([a, z, min]) => ({ a, z, min, n: cards.filter((c) => c.ageMinDays < z && c.ageMaxDays > a).length })).filter((b) => b.n < b.min);
  return low.length ? low.map((b) => `${b.a}-${b.z} 天只有 ${b.n} 張`).join('; ') : '';
});
audit('本週活動：72 個以上，三個年齡段各 24 個以上', () => {
  const a = JSON.parse(read(join(ROOT, 'content', 'activities', 'activities.json'))).items;
  const bands = [[1095, 2190], [2190, 4380], [4380, 6570]];
  const counts = bands.map(([x, y]) => a.filter((i) => i.ageMinDays < y && i.ageMaxDays > x).length);
  return a.length >= 72 && counts.every((c) => c >= 24) ? '' : `共 ${a.length}；各段 ${counts.join('/')}`;
});
audit('鼓勵卡：每個階段 20 張以上', () => {
  const b = JSON.parse(read(join(ROOT, 'content', 'encouragement', 'cards.json')));
  const c = {}; for (const x of b.cards) for (const s of x.stages) c[s] = (c[s] || 0) + 1;
  const low = Object.entries(c).filter(([, n]) => n < 20);
  return low.length ? low.map(([s, n]) => `${s} ${n}`).join(', ') : '';
});
audit('手冊提到的畫面文字在程式裡找得到', () => {
  const manual = read(join(ROOT, 'docs', 'manual', 'parent-guide.md'));
  const code = [...walk(join(ROOT, 'app'), ['.tsx']), ...walk(join(ROOT, 'src'), ['.ts', '.tsx'])].map(read).join('\n');
  const labels = [...manual.matchAll(/「([^」]{2,14})」/g)].map((m) => m[1]);
  const skip = new Set(['是', '已加入', '刪除', '問過', '翻譯自', '較小的孩子', '待複查', '可能重複', '這個時期的孩子', '新食材', '小米', '小米家', '媽媽的手機', '週三森林共學', '卡住', '不懂', '覺得怪', '恢復', '正式版', '設定 › 首頁要顯示哪些', '新食材 觀察第 N 天', '全部 N 條', 'AA', '1 歲第 N 到 N 週', '2 歲第 N 到 N 週', '以當年度簡章為準']);
  const missing = [...new Set(labels)].filter((l) => !skip.has(l) && !code.includes(l));
  return missing.length ? missing.join('、') : '';
});

if (!quick) {
  run('expo-doctor', 'npx', ['expo-doctor']);
  const out = mkdtempSync(join(tmpdir(), 'yucun-export-'));
  run('expo export（Android）', 'npx', ['expo', 'export', '--platform', 'android', '--output-dir', out]);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通過`);
for (const f of failed) console.log(`\n--- ${f.name} ---\n${f.out.slice(-1500)}`);
process.exit(failed.length ? 1 : 0);
