# 紅線 20 條自檢表（2026-10-07）

每次發布前更新。狀態：✅ 有證據、🔶 部分、⬜ 尚未、👤 需擁有者或人工。

| 編號 | 紅線 | 狀態 | 證據與做法 |
|---|---|---|---|
| R1 | 不診斷、不監測疾病、不分級判讀 | ✅ | personal 送審版型（src/release/profile.ts）下體溫、症狀、便色、就醫沒有輸入入口；org 版型體溫只顯示數字與部位（src/util/format.ts）；時間軸與一週圖只顯示紀錄時數，註明不評分（src/timeline/、app/record/timeline.tsx）；如廁訓練只數次數（src/tasks/toilet.ts）；照顧者打卡不計分（src/caregiver/resources.ts）；需醫師判斷的內容一律引國健署原文 |
| R2 | 不重製需授權的量表與教材 | ✅ | 程式與內容不含 EPDS、M-CHAT-R；產後情緒卡不放自評題目（content/cards/caregiver/postpartum-mood.json） |
| R3 | 內容只用可信度達標且授權允許的來源 | ✅ | npm run content:check 檢查每張卡的可信度、授權級與來源欄位 |
| R4 | 1 歲以下配方食品不廣告；不接受品牌贊助 | ✅ | 內容與程式無任何品牌名稱；無廣告元件 |
| R5 | 特種個資本地化，無伺服器 | ✅ | 紀錄只在 SQLite；使用者自行打開的行事曆同步只寫入行程（孩子暱稱、名稱、時間、地點），寫進手機行事曆後隨使用者自己的帳號設定保存，隱私權政策第 5 條已說明（src/calendar/sync.ts）；對外連線只有下載公開政策資料（src/remote/sync.ts，純 GET）；正式版關閉 APP 內更新，不連 Expo（app.config.js）；育村的村民名冊只隨家庭交接，鄰里小組只交換行程且以小組金鑰加密、不交換孩子紀錄，村長公告只下載公開資料（src/village/、src/notices/）；交接與備份皆加密（src/sync/）；隱私權政策 docs/legal/privacy-policy.md（待執業律師簽核） |
| R6 | 不建議劑量、不宣稱療效 | ✅ | personal 版型沒有用藥紀錄，只有通用「倒數提醒」：標題由使用者寫、通知只重複標題、響過即刪（src/db/reminders.ts、app/record/timer.tsx）；org 版型用藥只記名稱與使用者輸入的間隔，通知文字含「APP 不建議劑量」（src/notify/plan.ts）；週卡退燒相關改為依醫師指示 |
| R7 | 安全層不得被關閉；「趴睡」全產品禁用 | ✅ | 安全內容入口在暫停模式下仍顯示（app/(tabs)/index.tsx）；content:check 對標題、內文、補充擋「趴睡」（2026-10-07 新增，並修正 safety.safe-sleep 一處）；來源摘錄為原文引文不在此限 |
| R8 | 符合 Apple 1.4.1、5.1.3 與 Google Play 健康應用聲明 | ⬜ 👤 | personal 版型：Apple 類別選 Lifestyle、Google 選 Parenting，不選 Medical 或 Health & Fitness；資料不離開裝置，App Privacy 可填「未蒐集資料」；不接 HealthKit 或 Health Connect、不要求健康權限；審查備註寫明離線、不診斷、內容皆引政府來源；Google 資料安全表與隱私權政策網址仍要填；5.1.3(ii) 不把健康資料放 iCloud（目前沒有雲端功能） |
| R9 | 不以生成式 AI 產生醫療內容 | 🔶 👤 | 內容都改寫自政府原文並附來源與逐字摘錄，但改寫文字由 AI 協助撰寫，全部標 draft；上架前需人工逐張對照原文複核後改為 review 或 published |
| R10 | 不以書名或品牌命名風格 | ✅ | 風格名稱為結構型、回應型、混合型（src/style/questionnaire.ts） |
| R11 | 政策數字標年度與查核日期，走遠端 JSON | ✅ | content/policy/policy.json 每項附年度、查核日期與官方連結；data:check 擋查核超過 90 天；APP 由 GitHub Pages 更新（GitHub Pages 已開啟並發布，2026-10-08） |
| R12 | 政府開放資料標示來源 | ✅ | 每張卡的來源名稱含「政府網站資料開放宣告，可重製改作，須註明出處」；卡片詳情顯示來源 |
| R13 | 安全層須有 A 級原文可離線閱讀 | ✅ | 安全內容 14 張隨 APP 打包，離線可讀 |
| R14 | 疫情與環境提醒只轉述官方警示 | ✅ | content/alerts/alerts.json 只收疾管署新聞稿原文引句；data:check 擋非 cdc.gov.tw 來源，查核超過 14 天警告；沒有警示時顯示「本週無官方警示，上次查核」 |
| R15 | 不以類推產生安全清單 | ✅ | 安全清單全部來自原文；週卡未自行延伸 |
| R16 | 疫苗、健檢、補助、藥品、法規只用台灣官方 | ✅ | 時程 JSON 與政策 JSON 來源皆為 gov.tw、edu.tw；data:check 擋非政府網站 |
| R17 | 譯文不得新增原文沒有的建議 | 🔶 👤 | CDC 月齡卡 10 張待譯審；匯入腳本 content:import 已備妥 |
| R18 | 不使用有商業利益衝突的來源 | ✅ | 來源僅政府機關與醫學會 |
| R19 | B 級重述須通過 10 字連續相同檢查 | ✅ | content:check 內建相似度檢查（目前沒有 B 級卡） |
| R20 | 外國來源翻譯的主題群固定標示來源與原文連結 | ✅ | content:check 對 behavior 主題群要求 foreignOnly；翻譯卡顯示原文連結 |

## 上架前仍需完成

1. R8：兩家商店的隱私與健康聲明（依 docs/legal/privacy-policy.md 填寫）；商店文案與截圖依 docs/plan/plan-v1.0.md 第 1.5 節的用詞清單檢查。
2. R9：全部內容卡人工複核，draft 改為 review 或 published。
3. R17：CDC 月齡卡譯審。
4. 隱私權政策與服務條款由律師審閱，填入行號資料（負責人、統一編號、地址）。
5. Apple 加密出口申報：APP 使用 AES-256-GCM（交接與備份），依美國出口規定申報（見 docs/legal/sync-route-b-legal-review.md）。
