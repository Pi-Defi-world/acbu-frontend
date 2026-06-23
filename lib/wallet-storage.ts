import localforage from 'localforage';
import { getPasscode } from './passcode-manager';

localforage.config({
  name: 'ACBU_Wallet',
  storeName: 'wallet_store',
});

const KEY_STORE_PREFIX = 'stellar_secret_';
const KEY_STORE_PLAINTEXT_PREFIX = 'stellar_secret_plain_';
const KEY_STORE_PLAINTEXT_ADDRESS_PREFIX = 'stellar_secret_plain_addr_';
// KEY_STORE_PASSPHRASE intentionally removed (F-003):
// The passcode must never be persisted in sessionStorage — it must only live
// in memory for the duration of a single decrypt operation.  Any caller that
// previously relied on the sessionStorage round-trip must pass the passcode
// explicitly as a function argument instead.

function assertDevOnly(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Plaintext wallet storage is development-only and cannot be used in production',
    );
  }
}

/**
 * Helper to derive an AES-GCM key from the passcode using PBKDF2.
 */
async function deriveKey(passcode: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passcode),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a secret using AES-GCM and the user's passcode.
 * Returns a base64 string formatted as: salt_base64:iv_base64:ciphertext_base64
 */
async function encryptSecret(secret: string, passcode: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passcode, salt);
  const enc = new TextEncoder();
  
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(secret)
  );

  const salt64 = btoa(String.fromCharCode(...salt));
  const iv64 = btoa(String.fromCharCode(...iv));
  const cipher64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)));
  
  return `${salt64}:${iv64}:${cipher64}`;
}

/**
 * Decrypts a secret using AES-GCM and the user's passcode.
 */
async function decryptSecret(encrypted: string, passcode: string): Promise<string | null> {
  try {
    const parts = encrypted.split(':');
    if (parts.length !== 3) return null;
    
    const [salt64, iv64, cipher64] = parts;
    
    const salt = new Uint8Array(atob(salt64).split('').map(c => c.charCodeAt(0)));
    const iv = new Uint8Array(atob(iv64).split('').map(c => c.charCodeAt(0)));
    const cipherText = new Uint8Array(atob(cipher64).split('').map(c => c.charCodeAt(0)));
    
    const key = await deriveKey(passcode, salt);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherText
    );
    
    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.warn("Wallet decryption failed", err);
    return null;
  }
}

export async function storeWalletSecret(userId: string, secret: string, passcode: string): Promise<void> {
  const encrypted = await encryptSecret(secret, passcode);
  await localforage.setItem(`${KEY_STORE_PREFIX}${userId}`, encrypted);
}

export async function getWalletSecret(userId: string, passcode: string): Promise<string | null> {
  const encrypted = await localforage.getItem<string>(`${KEY_STORE_PREFIX}${userId}`);
  if (!encrypted) return null;
  
  return await decryptSecret(encrypted, passcode);
}

/**
 * Store wallet secret in IndexedDB without passcode.
 * This matches the "decrypt without passcode" requirement, but is NOT secure.
 * Only use for dev/test flows.
 */
export async function storeWalletSecretLocalPlaintext(
  userId: string,
  secret: string,
  stellarAddress?: string,
): Promise<void> {
  assertDevOnly();
  const userKey = `${KEY_STORE_PLAINTEXT_PREFIX}${userId}`;
  await localforage.setItem(userKey, secret);
  if (stellarAddress) {
    await localforage.setItem(
      `${KEY_STORE_PLAINTEXT_ADDRESS_PREFIX}${stellarAddress}`,
      secret,
    );
  }
}

/**
 * Read wallet secret from IndexedDB without passcode.
 */
export async function getWalletSecretLocalPlaintext(
  userId: string,
  stellarAddress?: string | null,
): Promise<string | null> {
  assertDevOnly();
  const userKey = `${KEY_STORE_PLAINTEXT_PREFIX}${userId}`;
  const addressKey = stellarAddress
    ? `${KEY_STORE_PLAINTEXT_ADDRESS_PREFIX}${stellarAddress}`
    : null;

  const byUser = await localforage.getItem<string>(userKey);
  if (byUser) return byUser;
  if (addressKey) {
    const byAddress = await localforage.getItem<string>(addressKey);
    if (byAddress) return byAddress;
  }
  return null;
}

/**
 * Best-effort wallet secret lookup:
 * - plaintext slot (dev/test flows and wallet-setup modal)
 * - encrypted slot decrypted with passcode from memory (wallet page flow)
 */
export async function getWalletSecretAnyLocal(
  userId: string,
  stellarAddress?: string | null,
): Promise<string | null> {
  assertDevOnly();
  const plaintext = await getWalletSecretLocalPlaintext(userId, stellarAddress);
  if (plaintext) return plaintext;

  try {
    const passcode = getPasscode();
    if (passcode) {
      const decrypted = await getWalletSecret(userId, passcode);
      if (decrypted) return decrypted;
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
