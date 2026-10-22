const mockStore = new Map<string, string>();

jest.mock('../../auth/secureStorage', () => ({
  secureStorage: {
    getItem: async (key: string) => mockStore.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mockStore.set(key, value);
    },
    deleteItem: async (key: string) => {
      mockStore.delete(key);
    },
  },
}));

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
import {
  MAX_MPIN_ATTEMPTS,
  attemptMpin,
  clearMpin,
  isMpinConfigured,
  setMpin,
} from '../../auth/mpin';
/* eslint-enable import/first */

describe('attemptMpin', () => {
  beforeEach(async () => {
    mockStore.clear();
    await clearMpin();
    await setMpin('1234', 'coach@example.com');
  });

  it('accepts the right MPIN', async () => {
    expect(await attemptMpin('1234')).toEqual({ status: 'ok' });
    expect(isMpinConfigured()).toBe(true);
  });

  it('counts wrong tries and says how many are left', async () => {
    expect(await attemptMpin('0000')).toEqual({
      status: 'wrong',
      remaining: MAX_MPIN_ATTEMPTS - 1,
    });
    expect(await attemptMpin('1111')).toEqual({
      status: 'wrong',
      remaining: MAX_MPIN_ATTEMPTS - 2,
    });
  });

  it('keeps the count across app restarts because it is stored on the device', async () => {
    await attemptMpin('0000');
    await attemptMpin('0000');
    // A restart keeps the secure storage and drops only in-memory state, so the count carries on.
    expect(await attemptMpin('0000')).toEqual({
      status: 'wrong',
      remaining: MAX_MPIN_ATTEMPTS - 3,
    });
  });

  it('resets the count after the right MPIN', async () => {
    await attemptMpin('0000');
    await attemptMpin('0000');
    expect(await attemptMpin('1234')).toEqual({ status: 'ok' });
    expect(await attemptMpin('0000')).toEqual({
      status: 'wrong',
      remaining: MAX_MPIN_ATTEMPTS - 1,
    });
  });

  it('clears the MPIN after too many wrong tries', async () => {
    let last = await attemptMpin('0000');
    for (let i = 1; i < MAX_MPIN_ATTEMPTS; i += 1) last = await attemptMpin('0000');
    expect(last).toEqual({ status: 'locked' });
    expect(isMpinConfigured()).toBe(false);
    // Even the right MPIN no longer works: the coach has to sign in with the password.
    expect(await attemptMpin('1234')).toEqual({
      status: 'wrong',
      remaining: MAX_MPIN_ATTEMPTS - 1,
    });
  });
});
