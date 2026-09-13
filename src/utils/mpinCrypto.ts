import * as Crypto from 'expo-crypto';

export const MPIN_LENGTH = 4;

/** Exactly 4 digits, no other characters. */
export function isValidMpinFormat(mpin: string): boolean {
  return /^\d{4}$/.test(mpin);
}

/** SHA-256 hex of `salt:mpin` (lowercase). Salt must already be hex/random string. */
export async function hashMpin(mpin: string, salt: string): Promise<string> {
  if (!isValidMpinFormat(mpin)) {
    throw new Error('MPIN must be exactly 4 digits.');
  }
  if (!salt) {
    throw new Error('MPIN salt is required.');
  }
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${mpin}`,
  );
  return digest.toLowerCase();
}

/** Constant-time-ish compare of hex digests (avoids early exit on length mismatch only). */
export function digestsEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyMpin(
  mpin: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  if (!isValidMpinFormat(mpin) || !salt || !expectedHash) return false;
  const actual = await hashMpin(mpin, salt);
  return digestsEqual(actual, expectedHash.toLowerCase());
}

/** 16-byte random salt as hex (32 chars). */
export async function generateMpinSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
