# 交接文件：育兒秘書 APP（parenting-secretary）

交接日期：2026-10-05
交接人：Claude Fable 5.1（Claude Code 工作階段）
接手對象：任何 AI agent 或工程師
專案擁有者：@outdoorsy（Git 作者：Joseph <josephyinyaoqing@gmail.com>）
程式庫：https://github.com/yinyaoqing/parenting-secretary（main 分支）

讀完本文件就能接手。細節都在程式庫內，本文只給地圖、現況、下一步與禁區。

---

## 1. 這是什麼

面向台灣 0–3 歲家庭的育兒秘書 APP，一人搭配 AI 開發。功能限於：日常紀錄、安全網提醒、衛教內容連結、公費資源與行政待辦時程、照顧者支持的資源導向。長期架構承載到 18 歲。

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
| R1 | 不診斷、不監測疾病、不分級判讀。體溫、尿布只顯示數字與官方定義。 |
| R2 | 不重製需授權的量表（M-CHAT-R、EPDS）與教材（Satter 逐字）。 |
| R3 | 內容只用可信度達標且授權允許的來源（見第 6 節）。 |
| R4 | 1 歲以下配方食品不得廣告促銷；不接受任何嬰幼兒用品品牌贊助。 |
| R5 | 特種個資本地化：資料只在裝置，無伺服器。 |
| R6 | 不建議藥物劑量、不宣稱療效。用藥提醒只倒數使用者輸入的間隔。 |
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
app/                    expo-router 畫面
  index.tsx             首頁：孩子資訊、上次餵奶/尿布、一鍵紀錄、今日時間軸、日夜切換
  onboarding/           建檔（child）、風格問卷（style）、結果（result）
  record/               瓶餵、體溫、副食品、紀錄列表（timeline）、修正時間（edit）
  cards/                內容卡列表（index）與詳情（[id]）
src/db/                 types（18 歲資料模型）、schema（SQLite v1）、index（開庫與遷移）、repo（孩子、風格、設定）、events（事件 append-only）、device（裝置 id）
src/records/quick.ts    一鍵紀錄輔助與安全網上界計算
src/style/questionnaire.ts  六向度 12 題、三預設、計分、衍生預設
src/content/            types（內容卡結構）、loader（載入打包 JSON）、cards.generated.json（產生物，勿手改）
src/ui/                 theme（日/夜調色）、useTheme
src/util/               age（實際與矯正月齡）、format
content/cards/          內容卡 JSON 原始檔（safety 14、milestones 10、weeks 12）
content/whitelist.json  相似度檢查白名單
scripts/
  check-content.mjs     產線十項檢查（必跑）
  build-content.mjs     打包內容卡到 src/content（prestart 自動跑）
  export-bilingual.mjs  對照稿輸出給譯者
  publish-preview.mjs   一鍵 EAS Update 到 preview 頻道並產 QR code 到 docs/dev/release/
docs/plan/              規劃文件 v0.3–v0.9
docs/week1/             授權申請信、訂閱流程、授權聲明清單、未獲授權處理
docs/validation/        家長規格驗證頁原始檔與說明
docs/translation/       對照稿輸出
docs/dev/run.md         如何啟動驗證
docs/dev/deploy-test.md 如何部署測試版（已含 EAS 專案資訊）
docs/dev/release/       最新一次發布的 QR code、latest.json、history.md（publish-preview 產生）
```

**指令**

```bash
npm install
npm run typecheck          # 必須 0 錯誤
npm run content:check      # 必須 0 張未通過
npm run content:build      # 產生 cards.generated.json
npm run content:bilingual  # 對照稿
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
| 6 | EAS Update 設定（組織 yinyaoqings-team、sdkVersion runtime）、一鍵發布腳本、eslint；0–3 個月週卡 12 張（content/cards/weeks，底本國健署孕產兒關懷網站寶寶篇第 1–12 週，A1） |

檢查狀態：typecheck 通過、content:check 36 張全過、Android JS 打包成功。

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

---

## 5. 下一步（依 plan-v0.9 時程表第 6 週起，含驗收條件）

| 優先 | 工作 | 驗收 |
|---|---|---|
| 1 | 週卡 12 張的人工複核：已依原文改寫並通過 content:check，但未經第二人核對原文；草稿狀態（draft）待複核後改 review | 逐張對照 readMore 的原文連結 |
| 2 | 月齡卡 48 張補齊：目前 10 張（CDC 月齡），週卡 12 張後還差 26 張；可拆為每月齡 2–3 張主題卡（遊戲、睡眠樣貌、飲食樣貌），底本 CDC/NHS/國健署 | 同上；A2 翻譯卡 translationReviewed=false 直到譯審匯回 |
| 3 | 本地通知（第 7–8 週）：expo-notifications、滾動排程（iOS 64 筆上限）、Android `SCHEDULE_EXACT_ALARM` 授權引導、通知健康檢查頁、安全網提醒實作（用 `recentIntervalsMinutes` 與 `safetyNetUpperBound`）、用藥倒數、暫停模式 | 需 EAS development build 真機測；驗收標準見 plan-v0.4 7.2：50 筆提醒誤差中位數 < 1 分鐘 |
| 4 | 公費資源時程（第 9–11 週）：`resource_timeline` 表、時程 JSON（9 次預防保健、6 次發展篩檢、疫苗、塗氟）、政策 JSON（津貼、補助、假別、扣除額）、行政待辦；遠端 JSON 放靜態空間 | 數值全部對應 plan-v0.5 數值來源表，附查核日期 |
| 5 | 飲食 24、睡眠 10、健康照護 14、家庭權益 20、居家安全 8、行為 2 張卡（上架 140 張目標） | 同內容卡驗收 |
| 6 | 譯審匯入腳本 `scripts/import-translation.mjs`（讀 CSV 的「修訂譯文」欄寫回卡片並設 translationReviewed=true） | 匯入後 content:check 通過 |
| 7 | 照顧者支持、暫停模式、行程骨架、匯出與備份（第 14 週） | 匯出 JSON 可再匯入還原 |
| 8 | 無障礙、長輩字級、隱私權政策、商店素材、紅線自檢（第 15–16 週） | — |

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
- 每次提交前：`npm run typecheck`、`npm run content:check`、Android export 煙霧測試。
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
- `content:check --net` 在 Windows 的 Node 下對所有 hpa.gov.tw 與 mammy.hpa.gov.tw 網址回報「無法存取」，原因是 Node 無法驗證該站的憑證鏈（UNABLE_TO_VERIFY_LEAF_SIGNATURE），curl 可正常存取。屬誤報，不要為此關閉憑證驗證；可改用 NODE_EXTRA_CA_CERTS 加入台灣 GCA 中繼憑證。
- 週卡（content/cards/weeks）改寫時刻意略去原文的生長數字範圍（R1）、Wessel 333 腸絞痛準則（R1）、輪狀病毒疫苗廠牌與時程、血管瘤段落；就醫情境一律以「國健署原文「…」」引用。
- 10 字相似度規則只對中文來源有效；英文來源靠段落順序規則與譯審。
- 段落順序檢查目前只在段落數相同時警告，不擋下。
- 月齡卡 CDC 語意（75% 以上已會）與國健署連續圖語意不同，已在卡片「閱讀更多」說明，仍是家長困惑的風險點。

---

## 9. 歷史脈絡（給想知道為什麼的人）

規劃經過六輪 AI 交叉審閱（v0.3–v0.9），主要轉折：v0.4 依五項原則砍掉所有判讀功能與後端；v0.5 擴充 13 個政府資料驅動的內容模組；v0.6 刪掉無來源的類推內容並改疫情提醒為官方警示觸發；v0.7 建立來源兩軸並納入 CDC、NHS 公眾領域底本；v0.8 結案 14 個開放問題宣告開發基準；v0.9 定稿投放節奏、補充區塊限制與產線十項檢查。每一輪的採納紀錄都在對應文件的「審閱紀錄」表。
