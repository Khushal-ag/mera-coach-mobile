// The client reads its base URL once when it loads, so each test loads it fresh with the URL set.
function loadApiFetch() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
  let apiFetch!: typeof import('../../api/client').apiFetch;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    apiFetch = require('../../api/client').apiFetch;
  });
  return apiFetch;
}

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

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    globalThis.fetch = realFetch;
    process.env.EXPO_PUBLIC_API_BASE_URL = realBase;
  });

  const settle = async (ms: number) => {
    await jest.advanceTimersByTimeAsync(ms);
  };

  it('gives up after the default 30 seconds', async () => {
    const apiFetch = loadApiFetch();
    // After loading: importing the client makes the Expo runtime reinstall its own fetch.
    globalThis.fetch = hangingFetch() as unknown as typeof fetch;
    const result = apiFetch('/v1/Ping').catch((e: Error) => e.message);
    await settle(30_001);
    await expect(result).resolves.toMatch(/timed out/i);
  });

  it('waits longer when the caller asks for a longer timeout', async () => {
    const apiFetch = loadApiFetch();
    // After loading: importing the client makes the Expo runtime reinstall its own fetch.
    globalThis.fetch = hangingFetch() as unknown as typeof fetch;
    let outcome: string | null = null;
    void apiFetch('/v1/Upload', { timeoutMs: 120_000 }).catch((e: Error) => {
      outcome = e.message;
    });
    await settle(60_000);
    expect(outcome).toBeNull();
    await settle(60_001);
    expect(outcome).toMatch(/timed out/i);
  });
});
