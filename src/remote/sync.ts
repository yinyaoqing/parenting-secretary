// 遠端資料同步：從 GitHub Pages 讀 manifest，版本較新才下載政策與公費時程 JSON。
// 只送出單純的 GET 請求，不帶任何使用者資料；抓不到就繼續用內建或上次存下的版本。
import { getSetting, setSetting } from '../db/repo';
import { emitDataChange } from '../db/changes';
import { BUNDLED_POLICY, setPolicyOverride, type PolicyBundle } from '../policy/loader';
import { BUNDLED_SCHEDULE, setScheduleOverride, type ScheduleBundle } from '../schedule/loader';

export const DATA_BASE = 'https://yinyaoqing.github.io/parenting-secretary/';
const CHECK_EVERY_MS = 12 * 3600000;
const TIMEOUT_MS = 8000;

interface Manifest { v: number; policy: { version: string; path: string }; schedule: { version: string; path: string } }

const validPolicy = (x: unknown): x is PolicyBundle => !!x && typeof (x as PolicyBundle).version === 'string' && Array.isArray((x as PolicyBundle).items) && Array.isArray((x as PolicyBundle).todos);
const validSchedule = (x: unknown): x is ScheduleBundle => !!x && typeof (x as ScheduleBundle).version === 'string' && Array.isArray((x as ScheduleBundle).items) && typeof (x as ScheduleBundle).sources === 'object';

async function getJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

// 啟動時先套用上次存下的遠端版本（離線也能用）。
export async function loadStoredRemote(): Promise<void> {
  try {
    const [p, s] = await Promise.all([getSetting('remote:policy'), getSetting('remote:schedule')]);
    const pj = p ? JSON.parse(p) : null;
    const sj = s ? JSON.parse(s) : null;
    if (validPolicy(pj)) setPolicyOverride(pj);
    if (validSchedule(sj)) setScheduleOverride(sj);
  } catch { /* 壞資料就用內建 */ }
}

export interface RemoteStatus { checkedAt?: string; policyVersion: string; scheduleVersion: string; error?: string }

export async function syncRemote(force = false): Promise<RemoteStatus> {
  const last = await getSetting('remote:lastCheck');
  const status = async (error?: string): Promise<RemoteStatus> => {
    const [p, s] = await Promise.all([getSetting('remote:policy'), getSetting('remote:schedule')]);
    const pv = p ? (JSON.parse(p) as PolicyBundle).version : BUNDLED_POLICY.version;
    const sv = s ? (JSON.parse(s) as ScheduleBundle).version : BUNDLED_SCHEDULE.version;
    return { checkedAt: (await getSetting('remote:lastCheck')) ?? undefined, policyVersion: pv > BUNDLED_POLICY.version ? pv : BUNDLED_POLICY.version, scheduleVersion: sv > BUNDLED_SCHEDULE.version ? sv : BUNDLED_SCHEDULE.version, error };
  };
  if (!force && last && Date.now() - new Date(last).getTime() < CHECK_EVERY_MS) return status();
  try {
    const m = (await getJson(`${DATA_BASE}manifest.json`)) as Manifest;
    let changed = false;
    const curP = await getSetting('remote:policy');
    const curPv = curP ? (JSON.parse(curP) as PolicyBundle).version : BUNDLED_POLICY.version;
    if (m.policy?.version > curPv && m.policy.version > BUNDLED_POLICY.version) {
      const pj = await getJson(DATA_BASE + m.policy.path);
      if (validPolicy(pj)) { await setSetting('remote:policy', JSON.stringify(pj)); setPolicyOverride(pj); changed = true; }
    }
    const curS = await getSetting('remote:schedule');
    const curSv = curS ? (JSON.parse(curS) as ScheduleBundle).version : BUNDLED_SCHEDULE.version;
    if (m.schedule?.version > curSv && m.schedule.version > BUNDLED_SCHEDULE.version) {
      const sj = await getJson(DATA_BASE + m.schedule.path);
      if (validSchedule(sj)) { await setSetting('remote:schedule', JSON.stringify(sj)); setScheduleOverride(sj); changed = true; }
    }
    await setSetting('remote:lastCheck', new Date().toISOString());
    if (changed) emitDataChange();
    return status();
  } catch (e) {
    return status(e instanceof Error ? e.message : '無法連線');
  }
}
