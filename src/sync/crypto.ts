// 交接包加密：AES-256-GCM，用 expo-crypto 內建實作（Expo Go 可用）。家庭金鑰只存在裝置的 settings。
import { AESEncryptionKey, AESSealedData, aesEncryptAsync, aesDecryptAsync, randomUUID } from 'expo-crypto';
import type { SyncCrypto } from './codec';

export async function generateFamilyKey(): Promise<string> {
  const key = await AESEncryptionKey.generate(256);
  return key.encoded('base64');
}

export function newFamilyId(): string {
  return `fam-${randomUUID()}`;
}

export async function makeCrypto(keyBase64: string): Promise<SyncCrypto> {
  const key = await AESEncryptionKey.import(keyBase64, 'base64');
  return {
    async encrypt(plain) {
      const sealed = await aesEncryptAsync(plain, key);
      return sealed.combined();
    },
    async decrypt(cipher) {
      const sealed = AESSealedData.fromCombined(cipher);
      return aesDecryptAsync(sealed, key);
    },
  };
}
