#!/usr/bin/env node
// EAS Build 在安裝相依套件後執行（package.json 的 eas-build-post-install）。
// production 建置一律重建送審版內容包：只含複核過的卡；安全層不完整時建置失敗，避免未複核內容上架。
import { spawnSync } from 'node:child_process';

const profile = process.env.EAS_BUILD_PROFILE;
if (profile !== 'production') {
  console.log(`eas-post-install: profile ${profile ?? '(none)'}，沿用倉庫裡的內容包`);
  process.exit(0);
}
const r = spawnSync(process.execPath, ['scripts/build-content.mjs', '--release'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
