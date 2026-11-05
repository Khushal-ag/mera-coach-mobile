import NetInfo from '@react-native-community/netinfo';
import { clearSession, getCurrentToken } from '../auth/session';
import {
  ApiError,
  type ApiResponseBody,
  extractErrorMessage,
  isNoRecordsBody,
  mapToUserFacingMessage,
} from './clientErrors';

export {
  ApiError,
  API_ERROR_NO_RECORDS,
  getErrorMessage,
  isNoRecordsBody,
  toUserMessage,
  type ApiResponseBody,
} from './clientErrors';

function apiBaseUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_API_BASE_URL;
}
// Allow slow first responses (cold API hosts); keep above ~15s.
const REQUEST_TIMEOUT_MS = 30_000;

/** `timeoutMs` overrides the default for slow-by-nature calls such as photo / video uploads. */
export type ApiRequestOptions = RequestInit & { timeoutMs?: number };

function isAbortError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;
  // Expo / RN fetch surfaces cancellations as FetchRequestCanceledException.
  return /FetchRequestCanceled|aborted|canceled|cancelled/i.test(err.message);
}

function anySignal(signals: (AbortSignal | undefined | null)[]): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const list = signals.filter((s): s is AbortSignal => Boolean(s));
  if (list.length === 0) {
    return { signal: new AbortController().signal, cleanup: () => undefined };
  }
  if (list.length === 1) {
    return { signal: list[0], cleanup: () => undefined };
  }
  if (typeof AbortSignal.any === 'function') {
    return { signal: AbortSignal.any(list), cleanup: () => undefined };
  }

  const controller = new AbortController();
  const onAbort = () => {
    controller.abort();
    for (const signal of list) {
      signal.removeEventListener('abort', onAbort);
    }
  };

  for (const signal of list) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', onAbort);
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      for (const signal of list) {
        signal.removeEventListener('abort', onAbort);
      }
    },
  };
}

export async function apiFetch<T = unknown>(
  path: string,
  { timeoutMs = REQUEST_TIMEOUT_MS, ...options }: ApiRequestOptions = {},
): Promise<T> {
  const BASE_URL = apiBaseUrl();
  if (!BASE_URL) {
    throw new ApiError('API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL in .env.', 0);
  }

  // Fail fast only when NetInfo is sure we're offline. Skip the check if NetInfo
  // is slow/unknown — awaiting NetInfo.fetch() with no timeout used to stall requests.
  try {
    const netState = await Promise.race([
      NetInfo.fetch(),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 800)),
    ]);
    if (netState && netState.isConnected === false) {
      throw new ApiError('No internet connection. Check your network and try again.', 0);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Ignore NetInfo failures and proceed to fetch.
  }

  const url = `${BASE_URL.replace(/\/$/, '')}${path}`;
  const token = getCurrentToken();

  // fetch() has no built-in timeout — combine our timer with any caller signal (RQ).
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  const { signal, cleanup: cleanupSignals } = anySignal([options.signal, timeoutController.signal]);

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    // Normalize both timeout and raw network failures (DNS, TLS, connection refused) to ApiError.
    if (isAbortError(err)) {
      const callerAborted = Boolean(options.signal?.aborted);
      // Our timer fired and the caller did not cancel — real timeout.
      if (timeoutController.signal.aborted && !callerAborted) {
        throw new ApiError('Request timed out. Please try again.', 0);
      }
      // React Query cancel (unmount / key change / offline flip). Rethrow AbortError so
      // TanStack Query treats it as cancellation, not isError — converting to ApiError
      // previously made routine cancels look like frequent API failures in the UI.
      if (err instanceof Error && err.name === 'AbortError') throw err;
      const abortErr = new Error('Aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  } finally {
    clearTimeout(timeoutId);
    cleanupSignals();
  }

  let body: ApiResponseBody = null;
  try {
    body = await res.json();
  } catch {
    /* empty/non-JSON body */
  }

  // Clear a stale/expired token so the next screen's auth check sends the user back to Login.
  // clearSession also wipes React Query cache (same as logoutLocal).
  if (res.status === 401) {
    await clearSession();
  }

  // errorCode 1 = no records → treat as empty success, not failure.
  const noRecords = isNoRecordsBody(body);
  const errorMessage = noRecords ? null : extractErrorMessage(body, res.status);
  if ((!res.ok && !noRecords) || errorMessage) {
    const fallback = `Request failed (${res.status})`;
    throw new ApiError(
      errorMessage || mapToUserFacingMessage(fallback, res.status) || fallback,
      res.status,
      body,
    );
  }

  if (noRecords) {
    return (body?.responseObj !== undefined ? body.responseObj : null) as T;
  }

  return (body?.responseObj !== undefined ? body.responseObj : body) as T;
}

type QueryValue = string | number | boolean | null | undefined;

/** Skips null/undefined; empty string is kept (some endpoints treat "" as meaningful). */
export function withQuery(path: string, query: Record<string, QueryValue> = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function apiGet<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
  return apiFetch<T>(query ? withQuery(path, query) : path);
}

export function apiPost<T = unknown>(
  path: string,
  body?: unknown,
  options?: Pick<ApiRequestOptions, 'timeoutMs'>,
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPut<T = unknown>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
