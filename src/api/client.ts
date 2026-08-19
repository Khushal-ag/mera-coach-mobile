// Generic fetch wrapper for the Mera Coach backend. Base URL is configurable via
// EXPO_PUBLIC_API_BASE_URL (see .env.example) so it can point at localhost, a LAN IP,
// or a tunnel URL without code changes.
import { getCurrentToken } from '../auth/session';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const API_VERSION = '1';

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

type ApiResponseBody = Partial<ValidationErrorBody & BusinessResponseBody> | null;

export class ApiError extends Error {
  status: number;
  body: ApiResponseBody;

  constructor(message: string, status: number, body: ApiResponseBody = null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// The backend uses two different error shapes, confirmed against the live Swagger spec:
//  - ASP.NET model validation (400): { errors: { FieldName: ["message", ...] } }
//  - Business responses (any status, incl. 200): { errorObj: [{ errorCode, errorMessage }], responseObj }
//    where errorCode 0 means success and responseObj holds the payload.
function extractErrorMessage(body: ApiResponseBody): string | null {
  if (!body) return null;
  if (body.errors) {
    const firstField = Object.keys(body.errors)[0];
    return firstField ? (body.errors[firstField]?.[0] ?? null) : null;
  }
  const err = body.errorObj?.[0];
  if (err && err.errorCode !== 0) return err.errorMessage;
  return null;
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError('API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL in .env.', 0);
  }

  const url = `${BASE_URL}${path.replace('{version}', API_VERSION)}`;
  const token = getCurrentToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  let body: ApiResponseBody = null;
  try {
    body = await res.json();
  } catch {
    /* empty/non-JSON body */
  }

  const errorMessage = extractErrorMessage(body);
  if (!res.ok || errorMessage) {
    throw new ApiError(errorMessage || `Request failed (${res.status})`, res.status, body);
  }

  return (body?.responseObj !== undefined ? body.responseObj : body) as T;
}
