# 育兒秘書（parenting-secretary）

面向台灣家庭的育兒秘書 APP。紀錄、衛教連結、提醒、導向政府既有服務；不診斷、不分級、不生成醫療內容。

- 規劃文件：`docs/plan/`，目前基準版為 v0.9（`plan-v0.9.md`）。
- 技術：Expo（React Native、TypeScript）、本地 SQLite、無後端。
- 開發原則：無顧問且內容須有可查核來源；第一階段完成 0–3 歲；架構承載到 18 歲；一人搭配 AI 最小成本；照顧風格由問卷決定但不得覆寫安全層。

## 開發

```bash
npm install
npx expo start
```

## 目錄（規劃中）

- `src/db/` 資料模型與 SQLite
- `src/content/` 內容卡 JSON 與產線腳本
- `src/reminders/` 本地通知與安全網規則
- `docs/plan/` 規劃文件各版本
