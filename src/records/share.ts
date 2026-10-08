// 分享今天：把一段時間的紀錄整理成純文字，給不裝 APP 的另一位照顧者。只有紀錄，沒有評語、沒有判斷。純函式，可用 node 測試。
export interface ShareEvent { type: string; startAt: string; endAt?: string; payload: Record<string, unknown> }

const pad = (n: number) => String(n).padStart(2, '0');
const hm = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dur = (min: number) => (min < 60 ? `${Math.round(min)} 分` : `${Math.floor(min / 60)} 時 ${Math.round(min % 60)} 分`);
const SITE: Record<string, string> = { rectal: '肛溫', ear: '耳溫', oral: '口溫', forehead: '額溫', axillary: '腋溫' };

export function buildShareText(name: string, events: ShareEvent[], fromMs: number, nowMs: number, label: string): string {
  const inRange = events.filter((e) => { const t = new Date(e.startAt).getTime(); return t >= fromMs && t <= nowMs; }).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const lines: string[] = [`${name} ${label}（到 ${hm(new Date(nowMs).toISOString())}）`];

  const feeds = inRange.filter((e) => e.type === 'feed.breast' || e.type === 'feed.bottle');
  if (feeds.length) {
    const parts = feeds.map((e) => {
      const p = e.payload as { side?: string; minutes?: number; ml?: number };
      return e.type === 'feed.bottle' ? `${hm(e.startAt)} 瓶 ${p.ml ?? ''}` : `${hm(e.startAt)} 親餵${p.side === 'L' ? '左' : p.side === 'R' ? '右' : ''}`;
    });
    const ml = feeds.reduce((a, e) => a + (e.type === 'feed.bottle' ? Number((e.payload as { ml?: number }).ml) || 0 : 0), 0);
    lines.push(`餵奶 ${feeds.length} 次${ml ? `（瓶餵共 ${ml} ml）` : ''}：${parts.join('、')}`);
  } else lines.push('餵奶：沒有紀錄');

  const solids = inRange.filter((e) => e.type === 'feed.solid');
  if (solids.length) lines.push(`副食品：${solids.map((e) => `${hm(e.startAt)} ${((e.payload.foods as string[]) ?? []).join('、')}`).join('；')}`);

  const diapers = inRange.filter((e) => e.type.startsWith('diaper.'));
  if (diapers.length) {
    const wet = diapers.filter((e) => e.type !== 'diaper.dirty').length;
    const dirty = diapers.filter((e) => e.type !== 'diaper.wet').length;
    lines.push(`尿布 ${diapers.length} 片：濕 ${wet}、便 ${dirty}（最後 ${hm(diapers[diapers.length - 1].startAt)}）`);
  } else lines.push('尿布：沒有紀錄');

  const sleeps = events.filter((e) => e.type === 'sleep').filter((e) => {
    const s = new Date(e.startAt).getTime(); const f = e.endAt ? new Date(e.endAt).getTime() : nowMs;
    return f > fromMs && s < nowMs;
  });
  if (sleeps.length) {
    const total = sleeps.reduce((a, e) => a + (Math.min(e.endAt ? new Date(e.endAt).getTime() : nowMs, nowMs) - Math.max(new Date(e.startAt).getTime(), fromMs)) / 60000, 0);
    const open = sleeps.find((e) => !e.endAt);
    lines.push(`睡眠 ${sleeps.length} 次，共 ${dur(total)}${open ? `；${hm(open.startAt)} 起睡著中` : ''}`);
  } else lines.push('睡眠：沒有紀錄');

  const meds = inRange.filter((e) => e.type === 'medication');
  lines.push(meds.length ? `用藥：${meds.map((e) => { const p = e.payload as { name?: string; doseText?: string; intervalHours?: number }; return `${hm(e.startAt)} ${p.name ?? ''} ${p.doseText ?? ''}${p.intervalHours ? `（間隔 ${p.intervalHours} 小時）` : ''}`.trim(); }).join('；')}` : '用藥：無');

  const temps = inRange.filter((e) => e.type === 'temperature');
  if (temps.length) { const t = temps[temps.length - 1]; const p = t.payload as { celsius?: number; site?: string }; lines.push(`最後一次體溫：${p.celsius}°C（${SITE[String(p.site)] ?? ''}）${hm(t.startAt)}`); }

  const notes = inRange.filter((e) => e.type === 'symptom' || e.type === 'visit');
  for (const n of notes) {
    const p = n.payload as { items?: string[]; note?: string; place?: string; reason?: string };
    lines.push(n.type === 'symptom' ? `${hm(n.startAt)} 症狀：${[...(p.items ?? []), p.note].filter(Boolean).join('、')}` : `${hm(n.startAt)} 就醫：${[p.place, p.reason, p.note].filter(Boolean).join('，')}`);
  }

  lines.push('（育兒秘書紀錄，只有紀錄，沒有判斷）');
  return lines.join('\n');
}
