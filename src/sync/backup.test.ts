// 備份檔測試：真的 PBKDF2 與 AES-256-GCM（node WebCrypto），驗證來回、錯誤密碼、交接檔誤用。
import assert from 'node:assert/strict';
import { encodeBackup, decodeBackup, pickSettings, type BackupData, type CryptoFactory } from './backup.ts';

const webAes: CryptoFactory = async (keyBytes) => {
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  return {
    async encrypt(plain) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
      const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out;
    },
    async decrypt(c) {
      return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: c.subarray(0, 12) }, key, c.subarray(12)));
    },
  };
};

let passed = 0;
async function test(name: string, fn: () => Promise<void> | void) { await fn(); passed++; console.log('ok', name); }

const data: BackupData = {
  v: 1, kind: 'backup', createdAt: '2026-10-06T00:00:00.000Z', appVersion: '0.1.0',
  children: [{ id: 'c1', nickname: '小米', birthDate: '2026-06-23', feedingMethod: 'breast', location: 'home', specialContexts: [], archivedAt: undefined, createdAt: 'x', updatedAt: 'x' }],
  events: [{ id: 'e1', childId: 'c1', type: 'sleep', startAt: '2026-10-05T10:00:00.000Z', payload: {}, recordedBy: 'devA', source: 'home', createdAt: 'x' }],
  schedule: [], styleProfiles: [], settings: { activeChildId: 'c1' },
};
const salt = new Uint8Array(16).map((_, i) => i);

await test('備份來回一致（較少迭代以加快測試）', async () => {
  const text = await encodeBackup(data, '我的備份密碼', salt, webAes, 20_000);
  assert.ok(text.startsWith('PSB1.'));
  const back = await decodeBackup(text, '我的備份密碼', webAes);
  assert.deepEqual(back, JSON.parse(JSON.stringify(data)));
});

await test('密碼錯誤：明確的錯誤訊息', async () => {
  const text = await encodeBackup(data, 'correct-horse', salt, webAes, 20_000);
  await assert.rejects(decodeBackup(text, 'wrong-horse', webAes), /密碼不對/);
});

await test('密碼太短不能產生備份；交接檔誤用給提示', async () => {
  await assert.rejects(encodeBackup(data, '123', salt, webAes, 20_000), /至少 6/);
  await assert.rejects(decodeBackup('PS1.abcd', 'whatever', webAes), /交接檔/);
});

await test('備份只帶使用偏好，不帶配對金鑰與裝置 id', () => {
  const s = pickSettings({ deviceId: 'd', familyKey: 'k', familyId: 'f', activeChildId: 'c1', 'templateMode:c1': '{}', themeMode: 'auto', pausedUntil: 'x' });
  assert.deepEqual(Object.keys(s).sort(), ['activeChildId', 'templateMode:c1', 'themeMode']);
});

console.log(`\n${passed} passed`);
