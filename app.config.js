// 動態設定：只決定 runtimeVersion，其餘全部沿用 app.json。
// Expo Go 測試頻道（npm run publish:preview）只接受 exposdk:<SDK> 的 runtime，所以預設用 sdkVersion。
// EAS 正式建置（development、production 設定檔）在 eas.json 設 NATIVE_BUILD=1，改用 appVersion：
// 原生程式變動時要升 version，舊安裝版不會收到不相容的 OTA 更新。
// 對正式頻道發 OTA 更新時也要帶同一個變數：NATIVE_BUILD=1 npx eas-cli update --channel production
module.exports = ({ config }) => ({
  ...config,
  runtimeVersion: process.env.NATIVE_BUILD === '1' ? { policy: 'appVersion' } : { policy: 'sdkVersion' },
});
