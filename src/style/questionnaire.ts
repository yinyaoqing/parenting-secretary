// 照顧風格問卷：規劃文件 v0.4 第 4.1 節。
// 六向度、每向度兩題、三個預設加自訂。風格只影響提醒預設模式、內容排序與語氣；
// 安全層不受任何向度影響（紅線 R7），這裡沒有任何選項能關閉安全內容。

import type { StyleAxis, StyleProfile } from '../db/types';

export interface Question {
  id: string;
  axis: StyleAxis;
  text: string;
  // 選項值 -2..2；負值偏向左端，正值偏向右端。左右端定義見 AXES。
  options: { label: string; value: -2 | -1 | 0 | 1 | 2 }[];
}

export const AXES: Record<StyleAxis, { left: string; right: string; affects: string }> = {
  routine: { left: '固定時間表', right: '跟隨孩子訊號', affects: '提醒預設模式、一日作息範本' },
  cry_response: { left: '立即回應', right: '先觀察再回應', affects: '安撫與睡眠方法排序' },
  sleep_arrangement: { left: '獨立房間', right: '同房或同床', affects: '睡眠內容排序（安全層不變）' },
  feeding_lead: { left: '大人安排', right: '孩子主導', affects: '副食品取向與挑食做法排序' },
  guidance: { left: '規則與後果', right: '情緒先行', affects: '12–36 個月行為卡排序' },
  info_depth: { left: '只要做法', right: '想看理論', affects: '是否預設展開第三層' },
};

export const QUESTIONS: Question[] = [
  {
    id: 'routine-1',
    axis: 'routine',
    text: '關於每天的餵奶與睡覺時間，你比較接近哪一種？',
    options: [
      { label: '希望盡量固定時間', value: -2 },
      { label: '大致固定，看情況調整', value: -1 },
      { label: '沒有特別偏好', value: 0 },
      { label: '主要看孩子當下的訊號', value: 1 },
      { label: '完全跟著孩子走', value: 2 },
    ],
  },
  {
    id: 'routine-2',
    axis: 'routine',
    text: '如果 APP 提醒你「該餵奶了」但孩子還在睡，你會？',
    options: [
      { label: '叫醒孩子按時餵', value: -2 },
      { label: '等一下再看', value: 0 },
      { label: '不叫醒，等孩子自己醒', value: 2 },
    ],
  },
  {
    id: 'cry-1',
    axis: 'cry_response',
    text: '孩子一哭，你通常？',
    options: [
      { label: '馬上抱起來或回應', value: -2 },
      { label: '先出聲安撫，看看情況', value: -1 },
      { label: '沒有固定做法', value: 0 },
      { label: '先觀察一兩分鐘再決定', value: 1 },
      { label: '確認安全後，給孩子一點時間', value: 2 },
    ],
  },
  {
    id: 'cry-2',
    axis: 'cry_response',
    text: '關於「孩子學著自己平靜下來」，你的想法是？',
    options: [
      { label: '這個階段不需要，先回應就好', value: -2 },
      { label: '可以慢慢練習', value: 0 },
      { label: '很重要，想早一點開始', value: 2 },
    ],
  },
  {
    id: 'sleep-1',
    axis: 'sleep_arrangement',
    text: '孩子晚上睡哪裡？',
    options: [
      { label: '自己的房間', value: -2 },
      { label: '和我們同房，但睡自己的床', value: 0 },
      { label: '和我們同床', value: 2 },
    ],
  },
  {
    id: 'sleep-2',
    axis: 'sleep_arrangement',
    text: '關於讓孩子自己入睡的方法（例如逐步減少陪伴），你的態度是？',
    options: [
      { label: '想了解並嘗試', value: -2 },
      { label: '看情況', value: 0 },
      { label: '不打算用', value: 2 },
    ],
  },
  {
    id: 'feed-1',
    axis: 'feeding_lead',
    text: '開始吃副食品時，你比較想？',
    options: [
      { label: '由大人準備泥狀、用湯匙餵', value: -2 },
      { label: '兩種都試', value: 0 },
      { label: '讓孩子自己抓著吃', value: 2 },
    ],
  },
  {
    id: 'feed-2',
    axis: 'feeding_lead',
    text: '孩子不想吃某樣食物時，你會？',
    options: [
      { label: '鼓勵再吃幾口', value: -2 },
      { label: '看情況', value: 0 },
      { label: '尊重孩子，下次再試', value: 2 },
    ],
  },
  {
    id: 'guide-1',
    axis: 'guidance',
    text: '孩子大一點後出現不當行為，你比較傾向？',
    options: [
      { label: '清楚的規則與一致的後果', value: -2 },
      { label: '兩者並用', value: 0 },
      { label: '先處理情緒，再談行為', value: 2 },
    ],
  },
  {
    id: 'guide-2',
    axis: 'guidance',
    text: '你希望 APP 的行為建議偏向？',
    options: [
      { label: '具體步驟與做法', value: -2 },
      { label: '都要', value: 0 },
      { label: '理解孩子為什麼這樣', value: 2 },
    ],
  },
  {
    id: 'info-1',
    axis: 'info_depth',
    text: '看內容時，你通常？',
    options: [
      { label: '只想知道現在該怎麼做', value: -2 },
      { label: '有時間就多看一點', value: 0 },
      { label: '想知道背後的理論與研究', value: 2 },
    ],
  },
  {
    id: 'info-2',
    axis: 'info_depth',
    text: '一張內容卡你希望多長？',
    options: [
      { label: '三行以內', value: -2 },
      { label: '一個畫面', value: 0 },
      { label: '可以很長，我會慢慢看', value: 2 },
    ],
  },
];

export const PRESETS: Record<Exclude<StyleProfile['preset'], 'custom'>, { name: string; aka: string; axes: Record<StyleAxis, number> }> = {
  structured: {
    name: '結構型',
    aka: '常見稱呼：規律作息派、百歲派',
    axes: { routine: -2, cry_response: 1, sleep_arrangement: -2, feeding_lead: -1, guidance: -1, info_depth: -1 },
  },
  responsive: {
    name: '回應型',
    aka: '常見稱呼：親密育兒、回應式照顧',
    axes: { routine: 2, cry_response: -2, sleep_arrangement: 1, feeding_lead: 1, guidance: 1, info_depth: 0 },
  },
  mixed: {
    name: '混合型',
    aka: '白天跟隨訊號、夜間固定流程',
    axes: { routine: 0, cry_response: 0, sleep_arrangement: 0, feeding_lead: 0, guidance: 0, info_depth: 0 },
  },
};

export function scoreAnswers(answers: Record<string, number>): Record<StyleAxis, number> {
  const sums: Record<StyleAxis, { total: number; n: number }> = {
    routine: { total: 0, n: 0 },
    cry_response: { total: 0, n: 0 },
    sleep_arrangement: { total: 0, n: 0 },
    feeding_lead: { total: 0, n: 0 },
    guidance: { total: 0, n: 0 },
    info_depth: { total: 0, n: 0 },
  };
  for (const q of QUESTIONS) {
    const v = answers[q.id];
    if (typeof v === 'number') {
      sums[q.axis].total += v;
      sums[q.axis].n += 1;
    }
  }
  const out = {} as Record<StyleAxis, number>;
  (Object.keys(sums) as StyleAxis[]).forEach((axis) => {
    const { total, n } = sums[axis];
    out[axis] = n ? Math.round(total / n) : 0;
  });
  return out;
}

export function nearestPreset(axes: Record<StyleAxis, number>): StyleProfile['preset'] {
  let best: StyleProfile['preset'] = 'custom';
  let bestDist = Infinity;
  (Object.keys(PRESETS) as (keyof typeof PRESETS)[]).forEach((key) => {
    const p = PRESETS[key].axes;
    const dist = (Object.keys(p) as StyleAxis[]).reduce((acc, a) => acc + Math.abs(p[a] - axes[a]), 0);
    if (dist < bestDist) {
      bestDist = dist;
      best = key;
    }
  });
  // 距離門檻：每向度平均差距超過 1 就視為自訂。
  return bestDist <= 6 ? best : 'custom';
}

// 風格決定的預設值。安全層不在此處，永遠固定。
export function derivedDefaults(axes: Record<StyleAxis, number>) {
  return {
    reminderMode: axes.routine <= -1 ? ('schedule' as const) : ('safety_net' as const),
    expandTheoryByDefault: axes.info_depth >= 1,
    // 0–6 個月即使選結構型，餵食提醒仍以安全網為預設（v0.4 第 4.1 節規則）。
    newbornReminderMode: 'safety_net' as const,
  };
}

// 結果頁固定文字（v0.4 第 4.1 節）。
export const RESULT_DISCLAIMER = '這是你的偏好，不是評分；沒有一種風格對所有孩子都對。安全睡眠、發燒、噎食等安全內容在任何風格下都會照常顯示，無法關閉。';
