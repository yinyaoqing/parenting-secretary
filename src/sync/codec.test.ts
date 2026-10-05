// 執行：node --experimental-strip-types src/sync/codec.test.ts
import assert from 'node:assert/strict';
import { bytesToBase64, base64ToBytes, encodePackage, decodePackage, splitFrames, FrameCollector, encodePairing, parsePairing, type SyncPackage, type SyncCrypto } from './codec.ts';

// 測試用：XOR 代替 AES，只驗證打包流程，不驗證密碼學。
const fakeCrypto = (k: number): SyncCrypto => ({
  encrypt: async (p) => p.map((b) => b ^ k),
  decrypt: async (c) => c.map((b) => b ^ k),
});

let passed = 0;
function test(name: string, fn: () => void | Promise<void>) { return Promise.resolve(fn()).then(() => { passed++; console.log('ok', name); }); }

await test('base64 來回一致，含非 3 倍數長度', () => {
  for (const len of [0, 1, 2, 3, 4, 5, 31, 100]) {
    const bytes = new Uint8Array(len).map((_, i) => (i * 73 + 11) & 255);
    const b64 = bytesToBase64(bytes);
    assert.equal(b64, Buffer.from(bytes).toString('base64'));
    assert.deepEqual(Array.from(base64ToBytes(b64)), Array.from(bytes));
  }
});

const pkg: SyncPackage = {
  v: 1, familyId: 'fam', from: 'devA', fromName: '媽媽的手機', createdAt: '2026-10-06T00:00:00.000Z',
  children: [{ id: 'c1', nickname: '小米', birthDate: '2026-06-23', feedingMethod: 'breast', location: 'home', specialContexts: [], createdAt: 'x', updatedAt: 'x' }],
  events: Array.from({ length: 60 }, (_, i) => ({ id: `e${i}`, childId: 'c1', type: 'diaper.wet', startAt: `2026-10-05T${String(i % 24).padStart(2, '0')}:00:00.000Z`, payload: {}, recordedBy: 'devA', source: 'home' as const, createdAt: '2026-10-05T00:00:00.000Z', seq: i + 1 })),
};

await test('打包後可還原，且比原始 JSON 小', async () => {
  const text = await encodePackage(pkg, fakeCrypto(0x5a));
  assert.ok(text.startsWith('PS1.'));
  assert.ok(text.length < JSON.stringify(pkg).length, `壓縮後 ${text.length} 應小於 ${JSON.stringify(pkg).length}`);
  const back = await decodePackage(text, fakeCrypto(0x5a));
  assert.deepEqual(back, pkg);
});

await test('金鑰不同時解密失敗並給出可讀訊息', async () => {
  const text = await encodePackage(pkg, fakeCrypto(0x5a));
  // XOR 用錯金鑰不會丟例外，但 inflate 會失敗；兩種都要變成可讀錯誤或丟出
  await assert.rejects(decodePackage(text, fakeCrypto(0x11)));
});

await test('QR 多張切換：亂序、重複掃描都能拼回', async () => {
  const text = await encodePackage(pkg, fakeCrypto(1));
  const frames = splitFrames(text, 300);
  assert.ok(frames.length > 1);
  const c = new FrameCollector();
  assert.equal(c.add('https://example.com'), null);
  const order = [...frames].reverse().concat(frames[0], frames[1]);
  let last: ReturnType<FrameCollector['add']> = null;
  for (const f of order) last = c.add(f);
  assert.equal(last?.done, true);
  assert.equal(c.result(), text);
});

await test('配對 QR code 來回一致，含中文與分隔字元', () => {
  const p = { familyId: 'fam-1', key: 'a+b/c=', deviceId: 'dev-x', deviceName: '阿嬤|的手機' };
  assert.deepEqual(parsePairing(encodePairing(p)), p);
  assert.equal(parsePairing('PS1.xxx'), null);
});

console.log(`\n${passed} tests passed`);
