#!/usr/bin/env node
// 一鍵發布測試版：產內容 → eas update 到 preview 頻道 → 把 QR code 與本次更新資訊存到 docs/dev/release/。
//
// 用法：
//   npm run publish:preview                       # 訊息預設為最近一次 commit 標題
//   npm run publish:preview -- --message "week6"  # 自訂訊息
//   npm run publish:preview -- --channel staging  # 換頻道（eas.json 需有對應 channel）
//   npm run publish:preview -- --skip-content     # 跳過 content:build
//
// 產出（docs/dev/release/）：
//   expo-go-<channel>.png   頻道 QR code，連結固定，之後每次發布家長重開 Expo Go 就拿到新版
//   expo-go-<channel>.svg   同上，Expo 官方樣式（需網路，失敗不影響）
//   latest.json             本次更新的 projectId、runtime、群組 ID、儀表板連結
//   history.md              每次發布追加一行
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import QRCode from 'qrcode';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const OUT_DIR = join(ROOT, 'docs', 'dev', 'release');

// ---------- 參數 ----------
const args = process.argv.slice(2);
function opt(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = args[i + 1];
  if (v === undefined || v.startsWith('--')) fail(`--${name} 需要一個值`);
  return v;
}
const channel = opt('channel', 'preview');
const environment = opt('environment', channel);
const skipContent = args.includes('--skip-content');
const message = opt('message', gitSubject() || `release ${new Date().toISOString().slice(0, 10)}`);

function fail(msg) {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
}

function gitSubject() {
  const r = spawnSync('git', ['log', '-1', '--format=%s'], { cwd: ROOT, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
}

// 執行指令並同時把輸出印到終端與收集起來（eas update 的結果要從輸出解析）
function run(cmd, cmdArgs, { env = {}, quiet = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, cmdArgs, {
      cwd: ROOT,
      shell: true, // Windows 上 eas/npm 是 .cmd，需經 shell
      env: { ...process.env, ...env },
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    let out = '';
    const tee = (chunk) => {
      const s = chunk.toString();
      out += s;
      if (!quiet) process.stdout.write(s);
    };
    child.stdout.on('data', tee);
    child.stderr.on('data', tee);
    child.on('close', (code) => resolve({ code, out }));
  });
}

// ---------- 前置檢查 ----------
const appJson = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo;
const projectId = appJson?.extra?.eas?.projectId;
const owner = appJson?.owner;
const slug = appJson?.slug;
if (!projectId) fail('app.json 缺少 extra.eas.projectId，請先執行 eas init');
if (!appJson?.updates?.url) fail('app.json 缺少 updates.url，請先執行 eas update:configure');

const who = await run('eas', ['whoami'], { quiet: true });
if (who.code !== 0) fail('尚未登入 EAS，請先執行 eas login');
console.log(`▶ 帳號 ${who.out.trim().split('\n')[0]}，專案 @${owner}/${slug}，頻道 ${channel}`);

// ---------- 1. 內容打包 ----------
if (!skipContent) {
  console.log('\n▶ npm run content:build');
  const r = await run('npm', ['run', 'content:build']);
  if (r.code !== 0) fail('content:build 失敗');
}

// ---------- 2. 發布 ----------
console.log(`\n▶ eas update --channel ${channel} --message "${message}"`);
const pub = await run(
  'eas',
  ['update', '--channel', channel, '--environment', environment, '--message', JSON.stringify(message.replace(/"/g, "'")), '--non-interactive'],
  { env: { CI: '1', EAS_SKIP_AUTO_FINGERPRINT: '1' } },
);
if (pub.code !== 0) fail('eas update 失敗，見上方輸出');

const pick = (label) => pub.out.match(new RegExp(`^${label}\\s+(.+)$`, 'm'))?.[1]?.trim();
const runtimeVersion = pick('Runtime version');
const groupId = pick('Update group ID');
const dashboard = pick('EAS Dashboard');
const platforms = pick('Platform');
if (!runtimeVersion || !groupId) fail('無法從 eas update 輸出解析 Runtime version / Update group ID');

// ---------- 3. QR code 與紀錄 ----------
mkdirSync(OUT_DIR, { recursive: true });
const expoGoLink = `exp://u.expo.dev/${projectId}?runtime-version=${encodeURIComponent(runtimeVersion)}&channel-name=${channel}`;
const svgUrl = `https://qr.expo.dev/eas-update?projectId=${projectId}&runtimeVersion=${runtimeVersion}&channel=${channel}`;
const pngPath = join(OUT_DIR, `expo-go-${channel}.png`);
const svgPath = join(OUT_DIR, `expo-go-${channel}.svg`);

await QRCode.toFile(pngPath, expoGoLink, { type: 'png', width: 640, margin: 2, errorCorrectionLevel: 'M' });

let svgSaved = false;
try {
  const res = await fetch(svgUrl);
  if (res.ok && (res.headers.get('content-type') || '').includes('svg')) {
    writeFileSync(svgPath, await res.text(), 'utf8');
    svgSaved = true;
  }
} catch {
  /* 離線或 qr.expo.dev 故障時略過，PNG 已足夠 */
}

const publishedAt = new Date().toISOString();
const latest = {
  publishedAt,
  owner,
  slug,
  projectId,
  channel,
  runtimeVersion,
  platforms,
  message,
  updateGroupId: groupId,
  dashboard,
  expoGoLink,
  qrPng: `docs/dev/release/expo-go-${channel}.png`,
  qrSvg: svgSaved ? `docs/dev/release/expo-go-${channel}.svg` : null,
};
writeFileSync(join(OUT_DIR, 'latest.json'), JSON.stringify(latest, null, 2) + '\n', 'utf8');

const historyPath = join(OUT_DIR, 'history.md');
if (!existsSync(historyPath)) {
  writeFileSync(historyPath, '# 發布紀錄\n\n| 時間 (UTC) | 頻道 | Runtime | 訊息 | 群組 ID |\n|---|---|---|---|---|\n', 'utf8');
}
appendFileSync(
  historyPath,
  `| ${publishedAt.slice(0, 16).replace('T', ' ')} | ${channel} | ${runtimeVersion} | ${message.replace(/\|/g, '\\|')} | [${groupId.slice(0, 8)}](${dashboard}) |\n`,
  'utf8',
);

console.log(`
✔ 發布完成
  Runtime      ${runtimeVersion}
  群組 ID      ${groupId}
  儀表板       ${dashboard}
  Expo Go 連結 ${expoGoLink}
  QR code      ${pngPath}${svgSaved ? `\n               ${svgPath}` : ''}
  紀錄         ${join(OUT_DIR, 'latest.json')}

把 PNG 或連結傳給測試者。對方需先在 Expo Go 登入已受邀進 @${owner} 的帳號。
`);
