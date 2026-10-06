// 本地通知的排程規劃（純函式，可用 node 測試）。實際排程在 scheduler.ts。
// 原則：滾動排程，每次資料變動或回到前景就重算；只排未來的；總數不超過 60（iOS 上限 64）。
// 暫停模式時什麼都不排（規劃 4.2）。安全網只在 1 歲前；用藥只倒數使用者輸入的間隔，不建議劑量（R6）。

export const MAX_PENDING = 60;
export const WINDOW_DAYS = 7;
export const PUBLIC_WINDOW_DAYS = 30;

export interface NotifySettings { paused: boolean; safetyNet: boolean; medication: boolean; schedule: boolean; publicSchedule: boolean }
export interface ChildNotifyInput {
  id: string;
  name: string;
  ageDays: number;
  lastFeedAt?: string;
  safetyNetMinutes?: number; // 已算好的上界（分鐘）
  meds: { name: string; lastAt: string; intervalHours: number }[];
  occurrences: { title: string; start: number; leadMinutes: number; location?: string }[]; // 未來 7 天的固定行程
  publicOpens: { title: string; category: string; window: string; opensOn: number }[]; // 時間窗開始日（當天 0 時）
}
export type NotifyKind = 'safetyNet' | 'medication' | 'schedule' | 'public';
export interface Planned { key: string; kind: NotifyKind; at: number; title: string; body: string; url: string }

const PRIORITY: Record<NotifyKind, number> = { safetyNet: 0, medication: 1, schedule: 2, public: 3 };
const pad = (n: number) => String(n).padStart(2, '0');
const hm = (ms: number) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dur = (min: number) => (min < 60 ? `${Math.round(min)} 分` : `${Math.floor(min / 60)} 時 ${pad(Math.round(min % 60))} 分`);

export function planNotifications(children: ChildNotifyInput[], s: NotifySettings, now: number): Planned[] {
  if (s.paused) return [];
  const out: Planned[] = [];
  const soon = now + 30_000;
  const horizon = now + WINDOW_DAYS * 86400000;

  for (const c of children) {
    const timeline = `/record/timeline?childId=${c.id}`;
    if (s.safetyNet && c.ageDays < 365 && c.lastFeedAt && c.safetyNetMinutes) {
      const at = new Date(c.lastFeedAt).getTime() + c.safetyNetMinutes * 60000;
      if (at > soon) out.push({ key: `net:${c.id}`, kind: 'safetyNet', at, title: `${c.name}距上次餵奶已 ${dur(c.safetyNetMinutes)}`, body: '比平常久。寶寶醒著嗎？有沒有找奶的樣子？只提醒這一次，不是時刻表。', url: '/' });
    }
    if (s.medication) {
      for (const m of c.meds) {
        const at = new Date(m.lastAt).getTime() + m.intervalHours * 3600000;
        if (at > soon && at <= horizon) out.push({ key: `med:${c.id}:${m.name}`, kind: 'medication', at, title: `${c.name}：${m.name} 的間隔到了`, body: `距上次已滿你輸入的 ${m.intervalHours} 小時。APP 不建議劑量，請依醫師或藥袋的指示。`, url: timeline });
      }
    }
    if (s.schedule) {
      for (const o of c.occurrences) {
        if (!o.leadMinutes) continue;
        const at = o.start - o.leadMinutes * 60000;
        if (at > soon && at <= horizon) out.push({ key: `sch:${c.id}:${o.title}:${o.start}`, kind: 'schedule', at, title: `${o.title} ${hm(o.start)}`, body: [c.name, o.leadMinutes >= 1440 ? '明天' : `${dur(o.leadMinutes)}後`, o.location].filter(Boolean).join(' · '), url: timeline });
      }
    }
    if (s.publicSchedule) {
      for (const p of c.publicOpens) {
        const at = p.opensOn + 9 * 3600000; // 當天 9 時
        if (at > soon && at <= now + PUBLIC_WINDOW_DAYS * 86400000) out.push({ key: `pub:${c.id}:${p.title}`, kind: 'public', at, title: `${p.category}：時間窗開始了`, body: `${c.name}：${p.title}，${p.window}。帶兒童健康手冊與健保卡。`, url: '/schedule' });
      }
    }
  }

  return out
    .sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind] || a.at - b.at)
    .slice(0, MAX_PENDING)
    .sort((a, b) => a.at - b.at);
}

// 通知準時度：送達時間減預定時間（秒），取中位數。
export function medianDelay(delays: number[]): number | null {
  if (!delays.length) return null;
  const s = [...delays].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
