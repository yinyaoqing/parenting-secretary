# MAS L1 資安自我檢查（2026-10-08）

依據：經濟部（現由數位發展部數位產業署督導）「行動應用 App 基本資安規範」與檢測基準的五大類。本 APP 沒有使用者身分鑑別、沒有交易，屬 L1。這份是送測前的自我對照，正式送測以檢測實驗室當期採用的規範版本為準。

狀態：✅ 符合並有證據、🔧 本次修正、⚠️ 已知殘餘風險、➖ 不適用。

## 一、行動應用程式發布安全

| 項目 | 狀態 | 證據 |
|---|---|---|
| 只在官方商店發布 | ✅ | App Store、Google Play；測試版經 EAS Update 給受邀測試者 |
| 提供版本資訊與更新說明 | ✅ | 設定 › 關於 › 版本；商店更新說明 |
| 提供問題回報與聯絡管道 | ✅ | 支援頁 docs/data/support.html，設定 › 關於 › 支援與意見回饋 |
| 宣告且只要求必要權限 | ✅ | 相機（掃 QR code）、通知、行事曆（使用者打開同步時才問）、Android 精確鬧鐘；移除麥克風與錄音權限（app.json blockedPermissions、microphonePermission: false） |

## 二、敏感性資料保護

| 項目 | 狀態 | 證據 |
|---|---|---|
| 蒐集前告知用途 | ✅ | 隱私權政策 docs/legal/privacy-policy.md；權限說明文字皆為中文並寫明用途 |
| 不把敏感資料傳出裝置 | ✅ | 無帳號、無伺服器；唯一的網路請求是下載公開的政策與時程 JSON（src/remote/sync.ts），不帶任何使用者資料 |
| 系統自動備份不帶走資料 | 🔧 | Android 預設會把 APP 資料自動備份到使用者的 Google 雲端，與「資料不離開手機」不符；已設 android.allowBackup = false（app.json） |
| iOS 裝置備份 | ⚠️ | iOS 的 iCloud 裝置備份會包含 APP 資料夾（由使用者的裝置備份設定決定，Apple 端加密）。expo-sqlite 目前無法對資料庫檔設定排除備份旗標；隱私權政策已說明資料存在手機。後續可改用原生設定排除 |
| 交接與備份檔加密 | ✅ | 交接包 AES-256-GCM（家庭金鑰由 expo-crypto 產生，src/sync/crypto.ts）；備份檔 PBKDF2-HMAC-SHA256 十萬次推導金鑰加 AES-GCM（src/sync/backup.ts） |
| 日誌不含個資 | ✅ | 程式中沒有 console.log／warn／error 輸出（2026-10-08 全倉庫掃描） |
| 不使用剪貼簿傳遞敏感資料 | ✅ | 程式未使用剪貼簿 |
| 通知內容 | ⚠️ | 鎖定畫面通知會顯示孩子暱稱與使用者自訂的倒數標題；由使用者在系統設定控制鎖定畫面預覽。倒數標題不帶任何預設健康字詞 |
| 刪除資料 | ✅ | 設定 › 資料 › 刪除全部資料（要輸入「刪除」確認） |

## 三、交易資源控管

| 項目 | 狀態 | 證據 |
|---|---|---|
| 付款與交易 | ➖ | 1.0 沒有內購與付款 |
| 撥號、地圖、外部連結由使用者觸發 | ✅ | 專線撥號、地圖導航、來源連結都需使用者點按；不自動撥號或傳簡訊 |
| 外部連結來源限制 | 🔧 | 遠端政策、時程、疫情資料中的連結必須是 https 的 gov.tw、edu.tw 或 gov.taipei 網址，疫情提醒限疾管署；不符合時整包不採用（src/remote/validate.ts，含測試） |

## 四、身分鑑別、授權與連線管理

| 項目 | 狀態 | 證據 |
|---|---|---|
| 使用者身分鑑別 | ➖ | 無帳號（L1） |
| 只用加密連線 | ✅ | 正式版唯一的網路請求為 https://yinyaoqing.github.io（src/remote/sync.ts）；關閉 APP 內更新後不再連 Expo，也不再送出 EAS-Client-ID 安裝識別碼；Android 目標版本預設禁止明文流量；iOS ATS 預設啟用 |
| 憑證驗證 | ✅ | 使用系統預設的 TLS 驗證，未自訂信任或關閉驗證 |
| 遠端資料完整性 | 🔧 | manifest 指定的檔名只接受單純檔名（擋 ../ 與外部網址）；內容做結構與連結檢查後才套用（src/remote/validate.ts） |
| 鄰里小組 | ✅ | 每個小組有獨立金鑰（expo-crypto 產生），加入碼以 QR code 當面掃描；小組檔 AES-GCM 加密，第一行只帶小組 id；沒有加入的手機無法解密（src/village/，含測試）。加入碼外流等於鑰匙外流，畫面已提醒不要截圖轉傳 |
| 裝置配對 | ✅ | 配對 QR code 面對面掃描；拒絕自己的配對碼；交接檔以家庭金鑰解密，金鑰不符即失敗 |

## 五、行動應用程式碼安全

| 項目 | 狀態 | 證據 |
|---|---|---|
| 不執行外部程式碼 | ✅ | 無 WebView、無 eval；遠端只載入 JSON 資料。商店正式版關閉 APP 內更新（app.config.js 依 EAS_BUILD_PROFILE=production 設 updates.enabled = false），程式只來自商店審核過的安裝檔 |
| 輸入檢查 | ✅ | SQLite 全部使用參數化查詢（src/db/*.ts）；匯入檔先檢查格式前綴再解密（src/sync/codec.ts looksLikePackage） |
| 深層連結 | ✅ | app/+native-intent.tsx 只把 file:// 與 content:// 轉到匯入確認頁；匯入一定要使用者按「合併紀錄」 |
| 除錯資訊 | ✅ | 正式建置不含開發選單；無日誌輸出 |
| 第三方函式庫 | ⚠️ | 依賴皆為 Expo SDK 57 官方模組與少數純 JS 套件（fflate、@noble/hashes 等）；npm audit 的既有警告屬開發工具鏈，送測前再跑一次並記錄 |
| 識別碼產生 | ✅ | 紀錄 id 用時間加亂數，只作識別不作安全用途；安全金鑰一律由 expo-crypto 產生 |

## 送測前待辦

1. 用 EAS production 建置的安裝檔送測（Android APK 或 AAB 轉 APK、iOS IPA）。
2. 送測前再跑一次 npm audit 與本表全倉庫掃描。
3. 決定是否在 iOS 排除資料庫的 iCloud 裝置備份（需要原生設定或 config plugin）。
