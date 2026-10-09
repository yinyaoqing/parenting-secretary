// 動態設定：決定 runtimeVersion 與是否啟用 APP 內更新，其餘全部沿用 app.json。
//
// runtimeVersion
// - Expo Go 測試頻道（npm run publish:preview）只接受 exposdk:<SDK> 的 runtime，所以預設用 sdkVersion。
// - EAS 建置（development、preview、production 設定檔）在 eas.json 設 NATIVE_BUILD=1，改用 appVersion：
//   原生程式變動時要升 version，舊安裝版不會收到不相容的 OTA 更新。
//
// APP 內更新（expo-updates）
// - 正式版（EAS_BUILD_PROFILE=production）關閉：程式與畫面的修改一律走商店改版。
//   理由：expo-updates 檢查更新時會送出隨機安裝識別碼（EAS-Client-ID）給 Expo；
//   關閉後 APP 唯一的網路請求是下載公開的政策與時程 JSON，App Store 隱私標示可以如實填「未蒐集資料」。
//   政策、時程、疫情提醒仍由 GitHub Pages 遠端更新，不受影響（src/remote/sync.ts）。
// - 測試用的 development、preview 建置與 Expo Go 頻道照舊啟用。
const isStoreBuild = process.env.EAS_BUILD_PROFILE === 'production';

module.exports = ({ config }) => ({
  ...config,
  runtimeVersion: process.env.NATIVE_BUILD === '1' ? { policy: 'appVersion' } : { policy: 'sdkVersion' },
  updates: isStoreBuild ? { ...config.updates, enabled: false } : config.updates,
});
