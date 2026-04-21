import localforage from 'localforage';

localforage.config({
  name: 'ACBU_Wallet',
  storeName: 'wallet_store',
});

const KEY_STORE_PREFIX = 'stellar_secret_';
const KEY_STORE_PLAINTEXT_PREFIX = 'stellar_secret_plain_';
const KEY_STORE_PASSPHRASE = 'acbu_passcode';

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

/**
 * Store wallet secret in IndexedDB without passcode.
 * This matches the "decrypt without passcode" requirement, but is NOT secure.
 * Only use for dev/test flows.
 */
export async function storeWalletSecretLocalPlaintext(
  userId: string,
  secret: string,
): Promise<void> {
  await localforage.setItem(`${KEY_STORE_PLAINTEXT_PREFIX}${userId}`, secret);
  // Fallback: IndexedDB can be unavailable in some browser modes; keep a copy in localStorage.
  // (Still per-origin; this is not meant as a security measure.)
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`${KEY_STORE_PLAINTEXT_PREFIX}${userId}`, secret);
    }
  } catch {
    // ignore
  }
}

/**
 * Read wallet secret from IndexedDB without passcode.
 */
export async function getWalletSecretLocalPlaintext(
  userId: string,
): Promise<string | null> {
  const key = `${KEY_STORE_PLAINTEXT_PREFIX}${userId}`;
  const secret = await localforage.getItem<string>(key);
  if (secret) return secret;
  try {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Best-effort wallet secret lookup:
 * - plaintext slot (dev/test flows and wallet-setup modal)
 * - encrypted slot decrypted with passcode from sessionStorage (wallet page flow)
 */
export async function getWalletSecretAnyLocal(
  userId: string,
): Promise<string | null> {
  const plaintext = await getWalletSecretLocalPlaintext(userId);
  if (plaintext) return plaintext;

  try {
    if (typeof window !== 'undefined') {
      const passcode = window.sessionStorage.getItem(KEY_STORE_PASSPHRASE) || '';
      if (passcode) {
        const decrypted = await getWalletSecret(userId, passcode);
        if (decrypted) return decrypted;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function hasStoredWallet(userId: string): Promise<boolean> {
  const encrypted = await localforage.getItem<string>(`${KEY_STORE_PREFIX}${userId}`);
  const plaintext = await localforage.getItem<string>(`${KEY_STORE_PLAINTEXT_PREFIX}${userId}`);
  return !!encrypted || !!plaintext;
}

export async function removeStoredWallet(userId: string): Promise<void> {
  await localforage.removeItem(`${KEY_STORE_PREFIX}${userId}`);
  await localforage.removeItem(`${KEY_STORE_PLAINTEXT_PREFIX}${userId}`);
}
