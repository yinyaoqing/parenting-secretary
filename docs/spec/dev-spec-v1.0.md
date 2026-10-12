# 育村 開發規格 v1.0（整合版，2026-10-12）

> 寫給：專案擁有者，以及接手的工程師或 AI 代理。
> 這是把 plan-v0.3 到 v1.0、決策表、交接文件、紅線自檢表與程式現況整理成的**單一規格**。每一條都有編號，方便你直接在這份文件上改、刪、加，改完交給工程端照著做。
> 「現況」欄位描述 2026-10-12 的程式；「可調」欄位是你最可能想改的參數或規則。

## 0. 如何使用本文件

- **編號**：章節用 `§N`，規格條目用 `N.N-x`（例如 `7.2-a`）。改動時只要說「7.2-a 的 1460 改 1825」。
- **狀態標記**：每條預設為「已實作」。你改成 ⬜ 表示要做、🔶 表示要調、❌ 表示要拿掉。
- **參數集中**：所有數值常數整理在 §23 附錄 A，改參數先看那裡，再對回條目。
- **文件關係**：本文件是現況規格；決策理由在 docs/dev/decisions.md；歷史版本在 docs/plan/；真機測試在 docs/dev/device-test.md；給家長的說明在 docs/manual/parent-guide.md。本文件與程式不一致時，以本文件為目標，修程式。
- **出新版的時機**：紅線、模組增刪、來源政策、收費、送審版型變動時，複製成 dev-spec-v1.1.md 再改；小修直接改本檔並在 §22 記一行。

---

## 1. 產品定義

### 1.1 一句話

面向台灣家庭的育兒 APP「育村」：紀錄、提醒、衛教連結、公費資源時程、照顧者支持，加上以孩子為中心的照顧者社群（我的村、鄰里小組、村長公告）。資料只在手機。不診斷、不判讀、不生成醫療內容。

### 1.2 五項開發原則（不可違反）

| 編號 | 原則 |
|---|---|
| P1 | 無醫療、營養、法規顧問。所有內容必須有可公開查核的來源，否則不進產品。 |
| P2 | 第一階段完成 0 到 3 歲全部功能，不切 MVP；1.0 讓 0 到 18 歲都能入場使用。 |
| P3 | 資料模型與內容包架構承載到 18 歲。 |
| P4 | 一人開發、最小成本：無後端、無帳號、無伺服器、無機器學習、無 LLM 執行期呼叫。 |
| P5 | 照顧風格由問卷決定，只影響內容排序與提醒預設，不得覆寫安全層。 |

### 1.3 不做清單

聯絡簿、作業、成績；園所或醫師推薦與排序；跨家庭共用孩子紀錄；公開論壇；帳號系統；廣告與品牌贊助；分析追蹤工具；HealthKit 或 Health Connect；推播伺服器；任何形式的評分、百分位、常模比較。

### 1.4 名稱與識別碼

| 項目 | 值 |
|---|---|
| 顯示名稱 | 育村 |
| 技術識別碼 | bundle id 與 package：`com.yinyaoqing.parentingsecretary`；slug 與倉庫：parenting-secretary；scheme：`parentingsecretary` |
| 擁有者 | 殷耀慶 yinyaoqing@protonmail.com（法務文件主體） |
| 網站 | https://yinyaoqing.github.io/parenting-secretary/（manual、privacy、terms、support、遠端資料） |
| 商標 | 以「育村」申請第 9、42 類；字面與同音檢索結果見 docs/dev/naming-trademark.md |

### 1.5 目標使用者

0 到 18 歲孩子的家長與照顧者（含祖父母、保母、輪班照顧者）。設計基準是「疲憊的主要照顧者單手操作」：短句、大按鈕、夜間模式、字級三段。

---

## 2. 紅線（R1 到 R20）

每次發布前在 docs/dev/redlines-checklist.md 自檢。產線腳本能擋的已標示。

| 編號 | 規則 | 程式或腳本把關 |
|---|---|---|
| R1 | 不診斷、不監測疾病、不分級判讀、不評分、不設目標、不比常模 | personal 版型無體溫、症狀、便色、就醫入口；時間軸只顯示時數；如廁只數次數 |
| R2 | 不重製需授權的量表（M-CHAT-R、EPDS）與教材 | 人工 |
| R3 | 內容只用可信度達標且授權允許的來源 | content:check 檢查 trust、license、sources |
| R4 | 1 歲以下配方食品不廣告；不接受任何嬰幼兒用品品牌贊助 | 人工；內容無品牌 |
| R5 | 特種個資本地化：資料只在裝置，無伺服器 | 對外連線只有 GET 公開 JSON；交接與備份加密 |
| R6 | 不建議藥物劑量、不宣稱療效 | personal 版型只有通用倒數提醒；內容卡禁用藥物建議 |
| R7 | 安全層不得被任何風格或設定關閉；「趴睡」全產品禁用 | content:check 擋「趴睡」；暫停模式仍顯示安全層 |
| R8 | 符合 Apple 1.4.1、5.1.3 與 Google Play 健康應用聲明 | 商店分類與文案規則見 §3.4 |
| R9 | 不以生成式 AI 產生醫療內容 | 所有卡改寫自官方原文並附摘錄；AI 協助撰寫的卡全部 draft，人工複核後才進 release |
| R10 | 不以書名或他人品牌命名風格 | 結構型、回應型、混合型 |
| R11 | 政策數字標年度與查核日期，走遠端 JSON | data:check 擋查核超過 90 天 |
| R12 | 政府開放資料標示來源 | 卡片來源名稱含授權宣告 |
| R13 | 安全層須有 A 級原文可離線閱讀 | build-content --release 安全層不齊即失敗 |
| R14 | 疫情與環境提醒只轉述官方已發布警示 | alerts 只收疾管署；查核超過 14 天警告 |
| R15 | 不以類推產生安全清單 | 人工 |
| R16 | 疫苗、健檢、補助、藥品、法規只用台灣官方（gov.tw、edu.tw、gov.taipei） | data:check 與 validate.ts 網域白名單 |
| R17 | 譯文不得新增原文沒有的建議；「本產品補充」≤ 譯文 30% 且 ≤ 80 字，無指示語氣 | content:check 檢查 supplement |
| R18 | 不使用有商業利益衝突的來源 | 人工 |
| R19 | B 級重述連續相同 ≤ 10 字（白名單除外）；段落順序不得一一對應 | content:check LCS |
| R20 | 外國來源翻譯的主題群固定標示來源與原文連結 | foreignOnly 與翻譯標示 |

---

## 3. 送審版型與商店

### 3.1 兩個版型

`src/release/profile.ts` 一行切換：`RELEASE_PROFILE = 'personal' | 'org'`。資料結構不變，轉組織帳號後改回 org 即開回功能。

| 開關 | personal（1.0 送審） | org |
|---|---|---|
| FEATURES.healthRecords（體溫、症狀、便色、就醫） | 關 | 開 |
| FEATURES.medicationLog（用藥紀錄與間隔通知、行程種類「服藥」） | 關，由倒數提醒承接 | 開 |
| FEATURES.careCards（腸絞痛、尿布疹、RSV 與輪狀三張卡，`profile: "org"`） | 不打包 | 打包 |
| 內容主題「健康照護」名稱 | 篩檢、接種與日常照護 | 同 |
| 安全層 14 張（含發燒處置） | 有，關不掉 | 同 |

### 3.2 倒數提醒規則（personal 版型的通用計時器）

- 3.2-a 標題、起算時間、間隔全由使用者輸入；APP 不給範本、不列候選詞；placeholder 用與健康無關的例子。
- 3.2-b 通知標題只重複使用者的字，內文固定「{孩子}：你設定的倒數到了。」
- 3.2-c 響過即刪：不留歷史、不進紀錄列表、分享文字與 CSV。
- 3.2-d 一次一則，無重複週期；重複的事用行程。
- 3.2-e 設定 › 提醒可一鍵關閉；暫停模式下停掉。

### 3.3 APP 內更新策略

- 3.3-a production 建置（EAS_BUILD_PROFILE=production）關閉 expo-updates，程式修正走商店改版；理由是 expo-updates 會送安裝識別碼給 Expo，與「未蒐集資料」申報衝突。
- 3.3-b 政策、時程、疫情、公告、活動資料仍由 GitHub Pages 遠端更新（§12）。
- 3.3-c 測試版（Expo Go preview 頻道、development、preview 建置）維持 OTA。

### 3.4 商店分類與文案（R8）

- Apple 主類別 Lifestyle，次類別 Utilities 或 Productivity；Google 類別 Parenting。不選 Medical、Health & Fitness。
- 文案與截圖不出現：健康管理、醫療、監測、發燒、退燒、用藥、症狀、體溫、防治。描述為「育兒紀錄、提醒、政府資源連結、照顧者社群」。
- 截圖不拍日記自由文字、不拍發燒卡。
- App Privacy 填「未蒐集資料」；Google 資料安全表照實填；不宣告任何健康權限。
- 審查備註三句：資料只存在裝置、沒有帳號與伺服器；不診斷、不判讀、不建議劑量；所有內容引用台灣政府公開資料並附來源連結。
- 加密出口申報：AES-256-GCM 用於交接與備份（docs/legal/sync-route-b-legal-review.md）。

### 3.5 法務文件

docs/legal/privacy-policy.md、terms.md 由 scripts/build-legal.mjs 轉成 docs/data/privacy.html、terms.html，另產 support.html 與 manual.html。管轄法院宜蘭地區。兩份已經兩輪律師角度審閱（plan-v1.0 §7）。

---

## 4. 孩子與使用者模型

### 4.1 Child（src/db/types.ts）

| 欄位 | 說明 | 可調 |
|---|---|---|
| nickname | 稱呼 | |
| birthDate | 出生日，所有年齡推算的根 | |
| dueDate | 預產期，早產兒矯正月齡；建檔與編輯只在 < 730 天時詢問 | 門檻 730 |
| feedingMethod | breast / bottle_breastmilk / formula / mixed；只在 < 1095 天時詢問 | 門檻 1095 |
| location | home / postnatal_center / daycare / kindergarten / coop / school / other；依年齡列出可選（src/home/location.ts） | 年齡對應表 |
| locationUntil | 產後護理之家預定出所日 | |
| specialContexts | preterm、multiple、dev_concern、disability_chronic、new_immigrant、grandparent 等；措辭「你想多看哪些資源」，可不選 | |
| daycareFrom、schoolFrom | 作息範本的事件起點 | |
| county | 戶籍縣市（22 縣市正式名稱，src/home/county.ts）；決定地方補助、親子館預設、村長公告 | |
| archivedAt | 封存（不刪資料） | |

### 4.2 年齡

- 4.2-a 所有規則用「天數」：1 歲 365、2 歲 730、3 歲 1095、4 歲 1460、6 歲 2190、12 歲 4380、15 歲 5475、18 歲 6570。
- 4.2-b 早產兒另算矯正月齡（src/util/age.ts），只用於內容與里程碑卡的挑選，不用於疫苗與公費時程。
- 4.2-c 年齡階段（src/content/stage.ts `ageStage`）：baby < 365、toddler < 1095、preschool < 2190、school < 4380、teen ≥ 4380。鼓勵卡另用六段：newborn 0–90、infant 91–365、toddler 366–1095、preschool 1096–2190、school 2191–4380、teen 4381–6570。

### 4.3 多孩子

目前孩子為全域狀態（src/ui/ChildContext.tsx）；標題列名字可點切換；編輯、封存、取消封存；前兩個孩子免費，第三個起為日後家庭版（§18）。

---

## 5. 資料模型（SQLite，SCHEMA_VERSION 6）

### 5.1 表

| 表 | 用途 | 重點欄位 |
|---|---|---|
| meta | schema 版本 | |
| children | 孩子 | §4.1 全部欄位 |
| events | 所有紀錄，append-only 加墓碑 | id、child_id、type、start_at、end_at、payload(JSON)、source(home/institution)、recorded_by、seq、updated_at、tz_offset_min、deleted_at |
| schedule_items | 行程與作息範本 | title、kind、weekdays、time、duration_minutes、location、lead_minutes(預設 30)、valid_from、valid_to、period、template_source、sync_to_device_calendar、updated_at、deleted_at |
| reminders | 倒數提醒等 | kind、title、body、fire_at、enabled |
| peers | 已配對的手機 | device id、名稱、最後交接 |
| village_members | 我的村名冊 | 稱呼、角色、電話、備註、墓碑；隨交接同步 |
| village_groups | 鄰里小組 | 小組 id、名稱、金鑰、我的稱呼 |
| group_items | 小組行程 | 日期、時間、內容、負責人、地點、備註、updated_at、墓碑 |
| style_profiles | 風格問卷結果 | preset、axes |
| content_cards | 內容卡快取（目前以打包 JSON 為主） | |
| resource_timeline | 公費時程快取 | |
| settings | 鍵值 | §5.3 |

### 5.2 Event 型別

feed.breast、feed.bottle、feed.solid、feed.pump、diaper.wet、diaper.dirty、diaper.both、toilet.attempt、sleep、tummy_time、outdoor、screen_time、learning、growth、temperature、symptom、medication、visit、milestone、mood_note、caregiver.checkin、task.*。字串列舉，可擴充。payload 自訂（例如 side、ml、startReason、celsius、minutes、subject）。

### 5.3 settings 鍵

| 鍵 | 用途 |
|---|---|
| deviceId、deviceName、familyId、familyKey | 裝置身分與家庭配對金鑰 |
| home:<key> | 首頁按鈕覆蓋：'1' 顯示、'0' 隱藏 |
| notify:safetyNet、notify:medication、notify:timer、notify:schedule、notify:public | 五類通知開關 |
| notify:fired、notify:tapped、notify:lastPlan | 準時度與疲勞統計 |
| cal:on、cal:calendarId、cal:map、cal:notice | 行事曆同步（單機設定，不隨交接） |
| remote:policy、remote:schedule、remote:alerts、remote:notices、remote:activities、remote:lastCheck | 遠端資料覆寫與上次檢查時間 |
| contentQuiet、encourage、encourage:kinds、pausedUntil、progressOn | 內容安靜、今天一句開關與種類、暫停模式、進度對照開關 |
| textScale、themeMode | 字級三段、日夜模式 |

### 5.4 遷移

src/db/index.ts 以 `hasColumn` 逐欄 ALTER，不刪表；新版本只能加欄與加表。

---

## 6. 畫面與路由（app/，expo-router）

### 6.1 底部五分頁

| 分頁 | 檔案 | 內容 |
|---|---|---|
| 今天 | (tabs)/index.tsx | 三格狀態、安全網橫幅、安全內容入口（SafetyBox）、一鍵紀錄磁貼與復原、今天一句、如廁訓練入口、暫停模式；無孩子時為歡迎頁 |
| 紀錄 | record/timeline.tsx（由分頁導入） | 列表、時間軸、一週或課表三視圖；3 歲以上摘要列 |
| 內容 | (tabs)/cards.tsx | 問問看搜尋列、內容安靜開關、本週一張、本週活動（≥ 3 歲）、安全內容（這個時期 / 較小的孩子）、想查什麼主題分組 |
| 育村 | (tabs)/village.tsx | 我的村、交班卡、鄰里小組、村長公告 |
| 時程 | (tabs)/schedule.tsx | 想問醫師的事、現在可以去 / 接下來 120 天 / 已過、行政待辦、補助與假別、官方疫情提醒、學習（進度對照）、找地方 |
| 設定 | (tabs)/settings.tsx | 孩子、行程與作息範本、安靜一點、照顧者、同步與交接、提醒、顯示、資料、關於 |

### 6.2 其他路由

| 路由 | 用途 |
|---|---|
| onboarding/child、style、result | 建檔三步：孩子資料（依年齡省略問題）、風格問卷（預設或逐題）、結果 |
| record/bottle、solid、pump、tummy、outdoor、screen、learning、temperature、medication、timer、more、edit、share | 各種紀錄（皆有時間列可補登）、修正與刪除、倒數提醒、更多紀錄（生長、日記；org 多便色、症狀、就醫）、分享今天 |
| cards/[id] | 內容卡詳情：AA 字級、來源區塊、翻譯標示 |
| child/switch、child/[id] | 切換孩子、編輯與封存 |
| plan/index、edit、derive | 範本開關與起點、每日範本、每週固定行程、新增編輯、從這週產生 |
| task/toilet | 如廁訓練（國健署原文，只數次數） |
| data/index | 加密備份匯出與還原、已封存孩子、刪除全部資料 |
| checkup/questions | 想問醫師的事（只存本機） |
| resources/nursing、centers、kindergartens | 哺集乳室（≤ 3 歲）、親子館與托育資源中心、幼兒園（2 到 7 歲） |
| search/index | 問問看：離線檢索，危急字詞固定顯示 119 |
| notify/index | 通知健康檢查：權限、接下來的提醒、測試通知、準時度 |
| caregiver/index | 照顧好自己：10 秒打卡、官方專線、請別人幫忙 |
| sync/index、qr、scan、import | 配對、交接、QR、掃描、匯入交接檔 |
| village/member、handover、group-new、join、group/[id]、group-item | 村民、交班卡、建立與加入小組、小組行程 |
| progress/index | 體制內進度對照表（可關閉） |
| +native-intent | 系統交來的 .psync 檔轉到 sync/import |

### 6.3 設計系統

src/ui/theme.ts：日夜兩套色票、字級三段（textScale）、對比 ≥ 4.5:1、所有可點元件有 accessibilityRole 與 label。插畫 8 張水彩 JPEG 與手繪 SVG（src/ui/art.tsx）。系統 header 全關，畫面自畫 TopBar。

---

## 7. 年齡規則（介面依年齡切換）

### 7.1 首頁磁貼預設（src/home/buttons.ts `defaultHome`）

| 鍵 | 預設出現條件 | 可調 |
|---|---|---|
| breast | 餵養方式為 breast 或 mixed 且 < 730 天 | 730 |
| pump | 餵養方式含母乳（breast、mixed、bottle_breastmilk）且 < 730 天 | 730 |
| bottle | 餵養方式不是純親餵且 < 1095 天 | 1095 |
| solid | ≥ 120 天；≥ 365 天標題改「吃飯」（`homeLabel`） | 120、365 |
| diaper | < 1460 天 | 1460 |
| tummy | < 365 天（設定頁可開到 548 天） | 365、548 |
| outdoor | ≥ 730 天 | 730 |
| screen | 730 到 4380 天 | |
| learning | ≥ 2190 天且 location = coop | |
| temp、med | 受 FEATURES 控制（personal 關） | |
| timer | 永遠 | |

使用者可在設定 › 首頁要顯示哪些 覆蓋（home:<key>）；設定頁只列 `relevantHomeKeys(ageDays)`（KEY_AGE：breast 0–1095、bottle 0–1460、pump 0–1095、solid 120+、diaper 0–2190、tummy 0–548、outdoor 730+、screen 730+、learning 2190+）加上已自訂開啟者。

### 7.2 其他介面規則

| 編號 | 元件 | 規則 |
|---|---|---|
| 7.2-a | 首頁「餵食」區標題 | ≥ 365 天且非親餵非瓶餵時顯示「吃飯」 |
| 7.2-b | 時程副標「第 N 天」 | < 365 天 |
| 7.2-c | 找哺集乳室 | ≤ 1095 天或沒有孩子 |
| 7.2-d | 找幼兒園 | 2 到 7 歲 |
| 7.2-e | 建檔與孩子檔案：餵養方式 | < 1095 天 |
| 7.2-f | 建檔與孩子檔案：早產兒 | < 730 天 |
| 7.2-g | 更多紀錄：頭圍 | < 1095 天 |
| 7.2-h | 更多紀錄：日記種類 | `diaryKinds(ageDays)` 依階段換字眼 |
| 7.2-i | 時間軸 | ≥ 2190 天用學齡版（`older`） |
| 7.2-j | 餵奶安全網設定列與橫幅 | < 365 天 |
| 7.2-k | 如廁訓練入口 | 548 到 2190 天，白天且非暫停模式；任務完成後不再顯示 |
| 7.2-l | 內容分頁搜尋提示 | `searchHint`：baby「吐奶、睡過夜、補助」、toddler「挑食、夜哭、幼兒園」、preschool「近視、如廁、抽籤」、school「健檢、課後照顧、網路」、teen「會考、睡眠、心理資源」 |
| 7.2-m | 安全層 | `splitSafety` 分「這個時期」（年齡區間含現在）與「較小的孩子」（區間已過）；首頁 SafetyBox 標題與副標跟著變 |
| 7.2-n | 本週活動卡 | ≥ 1095 天出現 |
| 7.2-o | 照顧地點選項 | 0 到 3 歲：在家、產後護理之家、托嬰；3 到 6 歲：在家、幼兒園、共學團或自學；6 歲以上：在家、共學團或自學、學校 |
| 7.2-p | 公費時程 | 依出生日算時間窗；category school 不推通知 |

---

## 8. 紀錄功能

- 8.1 **一鍵紀錄**（src/records/quick.ts）：親餵左右、瓶餵 ml、尿布濕 / 便 / 兩者、睡眠開始與結束（同時只能有一筆進行中）、清醒趴臥、戶外與 3C 分鐘、學習（科目、分鐘、材料、備註）。每筆帶 recordedBy（裝置名稱）。
- 8.2 **補登與修正**：所有表單有時間列；修正頁可改日期時間、微調、刪除（墓碑）。
- 8.3 **餵奶安全網**（< 1 歲）：取最近 NET_RECENT = 14 筆餵食間隔，加 PRIOR_N = 5 個先驗值 FEED_PRIOR_MIN = 150 分，取第 90 百分位，再以 FEED_CAP_MIN = 180 分為上限；超過即在首頁橫幅提醒並可推通知。只提示「距上次餵食已 N 分」，不評價。
- 8.4 **擠奶與庫存**（src/records/pump.ts）：擠奶 ml、庫存加減，純函式含測試。
- 8.5 **更多紀錄**：生長（身高、體重、頭圍 < 3 歲）、日記（種類依年齡）；org 版型多便色、症狀、就醫。
- 8.6 **分享今天**（src/records/share.ts）：純文字摘要，結尾署名育村；沒有的項目不出現該行。
- 8.7 **CSV 匯出**（src/records/csv.ts）。
- 8.8 **如廁訓練任務**（src/tasks/toilet.ts）：國健署原文，狀態以 task.* 事件保存，只數次數。
- 8.9 **想問醫師的事**：文字清單，可勾問過、可傳給另一位照顧者，只存本機。

---

## 9. 時間軸、行程與範本、行事曆

- 9.1 **兩層**：計畫層 ScheduleItem（虛線或淡色）與實際層 Event。三視圖：今天、一週（0 到 3 歲為 7 直欄睡眠餵食圖，學齡為課表格）、行程清單。總時數只顯示數字（R1）。
- 9.2 **範本門檻**：開關預設關；開啟前必選起點：月齡（最小 6 個月）或事件（開始上托嬰、副食品開始、入園入學）。起點寫進 validFrom；0 到 6 個月不排餵奶。
- 9.3 **範本來源**：手動、從這週產生（最近 7 天小睡與夜間睡眠）、事件預填。關掉開關不刪範本。
- 9.4 **行程種類**：routine、care、visit、class、activity（org 多 medication）。照顧地點為幼兒園或學校時，新增行程頁提供「上學」「放學接送」「才藝課」預填。
- 9.5 **行事曆同步**（src/calendar/）：每筆行程可單獨打開 sync_to_device_calendar；寫入手機本機行事曆「育村」，事件標題「孩子：行程」、每週重複、地點與提前提醒；單機設定（cal:on），不隨交接；已同步的行程改由行事曆提醒。使用者在行事曆刪事件不會自動重建；整個行事曆被刪時關閉所有同步並提示。Expo Go 下不做事。

---

## 10. 提醒與通知（本地，無推播）

### 10.1 類別與開關

| 類別 | 設定鍵 | 來源 | 優先序 |
|---|---|---|---|
| safetyNet 餵奶安全網 | notify:safetyNet | §8.3，< 1 歲 | 0（最高） |
| medication（org） | notify:medication | 使用者輸入的間隔，文字含「APP 不建議劑量」 | 1 |
| timer 倒數提醒 | notify:timer | §3.2 | 1 |
| schedule 行程提前提醒 | notify:schedule | lead_minutes，預設 30 分 | 2 |
| public 公費健檢與疫苗 | notify:public | 時間窗開始前，PUBLIC_WINDOW_DAYS = 30 天內 | 3 |

### 10.2 排程規則（src/notify/plan.ts、scheduler.ts）

- 10.2-a 資料變動（debounce 1.5 秒）或回前景時：取消本 APP 全部通知，依 plan 重排。
- 10.2-b 只排未來 WINDOW_DAYS = 7 天，最多 MAX_PENDING = 60 則，依優先序與時間截斷。
- 10.2-c 安全網每日上限 NET_DAILY_CAP = 3 則；連續被忽略（fired 未 tapped）會降低頻率（`ignoredStreak`）。
- 10.2-d 暫停模式（pausedUntil）期間不排任何通知（含安全網與倒數）；安全層內容在畫面上仍可讀（R7）。
- 10.2-e 通知健康檢查頁：權限狀態、接下來的提醒、送一則測試通知量準時度（`medianDelay`）、Android 「鬧鐘與提醒」權限按鈕（SCHEDULE_EXACT_ALARM）。
- 10.2-f 學校類時程（category school）、村長公告、本週活動不推通知。

---

## 11. 內容系統

### 11.1 內容卡結構（src/content/types.ts）

必備欄位：id（`<topicGroup>.<slug>`，與檔名一致）、topicGroup、title、ageMinDays、ageMaxDays、styleTags、evidence、body、sources、translated、foreignOnly、policyNumbers、updatedAt、status。選填：supplement、readMore、translationReviewed、profile。

### 11.2 來源兩軸

| 軸 | 值 | 規則 |
|---|---|---|
| trust | T1 台灣主管機關、台灣專科醫學會、外國主管機關；T2 學會與醫院；T3 只能作線索，不得為唯一來源 | |
| license | A1 台灣政府網站與法條：可改寫，附原文摘錄 | translated=false |
| | A2 美國聯邦公眾領域（CDC、NIH、NIMH、NICHD、USDA）、英國 NHS（OGL）：翻譯改寫 | translated=true，excerpt 英文原文，譯審後 translationReviewed=true 才可 published |
| | B 學會、醫院、基金會：只重述事實 | 連續相同 ≤ 10 字；每卡最多 1 個；excerpt 必填 |
| | C WHO、AAP、期刊：一句話結論加連結 | 不得為主要來源 |

### 11.3 主題群與標題

milestones「這個時期的孩子」、safety「安全」、feeding「飲食」、sleep「睡眠」、behavior（foreignOnly）、health「篩檢、接種與日常照護」、benefits、home_safety「居家安全」、caregiver「照顧者」、special。weeks 目錄的卡 topicGroup 為 milestones。

### 11.4 產線（scripts/check-content.mjs，`npm run content:check`）

必備欄位、來源欄位、trust 與 license 合法、T3 警告、B 級數量與摘錄、LCS ≤ 10、段落順序警告、supplement 字數與語氣、foreignOnly、A2 摘錄、譯審未完成不得 published、政策數字查核 ≤ 90 天、全文禁「趴睡」；`--net` 檢查來源 URL 存活（Node 失敗改 curl）；`--strict` 把警告變失敗。

### 11.5 打包（scripts/build-content.mjs）

- 完整版：所有卡 → src/content/cards.generated.json（prestart 自動跑；Expo Go 測試版用這個）。
- `--release`：只含 review / published 且譯審完成的卡，排除 `profile: "org"`（personal 時）；安全層 14 張不齊即失敗；EAS production 經 eas-post-install.mjs 自動執行。
- **現況**：240 張中 234 張 draft，release 試算只有 6 張。送審前擁有者抽查後改狀態（§22-1）。

### 11.6 年齡段內容門檻（verify 稽核）

0–1 歲 ≥ 60、1–3 ≥ 30、3–6 ≥ 25、6–12 ≥ 15、12–18 ≥ 20。現況 128 / 109 / 32 / 29 / 49（含跨段）。

### 11.7 安全層

14 張，任何版型與設定關不掉；依年齡分「這個時期」與「較小的孩子」兩段顯示；暫停模式與內容安靜不影響。

### 11.8 問問看（src/search/）

離線斷詞、同義詞、依年齡與主題排序；查詢含 EMERGENCY_TERMS（發燒、呼吸、抽搐、誤食、不醒、發紫、噎、溺水等）時最上方固定顯示 119 文案（固定文字，不是判斷）。不生成、不回答「要不要就醫」。

### 11.9 今天一句（src/encouragement/，content/encouragement/cards.json）

- 三類：official 國健署原文、plain 陪伴句（voice 育村）、thought 思想與角色模擬（voice「如果是 ○○」，無 genre 為思想模擬、genre literary 為文學角色，畫面標示「不是原文」）。
- 依六段年齡與處境（contexts：night、single、work、streak、preterm、grandparent）挑卡，一天一張同一天同一張，夜間不出現，可關閉、可只留某幾類（encourage:kinds）。不評分。
- 現況 71 張；每階段 ≥ 20（verify 稽核）。

### 11.10 本週活動（src/activities/，content/activities/activities.json）

- 欄位：id、title、body、setting（outdoor / indoor / either）、cost（free / low / ticket）、duration、ageMinDays、ageMaxDays、months、county 或全國、source（政府網址）、note、checkedAt。
- 挑選：`pickWeekly` 以孩子 id 加 ISO 週雜湊，同週固定；篩年齡與月份；ACTIVITY_MIN_AGE_DAYS = 1095。
- 門檻：≥ 72 個且 3–6、6–12、12–18 各 ≥ 24（現況 109）。可由 remote:activities 遠端覆寫。只列政府機關資訊，不是廣告。

---

## 12. 遠端資料（GitHub Pages）

- 12.1 **流程**：content/{policy,schedule,alerts,notices,activities}/*.json → `npm run data:check` 驗證 → `npm run data:build` 輸出 docs/data/*.json 與 manifest.json → git push → APP 每 CHECK_EVERY_MS = 12 小時 GET manifest（超時 8 秒），版本變了才下載對應檔，存入 remote:* 覆寫內建。
- 12.2 **manifest**：`{ v: 1, policy: {version, path}, schedule: {…}, alerts: {…}, notices: {…}, activities: {…} }`。
- 12.3 **APP 端驗證**（src/remote/validate.ts）：每個來源 URL 必須是 `https://*.gov.tw/`、`*.edu.tw/`、`*.gov.taipei/`；path 只能是單純檔名。不符合整包丟棄，沿用內建。
- 12.4 **資料檢查**（scripts/build-data.mjs）：政府網域、checkedAt 90 天（alerts 14 天）、縣市名稱合法、必備欄位。
- 12.5 **對外連線清單**：只有這一條 GET，加上使用者自己點開的外部連結。沒有分析、沒有推播、沒有 OTA（正式版）。

---

## 13. 公費時程、政策與行政待辦

### 13.1 時程（content/schedule/timeline.json，49 項）

- 欄位：id、category（checkup / development / vaccine / dental / school）、title、ageMinDays、ageMaxDays、window、note、source（sources 字典的鍵）、effectiveFrom。
- 內容：兒童預防保健 9 次（2026-07-01 起 7+2）、發展篩檢 6 次、公費疫苗、塗氟、小一與小四與國一學生健檢、HPV、學生流感；升學 7 項（會考、免試入學、特色招生、五專優先免試、學測、分科測驗、申請入學）。
- 顯示：現在可以去 / 接下來 120 天 / 時間窗已過；只有時間窗，不存接種狀態。school 類不推通知。
- 維護：升學日期以 115、116 學年度為準，每年 9 月更新。

### 13.2 政策（content/policy/policy.json，32 項、行政待辦 9 項）

- items 欄位：id、category（money / leave / tax / childcare / service）、title、who、amounts[{label, value}]、notes、apply、ageMinDays、ageMaxDays、county（選填）、source{name,url}、checkedAt。
- todos（行政待辦）：出生登記、津貼申請、幼兒園登記抽籤、國小新生入學報到、非學校型態實驗教育申請等，每項附官方連結與時間窗。
- 顯示規則（src/policy/select.ts）：依年齡與戶籍縣市篩選；沒填縣市只顯示中央項目；checkedAt 超過 90 天標「待複查」。

### 13.3 疫情提醒（alerts）與村長公告（notices）

alerts 只收疾管署新聞稿原文引句，沒有警示時顯示「本週無官方警示，上次查核」。notices 見 §14.3。

### 13.4 場所名錄（content/resources/）

哺集乳室 1,372 處（國健署開放資料，依縣市鄉鎮篩選，無座標故不排距離）、親子館與托育資源中心、幼兒園（全國教保資訊網開放資料，可篩公立、非營利、私立）。匯入腳本 import-centers.mjs、import-kindergartens.mjs。

---

## 14. 育村：社群三層

原則：「村」是每個孩子身邊那一圈照顧者與鄰里，不是公開論壇。三層都不需要伺服器、帳號、公開發文。

### 14.1 我的村

村民名冊（稱呼、角色 primary / shift / helper / professional、電話、備註，皆可空）存 village_members，隨家庭交接同步並進備份。已配對手機一起列出。交班卡：注意事項（本機）、有電話的村民、今天或 24 小時紀錄摘要 → 純文字分享。

### 14.2 鄰里小組

- 只交換行程（日期、時間、內容、誰負責、地點、備註），不交換孩子紀錄。
- 加入碼 `PSGRP1|…`（QR，內含小組金鑰）當面掃；小組檔 `PG1.` 前綴，AES-GCM 加密，第一行小組 id；用 LINE、AirDrop、Quick Share 傳，收到點開即合併，同一筆以最後修改為準（LWW）。
- 離開只刪本機金鑰與行程；小組資料不進備份。無即時同步。
- 限制與風險：加入碼外流等於鑰匙外流，需要時重建小組。

### 14.3 村長公告

content/notices/notices.json：publisher（機關）、title、body、url（政府網址）、startDate、endDate、county、ageMinDays、ageMaxDays。依縣市與孩子年齡篩選；沒填縣市只看全國。無使用者發文，不需審核。是 B2G 的賣點。

### 14.4 第四、五層不做

封閉群組需公司、路 B 架構與重新審查評估；公開論壇與定位相反。

---

## 15. 多裝置同步與備份（不經伺服器）

- 15.1 **配對**：面對面掃 `PSPAIR1|familyId|key|deviceId|deviceName`；之後兩機共用家庭金鑰。
- 15.2 **交接包** SyncPackage v1：children、events、schedule、members（含墓碑）。JSON → deflate → AES-GCM → base64，前綴 `PS1.`；QR 多張輪播 `PSQ1|i|n|fingerprint|chunk`；檔案副檔名 .psync（iOS UTI 與 Android intent filter 已註冊，點檔案直接開 APP 到 sync/import）。
- 15.3 **合併**（src/sync/merge.ts）：事件取聯集；刪除與結束時間只能單向補上；同一筆被兩邊修正時以較晚建立者為有效；合併後同一孩子只留一筆進行中的睡眠；一分鐘內同類重複紀錄只標示不刪。有測試。
- 15.4 **備份** PSB1：deflate + AES-256-GCM，金鑰由備份密碼 PBKDF2-HMAC-SHA256 推導，不含家庭金鑰；忘記密碼無法還原。內容：孩子、事件、行程、村民、交班注意事項；不含鄰里小組。
- 15.5 **刪除全部資料**：清空所有表與設定。

---

## 16. 照顧者支持、暫停模式與風格問卷

- 16.1 **照顧好自己**：10 秒打卡（不計分，存本機）、官方專線（孕產婦關懷 0800-870-870、1925 安心專線、家庭教育諮詢 412-8185、15 到 45 歲心理健康支持方案等，附查核日期）、請別人幫忙（系統分享文字）。
- 16.2 **暫停模式**：pausedUntil 期間停掉所有提醒（§10.2-d）、首頁精簡；安全層仍顯示（R7）。
- 16.3 **內容安靜**（contentQuiet）：內容分頁不主動放卡，安全層不受影響。
- 16.4 **風格問卷**（src/style/questionnaire.ts）：六向度（routine、cry_response、sleep_arrangement、feeding_lead、guidance、info_depth）各 -2 到 2，12 題，三預設結構型、回應型、混合型，可 custom；只影響內容排序（styleTags）與範本預設顯示，不覆寫安全層（P5）。

---

## 17. 階段服務

### 17.1 0 到 3 歲

完整紀錄、安全網、週卡（0 到 48 週、1 歲與 2 歲每兩週）、公費時程、政策、哺集乳室、如廁訓練。

### 17.2 3 到 6 歲（樞紐是照顧地點）

| 地點 | 服務 | 不做 |
|---|---|---|
| 共同 | 視力篩檢、入學前疫苗、幼兒園抽籤與繳費上限、戶外與 3C 紀錄、本週活動、3 到 6 歲內容卡 11 張（調整報告 §3.2） | 發展篩檢判讀（導向兒童預防保健） |
| 幼兒園 | 接送行程範本、找幼兒園、託藥規定卡、停課規定 | 聯絡簿、園所排序 |
| 共學團 | 鄰里小組排班、行事曆、親子館清單、安全卡 | 跨家庭共用紀錄 |
| 家長自帶 | 照顧者模組預設開、親子館與臨托資源、作息範本起點、抽籤時程 | 建議何時送園 |

### 17.3 6 到 12 歲

升小一為進場時機（新生報到、入學健檢、課後照顧）。課表與行程、小一與小四健檢、窩溝封填、近視、流感、學習扶助、85210、早餐與午餐、1953、113、校園輔導。不做聯絡簿、作業、成績。

### 17.4 自學家庭（非學校型態實驗教育）

每年 4 月與 10 月申請（行政待辦）。進度對照表（progress/index，content/progress/checklist.json，依教育部學習扶助基本學習內容分年級，勾「會了、還沒、沒教過」，無分數；可關閉；授權查核前保持空白）。評量導向因材網。學習紀錄事件（§8.1）日後匯出報告骨架（家庭版）。

### 17.5 12 到 18 歲

發展心理學（大腦、認同、情緒、睡眠相位、同儕）、家長怎麼陪（溝通、界線、心理健康求助、自殺防治警訊只轉述警訊與電話、網路安全、霸凌、自我照顧）、健康（國一健檢、HPV、睡眠時數、近視、體位、電子煙）、學校與升學 8 張、升學時程 7 項、青少年鼓勵卡 30 張。

---

## 18. 收費模式

- 18.1 1.0 全部免費、無內購；設定 › 關於 一句「目前功能永久免費，日後新增的進階功能會另外收費」，不出現價格。
- 18.2 已免費的功能永遠免費；付費只賣後續新增功能。不做訂閱、不做贊助與業配。
- 18.3 家庭版一次買斷 390 元涵蓋所有階段；30 天試用，從第一次碰到進階功能起算；到期只停新操作，不鎖既有資料。
- 18.4 候選進階功能（依付費意願）：成長紀錄冊 PDF、自學學習報告、育兒花費與補助帳本、保母與托育交班單、文件到期提醒、第三個以上孩子、課表拍照匯入。守則：照片只存手機、不畫百分位、不評分、稅務數字走政策 JSON。
- 18.5 延伸：B2G 縣市白牌為主要擴充路徑（docs/dev/b2g-research.md、b2g-tenders.md、mas-l1-checklist.md、docs/b2g/yilan-demo.md）；寵物照顧版為低成本第二產品；長照與機構版不做。

---

## 19. 建置、發布與更新

| 項目 | 現況 |
|---|---|
| 平台 | Expo SDK 57、React Native、TypeScript、expo-router、expo-sqlite、expo-notifications（本地）、expo-calendar、expo-camera、expo-sharing、expo-file-system、expo-crypto；bun.lock 不存在故用 npm |
| app.config.js | runtimeVersion：NATIVE_BUILD=1 時 appVersion，否則 sdkVersion（Expo Go）；production 建置 updates.enabled=false |
| eas.json | development（dev client、internal、channel development）、preview（internal、apk、channel preview）、production（autoIncrement、app-bundle、channel production）；皆 NATIVE_BUILD=1 |
| 測試版發布 | `npm run publish:preview [-- --message …]`：content:build → eas update 到 preview → QR 與 latest.json、history.md 寫到 docs/dev/release/；測試者需受邀進 @yinyaoqings-team 並在 Expo Go 登入 |
| 正式建置 | `npx eas-cli@latest build --profile production`；eas-post-install 跑 content:build --release |
| 網頁 | `npm run legal:build`、`npm run data:build` → docs/data → GitHub Pages |
| 原生目錄 | 不存在，CNG 產生；原生設定只在 app.json 與 plugins |
| Expo Go 限制 | 無準時鬧鐘權限、無 .psync 檔案關聯、無行事曆同步 |

---

## 20. 測試與驗證

| 指令 | 內容 |
|---|---|
| `npm run typecheck` | tsc 0 錯誤 |
| `npm run lint` | expo lint（verify 內用 --no-cache） |
| `npm test` | sync（merge、codec、backup）、timeline、search、calendar、data（validate）、village、stage |
| `npm run content:check [:net]` | §11.4 |
| `npm run data:check` | §12.4 |
| `npm run verify [-- --quick]` | 17 項：上述全部加 release 試算與還原、舊名稱稽核、佔位文字稽核、法務與手冊網頁無方括號或草稿、卡片 id 與檔名、年齡段卡數、活動數、鼓勵卡數、手冊畫面字眼存在於程式、expo-doctor、expo export |
| 真機 | docs/dev/device-test.md A 到 T 節；P 節為正式安裝版專屬 |
| 紅線 | docs/dev/redlines-checklist.md 每次發布前更新 |

---

## 21. 文件地圖

| 文件 | 內容 |
|---|---|
| docs/spec/dev-spec-v1.0.md | 本文件 |
| docs/dev/decisions.md | 決策表 1 到 18 與理由 |
| docs/plan/plan-v0.3 到 v1.0 | 歷史規劃，v1.0 為送審版型、收費、育村、階段與商業延伸 |
| docs/dev/adjustment-report-2026-10-12.md | 全階段介面與內容調整報告（三輪驗證） |
| docs/manual/parent-guide.md | 家長使用與測試手冊（→ manual.html） |
| docs/dev/device-test.md、release-checklist.md、redlines-checklist.md、deploy-test.md、run.md | 測試、送審、紅線、部署、啟動 |
| docs/dev/business-review.md、b2g-research.md、b2g-tenders.md、naming-trademark.md | 商業、B2G、名稱與商標 |
| docs/legal/ | 隱私權政策、服務條款、同步法律審閱 |
| HANDOVER.md | 程式庫地圖與接手說明 |

---

## 22. 待擁有者決定或處理

1. **卡片狀態**：234 張 draft 要人工複核後改 review / published；安全層 14 張不齊正式建置會失敗。
2. **譯審**：約 20 張 A2 翻譯卡。
3. **商店送審事項**：Apple Developer 個人帳號、App Privacy、Google 資料安全表、加密出口申報、法務文件填入資料。
4. **年度維護**：升學時程與「學校與升學」卡每年 9 月更新；政策 90 天查核；alerts 每週查核。
5. **商標申請**：第 9、42 類。
6. **待查核的內容前提**：全國教保資訊網開放資料授權、學習扶助基本學習內容授權等級（進度對照表內容仍空白）、非營利幼兒園第 2 胎繳費上限。
7. **兩個被擋的舊連結**：safety/choking 與 safety/no-honey-juice-water 的 AAP C 級連結（自動抓取 403，瀏覽器可開）。

### 修改紀錄

| 日期 | 變更 |
|---|---|
| 2026-10-12 | 首版整合（依 plan-v0.3 到 v1.0、決策 1 到 18、程式現況） |

---

## 23. 附錄 A：可調參數一覽

| 參數 | 值 | 位置 | 影響 |
|---|---|---|---|
| 年齡門檻（天） | 120 / 365 / 548 / 730 / 1095 / 1460 / 2190 / 4380 / 5475 / 6570 | src/home/buttons.ts、src/content/stage.ts、各畫面 | §7 全部規則 |
| KEY_AGE | §7.1 | src/home/buttons.ts | 設定頁列出的按鈕 |
| FEED_CAP_MIN / FEED_PRIOR_MIN / NET_RECENT / PRIOR_N / 百分位 | 180 / 150 / 14 / 5 / 0.9 | src/records/quick.ts | 餵奶安全網上界 |
| MAX_PENDING / WINDOW_DAYS / PUBLIC_WINDOW_DAYS / NET_DAILY_CAP | 60 / 7 / 30 / 3 | src/notify/plan.ts | 通知數量與時窗 |
| 通知優先序 | safetyNet 0、medication 1、timer 1、schedule 2、public 3 | src/notify/plan.ts | 超過 60 則時誰先保留 |
| debounce | 1.5 秒 | src/notify/scheduler.ts | 重排頻率 |
| lead_minutes 預設 | 30 | schema | 行程提前提醒 |
| 範本起點最小月齡 | 6 個月 | app/plan | 課表模式門檻 |
| 時程「接下來」視窗 | 120 天 | app/(tabs)/schedule.tsx | 顯示範圍 |
| 遠端檢查間隔 / 超時 | 12 小時 / 8 秒 | src/remote/sync.ts | 資料更新 |
| 政策查核 / 疫情查核 | 90 天 / 14 天 | scripts/build-data.mjs、check-content | 待複查標示 |
| LCS 上限 | 10 字 | scripts/check-content.mjs | B 級重述 |
| supplement 上限 | 譯文 30% 且 80 字 | scripts/check-content.mjs | 本產品補充 |
| ACTIVITY_MIN_AGE_DAYS | 1095 | src/activities/select.ts | 本週活動出現年齡 |
| 卡數門檻 | 60 / 30 / 25 / 15 / 20 | scripts/verify.mjs | 年齡段內容下限 |
| 活動門檻 | 72 總數、各段 24 | scripts/verify.mjs | |
| 鼓勵卡門檻 | 每階段 20 | scripts/verify.mjs | |
| 哺集乳室 / 幼兒園顯示年齡 | ≤ 3 歲 / 2 到 7 歲 | schedule.tsx、PlaceList | 找地方 |
| 政府網域白名單 | gov.tw、edu.tw、gov.taipei | validate.ts、build-data.mjs | 遠端資料接受範圍 |
| 家庭版價格 / 試用 | 390 元 / 30 天 | 尚未實作 | §18 |
