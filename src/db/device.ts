import { getSetting, setSetting } from './repo';
import { newId } from './index';

let cached: string | null = null;

// 無帳號：以裝置 id 作為 recordedBy。第一次啟動時產生並存在 settings。
export async function deviceId(): Promise<string> {
  if (cached) return cached;
  let id = await getSetting('deviceId');
  if (!id) {
    id = `dev-${newId()}`;
    await setSetting('deviceId', id);
  }
  cached = id;
  return id;
}
