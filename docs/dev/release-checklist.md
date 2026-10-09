# 1.0 送審清單（2026-10-08）

工程端能做的已全部完成。以下是送審前還要做的事，依順序排；👤 是擁有者本人才能做的。
規格依據：docs/plan/plan-v1.0.md（personal 送審版型、1.0 免費、.psync 與行事曆進 1.0）。

## 1. 帳號（👤，最先做，等待時間最長）

- [ ] Apple Developer Program 個人會員（US$99／年）：https://developer.apple.com/programs/enroll/
- [ ] Google Play 個人開發者帳號（US$25 一次）：https://play.google.com/console/signup
- [ ] Google 個人帳號新上架要先跑封閉測試（目前規則為 12 位測試者連續 14 天，以 Play Console 當下顯示為準），拿到正式上架資格後才能送正式版。帳號一開就開始找測試者。
- [ ] 確認套件識別碼。app.json 目前是 `com.yinyaoqing.parentingsecretary`（iOS 與 Android 相同）。第一次上傳後就不能改，要換請在上傳前告訴工程。

## 2. 開啟 GitHub Pages ✅（2026-10-08 完成）

- [x] GitHub 倉庫 Settings › Pages › Build and deployment 選「GitHub Actions」。
- [x] 三個網址已確認可開啟（HTTP 200），商店表單要填：
  - 隱私權政策 https://yinyaoqing.github.io/parenting-secretary/privacy.html
  - 服務條款 https://yinyaoqing.github.io/parenting-secretary/terms.html
  - 支援 https://yinyaoqing.github.io/parenting-secretary/support.html

## 3. 法務（👤）

- [x] 填入開發者殷耀慶與聯絡信箱 yinyaoqing@protonmail.com（2026-10-09），網頁已重建發布。
- [x] 兩輪審閱修正完成（2026-10-09）：五項必修、建議補強、與程式行為不符的四項、條款結構六項。
- [ ] 請執業律師簽核；修改後執行 `npm run legal:build` 並推上 main。
- [ ] 加密出口：app.json 已設 ITSAppUsesNonExemptEncryption = true（依 docs/legal/sync-route-b-legal-review.md 的保守判斷）。App Store Connect 第一次上傳會要求出口合規文件；向美國 BIS 提交年度自我分類報告（每年 2 月 1 日前）。若律師判斷只用系統加密可適用豁免，改成 false 並在工程端重建。
- [ ] App Store Connect 的發行地區先排除法國（ANSSI 申報）。

## 4. 內容複核（👤，最花時間）

送審版只打包狀態為 review 或 published、且翻譯卡已譯審的卡。`npm run content:build:release` 會列出各主題可上架張數；安全層不完整時 EAS production 建置會直接失敗。

目前狀態（2026-10-08）：

| 主題 | 可上架／全部 |
|---|---|
| 安全層 | 6／14 |
| 其他主題 | 0／120 |

- [ ] 安全層 8 張逐張對照原文複核，改為 review。其中 5 張是翻譯卡，要先譯審並設 translationReviewed。
- [ ] 其他主題至少複核到每個月齡都有內容（週卡、飲食、睡眠優先）。
- [ ] 鼓勵卡 55 張抽查。

## 5. 建置與真機（工程，帳號開好後）

- [ ] `npx eas-cli build --profile development --platform android`，安裝後跑 docs/dev/device-test.md 第 P 節與 K 節。
- [ ] iOS 同上（需 Apple 帳號；會要求登入並自動建立憑證）。
- [ ] `npx eas-cli build --profile production --platform all`，上傳 TestFlight 與 Play 封閉測試。
- [ ] 50 筆提醒準時度中位數小於 60 秒。
- [ ] 螢幕閱讀器走查：VoiceOver 與 TalkBack 走完建檔、記錄、交接、行事曆開關。

## 6. 商店資料（👤 填寫，文案工程可代擬）

- [ ] 類別：Apple 主類別 Lifestyle、次類別 Productivity；Google 類別 Parenting。不選 Medical、Health & Fitness。
- [ ] 文案與截圖用詞照 plan-v1.0 第 1.5 節：不出現健康管理、醫療、監測、發燒、退燒、用藥、症狀、體溫。截圖不拍安全層的發燒卡。
- [ ] 截圖：iPhone 6.9 吋；app.json 目前 supportsTablet = true，Apple 會另要 iPad 13 吋截圖。不想準備 iPad 截圖就改成 false。Google 另要 1024×500 特色圖。
- [ ] App Privacy：資料不離開裝置，選「未蒐集資料」。前提是正式版關閉 APP 內更新（app.config.js 已設定，production 建置自動生效），否則 Expo 會收到安裝識別碼。
- [ ] 程式修正一律走商店改版：npx eas-cli build --profile production 後 npx eas-cli submit；政策與時程資料照舊推 GitHub 自動更新。
- [ ] Google 資料安全表：不蒐集、不分享；交接與備份為使用者自行傳送的加密檔。
- [ ] Google 目標對象選 18 歲以上（家長），APP 不是給兒童使用。
- [ ] 年齡分級（Apple 問卷、Google IARC）：無暴力、無使用者互動、無購買。
- [ ] 審查備註三句：資料只存在裝置、沒有帳號與伺服器；不診斷、不判讀、不建議劑量；所有內容引用台灣政府公開資料並附來源連結。另附一句：行事曆權限只在使用者為行程打開同步時請求。
- [ ] 價格：免費，不設內購。

## 7. 送審當天

- [ ] `npm run typecheck && npm run lint && npm test && npm run content:check && npm run data:check`
- [ ] 紅線自檢表 docs/dev/redlines-checklist.md 每條有證據。
- [ ] 版本號：app.json 的 version 為 1.0.0；build number 由 EAS 自動遞增。
