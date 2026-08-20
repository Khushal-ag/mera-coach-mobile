// Base URL comes from EXPO_PUBLIC_API_BASE_URL (see .env.example).
import NetInfo from '@react-native-community/netinfo';
import { clearSession, getCurrentToken } from '../auth/session';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const API_VERSION = '1';
const REQUEST_TIMEOUT_MS = 15_000;

interface ValidationErrorBody {
  errors: Record<string, string[]>;
}

interface BusinessErrorEntry {
  errorCode: number;
  errorMessage: string;
}

interface BusinessResponseBody {
  errorObj?: BusinessErrorEntry[];
  responseObj?: unknown;
}

// 401 responses use ASP.NET's default ProblemDetails shape instead of the errorObj wrapper.
interface ProblemDetailsBody {
  title?: string;
  detail?: string;
  status?: number;
}

type ApiResponseBody = Partial<
  ValidationErrorBody & BusinessResponseBody & ProblemDetailsBody
> | null;

export class ApiError extends Error {
  status: number;
  body: ApiResponseBody;

  constructor(message: string, status: number, body: ApiResponseBody = null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

// Backend uses 3 error shapes: ASP.NET validation errors, {errorObj, responseObj} business
// responses, and ProblemDetails for 401s — check each in turn.
function extractErrorMessage(body: ApiResponseBody): string | null {
  if (!body) return null;
  if (body.errors) {
    const firstField = Object.keys(body.errors)[0];
    return firstField ? (body.errors[firstField]?.[0] ?? null) : null;
  }
  const err = body.errorObj?.[0];
  if (err && err.errorCode !== 0) return err.errorMessage;
  if (body.detail || body.title) return body.detail || body.title || null;
  return null;
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError('API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL in .env.', 0);
  }

  // Fail fast on known-offline instead of waiting through a timeout.
  const netState = await NetInfo.fetch();
  if (netState.isConnected === false) {
    throw new ApiError('No internet connection. Check your network and try again.', 0);
  }

  const url = `${BASE_URL}${path.replace('{version}', API_VERSION)}`;
  const token = getCurrentToken();

  // fetch() has no built-in timeout.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    // Normalize both timeout and raw network failures (DNS, TLS, connection refused) to ApiError.
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Request timed out. Please try again.', 0);
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

  const errorMessage = extractErrorMessage(body);
  if (!res.ok || errorMessage) {
    throw new ApiError(errorMessage || `Request failed (${res.status})`, res.status, body);
  }

  return (body?.responseObj !== undefined ? body.responseObj : body) as T;
}
