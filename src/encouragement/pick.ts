// 「今天一句」：依孩子年齡階段與照顧者處境，從固定的內容檔挑一張，一天一張、同一天同一張。純函式，可用 node 測試。
// 不依性別；不評分；夜間不出現（由畫面決定）；可關閉。思想模擬卡標示 kind=thought，畫面會寫明是模擬。

export type CardKind = 'official' | 'plain' | 'thought';
export type Stage = 'newborn' | 'infant' | 'toddler' | 'preschool' | 'school' | 'teen';
export type Context = 'night' | 'work' | 'single' | 'preterm' | 'grandparent' | 'multiple' | 'streak';

export interface EncourageCard {
  id: string;
  kind: CardKind;
  voice: string;
  school?: string;
  genre?: 'literary';
  stages: Stage[];
  contexts?: Context[];
  template?: 'night';
  body: string;
  action?: 'help' | 'checkin';
  quote?: { text: string; source: string };
  source?: { name: string; url?: string; license: 'A1' | 'C' };
}
export interface Bundle { version: string; stages: Record<Stage, [number, number]>; cards: EncourageCard[] }

export const STAGES: Record<Stage, [number, number]> = { newborn: [0, 90], infant: [91, 365], toddler: [366, 1095], preschool: [1096, 2190], school: [2191, 4380], teen: [4381, 6570] };

export function stageOf(ageDays: number): Stage | null {
  for (const [k, [a, b]] of Object.entries(STAGES) as [Stage, [number, number]][]) if (ageDays >= a && ageDays <= b) return k;
  return null;
}

// 簡單的穩定雜湊：同一天、同一個孩子得到同一張。
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

export interface PickInput {
  ageDays: number;
  contexts: Context[]; // 來自孩子檔案的 specialContexts 與今天的紀錄（night、streak）
  nightWakes?: number; // 昨晚餵奶或夜醒次數，供 night 模板
  date: string; // YYYY-MM-DD
  seed: string; // 孩子 id
  recent?: string[]; // 最近幾天出現過的卡 id，避免連續重複
}

export function pickCard(input: PickInput, cards: EncourageCard[]): EncourageCard | null {
  const stage = stageOf(input.ageDays);
  if (!stage) return null;
  const fits = cards.filter((c) => c.stages.includes(stage));
  // 有處境標籤的卡只在該處境出現；處境卡優先，其中 night 只在昨晚次數 >= 4 時成立。
  const ctx = new Set(input.contexts);
  if ((input.nightWakes ?? 0) < 4) ctx.delete('night');
  const contextual = fits.filter((c) => c.contexts?.length && c.contexts.some((x) => ctx.has(x)));
  const general = fits.filter((c) => !c.contexts?.length);
  const avoid = new Set(input.recent ?? []);
  const pool0 = contextual.length ? contextual : general;
  const pool = pool0.filter((c) => !avoid.has(c.id)).length ? pool0.filter((c) => !avoid.has(c.id)) : pool0;
  if (!pool.length) return null;
  const c = pool[hash(`${input.seed}|${input.date}`) % pool.length];
  if (c.template === 'night') return { ...c, body: c.body.replace('{n}', String(input.nightWakes ?? 0)) };
  return c;
}

export function kindLabel(c: EncourageCard): string {
  if (c.kind === 'official') return '國健署原文';
  if (c.kind === 'thought') return c.genre === 'literary' ? '角色模擬' : '思想模擬';
  return '今天一句';
}

// 分享用的純文字：引文附出處；模擬卡註明是模擬。
export function shareText(c: EncourageCard): string {
  const lines = [c.body];
  if (c.quote) lines.push(`「${c.quote.text}」${c.quote.source}`);
  if (c.kind === 'thought') lines.push(`（${c.voice}：依其${c.genre === 'literary' ? '角色' : '思想'}改寫的模擬，不是原文。${c.source?.name ?? ''}）`);
  if (c.kind === 'official' && c.source) lines.push(`（${c.source.name}）`);
  return lines.join('\n');
}
