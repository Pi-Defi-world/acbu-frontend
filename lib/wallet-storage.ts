import localforage from 'localforage';

localforage.config({
  name: 'ACBU_Wallet',
  storeName: 'wallet_store',
});

const KEY_STORE_PREFIX = 'stellar_secret_';

/**
 * Simulates AES encryption for the local storage.
 * In a production app, use SubtleCrypto or a library like 'crypto-js' to encrypt/decrypt
 * using the user's passcode or a derived key.
 */
function encryptSecret(secret: string, passcode: string): string {
  // Mock encryption: simple base64 encode with passcode for demo.
  // DO NOT use this in real production without real AES encryption.
  return btoa(`${passcode}:${secret}`);
}

function decryptSecret(encrypted: string, passcode: string): string | null {
  try {
    const decoded = atob(encrypted);
    const [p, secret] = decoded.split(':');
    if (p === passcode) {
      return secret;
    }
    return null;
  } catch {
    return null;
  }
}

export async function storeWalletSecret(userId: string, secret: string, passcode: string): Promise<void> {
  const encrypted = encryptSecret(secret, passcode);
  await localforage.setItem(`${KEY_STORE_PREFIX}${userId}`, encrypted);
}

export async function getWalletSecret(userId: string, passcode: string): Promise<string | null> {
  const encrypted = await localforage.getItem<string>(`${KEY_STORE_PREFIX}${userId}`);
  if (!encrypted) return null;
  
  return decryptSecret(encrypted, passcode);
}

export async function hasStoredWallet(userId: string): Promise<boolean> {
  const encrypted = await localforage.getItem<string>(`${KEY_STORE_PREFIX}${userId}`);
  return !!encrypted;
}

export async function removeStoredWallet(userId: string): Promise<void> {
  await localforage.removeItem(`${KEY_STORE_PREFIX}${userId}`);
}
