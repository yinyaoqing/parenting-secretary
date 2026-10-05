# 部署一版給測試者（線上測試）

兩條路，都走 Expo 的 EAS 雲端服務，免費額度夠用。第一次需要你本人登入 Expo 帳號，之後每次部署一行指令。

## 路 A：EAS Update 加 Expo Go（最快，不需 Apple 或 Google 帳號，但測試者要有 Expo 帳號）

測試者裝 Expo Go，打開你給的連結或掃 QR code 就能用，不需要你的電腦開著。

**2026 年 5 月起的限制**：Expo Go 只能載入「你本人或你所屬組織」擁有的專案，未登入或非成員會得到 HTTP 403「this project requires authentication」。個人帳號不能邀請成員，所以專案由組織 `yinyaoqings-team` 擁有（app.json 的 `owner`）。每位測試者需要：

1. 到 expo.dev 免費註冊一個帳號。
2. 你在 https://expo.dev/accounts/yinyaoqings-team/settings/members 用他的 email 邀請，角色選 **Viewer**（只能在 Expo Go 看專案，不能改任何東西）。
3. 他在 Expo Go 內登入同一個帳號，再開連結。

已知問題：Android 版 Expo Go 57.0.9 登入後仍可能 403（expo/expo#50253），iOS 正常。Android 測試者若遇到，改走路 B 的 APK。

一次性設定：

```bash
npm install -g eas-cli
eas login                      # 用你的 Expo 帳號（expo.dev 免費註冊）
eas init                       # 在 expo.dev 建立專案並寫入 projectId（owner 取自 app.json）
npx expo install expo-updates
eas update:configure           # 寫入 updates.url 與 runtimeVersion
```

`eas update:configure` 預設寫入 `runtimeVersion: { policy: "appVersion" }`，但 Expo Go 只接受 `exposdk:<SDK 版本>` 這種 runtime，否則顯示「Not compatible with this version of Expo Go」。所以 app.json 要改成：

```json
"runtimeVersion": { "policy": "sdkVersion" },
"platforms": ["ios", "android"]
```

`platforms` 排除 web 是因為專案沒裝 react-native-web，不排除會讓 export 失敗。日後走路 B 正式建置時再改回 `appVersion` 或 `fingerprint`。

每次部署（一鍵）：

```bash
npm run publish:preview                       # 訊息預設為最近一次 commit 標題
npm run publish:preview -- --message "week6"  # 自訂訊息
```

腳本在 `scripts/publish-preview.mjs`，依序做 content:build、eas update、產 QR code。產出在 `docs/dev/release/`：`expo-go-preview.png`（傳給家長的 QR code，連結固定不變）、`latest.json`（本次更新資訊）、`history.md`（發布紀錄）。

等同於手動執行：

```bash
npm run content:build
eas update --channel preview --environment preview --message "week5"
```

`--environment` 指定要帶入哪組 EAS 環境變數；目前沒設任何變數，給 preview 即可。指令結束會印出 Runtime version（應為 `exposdk:57.0.0`）與 EAS Dashboard 連結。

給測試者的連結是固定的，之後每次 `eas update` 到 preview 頻道，Expo Go 重新開啟就會拿到最新版：

- Expo Go 直接開啟：`exp://u.expo.dev/e71c550f-b0ed-4bfd-b807-04d248ee70a1?runtime-version=exposdk%3A57.0.0&channel-name=preview`
- QR code 圖檔（SVG）：`https://qr.expo.dev/eas-update?projectId=e71c550f-b0ed-4bfd-b807-04d248ee70a1&runtimeVersion=exposdk:57.0.0&channel=preview`
- 專案儀表板：https://expo.dev/accounts/yinyaoqings-team/projects/parenting-secretary

iPhone 用相機掃 QR code 會跳到 Expo Go；Android 在 Expo Go 內用「Scan QR code」。

限制：測試者要有 Expo 帳號並被邀請進組織（見上）；Expo Go 版本必須支援 SDK 57；本地通知在 Android 的 Expo Go 不完整；無法測小工具。對目前的紀錄、問卷、內容卡功能足夠。

## 路 B：EAS Build 內部發布（接近正式體驗）

Android：產出 APK 下載連結，測試者直接安裝，不需 Google Play 帳號。

```bash
eas build --profile preview --platform android
```

完成後 expo.dev 給一個安裝頁連結，可直接傳給 Android 測試者。

iOS：Windows 無法本機建置，但 EAS 雲端可以。需要 Apple Developer Program（US$99／年）。兩種發布方式：

```bash
eas build --profile preview --platform ios   # Ad hoc：需先在 expo.dev 登錄測試者 iPhone 的 UDID，最多 100 台
eas build --profile production --platform ios && eas submit --platform ios   # TestFlight：測試者裝 TestFlight 即可，不需 UDID
```

TestFlight 比 Ad hoc 省事，但要先在 App Store Connect 建立 APP 紀錄並通過一次簡單審查。

## 建議順序

1. 今天：路 A，發給 3 到 5 位家長與你自己，驗證紀錄與問卷流程。
2. 第 7 週做通知時：路 B 的 Android APK，因為通知要在真機、非 Expo Go 環境測。
3. 第 15 週：TestFlight，對應時程表的 iOS 內測檢查點。

## 不建議的路：網頁版

expo-sqlite 在網頁需要額外設定且行為與手機不同，通知完全不可用。網頁版只適合展示畫面，不適合驗證功能，先不做。

## 注意

- EAS Update 與 Build 都會把程式碼上傳到 Expo 的伺服器；內容卡與程式沒有個資，使用者資料仍只在手機裡。
- `eas init` 會在 app.json 寫入 `extra.eas.projectId`，請提交到 git。
- 免費額度：每月 30 次雲端建置（iOS 與 Android 各 15）、EAS Update 每月 1,000 MAU，測試期綽綽有餘。
