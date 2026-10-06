// 照顧者支持（規劃 v0.4 第 4.9 節、v0.5 增補）：狀態打卡與資源導向，不計分、不篩檢、不內嵌 EPDS（R2）。
// 每條資源都附官方頁面與查核日期。號碼與服務時間變動時改這裡。純資料與純函式，可用 node 測試。

export interface CareResource {
  id: string;
  name: string;
  phone?: string; // 撥號用，只留數字
  phoneLabel?: string;
  hours: string;
  desc: string;
  url: string;
  source: string;
  checkedAt: string;
}

export const RESOURCES: CareResource[] = [
  {
    id: 'hpa-mammy',
    name: '孕產婦關懷專線',
    phone: '0800870870',
    phoneLabel: '0800-870-870',
    hours: '週一至週五 8 時至 18 時，週六 9 時至 13 時（國定假日除外）',
    desc: '國健署孕產兒關懷中心，懷孕、產後與嬰幼兒照顧的諮詢。',
    url: 'https://mammy.hpa.gov.tw/',
    source: '國民健康署孕產兒關懷網站',
    checkedAt: '2026-10-06',
  },
  {
    id: 'mohw-1925',
    name: '1925 安心專線',
    phone: '1925',
    phoneLabel: '1925',
    hours: '24 小時，全年無休，免付費',
    desc: '心理困擾、壓力或面臨危機時，市話或手機直接撥打。',
    url: 'https://dep.mohw.gov.tw/DOMHAOH/cp-4906-54077-107.html',
    source: '衛生福利部心理健康司',
    checkedAt: '2026-10-06',
  },
  {
    id: 'moe-family',
    name: '家庭教育諮詢專線',
    phone: '024128185',
    phoneLabel: '412-8185（手機加 02）',
    hours: '週一至週六 9 時至 12 時、14 時至 17 時；週一至週五 18 時至 21 時',
    desc: '親職教養、親子關係、夫妻與家人相處。諮詢免費，電話費自付。',
    url: 'https://familyedu.moe.gov.tw/mainList.aspx?uid=8846&pid=8844',
    source: '教育部家庭教育資源網',
    checkedAt: '2026-10-06',
  },
  {
    id: 'mohw-1545',
    name: '15 至 45 歲青壯世代心理健康支持方案',
    hours: '115 年持續辦理；先上網查有名額的合作機構再預約',
    desc: '每人 3 次免費心理諮商，帶身分證明文件到合作機構。113、114 年用過的人，115 年可以再用。',
    url: 'https://dep.mohw.gov.tw/DOMHAOH/cp-502-85046-107.html',
    source: '衛生福利部心理健康司',
    checkedAt: '2026-10-06',
  },
];

// ---------- 每日 10 秒打卡 ----------
export type Level = 0 | 1 | 2; // 0 還可以、1 有點吃力、2 很難撐
export interface CheckIn { sleep: Level; energy: Level; mood: Level }
export const QUESTIONS: { key: keyof CheckIn; label: string; options: [string, string, string] }[] = [
  { key: 'sleep', label: '睡眠', options: ['還可以', '睡不太夠', '幾乎沒睡'] },
  { key: 'energy', label: '精力', options: ['還可以', '有點累', '撐不住'] },
  { key: 'mood', label: '心情', options: ['還可以', '有點低落', '很難受'] },
];

// 最近 3 天有 2 天心情選「很難受」時，主動把資源放到前面。不顯示分數，也不做任何判讀。
export function wantsSupport(byDate: Record<string, CheckIn | undefined>, dates: string[]): boolean {
  const recent = dates.slice(0, 3).map((d) => byDate[d]).filter(Boolean) as CheckIn[];
  return recent.filter((c) => c.mood === 2).length >= 2;
}

// 請求支援：由本人選擇內容並預覽，透過系統分享送出，APP 不經伺服器。
export const ASKS = ['幫我顧孩子一兩個小時，讓我睡一下', '幫忙買點東西或送餐過來', '陪我聊一聊', '幫忙做家事'];
export function askMessage(picks: string[], extra: string): string {
  const lines = picks.map((p) => `・${p}`);
  if (extra.trim()) lines.push(`・${extra.trim()}`);
  return `最近照顧孩子有點吃力，想請你幫忙：\n${lines.join('\n')}\n謝謝你。`;
}

// 產後 2 週與 6 週各一次的邀請（孩子出生後第 14 到 20 天、第 42 到 48 天）。
export function invitationKey(ageDays: number): '2w' | '6w' | null {
  if (ageDays >= 14 && ageDays <= 20) return '2w';
  if (ageDays >= 42 && ageDays <= 48) return '6w';
  return null;
}
