import localforage from 'localforage';
import { getPasscode } from './passcode-manager';

localforage.config({
  name: 'ACBU_Wallet',
  storeName: 'wallet_store',
});

const KEY_STORE_PREFIX = 'stellar_secret_';
const KEY_STORE_PLAINTEXT_PREFIX = 'stellar_secret_plain_';
const KEY_STORE_PLAINTEXT_ADDRESS_PREFIX = 'stellar_secret_plain_addr_';
<<<<<<< fix/174-178-191-236-security-billing-headers-sri
// KEY_STORE_PASSPHRASE intentionally removed (F-003):
// The passcode must never be persisted in sessionStorage — it must only live
// in memory for the duration of a single decrypt operation.  Any caller that
// previously relied on the sessionStorage round-trip must pass the passcode
// explicitly as a function argument instead.
=======
>>>>>>> dev

function assertDevOnly(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Plaintext wallet storage is development-only and cannot be used in production',
    );
  }
}

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
<<<<<<< fix/174-178-191-236-security-billing-headers-sri
 * Best-effort wallet secret lookup (dev/test flows only).
 *
 * Returns the plaintext secret from the dev storage slot.
 * The former sessionStorage passcode path has been intentionally removed (F-003):
 * passcodes must be held in memory only and passed explicitly to `getWalletSecret()`
 * by callers that perform authenticated decryption.
=======
 * Best-effort wallet secret lookup:
 * - plaintext slot (dev/test flows and wallet-setup modal)
 * - encrypted slot decrypted with passcode from memory (wallet page flow)
>>>>>>> dev
 */
export async function getWalletSecretAnyLocal(
  userId: string,
  stellarAddress?: string | null,
): Promise<string | null> {
  assertDevOnly();
<<<<<<< fix/174-178-191-236-security-billing-headers-sri
  return getWalletSecretLocalPlaintext(userId, stellarAddress);
=======
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
>>>>>>> dev
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
