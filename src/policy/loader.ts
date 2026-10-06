// 政策資料（育兒津貼、托育補助、假別、生育給付、扣除額、行政待辦）。
// 內建 content/policy/policy.json 當離線預設；遠端（GitHub Pages）版本較新時由 remote/sync.ts 覆蓋。紅線 R11。
import bundled from '../../content/policy/policy.json';

export interface PolicySource { name: string; url: string }
export interface PolicyItem {
  id: string; category: 'money' | 'leave' | 'tax' | string; title: string; who: string;
  amounts: { label: string; value: string }[]; notes: string[]; apply: string;
  ageMinDays: number; ageMaxDays: number; source: PolicySource; checkedAt: string;
}
export interface PolicyTodo { id: string; title: string; when: string; ageMinDays: number; ageMaxDays: number; detail: string; source: PolicySource; checkedAt: string }
export interface PolicyBundle { version: string; year: number; checkedAt: string; note?: string; items: PolicyItem[]; todos: PolicyTodo[] }

export const BUNDLED_POLICY = bundled as unknown as PolicyBundle;
let override: PolicyBundle | null = null;

export function setPolicyOverride(b: PolicyBundle | null): void { override = b; }
export function policyBundle(): PolicyBundle { return override && override.version > BUNDLED_POLICY.version ? override : BUNDLED_POLICY; }

export const STALE_DAYS = 90;
export function isStale(checkedAt: string, now = new Date()): boolean {
  return (now.getTime() - new Date(checkedAt).getTime()) / 86400000 > STALE_DAYS;
}

// 依孩子年齡挑出相關的項目（產假等 ageMinDays 為負，代表出生前就適用）。
export function policyFor(ageDays: number): { items: PolicyItem[]; todos: PolicyTodo[] } {
  const b = policyBundle();
  return {
    items: b.items.filter((it) => ageDays >= it.ageMinDays && ageDays <= it.ageMaxDays),
    todos: b.todos.filter((t) => ageDays >= t.ageMinDays && ageDays <= t.ageMaxDays),
  };
}
