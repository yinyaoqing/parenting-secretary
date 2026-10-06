import { OUTCOME_LABEL, type Outcome } from '../tasks/toilet';

export function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function sinceLabel(iso: string, now = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} 分鐘前`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} 小時 ${m} 分前` : `${h} 小時前`;
}

export function durationLabel(startIso: string, endIso?: string): string {
  const end = endIso ? new Date(endIso) : new Date();
  const mins = Math.max(0, Math.round((end.getTime() - new Date(startIso).getTime()) / 60000));
  if (mins < 60) return `${mins} 分`;
  return `${Math.floor(mins / 60)} 時 ${mins % 60} 分`;
}

export function startOfToday(now = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const TYPE_LABEL: Record<string, string> = {
  'feed.breast': '親餵', 'feed.bottle': '瓶餵', 'feed.solid': '副食品', 'feed.pump': '擠奶',
  'diaper.wet': '濕尿布', 'diaper.dirty': '便便', 'diaper.both': '濕＋便', 'toilet.attempt': '如廁',
  sleep: '睡眠', tummy_time: '清醒趴臥', growth: '生長', temperature: '體溫', symptom: '症狀',
  medication: '用藥', visit: '就醫', milestone: '里程碑', mood_note: '情緒日記',
  'task.attempt': '坐小馬桶', 'task.start': '開始如廁訓練', 'task.pause': '如廁訓練先休息', 'task.complete': '如廁訓練完成',
};
export function typeLabel(t: string): string { return TYPE_LABEL[t] ?? t; }

export function eventSummary(type: string, payload: Record<string, unknown>, startAt: string, endAt?: string): string {
  const p = payload as Record<string, string | number | undefined>;
  switch (type) {
    case 'feed.breast': return `${p.side === 'L' ? '左' : p.side === 'R' ? '右' : '雙側'}${p.minutes ? ` ${p.minutes} 分` : ''}`;
    case 'feed.bottle': return `${p.ml ?? ''} ml ${p.kind === 'formula' ? '配方奶' : p.kind === 'cow_milk' ? '鮮奶' : '母乳'}`;
    case 'feed.solid': return `${Array.isArray(payload.foods) ? (payload.foods as string[]).join('、') : ''} ${p.acceptance === 'refused' ? '拒絕' : p.acceptance === 'tasted' ? '嚐一點' : '有吃'}`;
    case 'sleep': return endAt ? durationLabel(startAt, endAt) : `進行中 ${durationLabel(startAt)}`;
    case 'temperature': return `${p.celsius}°C（${siteLabel(String(p.site))}）`;
    case 'tummy_time': return `${p.minutes} 分`;
    case 'medication': return `${p.name ?? ''} ${p.doseText ?? ''}`;
    case 'task.attempt': return OUTCOME_LABEL[p.outcome as Outcome] ?? '';
    default: return '';
  }
}

export function siteLabel(site: string): string {
  return ({ rectal: '肛溫', ear: '耳溫', oral: '口溫', forehead: '額溫', axillary: '腋溫' } as Record<string, string>)[site] ?? site;
}
