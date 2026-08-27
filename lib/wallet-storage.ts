import localforage from 'localforage';
import { getPasscode } from './passcode-manager';

localforage.config({
  name: 'ACBU_Wallet',
  storeName: 'wallet_store',
});

const KEY_STORE_PREFIX = 'stellar_secret_';
const KEY_STORE_PLAINTEXT_PREFIX = 'stellar_secret_plain_';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const SALT_SIZE = 16;
const IV_SIZE = 12;
const PBKDF2_ITERATIONS = 200_000;

export interface EncryptedWalletPayload {
  version: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
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
      salt: salt as unknown as BufferSource,
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
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    textEncoder.encode(secret),
  );

  const payload: EncryptedWalletPayload = {
    version: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  };
  return JSON.stringify(payload);
}

async function decryptSecret(encrypted: string, passcode: string): Promise<string | null> {
  try {
    if (!encrypted) return null;
    const payload = JSON.parse(encrypted) as EncryptedWalletPayload;
    if (
      !payload ||
      typeof payload !== 'object' ||
      payload.version !== 1 ||
      typeof payload.salt !== 'string' ||
      typeof payload.iv !== 'string' ||
      typeof payload.ciphertext !== 'string'
    ) {
      return null;
    }

    const salt = fromBase64(payload.salt);
    const iv = fromBase64(payload.iv);
    const ciphertext = fromBase64(payload.ciphertext);
    const key = await deriveKey(passcode, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ciphertext as unknown as BufferSource,
    );
    return textDecoder.decode(decrypted);
  } catch {
    return null;
  }
}

export async function storeWalletSecret(userId: string, secret: string, passcode: string): Promise<void> {
  if (!userId) return;
  const encrypted = await encryptSecret(secret, passcode);
  await localforage.setItem(`${KEY_STORE_PREFIX}${userId}`, encrypted);
}

export async function getWalletSecret(userId: string, passcode: string): Promise<string | null> {
  if (!userId || !passcode) return null;
  const encrypted = await localforage.getItem<string>(`${KEY_STORE_PREFIX}${userId}`);
  if (!encrypted) return null;
  
  return await decryptSecret(encrypted, passcode);
}

/**
 * Best-effort wallet secret lookup:
 * - encrypted slot decrypted with passcode from memory or argument
 */
export async function getWalletSecretAnyLocal(
  userId: string,
  _stellarAddress?: string | null,
  passcode?: string | null,
): Promise<string | null> {
  if (!userId) return null;
  try {
    const activePasscode = passcode ?? getPasscode();
    if (activePasscode) {
      const decrypted = await getWalletSecret(userId, activePasscode);
      if (decrypted) return decrypted;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function hasStoredWallet(userId: string): Promise<boolean> {
  if (!userId) return false;
  const encrypted = await localforage.getItem<string>(`${KEY_STORE_PREFIX}${userId}`);
  const plaintext = await localforage.getItem<string>(`${KEY_STORE_PLAINTEXT_PREFIX}${userId}`);
  return !!encrypted || !!plaintext;
}

export async function removeStoredWallet(userId: string): Promise<void> {
  if (!userId) return;
  await localforage.removeItem(`${KEY_STORE_PREFIX}${userId}`);
  await localforage.removeItem(`${KEY_STORE_PLAINTEXT_PREFIX}${userId}`);
}
