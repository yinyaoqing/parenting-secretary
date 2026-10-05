# 第 1 週待辦：訂閱清單與授權聲明存檔

## A. 授權聲明截圖存檔（存至 docs/licenses/，檔名為 來源-日期.png）

| 來源 | 頁面 | 要截到的文字 |
|---|---|---|
| 國健署 | https://www.hpa.gov.tw/Pages/Detail.aspx?nodeid=92&pid=5141 | 政府資料開放授權條款第 1 版、可商業利用、須註明出處、特別聲明除外 |
| 疾管署 | https://www.cdc.gov.tw/Category/FPage/TxkBIR9agw_IBRRmvn9TcQ | 政府網站資料開放宣告 |
| 政府資料開放平臺 | https://data.gov.tw/license | 授權條款全文 |
| 美國 CDC | https://www.cdc.gov/other/agencymaterials.html | 公眾領域聲明 |
| 美國 CDC Act Early | https://www.cdc.gov/act-early/ | 里程碑清單可重製說明 |
| 英國 NHS | https://digital.nhs.uk/about-nhs-digital/terms-and-conditions 與 nhs.uk 條款頁 | Open Government Licence v3.0 |
| 英國國家檔案館 | https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/ | OGL 全文 |
| USDA WIC | https://wicworks.fns.usda.gov/resources/infant-nutrition-and-feeding-guide | 聯邦政府著作說明 |
| NIAID | https://www.niaid.nih.gov/diseases-conditions/guidelines-clinicians-and-patients-food-allergy | 聯邦政府著作說明 |
| 國健署兒童健康手冊 | https://www.hpa.gov.tw/Pages/EBook.aspx?nodeid=1139 | 「保留所有權利」聲明（作為只能連結的依據） |
| WHO | 任一 WHO 指引 PDF 版權頁 | CC BY-NC-SA 3.0 IGO（作為只能敘述結論的依據） |

## B. 法規異動訂閱（全國法規資料庫 law.moj.gov.tw，使用「法規異動訂閱」或 RSS）

| 法規 | 用途 |
|---|---|
| 性別平等工作法 | 哺集乳時間、產檢假、陪產假、育嬰留停 |
| 勞動基準法 | 產假 |
| 戶籍法 | 出生登記期限與罰則 |
| 道路交通管理處罰條例 | 幼童乘車 |
| 小型車附載幼童安全乘坐實施及宣導辦法 | 後向座椅年齡 |
| 個人資料保護法 | 施行日期與義務 |
| 食品安全衛生管理法 | 嬰兒配方食品廣告限制 |
| 醫療器材管理法 | 產品定位邊界 |

## C. 新聞稿 RSS 或電子報訂閱（政策數字與時程）

| 機關 | 用途 | 入口 |
|---|---|---|
| 衛福部社家署 | 育兒津貼、托育補助 | 社家署網站最新消息 RSS |
| 教育部 | 2–5 歲育兒津貼、幼兒園 | 教育部全球資訊網即時新聞 |
| 勞動部 | 育嬰留停、假別 | 勞動部新聞稿 RSS |
| 財政部 | 幼兒學前特別扣除額 | 財政部新聞稿 |
| 國健署 | 預防保健、發展篩檢、衛教 | 國健署新聞 RSS |
| 疾管署 | 疫苗時程、腸病毒與流感新聞稿、疫情週報 | 疾管署新聞稿 RSS、疫情週報頁 |
| 食藥署 | 用藥安全、嬰兒食品 | 食藥署新聞 RSS |
| 衛福部口腔健康司 | 塗氟 | 口腔健康司最新消息 |
| 環境部 | 空氣品質開放資料格式異動 | 環境部開放資料平臺公告 |

## D. 開放資料集書籤（上架版 4 圖層）

| 圖層 | 資料集 |
|---|---|
| 哺集乳室 | https://data.gov.tw/dataset/23750 |
| 急救責任醫院 | 衛福部醫事司名單 PDF（2026-04-29 版），手動轉 JSON |
| 兒童發展聯合評估中心 | 衛福部或各縣市名單，上線前確認資料集 |
| 公共圖書館 | 教育部或各縣市資料集，上線前確認 |

## E. 每季查核循環（1、4、7、10 月）

1. 政策 JSON 全部數字對照 C 表來源重新查核，更新查核日期。
2. 法規卡對照 B 表異動通知。
3. 開放資料 JSON 重新抓取（每半年：1、7 月）。
4. 盤點「本產品補充」區塊，出現 3 張以上者升級或刪除（v0.9 第 3 章）。
5. 來源 URL 存活檢查腳本跑一次，待複查清單清空。
