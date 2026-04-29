import localforage from 'localforage';
import { getPasscode } from './passcode-manager';

localforage.config({
  name: 'ACBU_Wallet',
  storeName: 'wallet_store',
});

const KEY_STORE_PREFIX = 'stellar_secret_';
const KEY_STORE_PLAINTEXT_PREFIX = 'stellar_secret_plain_';
const KEY_STORE_PLAINTEXT_ADDRESS_PREFIX = 'stellar_secret_plain_addr_';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const SALT_SIZE = 16;
const IV_SIZE = 12;
const PBKDF2_ITERATIONS = 200_000;

function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(passcode: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passcode),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptSecret(secret: string, passcode: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
  const key = await deriveKey(passcode, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(secret),
  );

  return JSON.stringify({
    version: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  });
}

async function decryptSecret(encrypted: string, passcode: string): Promise<string | null> {
  try {
    const payload = JSON.parse(encrypted) as {
      version: number;
      salt: string;
      iv: string;
      ciphertext: string;
    };
    if (payload.version !== 1) return null;

    const salt = fromBase64(payload.salt);
    const iv = fromBase64(payload.iv);
    const ciphertext = fromBase64(payload.ciphertext);
    const key = await deriveKey(passcode, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );
    return textDecoder.decode(decrypted);
  } catch {
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
  const userKey = `${KEY_STORE_PLAINTEXT_PREFIX}${userId}`;
  await localforage.setItem(userKey, secret);
  if (stellarAddress) {
    await localforage.setItem(
      `${KEY_STORE_PLAINTEXT_ADDRESS_PREFIX}${stellarAddress}`,
      secret,
    );
  }
  // Fallback: IndexedDB can be unavailable in some browser modes; keep a copy in localStorage.
  // (Still per-origin; this is not meant as a security measure.)
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(userKey, secret);
      if (stellarAddress) {
        window.localStorage.setItem(
          `${KEY_STORE_PLAINTEXT_ADDRESS_PREFIX}${stellarAddress}`,
          secret,
        );
      }
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
  stellarAddress?: string | null,
): Promise<string | null> {
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
  try {
    if (typeof window !== 'undefined') {
      const lsByUser = window.localStorage.getItem(userKey);
      if (lsByUser) return lsByUser;
      if (addressKey) return window.localStorage.getItem(addressKey);
    }
  } catch {
    // ignore
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
