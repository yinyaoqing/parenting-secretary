# 全階段介面與內容調整報告（2026-10-11 到 2026-10-12）

> 給專案擁有者。本報告記錄「逐年齡評估介面與功能合理性」之後的所有調整、三輪驗證的結果與修正，以及送審前仍需你本人處理的事。對應決策第 18 項、plan-v1.0 第 5.5 到 5.8 節。

## 0. 一頁摘要

| 項目 | 調整前 | 調整後 |
|---|---|---|
| 首頁磁貼與字眼 | 不分年齡，4 歲孩子仍看到親餵、尿布、「副食品」 | 依年齡與餵養方式出現；滿 1 歲改稱「吃飯」；尿布到 4 歲；3C 時間 2 到 12 歲；學習紀錄 6 歲起（共學團或自學） |
| 建檔與孩子檔案 | 所有年齡都問餵養方式與早產兒 | 3 歲以上不問餵養方式；2 歲以上不問早產兒 |
| 時程、更多紀錄、設定 | 1 歲後仍顯示「第 N 天」、哺集乳室、頭圍、餵奶安全網 | 「第 N 天」只到 1 歲；哺集乳室到 3 歲；頭圍到 3 歲；餵奶安全網到 1 歲；設定只列這個年齡用得到的按鈕 |
| 內容分頁 | 搜尋提示與安全層都是嬰兒字眼；6 歲以上 0 張卡 | 提示依年齡；安全層分「這個時期」與「較小的孩子」；3 歲以上每週一個官方親子活動 |
| 內容卡 | 134 張（0 到 3 歲為主） | 240 張：1 到 3 歲 +48、3 到 6 歲 +11、6 到 12 歲 +18、12 到 18 歲 +29 |
| 時程 | 無升學項目 | +7 項（會考、免試入學、特色招生、五專優先免試、學測、分科測驗、申請入學） |
| 鼓勵卡 | 55 張，teen 14 張 | 71 張，teen 30 張 |
| 政策 | 30 項 | 32 項（幼兒學前特別扣除額更新；新增國小課後照顧班、學習扶助） |
| 本週活動 | 無 | 109 個，3 到 6、6 到 12、12 到 18 歲各 24 個以上，可遠端更新 |
| 工具與文件 | 無整體驗證腳本、無家長手冊 | `npm run verify`（17 項）；家長使用與測試手冊 docs/manual/parent-guide.md，發布為 manual.html |
| 驗證 | | 三輪：第一輪 14/17，修 3 項；第二輪 17/17；第三輪改查來源網址與紅線字詞（見第 6 節） |

## 1. 背景與範圍

2026-10-11 逐年齡（0 到 18 歲）走查每個畫面後，列出三類工作：A 程式修正、B 各年齡內容、C 資料查核。你的指示：ABC 全做；12 到 18 歲著重發展心理學的青少年階段、教育部學業標準與升學資訊；3 歲以上每週推薦合適的活動或親子戶外行程；完成後反覆驗證三輪、修正、產出調整報告與給無開發經驗家長的使用手冊。

評估時發現的主要問題（調整前）：

1. 餵食與尿布磁貼、「副食品」字眼在 1 到 3 歲後仍出現；尿布磁貼與如廁訓練同時出現互相矛盾。
2. 時間軸的夜間時段切分以嬰兒作息為準，學齡孩子不適用。
3. 建檔問題（餵養方式、早產兒）對 3 歲以上無意義。
4. 安全層 14 條全部以嬰兒為主，對 6 歲以上孩子等於沒有安全內容。
5. 6 歲以上內容卡為 0，12 到 18 歲鼓勵卡只有 14 張。
6. 沒有任何「這週可以帶孩子做什麼」的內容。

## 2. A：介面與程式調整

### 2.1 規則表（實作於 src/home/buttons.ts、src/content/stage.ts）

| 元件 | 規則 | 檔案 |
|---|---|---|
| 副食品磁貼 | 滿 120 天出現；滿 365 天標題改「吃飯」（首頁區塊、紀錄頁標題、設定頁） | buttons.ts `homeLabel`、app/(tabs)/index.tsx、app/record/solid.tsx |
| 尿布磁貼 | 1460 天（4 歲）前 | buttons.ts `defaultHome` |
| 3C 時間 | 730 到 4380 天 | buttons.ts |
| 學習紀錄 | 2190 天起且照顧地點為共學團或自學 | buttons.ts |
| 設定 › 首頁要顯示哪些 | 只列 `relevantHomeKeys(ageDays)` 的按鈕，已自訂開啟的照列 | buttons.ts、app/(tabs)/settings.tsx |
| 餵奶安全網（設定列） | 孩子未滿 365 天才顯示 | app/(tabs)/settings.tsx |
| 時程副標「第 N 天」 | 未滿 365 天 | app/(tabs)/schedule.tsx |
| 找哺集乳室 | 未滿 1095 天或沒有孩子 | app/(tabs)/schedule.tsx |
| 建檔與孩子檔案：餵養方式 | 未滿 1095 天才問 | app/onboarding/child.tsx、app/child/[id].tsx |
| 建檔與孩子檔案：早產兒 | 未滿 730 天才問 | 同上 |
| 更多紀錄：頭圍 | 未滿 1095 天 | app/record/more.tsx |
| 更多紀錄：日記種類 | `diaryKinds(ageDays)` 依階段換字眼 | stage.ts、more.tsx |
| 時間軸 | 2190 天起用學齡版切分（`older`） | app/record/timeline.tsx |
| 內容分頁搜尋提示 | `searchHint(ageDays)`：嬰兒「吐奶、睡過夜、補助」、1 到 3 歲「挑食、夜哭、幼兒園」、3 到 6 歲「近視、如廁、抽籤」、6 到 12 歲「健檢、課後照顧、網路」、12 到 18 歲「會考、睡眠、心理資源」 | stage.ts、app/(tabs)/cards.tsx、app/search/index.tsx |
| 安全層 | `splitSafety` 分「這個時期」與「較小的孩子」，首頁 SafetyBox 標題與副標跟著變 | stage.ts、cards.tsx、index.tsx |
| 本週活動卡 | 滿 1095 天在內容分頁出現；`pickWeekly` 以孩子 id 加 ISO 週做雜湊，同週固定、換週換 | src/activities/select.ts、loader.ts、cards.tsx |

### 2.2 新增模組

- `src/content/stage.ts`：`ageStage`、`searchHint`、`diaryKinds`、`splitSafety`、`safetySummary`；測試 `src/content/stage.test.ts`（4 項，納入 `npm test`）。
- `src/activities/select.ts`、`src/activities/loader.ts`：活動型別、年齡與月份篩選、週雜湊挑選、地點與費用標籤、遠端覆寫（`remote:activities`）。
- `src/remote/validate.ts` 新增 `activityUrlsSafe`；`src/remote/sync.ts` 抓取 manifest 的 activities；`scripts/build-data.mjs` 驗證並輸出 docs/data/activities.json。

### 2.3 其他程式修正

- 建檔頁註解裡的「即將推出」字樣改寫，避免佔位字樣稽核誤判。
- `scripts/verify.mjs` 的 lint 改為 `expo lint --no-cache`：Expo 的 lint 快取會記住 activities.json 尚未存在時的解析失敗。

## 3. B：各年齡內容

所有新卡 `status: draft`、`evidence: official`、`styleTags: ["all"]`，`npm run content:check` 240 張 0 張未通過。授權級：A1 台灣政府網站與法條（可改寫，附原文摘錄）；A2 美國聯邦政府公眾領域（翻譯卡，`translated: true`、`translationReviewed: false`，excerpt 為英文原文）；B 僅重述事實，每卡最多 1 個。

### 3.1 1 到 3 歲（48 張，content/cards/weeks/y1-*、y2-*）

國健署孕產兒關懷網站「幼兒 1 歲」「幼兒 2 歲」週文（A1）改寫，每兩週一張：`y1-week-01-02` 到 `y1-week-47-48`（365 到 729 天）、`y2-*` 24 張（730 到 1094 天）。主題涵蓋動作與語言里程、分離焦慮、咬人、吃飯、戒夜奶、如廁、角色扮演、常見疾病（腸病毒、諾羅、異位性皮膚炎、中耳炎）、第 6 次兒童預防保健等。每張含 readMore 連回原文。子代理在額度用盡前完成 48 張；第 1 歲第 49 到 52 週與第 2 歲第 49 到 52 週以前後兩張延長覆蓋，沒有空窗。

### 3.2 3 到 6 歲（11 張，檔名 p-*）

子代理因額度用盡沒有產出，由主代理依法條與國健署原文撰寫：

| 檔案 | 標題 | 年齡（天） | 來源 |
|---|---|---|---|
| milestones/p-kindergarten-day | 幼兒園的一天：作息、午睡、戶外活動 | 730–2190 | 幼兒教保及照顧服務實施準則第 4、7、8、12、15 條 |
| milestones/p-kindergarten-curriculum | 幼兒園在教什麼：統整課程、不做讀寫算精熟教學 | 730–2190 | 準則第 13、14 條；幼照法第 12 條 |
| milestones/p-preschool-is-optional | 幼兒園不是義務教育 | 730–2190 | 幼照法第 3、12 條；國民教育法第 2 條 |
| milestones/p-choosing-preschool | 選幼兒園：公立、非營利、準公共、私立；立案與裁罰查詢 | 730–2190 | 幼照法第 7、8 條；全國教保資訊網 |
| health/p-vision-3-to-6 | 3、4 歲起每年視力檢查：3010120 | 1095–2190 | 國健署兒童護眼運動 |
| health/p-checkup-3-to-7 | 3 到 7 歲兩次兒童預防保健 | 1095–2555 | 國健署 7+2 新聞稿（policyNumbers） |
| milestones/p-early-intervention | 發展有疑慮：發展評估與早期療育 | 730–2190 | 兒少法第 31 條；準則第 9 條 |
| milestones/p-starting-primary | 快上小學：6 歲入學、學區分發、通知時程 | 1825–2190 | 強迫入學條例第 6、7、9 條；國民教育法（policyNumbers） |
| milestones/p-experimental-education | 體制外選項：非學校型態實驗教育怎麼申請 | 1825–2555 | 非學校型態實驗教育實施條例第 4、5、6 條；國民教育法第 6 條（policyNumbers） |
| home_safety/p-never-alone | 6 歲以下不能單獨留在家裡或車上 | 365–2190 | 兒少法第 51 條 |
| health/p-kindergarten-medication | 帶藥去幼兒園：託藥只能是醫療機構開的藥 | 730–2190 | 準則第 11 條 |

未涵蓋：幼兒身體活動指引與青春期前身體變化（國健署 health99 網站維護中，無法開啟原文）。

### 3.3 6 到 12 歲（18 張，檔名 s-*）

子代理完成。health：小一學生健康檢查、窩溝封填、近視與戶外、85210、3C 與網路；feeding：早餐、營養午餐；milestones：第一、二、三學習階段學什麼、學校的一週、因材網、學習扶助；caregiver：1953 反霸凌、113 保護專線、各專線整理、校園輔導；sleep 1 張。來源為教育部、國教署、國健署、衛福部（A1）。

### 3.4 12 到 18 歲（29 張，檔名 t-*）

子代理完成，分四組：

- 發展心理學（milestones 8）：青少年的大腦還在裝修、12 到 14 歲、15 到 18 歲、「我是誰」、情緒為什麼忽上忽下、晚睡與生理時鐘、朋友變得最重要、性別平等教育。來源 NIMH、CDC Essentials for Parenting Teens、HHS OPA（A2）；Erikson 以 StatPearls 為唯一 B 來源；性平教育用性別平等教育法（A1）。
- 家長怎麼陪（caregiver 7）：先停 10 秒再回應、界線、心情不好很久可以找誰（1925、1995、學生輔導諮商中心）、衛福部青少年自殺警訊與一問二應三轉介（只轉述警訊與求助電話）、網路「五不一要」與 iWIN、霸凌定義與 1953、家長自我照顧。
- 健康（health 6）：國一健檢、公費 HPV 男女生、13 到 17 歲睡眠 8 到 10 小時、近視 3010120、BMI 百分位、電子煙五個危害。
- 學校與升學（milestones 8，皆 policyNumbers）：國中三年學什麼、高中三年四種學校類型、會考、免試入學與 15 個就學區、特色招生與五專、學習歷程檔案、高三的學測與分科測驗與申請入學、高中生輔導資源。來源國教院總綱、心測中心、入學資訊網、甄選會、大考中心，內文寫明學年度與「以當年度簡章為準」。

子代理放棄的主題與原因：國健署青少年網站 young.hpa.gov.tw 已不存在、health99 維護中；CDC 舊版 Positive Parenting Tips 下架；12basic.edu.tw 連線被拒（改用 entry.edu.tw 與臺北市十二年國教網）；菸檳酒只涵蓋電子煙。

### 3.5 鼓勵卡（content/encouragement/cards.json，55 → 71 張）

teen 階段 14 → 30 張。新增陪伴句 8 張（關上房門、一個字回答、你十五歲時、升學季、深夜兩盞燈、朋友優先、吵架之後、拿回自己的時間）與思想模擬 8 張（Erikson 認同試穿、Winnicott 青春期停滯期、Rogers 無條件接納、阿德勒 給他有份量的事、Vygotsky 鷹架抽掉、Bowlby 安全基地、Ginott 先聽懂、蒙特梭利 Erdkinder）。沿用既有欄位（`voice` 為「如果是 ○○」、無 `genre` 即為思想模擬），兩張與既有 id 衝突者改名 `thought.erikson.identity-trying-on`、`thought.rogers.regard-teen`。

## 4. C：資料

### 4.1 政策（content/policy/policy.json，版本 2026-10-11）

- `preschool-tax-deduction` 幼兒學前特別扣除額：改以所得稅法第 17 條為來源，補「以出生年認定」與「無排富」說明。
- 新增 `after-school-care` 國小課後照顧班（兒童課後照顧服務班與中心設立及管理辦法）、`learning-support` 學習扶助（國教署學習扶助資源平臺）。

### 4.2 時程（content/schedule/timeline.json，42 → 49 項，版本 2026-10-12）

新增 category `school` 的升學項目 7 項，來源鍵 `cap-116-schedule`（116 學年度會考與適性入學重要日程表）、`entry-edu`、`tp-12basic-faq`、`jctv-u5`、`ceec-116-dates`、`cac-115-schedule`。學校類不推通知（原有規則）。

### 4.3 本週活動（content/activities/activities.json，109 個）

欄位：id、title、body、setting（outdoor 46 / indoor 52 / either 11）、cost（free 65 / low 5 / ticket 39）、duration、ageMinDays、ageMaxDays、months、county 或全國、source（gov.tw、edu.tw、gov.taipei）、note。build-data 驗證來源網域、90 天查核、縣市名稱；發布到 docs/data/activities.json 並列入 manifest，APP 透過 `remote:activities` 覆寫。

### 4.4 遠端資料

`npm run data:build` 輸出 docs/data/{manifest,policy,schedule,alerts,notices,activities}.json。build-data 與 validate.ts 的政府網域白名單加入 gov.taipei。

## 5. 工具與文件

- `scripts/verify.mjs`（`npm run verify`，`-- --quick` 跳過 expo-doctor 與打包）：typecheck、lint、tests、content:check、data:check、release 試算、content:build 還原、舊名稱稽核、佔位文字稽核、法務與手冊網頁無方括號或草稿、卡片 id 與檔名一致且不重複、各年齡段卡數門檻（0-1 ≥ 60、1-3 ≥ 30、3-6 ≥ 25、6-12 ≥ 15、12-18 ≥ 20）、活動 ≥ 72 且各段 ≥ 24、鼓勵卡每階段 ≥ 20、手冊畫面文字存在於程式、expo-doctor、expo export。
- `docs/manual/parent-guide.md`：給無開發經驗家長的使用與測試手冊，15 節；`scripts/build-legal.mjs` 轉成 docs/data/manual.html，四個網頁導覽列互連。
- 文件更新：plan-v1.0 第 5.5 到 5.8 節；decisions 第 18 項；device-test 新增 T 節（依年齡的介面與內容）並把殘留的舊名稱改為育村；progress 加列。

## 6. 三輪驗證與修正

### 第一輪（`npm run verify` 完整）：14/17

| 失敗項 | 原因 | 修正 |
|---|---|---|
| lint | `import/no-unresolved` activities.json；`eslint --no-cache` 通過，是 Expo lint 快取殘留 | verify 改用 `expo lint --no-cache` |
| APP 沒有佔位文字 | app/onboarding/child.tsx 的註解含「即將推出」 | 改寫註解 |
| 手冊畫面文字 | 9 個字眼對不上：「模擬句」程式是「思想模擬」；「已與○○配對」「已合併來自○○的紀錄」「打開鬧鐘與提醒設定」實際字串不同；「正式版」「設定 › 首頁要顯示哪些」「新食材 觀察第 N 天」「全部 N 條」「AA」為敘述或樣板 | 手冊改用實際字串；樣板與敘述加入稽核的略過清單 |

### 第二輪（`npm run verify` 完整）：17/17

無失敗。另以腳本模擬 12 個年齡點（10 到 6400 天）列印首頁按鍵、標題、搜尋提示、日記種類、當日適用卡數與本週活動，結果與第 2.1 節規則一致；1 到 3 歲每一天都有一張週卡。

### 第三輪（換角度）

- 來源網址存活：`npm run content:check:net` 對 240 張卡的所有來源 URL 做 HEAD/GET，Node 失敗時改 curl。結果見 6.1。
- 紅線字詞：全文搜尋「劑量、診斷、評分、趴睡」。命中皆為合規脈絡：託藥卡的「託藥單寫劑量」與「APP 不提供任何劑量資訊」；因材網卡轉述教育部的「診斷學習落點」功能；2 歲週卡「記錄發作時間幫助醫師診斷」；早期療育卡「APP 不評分」。沒有改動。
- release 打包試算：`build-content --release` 只會帶 6 張（其餘 234 張為 draft），且安全層 8 張未達送審條件會讓正式建置失敗。這是 R13 的設計，見第 7 節第 1 點。
- 手冊對照：補上 1 到 3、3 到 6、6 到 12、12 到 18 歲各有哪些內容，與國三、高三的升學時程說明；重建 manual.html。

#### 6.1 來源網址檢查結果

240 張卡全部來源網址中，只有 2 個無法以自動方式存取，皆為既有安全層卡片的 C 級補充來源（AAP 期刊頁對自動抓取回 403），非本次新增：

| 卡片 | 網址 | 處置 |
|---|---|---|
| safety/choking | https://publications.aap.org/pediatrics/article/125/3/601/72681/ | 瀏覽器可開，屬 C 級（只用一句結論加連結），保留；送審前用瀏覽器再確認一次 |
| safety/no-honey-juice-water | https://publications.aap.org/pediatrics/article/139/6/e20170967/38754/ | 同上 |

本次新增的 106 張卡（1 到 3 歲 48、3 到 6 歲 11、6 到 12 歲 18、12 到 18 歲 29）與活動 109 個的來源網址全部可存取。

## 7. 送審前仍需你本人處理

1. **卡片狀態**：240 張中 234 張是 draft。release 打包只帶 review 以上，安全層 14 張必須全部 review 以上，否則 EAS production 建置會失敗。請抽查後把要上線的卡改 `status: "review"`（可用 content:import 或直接改 JSON）。翻譯卡（A2，約 20 張）要先譯審再把 `translationReviewed` 設 true，否則 published 會被擋。
2. **網址待複查**：見 6.1 列出的無法存取網址，多為政府網站對自動抓取回 403 或 PDF 連結變動；請在瀏覽器確認後更新或換來源。
3. **政策數字**：升學時程寫的是 115、116 學年度日期，每年 9 月新簡章公告後要更新 `content/schedule/timeline.json` 與 8 張「學校與升學」卡；`checkedAt` 超過 90 天會被標待複查。
4. **真機走查**：docs/dev/device-test.md 的 T 節（依年齡）與 P 節（正式安裝版）。
5. **商標**：以「育村」申請第 9、42 類（docs/dev/naming-trademark.md）。

## 8. 變更檔案清單

- 程式：app/(tabs)/{cards,index,schedule,settings}.tsx、app/child/[id].tsx、app/onboarding/child.tsx、app/record/{more,solid,timeline}.tsx、app/search/index.tsx、src/home/buttons.ts、src/content/stage.ts（新）、src/content/stage.test.ts（新）、src/activities/{select,loader}.ts（新）、src/remote/{sync,validate}.ts。
- 內容：content/cards/weeks/y1-*、y2-*（48 新）、content/cards/{milestones,health,caregiver,feeding,sleep,home_safety}/{p,s,t}-*.json（58 新）、content/encouragement/cards.json、content/activities/activities.json（新）、content/policy/policy.json、content/schedule/timeline.json。
- 腳本：scripts/verify.mjs（新）、scripts/build-data.mjs、scripts/build-legal.mjs、package.json。
- 文件與網頁：docs/manual/parent-guide.md（新）、docs/data/manual.html（新）、docs/data/*.json、docs/plan/plan-v1.0.md、docs/dev/{decisions,device-test,progress}.md、本報告。
