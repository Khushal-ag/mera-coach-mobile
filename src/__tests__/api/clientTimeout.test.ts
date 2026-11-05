import { apiFetch } from '../../api/client';

const SHORT_TIMEOUT_MS = 100;
const LONG_TIMEOUT_MS = 200;

// A fetch that never answers, but rejects with an AbortError once the request's signal fires.
function hangingFetch() {
  return jest.fn(
    (_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }),
  );
}

describe('apiFetch timeout', () => {
  const realFetch = globalThis.fetch;
  const realBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  const useRealTimers = typeof Bun !== 'undefined';

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
    if (!useRealTimers) jest.useFakeTimers();
  });
  afterEach(() => {
    if (!useRealTimers) jest.useRealTimers();
    globalThis.fetch = realFetch;
    process.env.EXPO_PUBLIC_API_BASE_URL = realBase;
  });

  const settle = async (ms: number) => {
    if (useRealTimers) {
      await new Promise<void>(resolve => {
        setTimeout(resolve, ms);
      });
      return;
    }
    if (typeof jest.advanceTimersByTimeAsync === 'function') {
      await jest.advanceTimersByTimeAsync(ms);
    } else {
      jest.advanceTimersByTime(ms);
    }
    await Promise.resolve();
    await Promise.resolve();
  };

  it('gives up after the configured timeout', async () => {
    globalThis.fetch = hangingFetch() as unknown as typeof fetch;
    const result = apiFetch('/v1/Ping', { timeoutMs: SHORT_TIMEOUT_MS }).catch(
      (e: Error) => e.message,
    );
    await settle(SHORT_TIMEOUT_MS + 1);
    await expect(result).resolves.toMatch(/timed out/i);
  });

  it('waits longer when the caller asks for a longer timeout', async () => {
    globalThis.fetch = hangingFetch() as unknown as typeof fetch;
    let outcome: string | null = null;
    void apiFetch('/v1/Upload', { timeoutMs: LONG_TIMEOUT_MS }).catch((e: Error) => {
      outcome = e.message;
    });
    await settle(100);
    expect(outcome).toBeNull();
    await settle(LONG_TIMEOUT_MS + 1);
    expect(outcome).toMatch(/timed out/i);
  });
});
