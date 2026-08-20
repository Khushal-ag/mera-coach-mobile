import * as Crypto from 'expo-crypto';

// Matches the backend's CoachBLL.HashPassword (SHA-256, lowercase hex) — the wire contract
// both clients send; not a substitute for HTTPS.
export async function hashPassword(password: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
  return hash.toLowerCase();
}
