// 內容卡結構：對應規劃文件 v0.7 第 3 章（來源政策 2.0）與 v0.9 第 5 章（產線十項檢查）。
// 缺任一必備欄位不得上線。

export type TrustLevel = 'T1' | 'T2' | 'T3';
export type LicenseLevel = 'A1' | 'A2' | 'B' | 'C';
export type EvidenceTag = 'strong' | 'partial' | 'clinical' | 'theory' | 'official';
export type TopicGroup =
  | 'milestones'
  | 'safety'
  | 'feeding'
  | 'sleep'
  | 'behavior'
  | 'health'
  | 'benefits'
  | 'home_safety'
  | 'caregiver'
  | 'special';

export type StyleTag = 'structured' | 'responsive' | 'mixed' | 'all';

export interface ContentSource {
  name: string; // 來源名稱，例如「國民健康署」「CDC Learn the Signs. Act Early.」
  url: string;
  lang: 'zh-TW' | 'en' | 'other';
  trust: TrustLevel;
  license: LicenseLevel;
  excerpt?: string; // B 級重述與 A2 翻譯須存原文摘錄，供相似度檢查與對照稿
  checkedAt: string; // ISO date
}

export interface ContentCard {
  id: string; // 例如 safety.safe-sleep
  topicGroup: TopicGroup;
  title: string;
  ageMinDays: number;
  ageMaxDays: number;
  styleTags: StyleTag[];
  evidence: EvidenceTag;
  body: string; // 主文：A1 原文或改寫、A2 譯文、B 重述、C 一句話結論
  supplement?: string; // 「本產品補充」：僅食材替換、單位換算、機構名稱對應；受字數與語氣限制
  readMore?: { label: string; url: string; note?: string }[]; // 例如國健署兒童發展連續圖連結與語意差異說明
  sources: ContentSource[]; // 至少一個；B 級連結每卡最多一個
  translated: boolean; // A2 翻譯卡片
  translationReviewed?: boolean; // 譯審完成才可發布
  foreignOnly: boolean; // 主題群無台灣官方內容時為 true，自動加固定標示
  policyNumbers: boolean; // 政策數字卡：查核日期須在 90 天內
  updatedAt: string;
  status: 'draft' | 'review' | 'published';
}
