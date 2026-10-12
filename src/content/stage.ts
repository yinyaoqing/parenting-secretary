// 依年齡切換用字與清單（純函式，可用 node 測試）。規劃 v1.0 第 5 章：所有階段入場，但字眼與入口要跟著年齡。
import type { ContentCard } from './types';

export type AgeStage = 'baby' | 'toddler' | 'preschool' | 'school' | 'teen';
export function ageStage(ageDays: number): AgeStage {
  if (ageDays < 365) return 'baby';
  if (ageDays < 1095) return 'toddler';
  if (ageDays < 2190) return 'preschool';
  if (ageDays < 4380) return 'school';
  return 'teen';
}

// 問問看的提示字：舉這個年齡會查的詞。
export function searchHint(ageDays: number | null): string {
  if (ageDays === null) return '例如：吐奶、睡過夜、補助';
  return ({ baby: '例如：吐奶、睡過夜、補助', toddler: '例如：挑食、夜哭、幼兒園', preschool: '例如：近視、如廁、抽籤', school: '例如：健檢、課後照顧、網路', teen: '例如：會考、睡眠、心理資源' } as Record<AgeStage, string>)[ageStage(ageDays)];
}

// 日記分類：幼兒、學齡、青少年各一組，都是描述，不評價。
export function diaryKinds(ageDays: number): string[] {
  const s = ageStage(ageDays);
  if (s === 'baby' || s === 'toddler') return ['情緒爆發', '分離焦慮', '新技能', '有趣的話', '其他'];
  if (s === 'preschool') return ['情緒', '朋友', '新技能', '有趣的話', '學校的事', '其他'];
  if (s === 'school') return ['學校的事', '朋友', '情緒', '興趣', '我們聊了什麼', '其他'];
  return ['我們聊了什麼', '學校與升學', '朋友', '情緒', '他在意的事', '其他'];
}

// 安全層：依年齡分成「現在適用」與「較小的孩子」。全部都保留可讀（R7），只是排序與摺疊。
export function splitSafety(cards: ContentCard[], ageDays: number | null): { current: ContentCard[]; past: ContentCard[] } {
  if (ageDays === null) return { current: cards, past: [] };
  const current = cards.filter((c) => ageDays >= c.ageMinDays && ageDays <= c.ageMaxDays);
  const past = cards.filter((c) => !current.includes(c));
  return { current, past };
}

// 安全入口的副標：取前三張的標題主詞（冒號前）。
export function safetySummary(current: ContentCard[]): string {
  const heads = current.slice(0, 3).map((c) => c.title.split(/[：:]/)[0].trim()).filter(Boolean);
  return heads.length ? `${heads.join('、')}⋯ 離線可讀，無法關閉` : '較小孩子的安全內容，離線可讀';
}
