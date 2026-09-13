jest.mock('expo-crypto', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('node:crypto') as {
    createHash: (algorithm: string) => {
      update: (data: string) => { digest: (encoding: string) => string };
    };
  };
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA256' },
    digestStringAsync: async (_algorithm: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data).digest('hex'),
    getRandomBytesAsync: async (size: number) => Uint8Array.from({ length: size }, (_, i) => i + 1),
  };
});

/* eslint-disable import/first -- jest.mock must run before the module under test loads */
import { digestsEqual, hashMpin, isValidMpinFormat, verifyMpin } from '../../utils/mpinCrypto';
/* eslint-enable import/first */

describe('isValidMpinFormat', () => {
  it('accepts exactly 4 digits', () => {
    expect(isValidMpinFormat('1234')).toBe(true);
    expect(isValidMpinFormat('0000')).toBe(true);
  });

  it('rejects other lengths or non-digits', () => {
    expect(isValidMpinFormat('123')).toBe(false);
    expect(isValidMpinFormat('12345')).toBe(false);
    expect(isValidMpinFormat('12a4')).toBe(false);
    expect(isValidMpinFormat('')).toBe(false);
  });
});

describe('hashMpin / verifyMpin', () => {
  const salt = 'aabbccddeeff00112233445566778899';

  it('hashes deterministically for the same salt and MPIN', async () => {
    const a = await hashMpin('2468', salt);
    const b = await hashMpin('2468', salt);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different hashes for different MPINs or salts', async () => {
    const base = await hashMpin('2468', salt);
    expect(await hashMpin('2469', salt)).not.toBe(base);
    expect(await hashMpin('2468', salt.replace('a', 'b'))).not.toBe(base);
  });

  it('verifies a correct MPIN and rejects a wrong one', async () => {
    const hash = await hashMpin('1357', salt);
    expect(await verifyMpin('1357', salt, hash)).toBe(true);
    expect(await verifyMpin('1358', salt, hash)).toBe(false);
    expect(await verifyMpin('135', salt, hash)).toBe(false);
  });

  it('throws when hashing an invalid MPIN', async () => {
    await expect(hashMpin('12', salt)).rejects.toThrow(/4 digits/i);
  });
});

describe('digestsEqual', () => {
  it('returns true only for identical strings of equal length', () => {
    expect(digestsEqual('abcd', 'abcd')).toBe(true);
    expect(digestsEqual('abcd', 'abce')).toBe(false);
    expect(digestsEqual('abc', 'abcd')).toBe(false);
  });
});
