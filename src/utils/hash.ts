import * as Crypto from 'expo-crypto';

// SHA-256 lowercase hex for Auth/login — not a substitute for HTTPS.
export async function hashPassword(password: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
  return hash.toLowerCase();
}
