// 系統把檔案交給 APP 時（iOS 點 .psync、Android 用「開啟方式」選育兒秘書），path 會是 file:// 或 content:// 網址。
// 這種網址不是路由，轉到匯入確認頁；其他網址照原樣交給 expo-router。
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (/^(file|content):\/\//i.test(path)) return `/sync/import?uri=${encodeURIComponent(path)}`;
    return path;
  } catch {
    return '/';
  }
}
