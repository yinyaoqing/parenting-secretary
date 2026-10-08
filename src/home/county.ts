// 戶籍縣市（決定地方補助與縣市資源；規劃 v1.0 第 6.3 節）。名稱用內政部正式寫法「臺」。
export const COUNTIES = [
  '臺北市', '新北市', '桃園市', '臺中市', '臺南市', '高雄市',
  '基隆市', '新竹市', '嘉義市',
  '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '澎湖縣', '金門縣', '連江縣',
] as const;
export type County = (typeof COUNTIES)[number];

// 開放資料常用「台」，比對前統一成「臺」。
export function normalizeCounty(s: string | undefined | null): string | undefined {
  if (!s) return undefined;
  const t = s.trim().replace(/^台/, '臺');
  return (COUNTIES as readonly string[]).includes(t) ? t : undefined;
}
