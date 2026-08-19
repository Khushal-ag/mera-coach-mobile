import * as Crypto from 'expo-crypto';

// Matches the backend's CoachBLL.HashPassword: SHA-256, lowercase hex.
// The web app hashes passwords client-side before they ever reach AuthController,
// so the mobile app must do the same — this is not a security substitute for HTTPS,
// just matching the existing wire contract both clients are expected to send.
export async function hashPassword(password: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
  return hash.toLowerCase();
}
