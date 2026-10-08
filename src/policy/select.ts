// 政策篩選（純函式，可用 node 測試）。
import type { PolicyBundle, PolicyItem, PolicyTodo } from './loader.ts';

// 依孩子年齡與戶籍縣市挑出相關的項目（產假等 ageMinDays 為負，代表出生前就適用）。
// 地方項目只給同縣市的孩子；沒填縣市只看得到中央項目。純函式，可用 node 測試。
export function selectPolicy(b: PolicyBundle, ageDays: number, county?: string): { items: PolicyItem[]; todos: PolicyTodo[] } {
  const inCounty = (x: { county?: string }) => !x.county || x.county === county;
  return {
    items: b.items.filter((it) => ageDays >= it.ageMinDays && ageDays <= it.ageMaxDays && inCounty(it)),
    todos: b.todos.filter((t) => ageDays >= t.ageMinDays && ageDays <= t.ageMaxDays && inCounty(t)),
  };
}

