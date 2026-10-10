# 交接文件：育村 APP（parenting-secretary，原名育兒秘書）

交接日期：2026-10-05
交接人：Claude Fable 5.1（Claude Code 工作階段）
接手對象：任何 AI agent 或工程師
專案擁有者：@outdoorsy（Git 作者：Joseph <josephyinyaoqing@gmail.com>）
程式庫：https://github.com/yinyaoqing/parenting-secretary（main 分支）

讀完本文件就能接手。細節都在程式庫內，本文只給地圖、現況、下一步與禁區。

---

## 1. 這是什麼

面向台灣家庭的育兒 APP「育村」（2026-10-10 由「育兒秘書」改名），一人搭配 AI 開發。功能限於：日常紀錄、安全網提醒、衛教內容連結、公費資源與行政待辦時程、照顧者支持的資源導向。長期架構承載到 18 歲。

**五項開發原則（不可違反）**

1. 無任何醫療、營養、法規顧問。所有內容必須有可公開查核的來源，否則不進產品。
2. 第一階段完成 0–3 歲全部功能，不切 MVP。
3. 資料模型與內容包架構承載到 18 歲。
4. 一人開發、最小成本：無後端、無帳號、無伺服器、無機器學習、無 LLM。
5. 照顧風格由問卷決定，只影響內容排序與提醒預設，**不得覆寫安全層**。

**規劃文件**：`docs/plan/plan-v0.9.md` 為開發基準版，之前版本 v0.3–v0.8 保留在同目錄供追溯。所有決策與理由都在裡面。只在紅線、模組增刪、來源政策、時程基準變動時出新版本。

---

## 2. 紅線（每次發布前自檢，詳見 plan-v0.4 第 2 章與 v0.5–v0.9 的增補）

| 編號 | 一句話 |
|---|---|
| R1 | 不診斷、不監測疾病、不分級判讀。personal 送審版型下沒有體溫、症狀、便色、就醫入口；org 版型體溫只顯示數字與官方定義。 |
| R2 | 不重製需授權的量表（M-CHAT-R、EPDS）與教材（Satter 逐字）。 |
| R3 | 內容只用可信度達標且授權允許的來源（見第 6 節）。 |
| R4 | 1 歲以下配方食品不得廣告促銷；不接受任何嬰幼兒用品品牌贊助。 |
| R5 | 特種個資本地化：資料只在裝置，無伺服器。 |
| R6 | 不建議藥物劑量、不宣稱療效。personal 版型只有通用「倒數提醒」（標題自寫、響過即刪）；org 版型用藥提醒只倒數使用者輸入的間隔。 |
| R7 | 安全睡眠等安全層不得被任何風格或設定關閉。「趴睡」一詞全產品禁用，改「清醒趴臥時間」。 |
| R8 | 符合 Apple 1.4.1、5.1.3 與 Google Play 健康應用聲明。 |
| R9 | 不以生成式 AI 產生醫療內容。 |
| R10 | 不以書名或他人品牌命名風格（用「結構型／回應型／混合型」）。 |
| R11 | 補助、假別等政策數字標年度與查核日期，走遠端 JSON。 |
| R12 | 政府開放資料標示來源（政府資料開放授權條款）。 |
| R13 | 安全層須有 A 級原文可離線閱讀。 |
| R14 | 疫情與環境提醒只轉述官方已發布警示，不自設門檻。 |
| R15 | 不以類推產生安全清單。 |
| R16 | 外國來源只用於不分國界主題；疫苗、健檢、補助、藥品、法規只用台灣官方。 |
| R17 | 譯文不得新增原文沒有的建議；「本產品補充」限食材替換、單位換算、機構名稱對應，≤ 譯文 30% 且 ≤ 80 字，無指示語氣。 |
| R18 | 不使用有商業利益衝突的來源。 |
| R19 | B 級重述須通過 10 字連續相同檢查（白名單除外）；段落順序不得與原文一一對應。 |
| R20 | 外國來源翻譯的主題群固定標示來源與原文連結。 |

---

## 3. 程式庫地圖

```
app/                    expo-router 畫面（依設計稿 v1：https://claude.ai/artifact/MriThFqEJ4gUim72TujHXr）
  _layout.tsx           ThemeProvider + Stack（系統 header 全關，畫面自畫 TopBar；record/* 為 modal）
  (tabs)/               底部四分頁：index（今天）、cards（內容）、schedule（時程，規劃中）、settings（設定）
  (tabs)/index.tsx      首頁：三格狀態、安全網提醒橫幅（首頁內，非通知）、安全內容入口、一鍵紀錄＋復原提示、清醒趴臥與用藥入口；無孩子時為歡迎頁
  onboarding/           建檔三步（child，原生日期選擇）、問卷（style：預設或逐題一頁）、結果（result）
  record/               瓶餵、體溫、副食品、清醒趴臥（tummy）、用藥（medication）：都有「時間」列可補登；紀錄（timeline：列表／時間軸／一週或課表三視圖）；修正（edit：日期時間選擇器＋微調＋刪除）
  cards/[id].tsx        內容卡詳情：閱讀字級、來源區塊、右上 AA 切換字級
  child/                switch（切換孩子的抽屜）、[id]（編輯、設為目前、封存；開始上托嬰與入園入學日期）
  plan/                 行程與範本：index（範本開關與起點、每天範本、每週固定行程）、edit（新增編輯，modal）、derive（從這週產生範本）
  task/toilet.tsx       如廁訓練任務頁（國健署原文，只數次數）
  data/index.tsx        資料與備份：加密備份匯出與還原、已封存的孩子、刪除全部資料
  record/pump.tsx       擠奶與母乳庫存；record/more.tsx 生長、日記（org 版型多便色、症狀、就醫）；record/timer.tsx 倒數提醒（標題自寫、響過即刪）；record/share.tsx 分享今天（純文字）
  checkup/questions.tsx 這次想問醫師的事（只存本機）
  resources/nursing.tsx 哺集乳室清單（國健署開放資料，依縣市鄉鎮篩選，系統地圖導航）
  search/index.tsx      問問看：離線檢索官方內容卡，危急字詞固定顯示 119（規劃 4.8）
  notify/index.tsx      通知健康檢查：權限、接下來的提醒、測試通知與準時度
  caregiver/index.tsx   照顧好自己：10 秒打卡（只存本機）、官方專線、請別人幫忙（系統分享）
  sync/                 同步與交接：index（配對、交接、分享與匯入交接檔）、qr（配對或交接 QR code，多張輪播）、scan（相機掃描，配對與交接共用）
src/db/                 types（18 歲資料模型）、schema（SQLite v4：事件加 seq、updated_at、tz_offset_min；peers 表；children.archived_at、daycare_from、school_from；schedule_items 補 kind、時長、有效期間、節次、範本來源、墓碑）、schedule（行程與範本顯示設定）、index（開庫與遷移）、repo（孩子、風格、設定）、events（事件 append-only）、device（裝置 id）
src/sync/               不經伺服器的多裝置同步：merge（純函式合併引擎，含測試）、codec（交接包打包、QR 多張切分、配對碼，含測試）、crypto（expo-crypto AES-GCM）、store（配對身分、peers、組差量包、套用交接包）
src/records/quick.ts    一鍵紀錄輔助與安全網上界計算
src/timeline/           時間軸：plan（純函式：起點、某天的計畫、從一週紀錄產生範本，含測試）、DayView、WeekView、Timetable、usePlan、colors
src/calendar/            同步到手機行事曆：plan（純函式：行程轉週期事件、比對新增更新刪除，含測試）、sync（expo-calendar 寫入、單機開關 cal:on、對應表 cal:map；Expo Go 不做事）
src/util/runtime.ts     是否在 Expo Go、交接檔 UTI
app/+native-intent.tsx  系統交來的 file:// 或 content:// 網址轉到 sync/import（點 .psync 直接開 APP）
app.config.js           runtimeVersion：預設 sdkVersion（Expo Go 測試頻道），EAS 建置設 NATIVE_BUILD=1 改 appVersion；APP 內更新：production 建置關閉（隱私標示「未蒐集資料」的前提），測試版照舊
scripts/build-content.mjs --release  送審版內容包：只含 review／published 且譯審完成的卡，安全層不完整就失敗；EAS production 建置經 eas-post-install.mjs 自動執行
scripts/build-legal.mjs 隱私權政策、服務條款、支援頁轉成 docs/data/*.html（GitHub Pages）
src/release/profile.ts  送審版型 personal／org 與功能開關 FEATURES（決策第 10 項、plan-v1.0 第 1 章）；改一行切換，資料結構不變
src/db/reminders.ts     倒數提醒（reminders 表 kind=timer）：新增、列出未到期、刪除、清掉已到期
src/village/            育村社群（plan-v1.0 第 4 章）：model（村民、小組、加入碼、小組檔加解密、交班卡，純函式含測試）、store（village_members 隨家庭交接同步；village_groups、group_items 用小組金鑰）
src/notices/            村長公告：select（依日期、縣市、年齡篩選，含測試）、loader（內建加遠端覆蓋）；內容在 content/notices/notices.json
app/(tabs)/village.tsx  育村分頁：我的村、鄰里小組、村長公告；app/village/ 村民、交班卡、建立與加入小組、小組行程
src/home/location.ts    照顧地點六種與依年齡篩選（建檔與編輯共用）
src/home/county.ts      22 縣市正式名稱；孩子的戶籍縣市（schema v5）決定地方補助
src/policy/select.ts    政策依年齡與縣市篩選（純函式，含測試）
src/progress/           進度對照表：select（年級換算、入口條件，含測試）、store（勾選只存本機）；內容在 content/progress/checklist.json，授權查核前保持空白
src/remote/validate.ts  遠端資料只接受政府網址與單純檔名（MAS L1，含測試）
src/ui/PlaceList.tsx    依縣市鄉鎮篩選的場所清單：哺集乳室、親子館（content/resources/parent-child-centers.json）、幼兒園（kindergartens.json）共用
scripts/import-centers.mjs、import-kindergartens.mjs  親子館與幼兒園名錄開放資料匯入
scripts/b2g-tenders.mjs 育兒資源網類標案追蹤，輸出 docs/dev/b2g-tenders.md
docs/dev/mas-l1-checklist.md、docs/b2g/yilan-demo.md  資安自我檢查與宜蘭縣示範說明
src/home/buttons.ts     首頁按鈕依餵養方式與年齡的預設與自訂覆蓋（純函式）；體溫與用藥鍵受版型控制
src/records/            pump（庫存）、share（分享今天文字）、csv（匯出），皆純函式含測試
src/content/summary.ts  卡片一句話與分段折疊
src/search/             檢索引擎：斷詞、同義詞、危急字詞（純函式，含測試）
src/encouragement/      今天一句：pick（挑卡純函式）、today（處境與記錄）、TodayCard；內容在 content/encouragement/cards.json（55 張，三類：國健署原文、自寫描述句、思想與角色模擬）
src/notify/             本地通知：plan（純函式：安全網、用藥、行程、公費時程，最多 60 則，含測試）、scheduler（滾動重排、權限、準時度）；資料變動由 src/db/changes.ts 通知
src/caregiver/          照顧者支持：resources（專線與查核日期、打卡題目、邀請時機，純函式）、store（打卡、暫停狀態）
src/sync/backup.ts      備份檔格式 PSB1（PBKDF2 推導金鑰＋AES-GCM，含測試）；backupStore.ts 匯出、還原、刪除全部
src/tasks/toilet.ts     如廁訓練任務：國健署原文與狀態計算（任務狀態用 task.* 事件，不另開表）
src/style/questionnaire.ts  六向度 12 題、三預設、計分、衍生預設
src/content/            types（內容卡結構）、loader（載入打包 JSON）、cards.generated.json（產生物，勿手改）
src/ui/ChildContext.tsx 目前孩子（activeChildId）的全域狀態；ChildTitle：標題列可點的孩子名字
src/ui/art.tsx          插畫（assets/art，8 張水彩 JPEG）與手繪 SVG 裝飾（天空、盾牌、奶瓶、體溫計、小芽、小熊、月亮雲朵）
src/ui/                 theme（設計系統色票、字級三段、樣式表）、ThemeContext（日夜模式與字級的全域狀態）、useTheme、components（Tile、Big、Chip、Seg、Opt、PickRow、ListRow、Badge、Banner、SafetyBox、Toast…）、DatePick（原生日期時間選擇）、TimeRow（表單補登時間列）
src/util/               age（實際與矯正月齡）、format、datetime（中文日期、相對時間、補登換算）
content/cards/          內容卡 JSON 原始檔（safety 14、milestones 10、weeks 12、home_safety 8、feeding 11、health 10、sleep 4）
content/alerts/         官方疫情提醒 alerts.json（只收疾管署原文；擁有者每週查核後 npm run data:build）
content/resources/      nursing-rooms.json（國健署自願設置哺集乳室名單彙整表，1,372 處）
content/policy/         政策 policy.json（補助、假別、生育給付、扣除額、行政待辦；每項附官方連結與查核日期）
docs/data/              GitHub Pages 發布的 manifest、policy、schedule（由 npm run data:build 產生，勿手改）
content/schedule/       公費時程 timeline.json（健檢 9 次、發展篩檢 6 次、疫苗、塗氟；只有時間窗，沒有金額）
src/policy/             政策 loader（內建＋遠端覆蓋、過期判斷）；src/remote/sync.ts 從 GitHub Pages 檢查更新
src/schedule/           loader：依出生日算時間窗與狀態，之後遠端 JSON 用同格式覆蓋
content/whitelist.json  相似度檢查白名單
scripts/
  check-content.mjs     產線十項檢查（必跑）
  build-content.mjs     打包內容卡到 src/content（prestart 自動跑）
  export-bilingual.mjs  對照稿輸出給譯者
  import-translation.mjs 譯審匯回：讀 CSV「修訂譯文」欄寫回卡片並設 translationReviewed=true（支援 --dry-run）
  publish-preview.mjs   一鍵 EAS Update 到 preview 頻道並產 QR code 到 docs/dev/release/
docs/plan/              規劃文件 v0.3–v0.9
docs/week1/             授權申請信、訂閱流程、授權聲明清單、未獲授權處理
docs/validation/        家長規格驗證頁原始檔與說明
docs/translation/       對照稿輸出
docs/dev/run.md         如何啟動驗證
docs/dev/deploy-test.md 如何部署測試版（已含 EAS 專案資訊）
docs/dev/device-test.md 真機驗證清單（階段 0，兩支手機）
docs/dev/business-review.md 商業模式四輪檢驗（2026-10-08）：營收情境、付費牆修正建議、B2B 機構版的代價、付費風險與收入之外的路、上架後驗證指標
docs/dev/b2g-research.md 縣市政府白牌調查：育兒資源網標案金額與廠商、競品、MAS 與無障礙要求、路線
docs/dev/release-checklist.md 1.0 送審清單（擁有者事項）
docs/dev/roadmap.md     開發順序（2026-10-06 排定，含各階段完成標準與擁有者待辦）
docs/dev/release/       最新一次發布的 QR code、latest.json、history.md（publish-preview 產生）
```

**指令**

```bash
npm install
npm run typecheck          # 必須 0 錯誤
npm run content:check      # 必須 0 張未通過
npm run content:build      # 產生 cards.generated.json
npm run content:bilingual  # 對照稿
npm run content:import -- docs/translation/bilingual-<日期>.csv --dry-run   # 譯審匯回（先 dry-run）
npm run lint               # eslint，目前 0 錯誤
npm run test:sync          # 合併引擎與交接包的 node 測試（不需 RN 環境）
npm run data:check         # 政策與時程 JSON 檢查（查核超過 90 天、非政府來源會失敗）
npm run data:build         # 檢查後寫入 docs/data/，推送後 GitHub Actions 發布到 Pages
npm run test:search        # 檢索與今天一句的 node 測試
npm run test:timeline      # 時間軸計畫層與如廁任務的 node 測試
npm test                   # 兩者都跑
npx expo start             # Expo Go 開發
npx expo export --platform android --output-dir /tmp/x   # 煙霧測試 JS 打包（web 會失敗，正常，未裝 react-native-web）
npm run publish:preview    # 發布測試版（需 eas login）
```

---

## 4. 目前狀態（2026-10-05）

### 4.1 已提交（對應時程第 1–5 週，加上第 6 週起的工作）

| 週 | 完成 |
|---|---|
| 1 | Expo SDK 57 專案、資料模型、SQLite schema、內容卡結構、產線檢查腳本、第 1 週文件 |
| 2 | 建檔流程、照顧風格問卷、安全層 14 條草稿 |
| 3 | 事件資料層（supersedes 修正、墓碑刪除、單一計時器）、快速紀錄輔助、安全層 11 條補入原文摘錄與確切網址、家長驗證頁 |
| 4 | 首頁一鍵紀錄、瓶餵、體溫、紀錄列表、日夜主題、CDC 月齡卡 10 張 |
| 5 | 副食品紀錄、修正時間、內容卡列表與詳情、內容打包、對照稿輸出、啟動與部署文件、eas.json |
| 9 | 多孩子切換：目前孩子存 settings，三個分頁與設定頁共用；切換單、編輯頁、封存；3 歲以上首頁精簡（擁有者決定）；多胞胎不做同時記錄（擁有者決定） |
| 8 | 睡眠 4 張（國健署 A1，自行入睡類標 structured／mixed 風格）；健康照護 10 張（國健署新生兒篩檢、視力口腔、預防注射，A1）；飲食 11 張（國健署營養、運動，A1）；居家安全 8 張（國健署事故傷害預防，A1）；安全卡 8 處原文摘錄補齊；時程分頁改為真資料（國健署 7+2、發展篩檢、疾管署 115.09 版疫苗表、塗氟）；時區切日；紀錄列表「可能重複」標示；check-content --net 改用 curl 後備 |
| 7 | 多裝置同步（不經伺服器）：QR code 面對面交接、AirDrop／Quick Share／LINE 傳加密交接檔並合併匯入；schema v2；區域網路與藍牙直連已決定不做；路 B（中繼伺服器）保留於 docs/legal 的法規備忘錄 |
| 6 | EAS Update 設定（組織 yinyaoqings-team、sdkVersion runtime）、一鍵發布腳本、eslint；0–3 個月週卡 12 張（content/cards/weeks，底本國健署孕產兒關懷網站寶寶篇第 1–12 週，A1） |

檢查狀態：typecheck 通過、content:check 69 張全過（安全層 14 條的原文摘錄已補齊）、Android JS 打包成功。

### 4.2 工作目錄

乾淨，全部已提交並推送。第一個動作：`npm install` 後跑 `npm run typecheck && npm run content:check` 確認環境。

### 4.3 外部資源與帳號

| 項目 | 狀態 |
|---|---|
| GitHub | yinyaoqing/parenting-secretary，main |
| Expo / EAS | 組織 `yinyaoqings-team`，專案 parenting-secretary，preview 頻道。Expo Go 測試者需註冊 Expo 帳號並被邀請為 Viewer（見 deploy-test.md） |
| Apple Developer | 未知，iOS TestFlight 前需要 |
| Google Play | 未知，Android 商店前需要；APK 內部發布不需要 |
| 家長驗證頁 | https://claude.ai/artifact/HPgtqdB6QFbgVpLwtZHsgq（私密 Artifact，回饋存於其資料庫 `feedback/<viewer id>`，擁有者可用 Claude Code 的 ArtifactData 工具 `list feedback` 讀回；原始檔在 docs/validation/） |
| 規劃文件閱讀頁 | https://claude.ai/code/artifact/40166272-1ee2-4f9b-b1f1-9de73b9ecb25（含 v0.3–v0.9 Markdown） |

### 4.4 需要專案擁有者本人做、尚未回報完成的事

1. 寄出三封學會授權申請信（草稿在 docs/week1/authorization-letters.md）。6 週無回覆依 D7-4 以 B 級重述上線，不阻擋。
2. 存 11 張授權聲明截圖到 docs/licenses/（清單在 docs/week1/subscriptions-and-evidence.md）。目錄尚不存在。
3. 訂閱法規異動與機關新聞 RSS（流程在 docs/week1/subscription-howto.md）。
4. 把家長驗證頁分享給 3–5 位家長；把 docs/translation/ 的對照稿交給譯者（擁有者已有譯者資源）。
5. 邀請家長測試者的 Expo 帳號進組織 yinyaoqings-team（角色 Viewer），再把 docs/dev/release/expo-go-preview.png 傳給他們；測試版已發布到 preview 頻道。
6. 以個人身分申請 Apple Developer Program 與 Google Play 開發者帳號（決策第 3、10 項）；商店類別、文案與審查備註照 docs/plan/plan-v1.0.md 第 1.5 節。

---

## 5. 下一步（依 plan-v0.9 時程表第 6 週起，含驗收條件）

| 優先 | 工作 | 驗收 |
|---|---|---|
| 1 | 週卡 12 張的人工複核：已依原文改寫並通過 content:check，但未經第二人核對原文；草稿狀態（draft）待複核後改 review | 逐張對照 readMore 的原文連結 |
| 2 | 月齡卡 48 張補齊：目前 10 張（CDC 月齡），週卡 12 張後還差 26 張；可拆為每月齡 2–3 張主題卡（遊戲、睡眠樣貌、飲食樣貌），底本 CDC/NHS/國健署 | 同上；A2 翻譯卡 translationReviewed=false 直到譯審匯回 |
| 3 | 本地通知（第 7–8 週）：expo-notifications、滾動排程（iOS 64 筆上限）、Android `SCHEDULE_EXACT_ALARM` 授權引導、通知健康檢查頁、安全網提醒實作（用 `recentIntervalsMinutes` 與 `safetyNetUpperBound`）、用藥倒數、暫停模式 | 需 EAS development build 真機測；驗收標準見 plan-v0.4 7.2：50 筆提醒誤差中位數 < 1 分鐘 |
| 4 | 公費資源時程（第 9–11 週）：`resource_timeline` 表、時程 JSON（9 次預防保健、6 次發展篩檢、疫苗、塗氟）、政策 JSON（津貼、補助、假別、扣除額）、行政待辦；遠端 JSON 放靜態空間 | 數值全部對應 plan-v0.5 數值來源表，附查核日期 |
| 5 | 飲食 24、睡眠 10、健康照護 14、家庭權益 20、居家安全 8、行為 2 張卡（上架 140 張目標） | 同內容卡驗收 |
| 6 | 照顧者支持、暫停模式、行程骨架、匯出與備份（第 14 週） | 匯出 JSON 可再匯入還原 |
| 7 | 無障礙、長輩字級、隱私權政策、商店素材、紅線自檢（第 15–16 週） | — |

檢查點（plan-v0.8 D6-4）：第 8 週 TestFlight 或 APK 可用；第 14 週內容 ≥ 100 張。未達則依序砍行為與情緒、在地資源、特殊情境擴充，不砍安全層與公費資源。

---

## 6. 內容產線規則（接手者最容易犯錯的地方）

**來源兩軸**（plan-v0.7 第 3 章）

- 可信度 T1（台灣主管機關、台灣專科醫學會、外國主管機關、WHO）、T2（醫學中心、基金會、國際專科學會、系統性回顧）、T3（診所、個別醫師，僅線索）、T4（媒體、品牌、社群，不用）。
- 授權 A1（政府資料開放授權條款網站、法條、開放資料：可引用原文）、A2（美國聯邦政府公眾領域如 CDC、NIH、USDA、NIAID；英國 NHS 的 Open Government Licence：可翻譯改寫，須標「翻譯自」）、B（學會、醫院、基金會、《兒童健康手冊》：可重述事實並引用，不得複製表達）、C（WHO、AAP、Cochrane、期刊：只敘述一句話結論加連結）、X（不用）。
- 重要：《兒童健康手冊》電子書保留所有權利，只能連結；國健署網站其他頁面適用開放授權。

**每張卡必備欄位**：見 `src/content/types.ts`。缺任一不得上線。B 級 zh-TW 來源必須有 `excerpt` 供相似度檢查；A2 翻譯卡進入 review 前也必須有 `excerpt`。草稿可暫以 `TODO：` 開頭佔位，腳本只警告；進入 review 即擋下。

**狀態流**：draft → review（來源與摘錄齊全，通過檢查）→ published（翻譯卡另需 translationReviewed=true）。

**改寫底本**：月齡發展用 CDC Act Early（公眾領域）、餵食用 USDA WIC 與 NHS、安全睡眠用 NICHD、發燒用 NHS 與衛福部頁面、過敏原用 NIAID 2017、居家安全用國健署。台灣官方與外國來源衝突時台灣優先並列說明。

**已知待補的來源缺口**（content/cards/safety 內標 TODO）：兒科醫學會轉載頁（自動抓取回 403，需人工開啟）、香港衛生署濕尿布頁（DNS 失敗）、阿斯匹靈與雷氏症候群句子（需食藥署頁面）、NHS 嚴重過敏反應頁、國健署「3 心」頁、國健署防溺五部曲頁、國健署 5 招防燒燙傷頁、衛福部五要五不頁。

---

## 7. 慣例

- 語言：程式註解、文件、提交訊息內容用繁體中文或英文皆可，使用者可見文字一律繁體中文（台灣用語）。
- Git：作者 Joseph <josephyinyaoqing@gmail.com>（使用者指定）；提交訊息結尾加 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`（接手的 agent 改成自己的名稱）。分支 main，無 PR 流程。
- 每次提交前：`npm run typecheck`、`npm run lint`、`npm run content:check`、Android export 煙霧測試。
- 不要在程式或內容中出現「建議就醫」「疑似」「診斷」等判斷語氣；安全層用官方原文的固定文字。
- 不要把 `content/cards/**/*.json` 的 `excerpt` 打包進 APP（build-content 已剝除）。
- 不要手改 `src/content/cards.generated.json`。
- 使用者是一人開發且無顧問；任何「找顧問核定」的建議都不可行，必須改成「找來源」或「刪除」。

---

## 8. 已知限制與風險

- Windows 無法本機建 iOS；走 EAS 雲端。
- Expo Go 自 2026 年 5 月起只能開啟本人或所屬組織的專案，測試者需 Expo 帳號並受邀；Android Expo Go 57.0.9 登入後仍可能 403（expo/expo#50253），改走 APK。
- 本地通知在 Expo Go 的 Android 不完整，第 7 週起必須用 development build。
- 問卷題目與內容卡文字未經任何真實家長測試；家長驗證頁回饋尚未收到。
- `content:check --net`：Node 無法驗證部分台灣政府網站的憑證鏈時改用系統 curl 再試，不關閉憑證驗證。publications.aap.org 對自動抓取回 403，屬 C 級來源，可忽略。
- 時程資料（content/schedule/timeline.json）：兒童預防保健 9 次依 2026-07-01 新制；疫苗依疾管署 115.09 版（預計 2026-10-01 實施）；塗氟補助年齡 2026 年 9 月起放寬到「進入國小當年度 8 月 31 日」但只在新聞見到，官方頁面尚未查到，JSON 仍寫未滿 6 歲；政策金額（津貼、補助）刻意不放，待遠端 JSON。
- 同步設計：事件取聯集、刪除與結束單向補上、同筆雙邊修正以較晚者為準、合併後只留一筆進行中的睡眠、一分鐘內同類重複只標示。孩子檔案以出生日判同一人，雙方收斂到字串較小的 id。交接差量靠每裝置 seq 與 updated_at；對方掃完要按「對方已掃描完成」才會前進 last_sent。交接檔副檔名 .psync，內容 PS1. 加 base64；配對 QR 含家庭金鑰，不加密。「用其他 APP 開啟 .psync」的檔案關聯尚未登記（需 development build）。
- 週卡（content/cards/weeks）改寫時刻意略去原文的生長數字範圍（R1）、Wessel 333 腸絞痛準則（R1）、輪狀病毒疫苗廠牌與時程、血管瘤段落；就醫情境一律以「國健署原文「…」」引用。
- 10 字相似度規則只對中文來源有效；英文來源靠段落順序規則與譯審。
- 段落順序檢查目前只在段落數相同時警告，不擋下。
- 月齡卡 CDC 語意（75% 以上已會）與國健署連續圖語意不同，已在卡片「閱讀更多」說明，仍是家長困惑的風險點。

---

## 9. 歷史脈絡（給想知道為什麼的人）

規劃經過六輪 AI 交叉審閱（v0.3–v0.9），主要轉折：v0.4 依五項原則砍掉所有判讀功能與後端；v0.5 擴充 13 個政府資料驅動的內容模組；v0.6 刪掉無來源的類推內容並改疫情提醒為官方警示觸發；v0.7 建立來源兩軸並納入 CDC、NHS 公眾領域底本；v0.8 結案 14 個開放問題宣告開發基準；v0.9 定稿投放節奏、補充區塊限制與產線十項檢查。每一輪的採納紀錄都在對應文件的「審閱紀錄」表。
