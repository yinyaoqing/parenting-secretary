# 部署一版給測試者（線上測試）

兩條路，都走 Expo 的 EAS 雲端服務，免費額度夠用。第一次需要你本人登入 Expo 帳號，之後每次部署一行指令。

## 路 A：EAS Update 加 Expo Go（最快，約 10 分鐘，不需 Apple 或 Google 帳號）

測試者只要裝 Expo Go，打開你給的連結或掃 QR code 就能用，不需要你的電腦開著。

一次性設定：

```bash
npm install -g eas-cli
eas login                      # 用你的 Expo 帳號（expo.dev 免費註冊）
eas init                       # 在 expo.dev 建立專案並寫入 projectId
npx expo install expo-updates
eas update:configure           # 寫入 updates.url 與 runtimeVersion
```

每次部署：

```bash
npm run content:build
eas update --channel preview --message "week5"
```

指令結束會印出一個網址與 QR code。把網址傳給測試者，他們在 Expo Go 打開。

限制：測試者的 Expo Go 版本必須支援 SDK 57；本地通知在 Android 的 Expo Go 不完整；無法測小工具。對目前的紀錄、問卷、內容卡功能足夠。

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
