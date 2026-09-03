// Base URL comes from EXPO_PUBLIC_API_BASE_URL (see .env.example).
import NetInfo from '@react-native-community/netinfo';
import { clearSession, getCurrentToken } from '../auth/session';
import {
  ApiError,
  type ApiResponseBody,
  extractErrorMessage,
  mapToUserFacingMessage,
} from './clientErrors';

export { ApiError, getErrorMessage, toUserMessage, type ApiResponseBody } from './clientErrors';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const API_VERSION = '1';
// Azure App Service cold starts can exceed 15s; keep this above typical wake time.
const REQUEST_TIMEOUT_MS = 30_000;

function isAbortError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;
  // Expo / RN fetch surfaces cancellations as FetchRequestCanceledException.
  return /FetchRequestCanceled|aborted|canceled|cancelled/i.test(err.message);
}

/** Abort when any of the given signals abort (timeout + React Query cancel). */
function anySignal(signals: (AbortSignal | undefined | null)[]): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();

  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }

  return controller.signal;
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
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

  const url = `${BASE_URL}${path.replace('{version}', API_VERSION)}`;
  const token = getCurrentToken();

  // fetch() has no built-in timeout — combine our timer with any caller signal (RQ).
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  const signal = anySignal([options.signal, timeoutController.signal]);

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
      if (timeoutController.signal.aborted) {
        throw new ApiError('Request timed out. Please try again.', 0);
      }
      // React Query cancel (unmount / offline flip) — not a real timeout.
      throw new ApiError('Request was cancelled.', 0);
    }
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  } finally {
    clearTimeout(timeoutId);
  }

  let body: ApiResponseBody = null;
  try {
    body = await res.json();
  } catch {
    /* empty/non-JSON body */
  }

  // Clear a stale/expired token so the next screen's auth check sends the user back to Login.
  if (res.status === 401) {
    await clearSession();
  }

  const errorMessage = extractErrorMessage(body, res.status);
  if (!res.ok || errorMessage) {
    const fallback = `Request failed (${res.status})`;
    throw new ApiError(
      errorMessage || mapToUserFacingMessage(fallback, res.status) || fallback,
      res.status,
      body,
    );
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

export function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
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
