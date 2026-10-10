// 村長公告的篩選（純函式，可用 node 測試）。規劃 v1.0 第 4 章第三層。
export interface Notice { id: string; publisher: string; county?: string; title: string; body: string; url: string; startsOn: string; endsOn?: string; ageMinDays?: number; ageMaxDays?: number }
export interface NoticeBundle { version: string; checkedAt: string; items: Notice[] }

// 依日期（YYYY-MM-DD）、戶籍縣市、孩子年齡挑出要顯示的公告；新的在前。
// 有縣市的公告只給同縣市；沒填縣市的家長只看到全國公告。不知道年齡時不篩年齡。
export function selectNotices(b: NoticeBundle, opts: { today: string; county?: string; ageDays?: number | null }): Notice[] {
  return b.items
    .filter((n) => n.startsOn <= opts.today && (!n.endsOn || n.endsOn >= opts.today))
    .filter((n) => !n.county || n.county === opts.county)
    .filter((n) => opts.ageDays == null || (opts.ageDays >= (n.ageMinDays ?? 0) && opts.ageDays <= (n.ageMaxDays ?? 99999)))
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn));
}
