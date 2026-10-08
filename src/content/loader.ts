// 內容卡載入：隨 APP 打包的 JSON（npm run content:build 產生）。遠端投放的 JSON 第 9 到 11 週加入。
import generated from './cards.generated.json';
import type { ContentCard, TopicGroup } from './types';
import { RELEASE_PROFILE } from '../release/profile';

type Bundle = { builtAt: string; cards: ContentCard[] };
const bundle = generated as unknown as Bundle;
// 標了 profile 的卡只在那個送審版型出現；載入時就濾掉，問問看與主題清單都看不到。
const cards: ContentCard[] = bundle.cards.filter((c) => !c.profile || c.profile === RELEASE_PROFILE);

export function allCards(): ContentCard[] {
  return cards;
}

export function cardById(id: string): ContentCard | undefined {
  return cards.find((c) => c.id === id);
}

export function cardsForAge(days: number, group?: TopicGroup): ContentCard[] {
  return cards.filter((c) => (!group || c.topicGroup === group) && days >= c.ageMinDays && days <= c.ageMaxDays);
}

export function safetyCards(): ContentCard[] {
  return cards.filter((c) => c.topicGroup === 'safety');
}

export const GROUP_LABEL: Record<TopicGroup, string> = {
  milestones: '這個時期的孩子',
  safety: '安全內容',
  feeding: '飲食',
  sleep: '睡眠',
  behavior: '行為與情緒',
  health: '篩檢、接種與日常照護',
  benefits: '權益與行政',
  home_safety: '居家安全',
  caregiver: '照顧者',
  special: '特殊情境',
};
