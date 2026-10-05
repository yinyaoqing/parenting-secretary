# 開發中如何啟動與驗證

## 日常（Expo Go，最快）

1. 手機安裝 Expo Go。
2. 專案目錄：

```bash
npm install            # 第一次或 package.json 有變動時
npm run content:build  # 把 content/cards 打包成 APP 用的 JSON
npx expo start         # 顯示 QR code；手機與電腦不同網路時改 npx expo start --tunnel
```

3. iPhone 用相機掃 QR code 會跳到 Expo Go；Android 在 Expo Go 內掃。
4. 存檔即熱更新。要重置資料就在 Expo Go 把專案刪掉重開，或在 APP 內等「匯出與重置」功能（第 14 週）。

能驗證：建檔、照顧風格問卷、首頁一鍵紀錄、瓶餵、體溫、副食品、紀錄列表、補登修正、內容卡、日夜模式。
不能完整驗證：本地通知的精準時間（Expo Go 在 Android 有限制）、小工具、匯出到雲端硬碟。

## 檢查指令

```bash
npm run typecheck      # TypeScript
npm run content:check  # 內容卡十項檢查
npm run content:check:net  # 加上來源 URL 存活
npm run content:build  # 產生 src/content/cards.generated.json
npm run content:bilingual  # 產生給譯者的對照稿 docs/translation/
npx expo export --platform android --output-dir /tmp/x  # 只打包 JS，確認能編譯
```

## 第 7 週起（通知）

通知需要開發版 APP，不再用 Expo Go：

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android   # 雲端建置，免費額度內
eas build --profile development --platform ios       # 需 Apple Developer 帳號；Windows 無法本機建 iOS
```

建好的開發版裝到手機後，仍用 `npx expo start` 連線熱更新。

## Android 模擬器（可選）

裝 Android Studio 與一個 Pixel 模擬器後，`npx expo start` 按 `a` 會自動開到模擬器。小米、OPPO 的省電行為模擬器測不到，通知驗收仍要真機。
