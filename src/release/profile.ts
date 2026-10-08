// 送審版型（擁有者決策第 10 項，2026-10-08）。
// personal：以個人開發者帳號送審。所有會讓審查員把 APP 歸為健康類的紀錄入口關閉；
//           APP 不知道使用者在記什麼，健康相關的事由使用者寫在日記或自訂倒數裡。
// org：以行號或公司的組織帳號送審，全部開啟。
// 資料結構不隨版型改變，切換不需要遷移；舊紀錄照常顯示，只是不再提供新增入口。
// 切換版型只改下面這一行，然後 npm run typecheck && npm run test。
export type ReleaseProfile = 'personal' | 'org';

export const RELEASE_PROFILE = 'personal' as ReleaseProfile;

const org = RELEASE_PROFILE === 'org';

export const FEATURES = {
  /** 體溫、症狀、便色、就醫的紀錄入口與摘要。 */
  healthRecords: org,
  /** 用藥紀錄（藥名、劑量文字、間隔倒數）、行程「服藥」種類與用藥間隔通知。關閉時由「倒數提醒」承接。 */
  medicationLog: org,
  /** 症狀與照護型內容卡（腸絞痛、尿布疹、呼吸道融合病毒與輪狀病毒）。卡片以 profile: "org" 標記。 */
  careCards: org,
} as const;
